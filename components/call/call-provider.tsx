"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getCallTicket, getIceServers, getSignalingToken, logCallEnd, logCallStart } from "@/app/actions/call";
import { CallOverlay, IncomingCallDialog } from "@/components/call/call-screens";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n";

type Peer = { id: string; name: string };
export type CallState =
  | { status: "idle"; notice?: MessageKey }
  | { status: "ringing" | "calling" | "connecting" | "in_call"; peer: Peer; video: boolean };

type CallApi = {
  state: CallState;
  /** Connected to the signaling server, so calls can be made and received. */
  online: boolean;
  muted: boolean;
  videoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (patientId: string, targetUserId: string, opts: { video: boolean; name: string }) => Promise<void>;
  endCall: () => void;
  accept: () => Promise<void>;
  decline: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
};

const CallContext = createContext<CallApi | null>(null);

export function useCall(): CallApi {
  const api = use(CallContext);
  if (!api) throw new Error("useCall must be used inside CallProvider");
  return api;
}

type ServerMsg = { type: string; [key: string]: unknown };

/** One signaling socket per signed-in user; one fresh RTCPeerConnection per call. */
export function CallProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<CallState>({ status: "idle" });
  const [online, setOnline] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const stateRef = useRef<CallState>(state);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<string | null>(null);
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const iceQueue = useRef<RTCIceCandidateInit[]>([]); // remote candidates before setRemoteDescription
  const outbox = useRef<RTCIceCandidateInit[] | null>(null); // local candidates before the call message is sent
  const callIdRef = useRef<string | null>(null);
  const callSeq = useRef(0); // bumps on every new call and every cleanup
  const iceServersRef = useRef<RTCIceServer[] | null>(null);
  const onMessageRef = useRef<(msg: ServerMsg) => void>(() => {});

  const update = useCallback((next: CallState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  /** Ends everything about the current call: peer connection, camera and mic, log. */
  const cleanup = useCallback(
    (notice?: MessageKey) => {
      callSeq.current++;
      pcRef.current?.close();
      pcRef.current = null;
      localRef.current?.getTracks().forEach((track) => track.stop());
      localRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      iceQueue.current = [];
      outbox.current = null;
      peerRef.current = null;
      offerRef.current = null;
      if (callIdRef.current) {
        void logCallEnd({ callId: callIdRef.current });
        callIdRef.current = null;
      }
      setMuted(false);
      setVideoOff(false);
      update({ status: "idle", notice });
    },
    [update]
  );

  const newPeer = useCallback(
    async (peerId: string, holdIce: boolean) => {
      iceServersRef.current ??= await getIceServers();
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      outbox.current = holdIce ? [] : null;
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const candidate = e.candidate.toJSON();
        if (outbox.current) outbox.current.push(candidate);
        else send({ type: "ice_candidate", targetUserID: peerId, candidate });
      };
      pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? new MediaStream([e.track]));
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        const s = stateRef.current;
        if (pc.connectionState === "connected" && s.status !== "idle" && s.status !== "in_call") {
          update({ ...s, status: "in_call" });
        }
        if (pc.connectionState === "failed") {
          send({ type: "hangup", targetUserID: peerId });
          cleanup("call.notice.failed");
        }
      };
      pcRef.current = pc;
      peerRef.current = peerId;
      return pc;
    },
    [cleanup, send, update]
  );

  const flushIce = async (pc: RTCPeerConnection) => {
    for (const candidate of iceQueue.current.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
  };

  const getMedia = async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  // Latest message handler, so the socket (created once) never sees stale state.
  useEffect(() => {
    onMessageRef.current = async (msg) => {
      const from = msg.fromUserID as string | undefined;
      switch (msg.type) {
        case "incoming_call":
          if (stateRef.current.status !== "idle") return void send({ type: "reject", targetUserID: from });
          peerRef.current = from!;
          offerRef.current = msg.offer as RTCSessionDescriptionInit;
          return update({ status: "ringing", peer: { id: from!, name: String(msg.fromName ?? "") }, video: Boolean(msg.video) });
        case "call_answered": {
          const pc = pcRef.current;
          if (!pc || from !== peerRef.current) return;
          await pc.setRemoteDescription(msg.answer as RTCSessionDescriptionInit);
          await flushIce(pc);
          const s = stateRef.current;
          if (s.status === "calling") update({ ...s, status: "connecting" });
          return;
        }
        case "ice_candidate": {
          if (from !== peerRef.current) return;
          const pc = pcRef.current;
          const candidate = msg.candidate as RTCIceCandidateInit;
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate).catch(() => {});
          else iceQueue.current.push(candidate);
          return;
        }
        case "call_rejected":
          if (from === peerRef.current) cleanup("call.notice.declined");
          return;
        case "call_ended":
          if (from === peerRef.current) cleanup("call.notice.ended");
          return;
        case "user_offline":
          return cleanup("call.notice.offline");
        case "user_busy":
          return cleanup("call.notice.busy");
        case "error":
          if (msg.error === "invalid_ticket") cleanup("call.notice.failed");
          return;
      }
    };
  });

  // Connect once after login; keepalive every 30 s; reconnect with backoff.
  useEffect(() => {
    let stopped = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      const creds = await getSignalingToken().catch(() => null);
      if (stopped || !creds) return; // calls not configured, or signed out
      const ws = new WebSocket(creds.url);
      wsRef.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: "register", token: creds.token }));
      ws.onmessage = (e) => {
        let msg: ServerMsg;
        try {
          msg = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (msg.type === "registered") {
          attempt = 0;
          setOnline(true);
        } else if (msg.type !== "pong") {
          void onMessageRef.current(msg);
        }
      };
      ws.onclose = (e) => {
        if (wsRef.current === ws) wsRef.current = null;
        setOnline(false);
        if (stateRef.current.status !== "idle") cleanup("call.notice.ended");
        // 4000: this account connected from another tab, which now takes the calls.
        if (stopped || e.code === 4000) return;
        retry = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempt++));
      };
    };

    void connect();
    const ping = setInterval(() => send({ type: "ping" }), 30_000);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(ping);
      wsRef.current?.close();
    };
  }, [cleanup, send]);

  const startCall = useCallback<CallApi["startCall"]>(
    async (patientId, targetUserId, { video, name }) => {
      if (stateRef.current.status !== "idle" || !wsRef.current) return;
      const seq = ++callSeq.current;
      update({ status: "calling", peer: { id: targetUserId, name }, video });
      const ticket = await getCallTicket({ patientId, targetUserId });
      if (!ticket.ok) return cleanup("call.notice.notAllowed");
      let stream: MediaStream;
      try {
        stream = await getMedia(video);
      } catch {
        return cleanup("call.notice.noMedia");
      }
      if ((stateRef.current as CallState).status !== "calling") return; // ended while asking for the mic
      const pc = await newPeer(targetUserId, true);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setLocalDescription(await pc.createOffer());
      send({ type: "call", ticket: ticket.ticket, offer: pc.localDescription, video });
      // The call message is out, so the server knows the pair: release held candidates.
      for (const candidate of outbox.current ?? []) send({ type: "ice_candidate", targetUserID: targetUserId, candidate });
      outbox.current = null;
      const callId = await logCallStart({ patientId, calleeId: targetUserId, video });
      // The call may have been declined or ended while this was being saved.
      if (callSeq.current === seq) callIdRef.current = callId;
      else if (callId) void logCallEnd({ callId });
    },
    [cleanup, newPeer, send, update]
  );

  const accept = useCallback(async () => {
    const s = stateRef.current;
    if (s.status !== "ringing" || !offerRef.current) return;
    update({ ...s, status: "connecting" });
    let stream: MediaStream;
    try {
      stream = await getMedia(s.video);
    } catch {
      send({ type: "reject", targetUserID: s.peer.id });
      return cleanup("call.notice.noMedia");
    }
    const pc = await newPeer(s.peer.id, false);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    await pc.setRemoteDescription(offerRef.current);
    await flushIce(pc);
    await pc.setLocalDescription(await pc.createAnswer());
    send({ type: "answer", targetUserID: s.peer.id, answer: pc.localDescription });
  }, [cleanup, newPeer, send, update]);

  const decline = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle") return;
    send({ type: "reject", targetUserID: s.peer.id });
    cleanup();
  }, [cleanup, send]);

  const endCall = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "idle") return;
    send({ type: "hangup", targetUserID: s.peer.id });
    cleanup();
  }, [cleanup, send]);

  // Muting and "video off" only disable tracks, so nothing is renegotiated.
  const toggleMute = useCallback(() => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    setMuted(next);
  }, [muted]);

  const toggleVideo = useCallback(() => {
    const next = !videoOff;
    localRef.current?.getVideoTracks().forEach((track) => (track.enabled = !next));
    setVideoOff(next);
  }, [videoOff]);

  const api: CallApi = {
    state,
    online,
    muted,
    videoOff,
    localStream,
    remoteStream,
    startCall,
    endCall,
    accept,
    decline,
    toggleMute,
    toggleVideo,
  };

  return (
    <CallContext value={api}>
      {/* The app stays mounted underneath; the call screens overlay it. */}
      {children}
      <IncomingCallDialog />
      <CallOverlay />
      {state.status === "idle" && state.notice ? (
        <p
          role="status"
          key={state.notice}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-foreground px-4 py-3 text-center text-base text-background shadow-lg"
        >
          {t(state.notice)}
        </p>
      ) : null}
    </CallContext>
  );
}

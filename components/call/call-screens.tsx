"use client";

import { useEffect, useRef, useState } from "react";
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, VideoIcon, VideoOffIcon } from "lucide-react";
import { useCall } from "@/components/call/call-provider";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function useStream(stream: MediaStream | null) {
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return ref;
}

/** Incoming call: a dialog with Accept / Decline, never confirm(). */
export function IncomingCallDialog() {
  const t = useT();
  const { state, accept, decline } = useCall();
  const ringing = state.status === "ringing";
  return (
    <Dialog open={ringing} onOpenChange={(open) => !open && ringing && decline()}>
      {ringing ? (
        <DialogContent showCloseButton={false} className="gap-5 p-6">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
            {state.peer.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="text-center">
            <DialogTitle className="text-xl">{t("call.incoming", { name: state.peer.name })}</DialogTitle>
            <DialogDescription className="mt-1 text-base">
              {state.video ? t("call.video") : t("call.voice")}
            </DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button size="xl" variant="destructive" onClick={decline}>
              <PhoneOffIcon aria-hidden />
              {t("call.decline")}
            </Button>
            <Button size="xl" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => void accept()}>
              <PhoneIcon aria-hidden />
              {t("call.accept")}
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
}

/** The call screen: overlays the app (which stays mounted) with Mute, Video off and End. */
export function CallOverlay() {
  const t = useT();
  const { state, localStream, remoteStream, muted, videoOff, endCall, toggleMute, toggleVideo } = useCall();
  const remoteRef = useStream(remoteStream);
  const localRef = useStream(localStream);
  if (state.status === "idle" || state.status === "ringing") return null;

  const label =
    state.status === "calling" ? t("call.calling") : state.status === "connecting" ? t("call.connecting") : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("call.with", { name: state.peer.name })} className="fixed inset-0 z-[60] flex flex-col bg-[#10282a] text-white">
      {state.video ? (
        <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
      ) : (
        <audio ref={remoteRef} autoPlay />
      )}
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col gap-3",
          state.video && remoteStream
            ? "items-start bg-gradient-to-b from-black/50 via-transparent to-transparent pt-6 pr-32 pl-5 text-left"
            : "items-center px-6 pt-16 text-center"
        )}
      >
        {!state.video || !remoteStream ? (
          <span className="flex size-24 items-center justify-center rounded-full bg-white/15 text-4xl font-semibold">
            {state.peer.name.slice(0, 1).toUpperCase()}
          </span>
        ) : null}
        <p className="text-2xl font-semibold drop-shadow">{state.peer.name}</p>
        <p className="text-lg text-white/80 drop-shadow" role="status">
          {label ?? <Elapsed />}
        </p>
      </div>
      {state.video ? (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className={cn("absolute top-4 right-4 z-10 h-36 w-24 rounded-xl bg-black object-cover ring-2 ring-white/40", videoOff && "opacity-30")}
        />
      ) : null}
      <div className="relative z-10 flex justify-center gap-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Button
          size="icon-touch"
          aria-pressed={muted}
          aria-label={muted ? t("call.unmute") : t("call.mute")}
          onClick={toggleMute}
          className={cn("size-16 rounded-full", muted ? "bg-white text-[#10282a] hover:bg-white/90" : "bg-white/15 text-white hover:bg-white/25")}
        >
          {muted ? <MicOffIcon className="size-7" /> : <MicIcon className="size-7" />}
        </Button>
        {state.video ? (
          <Button
            size="icon-touch"
            aria-pressed={videoOff}
            aria-label={videoOff ? t("call.videoOn") : t("call.videoOff")}
            onClick={toggleVideo}
            className={cn("size-16 rounded-full", videoOff ? "bg-white text-[#10282a] hover:bg-white/90" : "bg-white/15 text-white hover:bg-white/25")}
          >
            {videoOff ? <VideoOffIcon className="size-7" /> : <VideoIcon className="size-7" />}
          </Button>
        ) : null}
        <Button
          size="icon-touch"
          aria-label={t("call.end")}
          onClick={endCall}
          className="size-16 rounded-full bg-destructive text-white hover:bg-destructive/90"
        >
          <PhoneOffIcon className="size-7" />
        </Button>
      </div>
    </div>
  );
}

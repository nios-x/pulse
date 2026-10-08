// Pulse call signaling: relays WebRTC offers, answers and ICE candidates
// between two members of the same family. Deployed alone (e.g. on Render).
import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { verify } from "./token.ts";

const PORT = Number(process.env.PORT ?? 8080);
const SECRET = process.env.SIGNALING_SECRET;
if (!SECRET) throw new Error("SIGNALING_SECRET is not set");

type Client = { ws: WebSocket; userId: string; name: string };
const clients = new Map<string, Client>(); // userId -> socket
const activeCalls = new Map<string, string>(); // userId -> the peer's userId

const send = (ws: WebSocket, msg: object) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
const sendTo = (userId: string, msg: object) => {
  const c = clients.get(userId);
  if (c) send(c.ws, msg);
  return Boolean(c);
};
const inCall = (a: string, b: unknown) => typeof b === "string" && activeCalls.get(a) === b && activeCalls.get(b) === a;

function endCall(userId: string, notify: "call_ended" | "call_rejected") {
  const peer = activeCalls.get(userId);
  if (!peer) return;
  activeCalls.delete(userId);
  if (activeCalls.get(peer) === userId) activeCalls.delete(peer);
  sendTo(peer, { type: notify, fromUserID: userId });
}

// Plain HTTP answers "ok" so a platform health check passes.
const server = http.createServer((_req, res) => res.end("ok"));
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

wss.on("connection", (ws) => {
  let me: Client | null = null;

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "ping") return void send(ws, { type: "pong" });

    if (msg.type === "register") {
      const token = verify(msg.token, SECRET);
      if (!token || typeof token.userId !== "string") {
        send(ws, { type: "error", error: "invalid_token" });
        return ws.close(4001, "invalid token");
      }
      const old = clients.get(token.userId);
      if (old && old.ws !== ws) old.ws.close(4000, "replaced");
      me = { ws, userId: token.userId, name: String(token.name ?? "") };
      clients.set(me.userId, me);
      return void send(ws, { type: "registered", userId: me.userId });
    }
    if (!me) return void send(ws, { type: "error", error: "not_registered" });

    switch (msg.type) {
      case "call": {
        // The ticket comes from the Next.js app, which checked both users are in the same family.
        const ticket = verify(msg.ticket, SECRET);
        if (!ticket || ticket.from !== me.userId || typeof ticket.to !== "string" || ticket.to === me.userId) {
          return void send(ws, { type: "error", error: "invalid_ticket" });
        }
        if (activeCalls.has(me.userId)) endCall(me.userId, "call_ended");
        const target = clients.get(ticket.to);
        if (!target) return void send(ws, { type: "user_offline", targetUserID: ticket.to });
        if (activeCalls.has(ticket.to)) return void send(ws, { type: "user_busy", targetUserID: ticket.to });
        activeCalls.set(me.userId, ticket.to);
        activeCalls.set(ticket.to, me.userId);
        return void send(target.ws, {
          type: "incoming_call",
          fromUserID: me.userId,
          fromName: me.name,
          patientId: ticket.patientId,
          offer: msg.offer,
          video: Boolean(msg.video),
        });
      }
      case "answer":
        if (inCall(me.userId, msg.targetUserID)) sendTo(msg.targetUserID as string, { type: "call_answered", fromUserID: me.userId, answer: msg.answer });
        return;
      case "reject":
        if (inCall(me.userId, msg.targetUserID)) endCall(me.userId, "call_rejected");
        return;
      case "ice_candidate":
        if (inCall(me.userId, msg.targetUserID)) sendTo(msg.targetUserID as string, { type: "ice_candidate", fromUserID: me.userId, candidate: msg.candidate });
        return;
      case "hangup":
        if (activeCalls.get(me.userId) === msg.targetUserID) endCall(me.userId, "call_ended");
        return;
    }
  });

  ws.on("close", () => {
    if (me && clients.get(me.userId)?.ws === ws) {
      endCall(me.userId, "call_ended");
      clients.delete(me.userId);
    }
  });
});

server.listen(PORT, () => console.log(`signaling listening on :${PORT}`));

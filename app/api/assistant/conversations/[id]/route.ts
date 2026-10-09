import type { NextRequest } from "next/server";
import { z } from "zod";
import { conversationMessages, deleteConversation } from "@/lib/assistant-memory";
import { getContext } from "@/lib/context";

/** One of the user's past chats, to continue it. */
export async function GET(_req: NextRequest, { params }: RouteContext<"/api/assistant/conversations/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found.", { status: 404 });
  const ctx = await getContext();
  const messages = await conversationMessages(ctx, id);
  if (!messages) return new Response("Not found.", { status: 404 });
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext<"/api/assistant/conversations/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 204 });
  const ctx = await getContext();
  await deleteConversation(ctx, id);
  return new Response(null, { status: 204 });
}

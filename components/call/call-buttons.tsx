"use client";

import { PhoneIcon, VideoIcon } from "lucide-react";
import { useCall } from "@/components/call/call-provider";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Audio call and Video call buttons for one family member. Hidden while calls are offline. */
export function CallButtons({ patientId, userId, name }: { patientId: string; userId: string; name: string }) {
  const t = useT();
  const { online, state, startCall } = useCall();
  if (!online) return null;
  const busy = state.status !== "idle";
  return (
    <div className="flex gap-1">
      <Button
        size="icon-touch"
        variant="secondary"
        disabled={busy}
        aria-label={t("call.voiceWith", { name })}
        onClick={() => void startCall(patientId, userId, { video: false, name })}
      >
        <PhoneIcon />
      </Button>
      <Button
        size="icon-touch"
        variant="secondary"
        disabled={busy}
        aria-label={t("call.videoWith", { name })}
        onClick={() => void startCall(patientId, userId, { video: true, name })}
      >
        <VideoIcon />
      </Button>
    </div>
  );
}

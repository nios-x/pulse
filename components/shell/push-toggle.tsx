"use client";

import { useEffect, useState } from "react";
import { BellRingIcon } from "lucide-react";
import { deletePushSubscriptionAction, savePushSubscriptionAction } from "@/app/actions/push";
import { useT } from "@/components/i18n-provider";
import { Switch } from "@/components/ui/switch";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** "Medicine reminders" switch in the menu: asks permission and saves this phone's push subscription. */
export function PushToggle() {
  const t = useT();
  const [state, setState] = useState<State>("loading");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/");
        next = (await reg?.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function toggle(on: boolean) {
    setState("busy");
    try {
      const reg = await registration();
      await navigator.serviceWorker.ready;
      if (on) {
        if ((await Notification.requestPermission()) !== "granted") return setState("denied");
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!),
        });
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const saved = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: json.keys });
        setState(saved.ok ? "on" : "off");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await deletePushSubscriptionAction({ endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
        setState("off");
      }
    } catch {
      setState("off");
    }
  }

  if (state === "unsupported" || state === "loading") return null;
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base">
      <BellRingIcon className="size-5 text-muted-foreground" aria-hidden />
      <span className="flex flex-1 flex-col">
        {t("push.toggle")}
        {state === "denied" ? <span className="text-sm text-muted-foreground">{t("push.denied")}</span> : null}
      </span>
      <Switch
        checked={state === "on"}
        disabled={state === "denied" || state === "busy"}
        onCheckedChange={(checked) => void toggle(checked)}
        aria-label={t("push.toggle")}
      />
    </label>
  );
}

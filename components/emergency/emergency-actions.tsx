"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Printer, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ensureEmergencyLink } from "@/app/actions/share";
import { RoleGate } from "@/components/health/role-gate";
import { SpeakButton } from "@/components/voice/speak-button";
import { Button } from "@/components/ui/button";

export function EmergencyActions({ memberId, shareUrl, speech, name }: { memberId: string; shareUrl: string | null; speech: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [url, setUrl] = useState(shareUrl);

  const share = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Emergency card: ${name}`, text: `Emergency medical info for ${name}`, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: "Paste it in WhatsApp or SMS." });
  };

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button onClick={() => window.print()}>
        <Printer aria-hidden="true" /> Print or save as PDF
      </Button>
      {url ? (
        <Button variant="outline" onClick={share}>
          {typeof navigator !== "undefined" && "share" in navigator ? <Share2 aria-hidden="true" /> : <Copy aria-hidden="true" />} Share link
        </Button>
      ) : (
        <RoleGate action="sharing.manage" memberId={memberId}>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await ensureEmergencyLink(memberId);
                if (res.ok && res.data) {
                  setUrl(res.data.url);
                  toast.success("QR code created", { description: "Anyone who scans it sees this card only, for one year. You can turn it off in Settings." });
                  router.refresh();
                } else if (!res.ok) toast.error(res.error);
              })
            }
          >
            <QrCode aria-hidden="true" /> Create QR code
          </Button>
        </RoleGate>
      )}
      <SpeakButton text={speech} label="Read aloud" size="default" />
    </div>
  );
}

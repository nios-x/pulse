"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyCode({ code }: { code: string }) {
  return (
    <Button variant="outline" size="sm" className="border-brand-foreground/30 bg-brand-foreground/10 text-brand-foreground hover:bg-brand-foreground/20" onClick={async () => { await navigator.clipboard.writeText(code); toast.success("Code copied. Families enter it under Settings → Doctors."); }}>
      <Copy aria-hidden="true" /> Copy code
    </Button>
  );
}

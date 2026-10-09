"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { InteractionPanel } from "@/components/health/interaction-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { checkInteractions, genericAlternative, lookupGenerics } from "@/lib/drugs";

type Med = { id: string; memberId: string; name: string; genericName: string | null };

/** "Check before you buy": add any medicine (e.g. from the chemist) to a person's list and see clashes. */
export function InteractionChecker({ members, meds }: { members: { id: string; name: string }[]; meds: Med[] }) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const theirs = meds.filter((m) => m.memberId === memberId);
  const list = [...theirs.map((m) => ({ id: m.id, name: m.name, genericName: m.genericName })), ...extra.map((name, i) => ({ id: `extra-${i}`, name }))];
  const { interactions, duplicates } = checkInteractions(list);
  const relevant = extra.length
    ? { interactions: interactions.filter((i) => i.first.id.startsWith("extra") || i.second.id.startsWith("extra")), duplicates: duplicates.filter((d) => d.medicines.some((m) => m.id.startsWith("extra"))) }
    : { interactions, duplicates };

  const add = () => {
    const name = draft.trim();
    if (name.length < 2) return;
    setExtra((e) => [...e, name]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-[0.9375rem] font-medium">
          For
          <NativeSelect value={memberId} onChange={(e) => { setMemberId(e.target.value); setExtra([]); }}>
            {members.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-1.5 text-[0.9375rem] font-medium">
          Medicine you&apos;re thinking of taking
          <span className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="e.g. Combiflam, Dolo 650, Ciplox" className="pl-11" />
          </span>
        </label>
        <Button type="button" variant="outline" onClick={add} disabled={draft.trim().length < 2}>
          <Plus aria-hidden="true" /> Check
        </Button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Medicines being checked">
        {theirs.map((m) => (
          <span key={m.id} className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-sm">{m.name}</span>
        ))}
        {extra.map((name, i) => {
          const known = lookupGenerics(name).length > 0;
          const alt = genericAlternative(name);
          return (
            <span key={`${name}-${i}`} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-accent pr-1 pl-3 text-sm text-accent-foreground">
              {name}
              {!known && <span className="text-xs text-muted-foreground">(not in our list)</span>}
              {alt && <span className="text-xs">· generic ~₹{alt.genericPrice}/10</span>}
              <button type="button" aria-label={`Remove ${name}`} onClick={() => setExtra(extra.filter((_, j) => j !== i))} className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-primary-soft">
                <X className="size-4" aria-hidden="true" />
              </button>
            </span>
          );
        })}
      </div>
      <InteractionPanel interactions={relevant.interactions} duplicates={relevant.duplicates} count={list.length} memberName={members.find((m) => m.id === memberId)?.name.split(" ")[0]} />
    </div>
  );
}

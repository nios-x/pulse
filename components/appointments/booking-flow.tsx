"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Languages, MapPin, Search, Star, Video } from "lucide-react";
import { toast } from "sonner";
import { bookAppointment, getSlots } from "@/app/actions/appointments";
import { Segmented } from "@/components/form/segmented";
import { useAccess } from "@/components/providers/access-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, formatDay, formatTime, weekday } from "@/lib/dates";
import type { Slot } from "@/lib/slots";
import { cn } from "@/lib/utils";

export type DoctorCard = {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  city: string;
  languages: string[];
  yearsExperience: number;
  fee: number;
  rating: number;
  teleconsult: boolean;
  hours: Record<string, [string, string] | null>;
};

export function BookingFlow({ doctors, members, defaultMemberId, today, suggestedSpecialty }: { doctors: DoctorCard[]; members: { id: string; name: string }[]; defaultMemberId?: string; today: string; suggestedSpecialty?: string }) {
  const router = useRouter();
  const { can } = useAccess();
  const allowed = members.filter((m) => can("appointments.manage", m.id));
  const [query, setQuery] = useState(suggestedSpecialty ?? "");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState(allowed.find((m) => m.id === defaultMemberId)?.id ?? allowed[0]?.id ?? "");
  const [mode, setMode] = useState<"in_person" | "video">("video");
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loadingSlots, startSlots] = useTransition();
  const [booking, startBooking] = useTransition();

  const doctor = doctors.find((d) => d.id === doctorId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => !q || `${d.name} ${d.specialty} ${d.clinic} ${d.languages.join(" ")}`.toLowerCase().includes(q));
  }, [doctors, query]);
  const days = doctor ? Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => doctor.hours[String(weekday(d))]) : [];

  useEffect(() => {
    if (!doctor || !date) return;
    startSlots(async () => {
      setSlots(await getSlots(doctor.id, date));
    });
  }, [doctor, date]);

  const pickDoctor = (d: DoctorCard) => {
    setDoctorId(d.id);
    setMode(d.teleconsult ? "video" : "in_person");
    setDate(null);
    setSlots(null);
    setTime(null);
    setTimeout(() => document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const confirm = () =>
    startBooking(async () => {
      if (!doctor || !date || !time) return;
      const res = await bookAppointment({ doctorId: doctor.id, memberId, date, time, mode, reason: reason || undefined });
      if (res.ok) {
        toast.success(res.message, { description: res.data?.meetingUrl ? "A private video link was created and emailed to the family." : "A confirmation was emailed to the family." });
        router.push("/appointments");
      } else {
        toast.error(res.error);
        setSlots(await getSlots(doctor.id, date));
        setTime(null);
      }
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section aria-labelledby="dir" className="flex flex-col gap-4">
        <h2 id="dir" className="text-lg font-semibold">1. Choose a doctor</h2>
        <label className="relative">
          <span className="sr-only">Search doctors by name, speciality or language</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search: physician, child, heart, Hindi…" className="pl-11" type="search" />
        </label>
        <ul className="flex flex-col gap-3">
          {filtered.length === 0 && <li className="rounded-xl border border-dashed border-border-strong p-8 text-center text-base text-muted-foreground">No doctors match “{query}”.</li>}
          {filtered.map((d) => {
            const on = d.id === doctorId;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => pickDoctor(d)}
                  aria-pressed={on}
                  className={cn("flex w-full cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,box-shadow] duration-150 sm:p-5", on ? "border-primary ring-2 ring-primary/25" : "border-border hover:border-border-strong")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{d.name}</p>
                      <p className="text-[0.9375rem] text-muted-foreground">{d.specialty} · {d.yearsExperience} yrs experience</p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-lg font-semibold tabular">₹{d.fee}</span>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Star className="size-3.5 fill-current" aria-hidden="true" /> {d.rating.toFixed(1)}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" /> {d.clinic}</span>
                    <span className="inline-flex items-center gap-1.5"><Languages className="size-4" aria-hidden="true" /> {d.languages.join(", ")}</span>
                    {d.teleconsult && <span className="inline-flex items-center gap-1.5 font-medium text-primary"><Video className="size-4" aria-hidden="true" /> Video consult</span>}
                  </div>
                  {on && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Check className="size-4" aria-hidden="true" /> Selected</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="booking-panel" aria-labelledby="slot" className="flex scroll-mt-24 flex-col gap-5 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start sm:p-6">
        <h2 id="slot" className="text-lg font-semibold">2. Pick a time</h2>
        {!doctor ? (
          <p className="text-base text-muted-foreground">Choose a doctor to see open slots for the next two weeks.</p>
        ) : (
          <>
            <label className="flex flex-col gap-2 text-[0.9375rem] font-medium">
              Patient
              <NativeSelect value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {allowed.map((m) => <NativeSelectOption key={m.id} value={m.id}>{m.name}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            {doctor.teleconsult && (
              <fieldset>
                <legend className="mb-2 text-[0.9375rem] font-medium">How</legend>
                <Segmented name="mode" label="Consult type" value={mode} onChange={setMode} options={[{ value: "video", label: "Video consult", icon: Video }, { value: "in_person", label: "At the clinic", icon: MapPin }]} />
              </fieldset>
            )}
            <fieldset>
              <legend className="mb-2 text-[0.9375rem] font-medium">Day</legend>
              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.map((d) => (
                  <button key={d} type="button" aria-pressed={date === d} onClick={() => { setDate(d); setTime(null); }} className={cn("flex min-h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border text-center transition-colors", date === d ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted")}>
                    <span className="text-xs font-medium uppercase">{formatDay(d).split(",")[0]}</span>
                    <span className="text-lg font-semibold tabular">{Number(d.slice(8))}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {date && (
              <fieldset aria-busy={loadingSlots}>
                <legend className="mb-2 text-[0.9375rem] font-medium">Time on {formatDay(date)}</legend>
                {loadingSlots || !slots ? (
                  <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
                ) : slots.filter((s) => s.available).length === 0 ? (
                  <p className="text-base text-muted-foreground">No free slots this day. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => (
                      <button key={s.time} type="button" disabled={!s.available} aria-pressed={time === s.time} onClick={() => setTime(s.time)} className={cn("min-h-11 cursor-pointer rounded-lg border text-[0.9375rem] font-medium tabular transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground/60 disabled:line-through", time === s.time ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>
                        {formatTime(s.time)}
                        {!s.available && <span className="sr-only"> (taken)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
            <label className="flex flex-col gap-2 text-[0.9375rem] font-medium">
              Reason for visit <span className="sr-only">(optional)</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Knee pain for 2 weeks (optional)" maxLength={160} />
            </label>
            <div className="rounded-lg bg-surface p-4 text-[0.9375rem]">
              <p className="font-medium">{doctor.name}</p>
              <p className="text-muted-foreground">
                {date && time ? `${formatDay(date)} at ${formatTime(time)}` : "Choose a day and time"} · {mode === "video" ? "Video consult (link emailed)" : doctor.clinic} · ₹{doctor.fee}, pay at consult
              </p>
            </div>
            <p className="text-sm text-muted-foreground">By booking, you agree to share this person&apos;s health summary (medicines, readings, allergies, records) with the doctor until 7 days after the visit. You can turn it off any time in Settings.</p>
            <Button size="lg" disabled={!date || !time || !memberId || booking} onClick={confirm}>
              <CalendarCheck aria-hidden="true" /> {booking ? "Booking…" : "Confirm booking"}
            </Button>
          </>
        )}
      </section>
    </div>
  );
}

"use client";

import { useActionState, useTransition } from "react";
import { CalendarPlusIcon, CheckIcon, XIcon } from "lucide-react";
import { bookCallAction, cancelBookingAction, respondBookingAction } from "@/app/(app)/p/[patientId]/doctor/actions";
import { useT } from "@/components/i18n-provider";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import type { FormState } from "@/lib/validators";

type Person = { id: string; name: string };

const selectClass = "h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

/** Book a call with the doctor for one member of the family. */
export function BookCallForm({
  patientId,
  doctors,
  members,
  defaultMemberId,
  minWhen,
}: {
  patientId: string;
  doctors: Person[];
  members: Person[];
  defaultMemberId: string;
  /** "YYYY-MM-DDTHH:MM" in India time, for the date-time picker's minimum. */
  minWhen: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(bookCallAction, {});
  const err = (key?: MessageKey) => (key ? t(key) : undefined);

  return (
    <form key={state.ok ? state.values?.when : "form"} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="patientId" value={patientId} />
      {doctors.length > 1 ? (
        <label className="flex flex-col gap-1.5 text-base font-medium">
          {t("booking.doctor")}
          <select name="doctorId" defaultValue={state.values?.doctorId ?? doctors[0].id} className={selectClass}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="doctorId" value={doctors[0].id} />
      )}
      <label className="flex flex-col gap-1.5 text-base font-medium">
        {t("booking.member")}
        <select name="memberId" defaultValue={state.values?.memberId ?? defaultMemberId} className={selectClass}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.memberId ? <span className="text-sm text-destructive">{err(state.fieldErrors.memberId)}</span> : null}
      </label>
      <TextField
        name="when"
        type="datetime-local"
        label={t("booking.when")}
        min={minWhen}
        defaultValue={state.ok ? undefined : state.values?.when}
        error={err(state.fieldErrors?.when)}
        required
      />
      <TextField
        name="reason"
        label={t("booking.reason")}
        placeholder={t("booking.reasonPlaceholder")}
        maxLength={120}
        defaultValue={state.ok ? undefined : state.values?.reason}
      />
      <FormMessage>{err(state.fieldErrors?.doctorId ?? state.error)}</FormMessage>
      {state.ok ? <FormMessage tone="ok">{t("booking.booked", { when: state.values?.when ?? "" })}</FormMessage> : null}
      <Button type="submit" size="xl" disabled={pending}>
        <CalendarPlusIcon aria-hidden />
        {pending ? t("common.wait") : t("booking.book")}
      </Button>
    </form>
  );
}

/** The doctor's answer to a requested call. */
export function BookingResponse({ patientId, bookingId }: { patientId: string; bookingId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const respond = (accept: boolean) =>
    startTransition(async () => void (await respondBookingAction({ patientId, bookingId, accept })));
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button size="touch" variant="destructive" disabled={pending} onClick={() => respond(false)}>
        <XIcon aria-hidden />
        {t("booking.decline")}
      </Button>
      <Button size="touch" className="bg-success text-success-foreground hover:bg-success/90" disabled={pending} onClick={() => respond(true)}>
        <CheckIcon aria-hidden />
        {t("booking.accept")}
      </Button>
    </div>
  );
}

export function CancelBooking({ patientId, bookingId }: { patientId: string; bookingId: string }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="touch"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(async () => void (await cancelBookingAction({ patientId, bookingId })))}
    >
      {t("booking.cancel")}
    </Button>
  );
}

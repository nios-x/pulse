"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { addMedicationsAction, updateMedicationAction } from "@/app/(app)/p/[patientId]/meds/actions";
import { useT } from "@/components/i18n-provider";
import { ChoiceChips } from "@/components/form/choice-chips";
import { FormMessage, TextField } from "@/components/form/text-field";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import { MAX_MED_TIMES, MAX_MEDS_AT_ONCE, type FormState } from "@/lib/validators";

const PRESET_TIMES = ["08:00", "14:00", "20:00"] as const;
const MAX_CUSTOM_TIMES = MAX_MED_TIMES - PRESET_TIMES.length;

type Medication = { id: string; name: string; dose: string; times: string[] };
/** A row in the form. Inputs are uncontrolled; the keys only decide which rows exist. */
type Row = { key: number; defaults?: Medication; customKeys: number[] };

const isPreset = (x: string) => PRESET_TIMES.includes(x as (typeof PRESET_TIMES)[number]);

function firstRow(defaults?: Medication): Row {
  const customCount = defaults ? defaults.times.filter((x) => !isPreset(x)).length : 0;
  return { key: 0, defaults, customKeys: Array.from({ length: Math.max(customCount, 1) }, (_, i) => i + 1) };
}

/** Add one or more medicines, or edit one when `medication` is given. */
export function MedicationForm({
  patientId,
  medication,
  timeLabels,
}: {
  patientId: string;
  medication?: Medication;
  timeLabels: Record<string, string>;
}) {
  const t = useT();
  // The first row has fixed keys (they feed input ids, so server and client agree);
  // rows and times added later count on from 1000, only inside click handlers.
  const nextKey = useRef(1000);
  const newKey = () => nextKey.current++;
  const newRow = (): Row => ({ key: newKey(), customKeys: [newKey()] });

  const [rows, setRows] = useState<Row[]>(() => [firstRow(medication)]);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();
  const err = (key?: MessageKey) => (key ? t(key) : undefined);
  // Edit answers with plain field names; adding many answers with "<row>.<field>".
  const fieldError = (row: number, field: string) =>
    err(state.fieldErrors?.[medication ? field : `${row}.${field}`]);

  const update = (key: number, change: (row: Row) => Row | null) => {
    setState({});
    setRows((rs) => rs.flatMap((r) => (r.key === key ? (change(r) ?? []) : [r])));
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const meds = rows.map(({ key }) => ({
      name: String(data.get(`name-${key}`) ?? ""),
      dose: String(data.get(`dose-${key}`) ?? ""),
      times: [...data.getAll(`times-${key}`), ...data.getAll(`custom-${key}`)].map(String).filter(Boolean),
    }));
    startTransition(async () => {
      const result = medication
        ? await updateMedicationAction({ patientId, medicationId: medication.id, ...meds[0] })
        : await addMedicationsAction({ patientId, meds });
      setState(result);
      // A fresh blank row after adding, so the next medicine starts clean.
      if (result.ok && !medication) setRows([newRow()]);
    });
  }

  const count = Number(state.values?.count ?? 1);
  const many = rows.length > 1;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {rows.map((row, i) => {
        const custom = row.defaults?.times.filter((x) => !isPreset(x)) ?? [];
        const idSuffix = medication ? medication.id : row.key;
        return (
          <fieldset
            key={row.key}
            className={many ? "flex flex-col gap-4 rounded-2xl border border-edge bg-card/60 p-3" : "flex flex-col gap-4"}
          >
            {many ? (
              <div className="flex items-center justify-between gap-2">
                <legend className="font-heading text-base font-semibold text-plum">{t("meds.row", { n: i + 1 })}</legend>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-touch"
                  aria-label={t("meds.removeRow", { n: i + 1 })}
                  onClick={() => update(row.key, () => null)}
                >
                  <XIcon aria-hidden />
                </Button>
              </div>
            ) : null}
            <div className="grid grid-cols-[3fr_2fr] gap-3">
              <TextField
                name={`name-${row.key}`}
                id={`name-${idSuffix}`}
                label={t("meds.name")}
                placeholder="Metformin"
                defaultValue={row.defaults?.name}
                error={fieldError(i, "name")}
                required
              />
              <TextField
                name={`dose-${row.key}`}
                id={`dose-${idSuffix}`}
                label={t("meds.dose")}
                placeholder="500 mg"
                defaultValue={row.defaults?.dose}
                error={fieldError(i, "dose")}
              />
            </div>
            <ChoiceChips
              name={`times-${row.key}`}
              type="checkbox"
              box
              columns={3}
              legend={t("meds.times")}
              defaultValue={row.defaults?.times ?? ["08:00"]}
              chipClassName="justify-center px-2"
              options={PRESET_TIMES.map((time) => ({ value: time, label: timeLabels[time] }))}
            />
            <div className="flex flex-col gap-2">
              {row.customKeys.map((ck, j) => (
                <div key={ck} className="flex items-center gap-2">
                  <label className="flex flex-1 items-center justify-between gap-3 text-base">
                    {t("meds.customTime")}
                    <input
                      type="time"
                      name={`custom-${row.key}`}
                      defaultValue={custom[j]}
                      className="h-12 rounded-lg border border-input bg-card px-3 font-heading font-medium text-plum focus-visible:border-violet focus-visible:ring-4 focus-visible:ring-violet/15 focus-visible:outline-none"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-touch"
                    aria-label={t("meds.removeTime")}
                    onClick={() => update(row.key, (r) => ({ ...r, customKeys: r.customKeys.filter((k) => k !== ck) }))}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </div>
              ))}
              {row.customKeys.length < MAX_CUSTOM_TIMES ? (
                <button
                  type="button"
                  className="action-link flex h-11 w-fit items-center gap-1.5"
                  onClick={() => update(row.key, (r) => ({ ...r, customKeys: [...r.customKeys, newKey()] }))}
                >
                  <PlusIcon className="size-4" aria-hidden />
                  {t("meds.addTime")}
                </button>
              ) : null}
            </div>
            <FormMessage>{fieldError(i, "times")}</FormMessage>
          </fieldset>
        );
      })}

      {!medication && rows.length < MAX_MEDS_AT_ONCE ? (
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full border-dashed"
          onClick={() => {
            setState({});
            setRows((rs) => [...rs, newRow()]);
          }}
        >
          <PlusIcon aria-hidden />
          {t("meds.addAnother")}
        </Button>
      ) : null}

      <FormMessage>{err(state.error ?? state.fieldErrors?.form)}</FormMessage>
      {state.ok ? (
        <FormMessage tone="ok">
          {count > 1 ? t("meds.savedMany", { count }) : t("meds.saved", { name: state.values?.name ?? "" })}
        </FormMessage>
      ) : null}
      <Button type="submit" size="xl" disabled={pending}>
        {pending
          ? t("common.wait")
          : medication
            ? t("common.save")
            : many
              ? t("meds.addMany", { count: rows.length })
              : t("meds.add")}
      </Button>
    </form>
  );
}

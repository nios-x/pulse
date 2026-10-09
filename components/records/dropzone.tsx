"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FileText, ImageUp, X } from "lucide-react";
import { fileSize } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Drag a file in, or click / press Enter to choose one. Shows a preview of what was picked. */
export function Dropzone({
  file,
  onFile,
  accept,
  title = "Drag a file here, or choose one",
  hint = "PDF, JPG, PNG or WebP · up to 8 MB",
  capture,
  error,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
  title?: string;
  hint?: string;
  capture?: boolean;
  error?: string;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (file) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="Preview of the chosen file" className="h-full w-full object-cover" /> : <FileText className="size-8 text-muted-foreground" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{fileSize(file.size)} · will be encrypted</p>
        </div>
        <button type="button" onClick={() => onFile(null)} aria-label="Remove file" className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
          over ? "border-primary bg-accent" : error ? "border-danger-border bg-danger-soft/40" : "border-border-strong bg-surface/60 hover:border-primary/60 hover:bg-accent/40"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ImageUp className="size-6" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold">{over ? "Drop to add" : title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
        <input
          id={id}
          type="file"
          accept={accept}
          capture={capture ? "environment" : undefined}
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      </label>
      {error && <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, XIcon } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

const MAX_EDGE = 1024; // px; plenty for recognising food, small enough for slow networks

/** Draws an image or video frame into a JPEG data URL no larger than MAX_EDGE. */
function toJpeg(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

export async function fileToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return toJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/**
 * Full-screen camera: live preview from the back camera and one big shutter
 * button. Falls back to the phone's own camera/gallery picker when the
 * browser can't open the camera.
 */
export function MealCamera({ onPhoto, onClose }: { onPhoto: (dataUrl: string) => void; onClose: () => void }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop()); // camera light off
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 64) return;
    onPhoto(toJpeg(video, video.videoWidth, video.videoHeight));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t("photo.cameraTitle")} className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-lg">{t("photo.noCamera")}</p>
            <Button size="xl" className="bg-white text-black hover:bg-white/90" onClick={() => fileRef.current?.click()}>
              <ImageIcon aria-hidden />
              {t("photo.choose")}
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            // Some cameras send a tiny first frame; wait for a real picture.
            onLoadedData={(e) => setReady(e.currentTarget.videoWidth >= 64)}
            onResize={(e) => setReady(e.currentTarget.videoWidth >= 64)}
            className="size-full object-cover"
          />
        )}
        <p className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-5 pt-5 pb-8 text-center text-base">
          {t("photo.hint")}
        </p>
      </div>

      <div className="flex items-center justify-between px-8 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.cancel")}
          className="flex size-12 items-center justify-center rounded-full bg-white/15"
        >
          <XIcon className="size-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          aria-label={t("photo.capture")}
          className="size-20 rounded-full border-4 border-white bg-white/90 transition-transform active:scale-95 disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("photo.choose")}
          className="flex size-12 items-center justify-center rounded-full bg-white/15"
        >
          <ImageIcon className="size-6" aria-hidden />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPhoto(await fileToJpeg(file));
        }}
      />
    </div>
  );
}

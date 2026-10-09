"use client";

import { useEffect, useState } from "react";

/** A number that counts up from zero when it appears. Screen readers get the final value straight away. */
export function CountUp({ value, duration = 1100, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const k = instant ? 1 : Math.max(0, Math.min(1, (now - start) / duration));
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay]);

  return (
    <>
      <span aria-hidden="true">{shown.toLocaleString("en-IN")}</span>
      <span className="sr-only">{value.toLocaleString("en-IN")}</span>
    </>
  );
}

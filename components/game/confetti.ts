"use client";

/** A short, light confetti burst in fruit colours. Skipped when the user prefers reduced motion. */
export function celebrate(origin?: { x: number; y: number }) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "60" });
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const css = getComputedStyle(document.documentElement);
  const colors = ["--fruit-orange", "--fruit-berry", "--fruit-lemon", "--fruit-leaf", "--fruit-grape", "--brand"].map((v) => css.getPropertyValue(v).trim() || "#f90");
  const ox = origin?.x ?? innerWidth / 2;
  const oy = origin?.y ?? innerHeight / 3;
  const parts = Array.from({ length: 90 }, () => {
    const a = Math.random() * Math.PI * 2;
    const v = 4 + Math.random() * 7;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: 3 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)], round: Math.random() < 0.5, spin: Math.random() * 6 };
  });
  let frame = 0;
  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - frame / 90);
      ctx.beginPath();
      if (p.round) ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      else ctx.rect(p.x, p.y, p.r * 1.6, p.r * 0.9);
      ctx.fill();
    }
    if (frame < 90) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

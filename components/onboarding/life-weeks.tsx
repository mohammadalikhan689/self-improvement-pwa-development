"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

// Your life as a tapestry of weeks: 52 columns (weeks in a year) by 90 rows (years).
// Lived weeks fill in softly from the top. Drawn on a canvas so 4,680 cells stay cheap.

const COLS = 52;
const ROWS = 90;
const PITCH_X = 6;
const PITCH_Y = 2.2;
const CELL_W = 4.8;
const CELL_H = 1.5;
const WIDTH = COLS * PITCH_X;
const HEIGHT = ROWS * PITCH_Y;

export function weeksLived(dobIso: string, now = new Date()) {
  const dob = new Date(`${dobIso}T00:00:00`);
  const weeks = Math.floor((now.getTime() - dob.getTime()) / (7 * 86400000));
  return Math.max(0, Math.min(weeks, COLS * ROWS));
}

export function LifeWeeks({ dob }: { dob: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const lived = weeksLived(dob);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const styles = getComputedStyle(document.documentElement);
    const track = styles.getPropertyValue("--border").trim() || "#e9e1d5";
    const fill = styles.getPropertyValue("--primary").trim() || "#5B8C6E";
    const amber = styles.getPropertyValue("--amber").trim() || "#E9B44C";

    let frame = 0;
    const start = performance.now();
    const duration = reduce ? 0 : 1400;

    const draw = (progress: number) => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      const filled = Math.floor(lived * progress);
      for (let i = 0; i < COLS * ROWS; i++) {
        const x = (i % COLS) * PITCH_X;
        const y = Math.floor(i / COLS) * PITCH_Y;
        ctx.fillStyle = i === lived ? amber : i < filled ? fill : track;
        ctx.globalAlpha = i < filled ? 0.95 : i === lived ? 1 : 0.7;
        ctx.fillRect(x, y, CELL_W, CELL_H);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      draw(eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lived, reduce]);

  return (
    <canvas
      ref={ref}
      className="ob-weeks"
      style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      role="img"
      aria-label={`${lived.toLocaleString()} weeks lived so far, out of about 4,680 in ninety years`}
    />
  );
}

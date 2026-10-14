"use client";

import { useEffect, useState } from "react";

const SHOW_MS = 1900;
const FADE_MS = 450;

/**
 * Opening animation: four small steps climb up, then the name appears.
 * It covers the app while it loads, then fades away.
 */
export function Splash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const a = window.setTimeout(() => setPhase("fade"), SHOW_MS);
    const b = window.setTimeout(() => setPhase("gone"), SHOW_MS + FADE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`ss-splash${phase === "fade" ? " out" : ""}`} role="status" aria-label="Loading Small Steps">
      <style>{`
        .ss-splash, .ss-splash * { box-sizing: border-box; }
        .ss-splash { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; background: var(--background, #FAF7F2); color: var(--foreground, #1F2937); transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
        .ss-splash::before { content: ""; position: absolute; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(closest-side, rgba(233,180,76,.28), rgba(233,180,76,0)); animation: ss-glow 2.4s ease-in-out both; }
        .ss-splash.out { opacity: 0; transform: scale(1.04); pointer-events: none; }
        .ss-steps { position: relative; display: flex; align-items: flex-end; gap: 10px; height: 96px; }
        .ss-step { width: 22px; border-radius: 8px; background: var(--primary, #5B8C6E); transform-origin: bottom; transform: scaleY(0); opacity: 0; animation: ss-rise .55s cubic-bezier(.2,.9,.3,1.2) forwards; }
        .ss-step:nth-child(1) { height: 28px; animation-delay: .15s; opacity: .55; }
        .ss-step:nth-child(2) { height: 50px; animation-delay: .38s; opacity: .7; }
        .ss-step:nth-child(3) { height: 72px; animation-delay: .61s; opacity: .85; }
        .ss-step:nth-child(4) { height: 96px; animation-delay: .84s; background: linear-gradient(180deg,#f0a855,#dc6f35); }
        .ss-dot { position: absolute; right: -2px; top: -18px; width: 12px; height: 12px; border-radius: 50%; background: #E9B44C; opacity: 0; animation: ss-pop .5s ease 1.35s forwards, ss-bob 1.6s ease-in-out 1.85s infinite; }
        .ss-word { position: relative; text-align: center; opacity: 0; transform: translateY(8px); animation: ss-in .6s ease 1.1s forwards; }
        .ss-word h1 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: 2rem; letter-spacing: -.02em; line-height: 1.1; }
        .ss-word p { margin: 8px 0 0; font-size: .85rem; color: var(--muted-foreground, #786F65); letter-spacing: .04em; }
        @keyframes ss-rise { from { transform: scaleY(0); } to { transform: scaleY(1); opacity: inherit; } }
        @keyframes ss-in { to { opacity: 1; transform: none; } }
        @keyframes ss-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes ss-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes ss-glow { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .ss-step, .ss-word, .ss-dot, .ss-splash::before { animation-duration: .01s; animation-delay: 0s; } .ss-dot { animation: ss-pop .01s forwards; } }
      `}</style>
      <div className="ss-steps" aria-hidden="true">
        <span className="ss-step" />
        <span className="ss-step" />
        <span className="ss-step" />
        <span className="ss-step" />
        <span className="ss-dot" />
      </div>
      <div className="ss-word">
        <h1>Small Steps</h1>
        <p>One honest day at a time</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, LoaderCircle } from "lucide-react";
import { RetellWebClient } from "retell-client-js-sdk";
import { toast } from "sonner";

export function VoiceCoachButton() {
  const clientRef = useRef<RetellWebClient | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "live" | "error">("idle");

  useEffect(() => {
    const client = new RetellWebClient();
    clientRef.current = client;
    const reset = () => setState("idle");
    client.on("call_ended", reset);
    client.on("error", reset);
    return () => {
      client.stopCall();
      client.removeAllListeners();
      clientRef.current = null;
    };
  }, []);

  async function toggleCall() {
    if (state === "live" || state === "connecting") {
      clientRef.current?.stopCall();
      setState("idle");
      return;
    }
    setState("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const response = await fetch("/api/voice/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, tz_offset_minutes: new Date().getTimezoneOffset() }),
      });
      if (!response.ok) throw new Error("Unable to start the voice coach.");
      const call = await response.json();
      const client = clientRef.current;
      if (!client) return;
      client.once("call_started", () => setState("live"));
      client.once("call_ended", () => setState("idle"));
      client.once("error", () => setState("error"));
      await client.startCall({ callId: call.call_id, accessToken: call.access_token, transport: call.transport, iceServers: call.ice_servers });
      setState("live");
    } catch (error) {
      clientRef.current?.stopCall();
      setState("error");
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access is blocked. Allow it in your browser settings, then try again."
        : "The voice coach could not start. Please try again.";
      toast.error(message);
      window.setTimeout(() => setState("idle"), 2500);
    }
  }

  const live = state === "live";
  const label = live ? "Listening" : state === "connecting" ? "Connecting" : state === "error" ? "Try again" : "Talk to coach";
  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-5 z-30 flex flex-col items-end gap-2 sm:right-8">
      {live && <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">Listening</span>}
      <button type="button" onClick={toggleCall} aria-label={label} className="relative grid size-16 place-items-center rounded-full text-white transition-transform active:scale-95" style={{ background: live ? "linear-gradient(135deg,#dc2626,#f87171)" : "linear-gradient(135deg,#dc6f35,#f0a855)", boxShadow: live ? "0 10px 26px rgba(220,38,38,.35)" : "0 10px 26px rgba(220,111,53,.35)" }}>
        {live && <span className="absolute inset-[-7px] rounded-full border-2 border-red-400/50 animate-ping" aria-hidden="true" />}
        {state === "connecting" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : live ? <PhoneOff aria-hidden="true" /> : state === "error" ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
      </button>
    </div>
  );
}

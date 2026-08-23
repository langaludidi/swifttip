"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function extractWorkerToken(raw: string): string | null {
  const value = raw.trim();
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/tip\/([A-Za-z0-9_-]{4,64})\/?$/);
    return match?.[1] ?? null;
  } catch {
    return /^[A-Za-z0-9_-]{4,64}$/.test(value) ? value : null;
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"starting" | "scanning" | "unsupported" | "denied" | "invalid">("starting");

  useEffect(() => {
    let cancelled = false;
    let animationFrame = 0;

    async function start() {
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setState("scanning");

        const detector = new Detector({ formats: ["qr_code"] });
        const scan = async () => {
          if (cancelled) return;
          try {
            const results = await detector.detect(video);
            const raw = results[0]?.rawValue;
            if (raw) {
              const token = extractWorkerToken(raw);
              if (token) {
                stream.getTracks().forEach((track) => track.stop());
                window.location.assign(`/tip/${encodeURIComponent(token)}`);
                return;
              }
              setState("invalid");
            }
          } catch {
            // Camera frames can fail transiently while the stream initialises.
          }
          animationFrame = window.requestAnimationFrame(scan);
        };
        animationFrame = window.requestAnimationFrame(scan);
      } catch {
        setState("denied");
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Scan worker QR</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow" style={{ textAlign: "center" }}>
          <span className="eyebrow">Customer</span>
          <h1>Point your camera at the worker's SwiftTip QR.</h1>
          <p className="lead">The camera is used only in your browser to read the QR. SwiftTip does not need a customer account.</p>
          <div style={{ marginTop: 22, overflow: "hidden", borderRadius: 24, background: "#062f33", aspectRatio: "1 / 1", position: "relative" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div aria-hidden="true" style={{ position: "absolute", inset: "16%", border: "3px solid white", borderRadius: 24, boxShadow: "0 0 0 999px rgba(0,0,0,.18)" }} />
          </div>
          <p className="fee-note" role="status">
            {state === "starting" && "Starting camera…"}
            {state === "scanning" && "Looking for a SwiftTip QR…"}
            {state === "unsupported" && "QR scanning isn't supported by this browser. Enter the worker code instead."}
            {state === "denied" && "Camera access wasn't available. You can still enter the worker code."}
            {state === "invalid" && "That QR isn't a recognised SwiftTip worker QR. Try again or enter the code."}
          </p>
          <Link className="button button-primary button-large" href="/code" style={{ marginTop: 16 }}>Enter worker code instead</Link>
        </section>
      </div>
    </main>
  );
}

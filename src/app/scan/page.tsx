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

  const status = state === "starting" ? "Starting camera…" : state === "scanning" ? "Looking for a SwiftTip QR…" : state === "unsupported" ? "QR scanning is not supported by this browser." : state === "denied" ? "Camera access is unavailable." : "That is not a recognised SwiftTip worker QR.";

  return (
    <main className="flow-shell customer-flow-page">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Scan worker QR</strong><span style={{ width: 42 }} /></header>
        <section className="tip-flow scan-flow">
          <span className="eyebrow">Find the worker</span>
          <h1>Scan their SwiftTip QR.</h1>
          <p className="lead">Point your camera at the worker's QR. You will confirm who you are tipping before choosing an amount.</p>

          <div className="scanner-shell">
            <video ref={videoRef} muted playsInline className="scanner-video" />
            <div className="scanner-dim" aria-hidden="true" />
            <div className="scanner-frame" aria-hidden="true" />
          </div>

          <div className="scanner-status" role="status"><span className="scan-dot" aria-hidden="true"/><span>{status}</span></div>

          {(state === "unsupported" || state === "denied" || state === "invalid") && <div className="state-banner warning" role="alert"><span className="state-icon">!</span><div className="state-copy"><strong>Use the worker code instead</strong><p>The code shown with the worker's SwiftTip QR reaches the same confirmation screen.</p></div></div>}

          <Link className="button button-secondary button-large" href="/code" style={{ marginTop: 16 }}>Enter worker code</Link>
          <p className="scanner-helper">Camera access is used to read the QR in your browser. SwiftTip does not require a customer account.</p>
        </section>
      </div>
    </main>
  );
}

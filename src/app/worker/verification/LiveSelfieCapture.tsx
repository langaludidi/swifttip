"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadLiveSelfie } from "./actions";

export function LiveSelfieCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Start the camera and centre your face in good light.");
  const [pending, startTransition] = useTransition();

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPreview(null);
      setCapturedFile(null);
      setCameraReady(true);
      setMessage("Look directly at the camera, remove sunglasses, and take the selfie.");
    } catch {
      setMessage("Camera access was unavailable. Allow camera access, or use the camera fallback below.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 960;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, 960, 960);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "live-selfie.jpg", { type: "image/jpeg" });
      setCapturedFile(file);
      setPreview(URL.createObjectURL(blob));
      setMessage("Check that your face is clear, then submit this live selfie.");
      stopCamera();
    }, "image/jpeg", 0.86);
  }

  function submit(file: File, method: "browser_camera" | "camera_file_fallback") {
    const data = new FormData();
    data.set("selfie", file);
    data.set("captureMethod", method);
    startTransition(() => void uploadLiveSelfie(data));
  }

  return <div className="selfie-capture">
    <div className="selfie-frame">
      {preview ? <img src={preview} alt="Your captured live selfie"/> : <video ref={videoRef} playsInline muted aria-label="Live front camera preview"/>}
    </div>
    <p className="selfie-help" aria-live="polite">{message}</p>
    <div className="stack-actions">
      {!cameraReady && !preview && <button className="button button-secondary" type="button" onClick={startCamera}>Start front camera</button>}
      {cameraReady && <button className="button button-secondary" type="button" onClick={capture}>Take selfie</button>}
      {preview && capturedFile && <><button className="button button-primary" type="button" disabled={pending} onClick={() => submit(capturedFile, "browser_camera")}>{pending ? "Submitting…" : "Use this live selfie"}</button><button className="compact-link" type="button" disabled={pending} onClick={startCamera}>Retake</button></>}
    </div>
    {!cameraReady && !preview && <details className="selfie-fallback"><summary>Camera not opening?</summary><p>Use your phone camera to take a new selfie now. Do not select an old photo.</p><input type="file" accept="image/jpeg,image/png" capture="user" disabled={pending} onChange={(event) => { const file=event.target.files?.[0]; if(file) submit(file,"camera_file_fallback"); }}/></details>}
  </div>;
}

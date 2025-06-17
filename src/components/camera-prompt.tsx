import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraPrompt({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceValid, setFaceValid] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emoji, setEmoji] = useState("😐");

  const MIN_WIDTH = 280;
  const MIN_HEIGHT = 280;
  const CENTER_TOLERANCE = 80;

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.log(err)
        setError("Could not access camera");
      }
    };

    const loadModels = async () => {
      setLoadingModels(true);
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      setLoadingModels(false);
    };

    loadModels();
    setupCamera();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current || loadingModels) return;

      const detections = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      const ctx = canvasRef.current?.getContext("2d");
      if (canvasRef.current && ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (detections && detections.box && ctx && videoRef.current) {
        const { width, height, x, y } = detections.box;

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        const videoCenterX = videoRef.current.videoWidth / 2;
        const videoCenterY = videoRef.current.videoHeight / 2;

        const isCentered =
          Math.abs(centerX - videoCenterX) < CENTER_TOLERANCE &&
          Math.abs(centerY - videoCenterY) < CENTER_TOLERANCE;

        const isBigEnough = width > MIN_WIDTH && height > MIN_HEIGHT;

        const valid = isCentered && isBigEnough;
        setFaceValid(valid);
        setEmoji(valid ? "✅" : isBigEnough ? "↔️" : "📏");

        if (valid && navigator.vibrate) {
          navigator.vibrate(100);
        }
      } else {
        setFaceValid(false);
        setEmoji("😐");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [loadingModels]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      onCapture(dataUrl);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <video ref={videoRef} style={{ width: 320, height: 240 }} muted playsInline />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
      </div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {loadingModels && <p>Loading face detection...</p>}
      {!loadingModels && (
        <>
          <p style={{ fontSize: "2rem" }}>{emoji}</p>
          <p style={{ color: faceValid ? "green" : "red" }}>
            {faceValid
              ? "Face is ready! You can capture now."
              : "Ensure your face is centered and clearly visible."}
          </p>
          <button onClick={handleCapture} disabled={!faceValid}>
            Capture Photo
          </button>
        </>
      )}
    </div>
  );
}

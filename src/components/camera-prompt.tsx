import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { getFaceMesh } from "@/util/faceValidation";
import { Results } from "@mediapipe/face_mesh";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraPrompt({ onCapture }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceValid, setFaceValid] = useState(false);
  const [isPerfect, setIsPerfect] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showFlash, setShowFlash] = useState(false);
  const isCountingDownRef = useRef(false);
  const hasCapturedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Track the stream
  const lastFaceSeenAtRef = useRef(0);
  const lastDetectAtRef = useRef(0);
  const faceMeshRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureBrightnessCanvas = useCallback(() => {
    if (brightnessCanvasRef.current) return brightnessCanvasRef.current;
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    brightnessCanvasRef.current = canvas;
    return canvas;
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    return canvas.toDataURL("image/jpeg");
  }, []);

  const fileToJpegDataUrl = useCallback(async (file: File) => {
    const maxSide = 1600;
    if (typeof document === "undefined") return null;

    if (typeof createImageBitmap === "function") {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image" as any,
        });
      } catch {
        bitmap = await createImageBitmap(file);
      }

      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return canvas.toDataURL("image/jpeg", 0.92);
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    return dataUrl;
  }, []);

  useEffect(() => {
    isCountingDownRef.current = isCountingDown;
  }, [isCountingDown]);

  // Advanced MediaPipe Mesh drawing
  const drawMediaPipeMesh = useCallback((
    ctx: CanvasRenderingContext2D,
    results: Results,
    isPerfect: boolean
  ) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const landmarks = results.multiFaceLandmarks[0];
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    const themeColor = isPerfect ? "rgba(34, 197, 94, 0.9)" : "rgba(248, 71, 180, 0.9)";
    const themeColorSubtle = isPerfect ? "rgba(34, 197, 94, 0.4)" : "rgba(248, 71, 180, 0.4)";
    const themeColorGlow = isPerfect ? "rgba(34, 197, 94, 0.8)" : "rgba(248, 71, 180, 0.8)";

    // Draw high-tech mesh dots
    ctx.fillStyle = themeColor;
    for (let i = 0; i < landmarks.length; i++) {
      // Only draw key landmarks for a cleaner but still "techy" look
      if (i % 5 === 0) {
        const landmark = landmarks[i];
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw glowing silhouette
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (const lm of landmarks) {
      minX = Math.min(minX, lm.x);
      maxX = Math.max(maxX, lm.x);
      minY = Math.min(minY, lm.y);
      maxY = Math.max(maxY, lm.y);
    }

    const centerX = ((minX + maxX) / 2) * width;
    const centerY = ((minY + maxY) / 2) * height;
    const radiusX = ((maxX - minX) / 2) * width * 1.15;
    const radiusY = ((maxY - minY) / 2) * height * 1.3;

    // Pulse effect for the target
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 4) * 0.05 + 1;
    
    // Draw target brackets
    const bracketSize = 40;
    const bracketGap = 10;
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 3;
    
    // Top Left
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * pulse - bracketGap, centerY - radiusY * pulse + bracketSize);
    ctx.lineTo(centerX - radiusX * pulse - bracketGap, centerY - radiusY * pulse - bracketGap);
    ctx.lineTo(centerX - radiusX * pulse + bracketSize, centerY - radiusY * pulse - bracketGap);
    ctx.stroke();

    // Top Right
    ctx.beginPath();
    ctx.moveTo(centerX + radiusX * pulse + bracketGap, centerY - radiusY * pulse + bracketSize);
    ctx.lineTo(centerX + radiusX * pulse + bracketGap, centerY - radiusY * pulse - bracketGap);
    ctx.lineTo(centerX + radiusX * pulse - bracketSize, centerY - radiusY * pulse - bracketGap);
    ctx.stroke();

    // Bottom Left
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * pulse - bracketGap, centerY + radiusY * pulse - bracketSize);
    ctx.lineTo(centerX - radiusX * pulse - bracketGap, centerY + radiusY * pulse + bracketGap);
    ctx.lineTo(centerX - radiusX * pulse + bracketSize, centerY + radiusY * pulse + bracketGap);
    ctx.stroke();

    // Bottom Right
    ctx.beginPath();
    ctx.moveTo(centerX + radiusX * pulse + bracketGap, centerY + radiusY * pulse - bracketSize);
    ctx.lineTo(centerX + radiusX * pulse + bracketGap, centerY + radiusY * pulse + bracketGap);
    ctx.lineTo(centerX + radiusX * pulse - bracketSize, centerY + radiusY * pulse + bracketGap);
    ctx.stroke();

    // Draw subtle ellipse
    ctx.strokeStyle = themeColorSubtle;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX * pulse, radiusY * pulse, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Add scanning line effect
    const scanPos = (Math.sin(time * 1.5) * 0.5 + 0.5); // 0 to 1
    const scanY = (centerY - radiusY) + (radiusY * 2 * scanPos);
    
    ctx.strokeStyle = themeColorGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const dy = Math.abs(scanY - centerY);
    if (dy < radiusY) {
      const scanWidth = radiusX * Math.sqrt(1 - (dy * dy) / (radiusY * radiusY));
      ctx.moveTo(centerX - scanWidth, scanY);
      ctx.lineTo(centerX + scanWidth, scanY);
      ctx.stroke();
      
      // Add a small glow to the scan line
      ctx.shadowBlur = 10;
      ctx.shadowColor = themeColorGlow;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    setIsCountingDown(false);
    setIsPerfect(false);
    setCountdown(3);
    if (countdownRef.current) {
      cancelAnimationFrame(countdownRef.current);
    }
    setTips(["Hold still and meet the checks to start the countdown again"]);
  }, []);

  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setCountdown(3);

    let lastTime = performance.now();

    const animate = (now: number) => {
      if (now - lastTime >= 1000) {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Flash effect start
            setShowFlash(true);
            
            const image = captureFrame();
            if (image) setCapturedImage(image);
            setIsCountingDown(false);
            hasCapturedRef.current = true;
            stopCamera();

            // Clear flash after a brief moment
            setTimeout(() => setShowFlash(false), 300);
            
            return 3;
          }
          return prev - 1;
        });
        lastTime = now;
      }
      countdownRef.current = requestAnimationFrame(animate);
    };
    countdownRef.current = requestAnimationFrame(animate);
  }, [captureFrame, stopCamera]);


  const analyze = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.readyState < 2 || !canvas) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    const now = performance.now();
    if (now - lastDetectAtRef.current < 60) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }
    lastDetectAtRef.current = now;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    try {
      if (!faceMeshRef.current) {
        faceMeshRef.current = await getFaceMesh();
      }
      
      const faceMesh = faceMeshRef.current;
      
      const results = await new Promise<Results>((resolve) => {
        faceMesh.onResults((res: Results) => resolve(res));
        faceMesh.send({ image: video });
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        lastFaceSeenAtRef.current = now;
        const landmarks = results.multiFaceLandmarks[0];

        const feedback: string[] = [];

        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        for (const lm of landmarks) {
          minX = Math.min(minX, lm.x);
          maxX = Math.max(maxX, lm.x);
          minY = Math.min(minY, lm.y);
          maxY = Math.max(maxY, lm.y);
        }

        const boxWidth = (maxX - minX) * canvas.width;
        const boxHeight = (maxY - minY) * canvas.height;
        const centerX = ((minX + maxX) / 2) * canvas.width;

        const isCentered = Math.abs(centerX - canvas.width / 2) < canvas.width * 0.15;
        const isBigEnough = boxWidth > canvas.width * 0.3 && boxHeight > canvas.height * 0.4;
        const isTooClose = boxWidth > canvas.width * 0.9;
        const isFullyInside = minX > 0 && maxX < 1 && minY > 0 && maxY < 1;

        const bCanvas = ensureBrightnessCanvas();
        let lighting = true;
        if (bCanvas) {
          bCanvas.width = 40;
          bCanvas.height = 40;
          const bCtx = bCanvas.getContext("2d");
          if (bCtx) {
            bCtx.drawImage(video, 0, 0, 40, 40);
            const bData = bCtx.getImageData(0, 0, 40, 40).data;
            let sum = 0;
            for (let i = 0; i < bData.length; i += 4) {
              sum += (bData[i] + bData[i + 1] + bData[i + 2]) / 3;
            }
            const avg = sum / (40 * 40);
            lighting = avg > 40 && avg < 250;
          }
        }

        if (!lighting) feedback.push("Improve your lighting");
        if (!isCentered) feedback.push("Center your face");
        if (!isBigEnough) feedback.push("Move closer");
        if (isTooClose) feedback.push("Move back a bit");
        if (!isFullyInside) feedback.push("Keep face inside frame");

        if (feedback.length === 0) feedback.push("✨ Perfect! Keep still...");
        setTips(feedback);

        const perfect = feedback.length === 1 && feedback[0] === "✨ Perfect! Keep still...";
        setIsPerfect(perfect);
        setFaceValid(true); 

        drawMediaPipeMesh(ctx, results, perfect);

        if (perfect && !isCountingDownRef.current) {
          startCountdown();
        } else if (!perfect && isCountingDownRef.current) {
          cancelCountdown();
        }
      } else {
        const graceMs = 1500;
        if (now - lastFaceSeenAtRef.current > graceMs) {
          setFaceValid(false);
          setIsPerfect(false);
          setTips(["Position your face in the frame"]);
          if (isCountingDownRef.current) cancelCountdown();
        }
      }
    } catch (err) {
      console.error("MediaPipe error:", err);
    }

    if (!hasCapturedRef.current) {
      animationRef.current = requestAnimationFrame(analyze);
    }
  }, [
    cancelCountdown,
    drawMediaPipeMesh,
    ensureBrightnessCanvas,
    startCountdown,
  ]);

  const startCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setTips(["Camera isn’t available on this device/browser. Use Upload instead."]);
      return;
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.srcObject = stream;
    await new Promise((resolve) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
    });

    try {
      await video.play();
    } catch {
      setTips([
        "Tap anywhere on the screen, then try again.",
        "If it still won’t start, use Upload instead.",
      ]);
      return;
    }

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      analyze();
    }
  }, [analyze]);

  useEffect(() => {
    const start = async () => {
      try {
        await startCamera();
      } catch {
        setTips([
          "We couldn’t access your camera.",
          "Allow camera permission, then refresh this page.",
        ]);
      }
    };

    start();

    return () => {
      stopCamera();
      if (countdownRef.current) cancelAnimationFrame(countdownRef.current);
    };
  }, [startCamera, stopCamera]);

  const handleTakePhoto = () => {
    if (hasCapturedRef.current) return;
    if (!faceValid || isCountingDownRef.current) return;
    setTips(["Hold still — capturing"]);
    startCountdown();
  };

  const handleRetake = async () => {
    hasCapturedRef.current = false;
    setCapturedImage(null);
    setIsCountingDown(false);
    setCountdown(3);
    setFaceValid(false);
    setIsPerfect(false);
    setTips(["Get ready — tap Take photo when the checks show Ready"]);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      await startCamera();
    } catch {
      setTips([
        "We couldn’t access your camera.",
        "Allow camera permission, then refresh this page.",
      ]);
    }
  };

  const handleUploadInstead = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    stopCamera();
    hasCapturedRef.current = true;
    setIsCountingDown(false);
    setIsPerfect(false);
    setCountdown(3);

    try {
      const dataUrl = await fileToJpegDataUrl(file);
      if (!dataUrl) {
        setTips(["Couldn’t read that photo. Please try another one."]);
        hasCapturedRef.current = false;
        await startCamera();
        return;
      }
      setCapturedImage(dataUrl);
      setTips(["Photo ready — continue when you’re happy"]);
    } catch {
      setTips(["Couldn’t read that photo. Please try another one."]);
      hasCapturedRef.current = false;
      await startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-pink-100 to-rose-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{ backgroundColor: "#f847b4" }}
        ></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"
          style={{ backgroundColor: "#ffd9f0" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"
          style={{ backgroundColor: "#f847b4" }}
        ></div>
      </div>

      <div className="text-center mb-8 z-10">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/bb-logo.png"
            alt="BH Logo"
            width={100}
            height={100}
            className="cursor-pointer"
            onClick={() => router.push("/")}
          />
        </div>
      </div>

      <div className="text-center z-10 mb-10">
        <div className="text-pink-900 font-semibold text-lg">
          Face Scan
        </div>
        <div className="text-pink-900/70 text-sm">
          Good light, face centered, eyes visible — then tap Take photo
        </div>
      </div>

      <div
        className={`w-full max-w-[380px] z-10 mb-6 rounded-2xl border backdrop-blur-sm shadow-lg px-5 py-4 h-[140px] flex flex-col transition-colors duration-300 ${
          isPerfect
            ? "bg-green-50/80 border-green-400/60"
            : faceValid
            ? "bg-white/80 border-pink-400/60"
            : "bg-white/70 border-pink-300/50"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-pink-900">
            Live tips
          </div>
          <div
            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors duration-300 ${
              isPerfect
                ? "bg-green-500 text-white"
                : faceValid
                ? "bg-pink-500 text-white"
                : "bg-pink-100 text-pink-800"
            }`}
          >
            {isPerfect ? "Perfect" : faceValid ? "Ready" : "Adjusting"}
          </div>
        </div>
        <div className="text-sm text-pink-900/80 space-y-1 flex-1 overflow-hidden">
          {tips.length > 0 ? (
            tips.slice(0, 3).map((t) => (
              <div key={t} className="leading-snug">
                {t}
              </div>
            ))
          ) : (
            <div className="leading-snug">
              Get ready — we’ll guide you in real time
            </div>
          )}
        </div>
      </div>

      {/* Camera viewport */}
      <div className="relative z-10">
        <div className="relative w-[350px] h-[450px] bg-gradient-to-br from-pink-900/80 to-pink-800/80 rounded-3xl p-4 shadow-2xl border border-pink-700/50 backdrop-blur-sm">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
            {!capturedImage && (
              <>
                <video
                  ref={videoRef}
                  className="absolute w-full h-full object-cover transform -scale-x-100"
                  autoPlay
                  playsInline
                  muted
                />

                <canvas
                  ref={canvasRef}
                  className="absolute w-full h-full transform -scale-x-100"
                />
              </>
            )}
            {capturedImage && (
              <div className="relative w-full h-full">
                <Image
                  src={capturedImage}
                  alt="Captured"
                  fill
                  sizes="350px"
                  unoptimized
                  className="object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
              </div>
            )}
            {!capturedImage &&
              !hasCapturedRef.current &&
              !isCountingDown && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
                  <button
                    onClick={handleTakePhoto}
                    disabled={!faceValid}
                    className={`group px-8 py-4 rounded-2xl font-semibold shadow-xl transition-all duration-300 border backdrop-blur-sm ${
                      faceValid
                        ? "bg-pink-500 hover:bg-pink-600 text-white hover:scale-105 border-pink-600/50"
                        : "bg-white/30 text-white/70 border-white/20 cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{faceValid ? "📸 Take photo" : "Get ready"}</span>
                    </span>
                  </button>
                </div>
              )}

            {!capturedImage && !isCountingDown && (
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={handleUploadInstead}
                  className="px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-xl text-sm font-semibold border border-white/20 backdrop-blur-sm"
                >
                  Upload instead
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            {/* Action buttons - Now as overlay */}
            {capturedImage && !isCountingDown && (
              <div className="absolute bottom-4 left-4 right-4 flex gap-3 z-20">
                <button
                  onClick={() => onCapture(capturedImage)}
                  className="group relative flex-1 px-6 py-3 bg-gradient-to-r text-white rounded-xl font-semibold shadow-xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #f847b4, #ec4899)",
                    boxShadow: "0 10px 15px -3px rgba(248, 71, 180, 0.4)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #ec4899, #f847b4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(135deg, #f847b4, #ec4899)";
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    <span>Continue</span>
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </span>
                </button>
                <button
                  onClick={handleRetake}
                  className="group px-6 py-3 bg-black/60 hover:bg-black/80 text-white rounded-xl font-semibold shadow-xl transition-all duration-300 hover:scale-105 border border-white/20 backdrop-blur-sm"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg
                      className="w-4 h-4 group-hover:rotate-12 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Retake</span>
                  </span>
                </button>
              </div>
            )}

            {/* Countdown overlay */}
            {isCountingDown && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-30">
                <div className="relative flex items-center justify-center">
                  {/* Circular progress background */}
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="white"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={552.92}
                      strokeDashoffset={552.92 * (countdown / 3)}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute text-8xl font-bold text-white drop-shadow-2xl">
                    {countdown}
                  </div>
                </div>
                <div className="mt-8 px-6 py-2 bg-pink-500 text-white rounded-full font-bold animate-pulse shadow-lg">
                  {countdown === 3 ? "Get ready..." : countdown === 2 ? "Hold still..." : "Capturing!"}
                </div>
              </div>
            )}

            {/* Flash effect overlay */}
            {showFlash && (
              <div className="absolute inset-0 bg-white z-50 animate-flash" />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes flash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

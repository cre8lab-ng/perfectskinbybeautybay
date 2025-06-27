import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Image from "next/image";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraPrompt({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [lightingOK, setLightingOK] = useState(false);
  const [facePositionOK, setFacePositionOK] = useState(false);
  const [straightOK, setStraightOK] = useState(false);
  const [faceValid, setFaceValid] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const hasCapturedRef = useRef(false);
  const countdownRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Track the stream
  console.log(captureFailed, faceValid);
  const [eyesDetected, setEyesDetected] = useState(false);

  // Function to stop camera completely
  const stopCamera = () => {
    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const analyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.readyState < 2 || !canvas) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result) {
      const dims = faceapi.matchDimensions(canvas, video, true);
      const resized = faceapi.resizeResults(result, dims);
      faceapi.draw.drawFaceLandmarks(canvas, resized);

      const box = result.detection.box;
      const landmarks = result.landmarks;

      const faceCanvasW = canvas.width;
      const faceCanvasH = canvas.height;

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const isBigEnough =
        box.width > 0.5 * faceCanvasW && box.height > 0.5 * faceCanvasH;
      const isTooClose =
        box.width > 0.85 * faceCanvasW || box.height > 0.85 * faceCanvasH;
      const isFullyInside =
        box.x > 10 &&
        box.y > 10 &&
        box.x + box.width < faceCanvasW - 10 &&
        box.y + box.height < faceCanvasH - 10;

      const isCentered =
        Math.abs(centerX - faceCanvasW / 2) < 50 &&
        Math.abs(centerY - faceCanvasH / 2) < 50;

      const hasMargin =
        box.x > faceCanvasW * 0.1 &&
        box.y > faceCanvasH * 0.1 &&
        box.x + box.width < faceCanvasW * 0.9 &&
        box.y + box.height < faceCanvasH * 0.9;

      const brightness = getAverageBrightness(ctx, box);
      const lighting = brightness > 80;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      
      const areEyesVisible = leftEye.length > 0 && rightEye.length > 0;
      setEyesDetected(areEyesVisible);
      
      const straight = areEyesVisible && isLookingStraight(landmarks);
      
      const isValid =
        lighting &&
        straight &&
        isFullyInside &&
        isBigEnough &&
        isCentered &&
        hasMargin &&
        !isTooClose;

      const feedback: string[] = [];
      if (!lighting) feedback.push("💡 Improve lighting on your face");
      if (!straight) feedback.push("🧍 Look straight into the camera");
      if (!(isCentered && isBigEnough)) feedback.push("🎯 Center your face");
      if (!hasMargin) feedback.push("↔️ Add more space around your face");
      if (isTooClose) feedback.push("↪️ Move back a little");
      if (!isFullyInside)
        feedback.push("🎯 Keep your full face within the frame");
      if (feedback.length === 0) feedback.push("✅ Ready. Hold still...");
      if (!areEyesVisible) feedback.push("👁️ Make sure both eyes are visible");

      setTips(feedback);
      setLightingOK(lighting);
      setStraightOK(straight);
      setFacePositionOK(
        isCentered && isFullyInside && isBigEnough && !isTooClose
      );
      setFaceValid(isValid);

      if (isValid && !isCountingDown) {
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = video.videoWidth;
        tmpCanvas.height = video.videoHeight;
        const tmpCtx = tmpCanvas.getContext("2d");
        if (tmpCtx) {
          tmpCtx.drawImage(video, 0, 0);
          const image = tmpCanvas.toDataURL("image/jpeg");
          setCapturedImage(image);
          
          // Set all checks to green and stop camera before countdown
          setLightingOK(true);
          setStraightOK(true);
          setFacePositionOK(true);
          setFaceValid(true);
          stopCamera();
          
          startCountdown(image);
        }
      } else if (!isValid && isCountingDown) {
        cancelCountdown();
      }
    } else {
      setFaceValid(false);
      setLightingOK(false);
      setFacePositionOK(false);
      setStraightOK(false);
      setTips(["❌ No face detected"]);
    }

    // Only continue animation if we haven't captured yet
    if (!capturedImage && !hasCapturedRef.current) {
      animationRef.current = requestAnimationFrame(analyze);
    }
  };
  
  useEffect(() => {
    const loadModelsAndStart = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });

        // Store stream reference
        streamRef.current = stream;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
          console.error("Video or canvas element not found");
          return;
        }

        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        analyze();
      } catch (error) {
        console.error("Failed to initialize camera:", error);
        setTips(["❌ Failed to access camera. Please check permissions."]);
      }
    };

    loadModelsAndStart();

    return () => {
      stopCamera();
    };
  }, [isCountingDown]);

  const handleRetake = async () => {
    hasCapturedRef.current = false;
    setCapturedImage(null);
    setCountdown(3);
    setIsCountingDown(false);
    setCaptureFailed(false);
    setTips(["📸 Reinitializing camera..."]);
  
    // Stop existing camera
    stopCamera();
  
    // Wait and restart camera
    setTimeout(async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });

        // Store new stream reference
        streamRef.current = newStream;
  
        const video = videoRef.current;
        const canvas = canvasRef.current;
  
        if (!video || !canvas) {
          console.error("Video or canvas element not found during retake");
          setTips(["❌ Failed to restart camera - elements not found"]);
          return;
        }
  
        video.srcObject = newStream;
        await video.play();
  
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
  
        setTips(["✅ Camera ready. Hold still..."]);
        analyze();
      } catch (err) {
        console.error("Failed to restart camera:", err);
        setTips(["❌ Failed to restart camera"]);
      }
    }, 300);
  };

  const startCountdown = (image: string) => {
    console.log(image, tips);
    setIsCountingDown(true);
    setCountdown(3);
    
    let lastTime = performance.now();
    
    const animate = (now: number) => {
      if (now - lastTime >= 1000) {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsCountingDown(false);
            hasCapturedRef.current = true;
            return 3;
          }
          return prev - 1;
        });
        lastTime = now;
      }
      countdownRef.current = requestAnimationFrame(animate);
    };
    countdownRef.current = requestAnimationFrame(animate);
  };

  const cancelCountdown = () => {
    setIsCountingDown(false);
    setCountdown(3);
    if (countdownRef.current) {
      cancelAnimationFrame(countdownRef.current);
    }
    setTips(["⚠️ Hold still and meet all conditions to capture."]);
  };

  const getAverageBrightness = (ctx: CanvasRenderingContext2D, box: any) => {
    const data = ctx.getImageData(box.x, box.y, box.width, box.height).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4)
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    return total / (data.length / 4);
  };

  const isLookingStraight = (landmarks: faceapi.FaceLandmarks68) => {
    const left = landmarks.getLeftEye()[0];
    const right = landmarks.getRightEye()[3];
    const nose = landmarks.getNose()[3];
    const symmetry = Math.abs(nose.x - left.x - (right.x - nose.x));
    return symmetry < 5;
  };

  const handleForceCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const image = canvas.toDataURL("image/jpeg");

    setLightingOK(true);
    setStraightOK(true);
    setFacePositionOK(true);
    setFaceValid(true);
    setTips(["✅ Force captured for testing purposes"]);

    setCapturedImage(image);
    
    // Stop camera before starting countdown
    stopCamera();
    startCountdown(image);
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
            src="/images/bh-logo.png"
            alt="BH Logo"
            width={100}
            height={100}
          />
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap gap-3 mb-8 z-10">
        <StatusBox label="LIGHTING" active={lightingOK} icon="💡" />
        <StatusBox label="POSITION" active={facePositionOK} icon="🎯" />
        <StatusBox label="ALIGNMENT" active={straightOK} icon="👁️" />
      </div>

      {/* Camera viewport */}
      <div className="relative z-10">
        <div className="relative w-[350px] h-[450px] bg-gradient-to-br from-pink-900/80 to-pink-800/80 rounded-3xl p-4 shadow-2xl border border-pink-700/50 backdrop-blur-sm">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
            {!capturedImage && (
              <>
                <video
                  ref={videoRef}
                  className="absolute w-full h-full object-cover transform scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute w-full h-full transform scale-x-[-1]"
                />
              </>
            )}

            {capturedImage && (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  className="w-full h-full object-cover rounded-2xl"
                  alt="Captured"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
              </div>
            )}

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
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                <div className="text-8xl font-bold text-white animate-bounce drop-shadow-2xl">
                  {countdown}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!capturedImage && !isCountingDown && eyesDetected && (
        <button
          onClick={handleForceCapture}
          className="group mt-8 px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-semibold shadow-xl transition-all duration-300 hover:scale-105 border border-pink-600/50 z-20"
        >
          <span className="flex items-center space-x-2">
            <span>📸 Capture</span>
          </span>
        </button>
      )}

      <style jsx>{`
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

function StatusBox({
  label,
  active,
  icon,
}: {
  label: string;
  active: boolean;
  icon: string;
}) {
  return (
    <div
      className={`group relative p-1 rounded-xl font-semibold text-sm transition-all duration-300 backdrop-blur-sm border ${
        active
          ? "border-pink-400/50 text-pink-700 shadow-lg"
          : "bg-white/60 border-pink-300/50 text-gray-600"
      }`}
      style={
        active
          ? {
              backgroundColor: "rgba(248, 71, 180, 0.2)",
              boxShadow: "0 10px 15px -3px rgba(248, 71, 180, 0.2)",
            }
          : {}
      }
    >
      <div className="flex items-center space-x-2">
        <span
          className={`text-lg transition-transform duration-300 ${
            active ? "animate-bounce" : ""
          }`}
        >
          {active ? "✓" : icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>

      {active && (
        <div
          className="absolute inset-0 rounded-xl animate-pulse"
          style={{ backgroundColor: "rgba(248, 71, 180, 0.2)" }}
        ></div>
      )}
    </div>
  );
}
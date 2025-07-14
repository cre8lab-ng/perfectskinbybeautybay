import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Image from "next/image";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraPrompt({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const streamRef = useRef<MediaStream | null>(null);
  const [eyesDetected, setEyesDetected] = useState(false);
  const [showCaptureButton, setShowCaptureButton] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false); // Add this state

  console.log(faceValid)

  useEffect(() => {
    if (!hasCapturedRef.current && isVideoReady) { // Only start timer when video is ready
      const timeout = setTimeout(() => {
        setShowCaptureButton(true);
      }, 8000);

      return () => clearTimeout(timeout);
    }
  }, [isVideoReady]); // Add isVideoReady as dependency

  const drawOvalFaceMesh = (ctx, landmarks, faceBox) => {
    if (!landmarks || !faceBox) return;

    let centerX, centerY, radiusX, radiusY;

    if (landmarks && landmarks.positions) {
      const landmarkPoints = landmarks.positions;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      landmarkPoints.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });

      const landmarkWidth = maxX - minX;
      const landmarkHeight = maxY - minY;

      centerX = minX + landmarkWidth / 2;
      centerY = minY + landmarkHeight / 2;

      radiusX = (landmarkWidth / 2) * 1.4;
      radiusY = (landmarkHeight / 2) * 1.6;

      console.log("Using landmark bounds:", {
        landmarkWidth,
        landmarkHeight,
        detectionWidth: faceBox.width,
        detectionHeight: faceBox.height,
        finalRadiusX: radiusX,
        finalRadiusY: radiusY,
      });
    } else {
      centerX = faceBox.x + faceBox.width / 2;
      centerY = faceBox.y + faceBox.height / 2;
      radiusX = (faceBox.width / 2) * 1.8;
      radiusY = (faceBox.height / 2) * 1.8;

      console.log("Using detection box fallback");
    }

    const canvas = ctx.canvas;
    const minRadius = Math.min(canvas.width, canvas.height) * 0.15;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.45;

    radiusX = Math.max(minRadius, Math.min(maxRadius, radiusX));
    radiusY = Math.max(minRadius, Math.min(maxRadius, radiusY));

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;

    const faceArea = radiusX * radiusY;
    const horizontalLines = Math.max(
      10,
      Math.min(20, Math.floor(faceArea / 1000))
    );
    const verticalLines = Math.max(
      8,
      Math.min(16, Math.floor(faceArea / 1200))
    );

    for (let i = 0; i <= horizontalLines; i++) {
      const t = i / horizontalLines;
      const y = centerY - radiusY + 2 * radiusY * t;

      const distanceFromCenter = Math.abs(y - centerY);
      const normalizedDistance = distanceFromCenter / radiusY;

      if (normalizedDistance <= 1) {
        const widthAtHeight =
          radiusX * Math.sqrt(1 - normalizedDistance * normalizedDistance);

        ctx.beginPath();
        ctx.moveTo(centerX - widthAtHeight, y);

        const segments = 20;
        for (let j = 0; j <= segments; j++) {
          const segmentT = j / segments;
          const x = centerX - widthAtHeight + 2 * widthAtHeight * segmentT;

          const curve = Math.sin(segmentT * Math.PI) * 2;
          ctx.lineTo(x, y + curve);
        }
        ctx.stroke();
      }
    }

    for (let i = 0; i <= verticalLines; i++) {
      const t = i / verticalLines;
      const angle = -Math.PI / 2 + Math.PI * t;

      ctx.beginPath();

      const segments = 25;
      for (let j = 0; j <= segments; j++) {
        const segmentT = j / segments;
        const currentAngle = -Math.PI / 2 + Math.PI * segmentT;

        let x =
          centerX +
          radiusX * Math.cos(angle) * Math.sin(currentAngle + Math.PI / 2);
        const y = centerY + radiusY * Math.sin(currentAngle);

        const faceAdjustment = Math.sin(currentAngle + Math.PI / 2) * 0.85;
        x = centerX + radiusX * Math.cos(angle) * faceAdjustment;

        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    drawFacialFeatureGuides(ctx, centerX, centerY, radiusX, radiusY);

    ctx.globalAlpha = 1;
  };

  const drawFacialFeatureGuides = (ctx, centerX, centerY, radiusX, radiusY) => {
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1;

    const eyeY = centerY - radiusY * 0.2;
    const eyeSpacing = radiusX * 0.3;

    ctx.beginPath();
    ctx.ellipse(
      centerX - eyeSpacing,
      eyeY,
      radiusX * 0.15,
      radiusY * 0.08,
      0,
      0,
      2 * Math.PI
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      centerX + eyeSpacing,
      eyeY,
      radiusX * 0.15,
      radiusY * 0.08,
      0,
      0,
      2 * Math.PI
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radiusY * 0.1);
    ctx.lineTo(centerX, centerY + radiusY * 0.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 0.05, centerY);
    ctx.quadraticCurveTo(
      centerX,
      centerY + radiusY * 0.05,
      centerX + radiusX * 0.05,
      centerY
    );
    ctx.stroke();

    const mouthY = centerY + radiusY * 0.3;
    ctx.beginPath();
    ctx.ellipse(centerX, mouthY, radiusX * 0.2, radiusY * 0.06, 0, 0, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 0.8, centerY + radiusY * 0.6);
    ctx.quadraticCurveTo(
      centerX,
      centerY + radiusY * 0.9,
      centerX + radiusX * 0.8,
      centerY + radiusY * 0.6
    );
    ctx.stroke();
  };

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const analyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isVideoReady) { // Check isVideoReady
      if (!capturedImage && !hasCapturedRef.current) {
        animationRef.current = requestAnimationFrame(analyze);
      }
      return;
    }

    // Enhanced video readiness check
    if (video.readyState < 3 || video.videoWidth === 0 || video.videoHeight === 0) {
      if (!capturedImage && !hasCapturedRef.current) {
        animationRef.current = requestAnimationFrame(analyze);
      }
      return;
    }

    // Only update canvas dimensions if they don't match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (!capturedImage && !hasCapturedRef.current) {
        animationRef.current = requestAnimationFrame(analyze);
      }
      return;
    }

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result) {
        const videoHasValidDimensions = video.videoWidth > 0 && video.videoHeight > 0;
        const canvasHasValidDimensions = canvas.width > 0 && canvas.height > 0;

        if (!videoHasValidDimensions || !canvasHasValidDimensions) {
          console.warn("Invalid dimensions detected:", {
            video: { width: video.videoWidth, height: video.videoHeight },
            canvas: { width: canvas.width, height: canvas.height },
          });
          if (!capturedImage && !hasCapturedRef.current) {
            animationRef.current = requestAnimationFrame(analyze);
          }
          return;
        }

        const dims = faceapi.matchDimensions(canvas, video, true);

        if (dims.width === 0 || dims.height === 0) {
          console.warn("matchDimensions returned invalid dimensions:", dims);
          if (!capturedImage && !hasCapturedRef.current) {
            animationRef.current = requestAnimationFrame(analyze);
          }
          return;
        }

        const resized = faceapi.resizeResults(result, dims);
        const box = result.detection.box;

        drawOvalFaceMesh(ctx, resized.landmarks, box);

        const landmarks = result.landmarks;
        const faceCanvasW = canvas.width;
        const faceCanvasH = canvas.height;

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        const isCentered =
          Math.abs(centerX - faceCanvasW / 2) < 15 &&
          Math.abs(centerY - faceCanvasH / 2) < 30;

        const isBigEnough =
          box.width > 0.35 * faceCanvasW &&
          box.height > 0.45 * faceCanvasH;

        const isTooClose =
          box.width > 0.9 * faceCanvasW ||
          box.height > 0.9 * faceCanvasH;

        const isFullyInside =
          box.x > 30 &&
          box.y > 30 &&
          box.x + box.width < faceCanvasW - 30 &&
          box.y + box.height < faceCanvasH - 30;

        const hasMargin =
          box.x > faceCanvasW * 0.1 &&
          box.y > faceCanvasH * 0.1 &&
          box.x + box.width < faceCanvasW * 0.9 &&
          box.y + box.height < faceCanvasH * 0.9;

        const getGlobalBrightness = (ctx: CanvasRenderingContext2D) => {
          const { width, height } = ctx.canvas;
          const data = ctx.getImageData(0, 0, width, height).data;
          let total = 0;
          for (let i = 0; i < data.length; i += 4) {
            total += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          return total / (data.length / 4);
        };

        const brightness = getGlobalBrightness(ctx);
        const lighting = brightness >= 3;

        console.log(brightness, "bright");
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
    } catch (error) {
      console.error("Face detection error:", error);
      setTips(["⚠️ Face detection temporarily unavailable"]);
    }

    if (!capturedImage && !hasCapturedRef.current) {
      animationRef.current = requestAnimationFrame(analyze);
    }
  };

  useEffect(() => {
    const loadModelsAndStart = async () => {
      try {
        setTips(["🔄 Loading face detection models..."]);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
        ]);

        setTips(["📹 Starting camera..."]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user", 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          },
          audio: false,
        });

        streamRef.current = stream;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
          console.error("Video or canvas element not found");
          setTips(["❌ Failed to initialize camera elements"]);
          return;
        }

        video.srcObject = stream;

        // Wait for video to be completely ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Video load timeout"));
          }, 10000);

          const handleLoadedData = () => {
            clearTimeout(timeout);
            resolve(null);
          };

          video.addEventListener("loadeddata", handleLoadedData, { once: true });
        });

        await video.play();

        // Wait for first frame to be available
        await new Promise((resolve) => {
          const checkFrame = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              resolve(null);
            } else {
              setTimeout(checkFrame, 50);
            }
          };
          checkFrame();
        });

        // Set canvas dimensions after video is fully ready
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        console.log("Video and canvas ready:", {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });

        setTips(["✅ Camera ready. Position your face..."]);
        setIsVideoReady(true); // Mark video as ready

        // Small delay to ensure everything is stable
        setTimeout(() => {
          analyze();
        }, 100);

      } catch (error) {
        console.error("Failed to initialize camera:", error);
        setTips(["❌ Failed to access camera. Please check permissions."]);
      }
    };

    loadModelsAndStart();

    return () => {
      setIsVideoReady(false);
      stopCamera();
    };
  }, []);

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

    stopCamera();
    startCountdown(image);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-pink-100 to-rose-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
        <div className="flex justify-center">
          <Image
            src="/images/bh-logo.png"
            alt="BH Logo"
            width={100}
            height={100}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8 z-10">
        <StatusBox label="LIGHTING" active={lightingOK} icon="💡" />
        <StatusBox label="POSITION" active={facePositionOK} icon="🎯" />
        <StatusBox label="ALIGNMENT" active={straightOK} icon="👁️" />
      </div>

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

            {!capturedImage && showCaptureButton && !hasCapturedRef.current && !isCountingDown && eyesDetected && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
                <button
                  onClick={handleForceCapture}
                  className="group px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-semibold shadow-xl transition-all duration-300 hover:scale-105 border border-pink-600/50 backdrop-blur-sm"
                >
                  <span className="flex items-center space-x-2">
                    <span>📸 Capture</span>
                  </span>
                </button>
              </div>
            )}

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
                  onClick={() => window.location.reload()}
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

      {/* Tips display */}
      <div className="mt-6 max-w-md text-center z-10">
        {tips.map((tip, index) => (
          <div key={index} className="text-pink-700 font-medium mb-2">
            {tip}
          </div>
        ))}
      </div>

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

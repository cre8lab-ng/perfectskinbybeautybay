import { useEffect, useRef, useState } from "react";
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
  console.log(faceValid);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const hasCapturedRef = useRef(false);
  const MARGIN_RATIO = 0.06;
  const cameraRef = useRef<any>(null);
  const faceMeshInstanceRef = useRef<any>(null);

  useEffect(() => {
    let camera: any;
  
    const loadMediaPipe = async () => {
      // ✅ Prevent reinitialization
      if (faceMeshInstanceRef.current) return;
  
      // ✅ Load scripts once
      if (!(window as any).FaceMesh)
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        );
      if (!(window as any).Camera)
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        );
  
      // ✅ Initialize FaceMesh only once
      const faceMesh = new (window as any).FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
  
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
  
      let validationStableFor = 0;
      let lastValid = false;
      let countdownStarted = false;
      
      faceMesh.onResults((results: any) => {
        if (!canvasRef.current || !videoRef.current) return;
      
        const ctx = canvasRef.current.getContext("2d")!;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
        if (results.multiFaceLandmarks?.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
      
          const faceBox = getBoundingBox(landmarks);
          const faceCanvasW = canvasRef.current.width;
          const faceCanvasH = canvasRef.current.height;
      
          const isBigEnough =
            faceBox.width > 0.45 * faceCanvasW && faceBox.height > 0.45 * faceCanvasH;
          const isTooClose =
            faceBox.width > 0.85 * faceCanvasW || faceBox.height > 0.85 * faceCanvasH;
          const isFullyInside =
            faceBox.x >= 0 &&
            faceBox.y >= 0 &&
            faceBox.x + faceBox.width <= faceCanvasW &&
            faceBox.y + faceBox.height <= faceCanvasH;
      
          const centerX = faceBox.x + faceBox.width / 2;
          const centerY = faceBox.y + faceBox.height / 2;
          const isCentered =
            Math.abs(centerX - faceCanvasW / 2) < 80 &&
            Math.abs(centerY - faceCanvasH / 2) < 80;
      
          const hasMargin =
            faceBox.x > faceCanvasW * MARGIN_RATIO &&
            faceBox.y > faceCanvasH * MARGIN_RATIO &&
            faceBox.x + faceBox.width < faceCanvasW * (1 - MARGIN_RATIO) &&
            faceBox.y + faceBox.height < faceCanvasH * (1 - MARGIN_RATIO);
      
          const brightness = getAverageBrightness(ctx, faceBox);
          const lighting = brightness > 60;
          const straight = isLookingStraight(landmarks);
      
          const isValid =
            lighting && straight && isFullyInside && isBigEnough && isCentered && hasMargin;
      
          const feedback: string[] = [];
          if (!lighting) feedback.push("💡 Improve lighting on your face");
          if (!straight) feedback.push("🧍 Look straight into the camera");
          if (!(isCentered && isBigEnough)) feedback.push("🎯 Center your face");
          if (!hasMargin) feedback.push("↔️ Add more space around your face");
          if (!isBigEnough) feedback.push("↩️ Move closer to fill the box");
          if (isTooClose) feedback.push("↪️ Move back a little");
          if (!isFullyInside)
            feedback.push("🎯 Keep your full face within the frame");
          if (feedback.length === 0) feedback.push("✅ Ready. Hold still...");
      
          setTips(feedback);
          setLightingOK(lighting);
          setStraightOK(straight);
          setFacePositionOK(isCentered && isFullyInside && isBigEnough && !isTooClose);
          setFaceValid(isValid);
      
          const now = Date.now();
      
          if (isValid) {
            if (!lastValid) validationStableFor = now;
            lastValid = true;
      
            // Start countdown if stable for 1.5s and not already counting down
            if (
              now - validationStableFor > 1500 &&
              !countdownStarted &&
              !isCountingDown
            ) {
              countdownStarted = true;
              const canvas = document.createElement("canvas");
              canvas.width = videoRef.current!.videoWidth;
              canvas.height = videoRef.current!.videoHeight;
              const tmpCtx = canvas.getContext("2d")!;
              tmpCtx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);
              const image = canvas.toDataURL("image/jpeg");
              setCapturedImage(image);
              startCountdown(image);
            }
          } else {
            lastValid = false;
            validationStableFor = now;
      
            // Cancel countdown if in progress
            if (isCountingDown || countdownStarted) {
              setIsCountingDown(false);
              setCountdown(3);
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownStarted = false;
              setCapturedImage(null);
              hasCapturedRef.current = false;
              setTips(["⚠️ Hold still and meet all conditions to capture."]);
            }
          }
        } else {
          setFaceValid(false);
          setLightingOK(false);
          setFacePositionOK(false);
          setStraightOK(false);
          setTips(["❌ No face detected"]);
          lastValid = false;
          validationStableFor = Date.now();
        }
      });
      
      faceMeshInstanceRef.current = faceMesh;
  
      // Wait for video before canvas sizing
      videoRef.current!.onloadedmetadata = () => {
        canvasRef.current!.width = videoRef.current!.videoWidth;
        canvasRef.current!.height = videoRef.current!.videoHeight;
        videoRef.current!.play();
      };
  
      // ✅ Only create Camera once
      camera = new (window as any).Camera(videoRef.current!, {
        onFrame: async () => {
          if (!videoRef.current) return;
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
  
      cameraRef.current = camera;
      camera.start();
    };
  
    loadMediaPipe().catch(console.error);
  
    return () => {
      camera?.stop?.();
    };
  }, []);
  

  const startCountdown = (image: string) => {
    setIsCountingDown(true);
    let time = 3;
    setCountdown(time);
  
    countdownRef.current = setInterval(() => {
      time -= 1;
      setCountdown(time);
  
      if (time === 0) {
        clearInterval(countdownRef.current!);
        setIsCountingDown(false);
  
        if (!faceValid) {
          setCaptureFailed(true); // ❗mark as failed
          setCapturedImage(image); // still show the image
          hasCapturedRef.current = false;
          return;
        }
        
      }
    }, 1000);
  };
  

  const getBoundingBox = (landmarks: any[]) => {
    const xs = landmarks.map((lm) => lm.x * canvasRef.current!.width);
    const ys = landmarks.map((lm) => lm.y * canvasRef.current!.height);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  };

  const getAverageBrightness = (ctx: CanvasRenderingContext2D, box: any) => {
    const data = ctx.getImageData(box.x, box.y, box.width, box.height).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4)
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    return total / (data.length / 4);
  };

  const isLookingStraight = (landmarks: any[]) => {
    const left = landmarks[33],
      right = landmarks[263],
      nose = landmarks[1];
    const symmetry = Math.abs(nose.x - left.x - (right.x - nose.x));
    const verticalTilt = Math.abs(landmarks[10].y - landmarks[152].y);
    return symmetry < 0.02 && verticalTilt > 0.25;
  };

  const handleRetake = () => {
    hasCapturedRef.current = false;
    setCapturedImage(null);
    setCountdown(3);
    setIsCountingDown(false);
    setCaptureFailed(false);

    if (cameraRef.current) {
      cameraRef.current.stop();
    }

    // Clear and restart camera after a short delay
    setTimeout(() => {
      if (videoRef.current && faceMeshInstanceRef.current) {
        cameraRef.current = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            if (!videoRef.current) return;
            await faceMeshInstanceRef.current.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });

        cameraRef.current.start();
      }
      
    }, 300);
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
            width={80}
            height={80}
          />
        </div>
        <p className="text-gray-600 text-lg mt-4">
          Position your face within the frame for verification
        </p>
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
                  className="absolute w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="absolute w-full h-full" />

                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-4/5 h-4/5">
                    {/* Animated corner guides */}
                    <div
                      className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 animate-pulse"
                      style={{ borderColor: "#f847b4" }}
                      // className="rounded-tl-lg"
                    ></div>
                    <div
                      className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 animate-pulse"
                      style={{ borderColor: "#f847b4" }}
                      // className="rounded-tr-lg"
                    ></div>
                    <div
                      className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 animate-pulse"
                      style={{ borderColor: "#f847b4" }}
                      // className="rounded-bl-lg"
                    ></div>
                    <div
                      className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 animate-pulse"
                      style={{ borderColor: "#f847b4" }}
                      // className="rounded-br-lg"
                    ></div>

                    {/* Center crosshair */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6">
                      <div
                        className="absolute top-1/2 left-0 right-0 h-0.5 opacity-60"
                        style={{ backgroundColor: "#f847b4" }}
                      ></div>
                      <div
                        className="absolute left-1/2 top-0 bottom-0 w-0.5 opacity-60"
                        style={{ backgroundColor: "#f847b4" }}
                      ></div>
                    </div>
                  </div>
                </div>
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

    {captureFailed && (
      <div className="absolute inset-0 flex items-center justify-center text-white text-center bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
        <p className="text-lg">
          ❌ Face moved during capture.
          <br />
          Please retake and try again.
        </p>
      </div>
    )}
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

      {/* Feedback section */}
      {tips.length > 0 ? (
  <div className="mt-8 z-10 max-w-md">
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-200 shadow-xl">
      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="flex items-center space-x-3 text-gray-700 animate-fadeIn"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: "#f847b4" }}
            ></div>
            <p className="text-sm leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
) : null}


      {/* Action buttons */}
      {capturedImage && !isCountingDown && (
        <div className="mt-8 flex gap-4 z-10">
          <button
            onClick={() => onCapture(capturedImage)}
            className="group relative px-8 py-4 bg-gradient-to-r text-white rounded-2xl font-semibold shadow-xl transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #f847b4, #ec4899)",
              boxShadow: "0 20px 25px -5px rgba(248, 71, 180, 0.25)",
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
            <span className="relative z-10 flex items-center space-x-2">
              <span>Continue</span>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
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
            className="group px-8 py-4 bg-pink-800/80 hover:bg-pink-700/80 text-white rounded-2xl font-semibold shadow-xl transition-all duration-300 hover:scale-105 border border-pink-600/50"
          >
            <span className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 group-hover:rotate-12 transition-transform"
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

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

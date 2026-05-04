import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Image from "next/image";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraPrompt({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // const [captureFailed, setCaptureFailed] = useState(false);
  const [lightingOK, setLightingOK] = useState(false);
  const [facePositionOK, setFacePositionOK] = useState(false);
  const [straightOK, setStraightOK] = useState(false);
  const [sharpOK, setSharpOK] = useState(false);
  const [faceValid, setFaceValid] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const isCountingDownRef = useRef(false);
  const hasCapturedRef = useRef(false);
  const hasAutoSubmittedRef = useRef(false);
  const countdownRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Track the stream
  const [showCaptureButton, setShowCaptureButton] = useState(false);
  const showCaptureButtonTimeoutRef = useRef<number | null>(null);
  const modelsLoadedRef = useRef(false);
  const validStreakRef = useRef(0);
  const lastFaceSeenAtRef = useRef(0);
  const lastDetectAtRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scheduleManualCaptureButton = useCallback(() => {
    if (showCaptureButtonTimeoutRef.current) {
      window.clearTimeout(showCaptureButtonTimeoutRef.current);
    }
    setShowCaptureButton(false);
    showCaptureButtonTimeoutRef.current = window.setTimeout(() => {
      if (!hasCapturedRef.current) setShowCaptureButton(true);
    }, 5000);
  }, []);

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
    if (!hasCapturedRef.current) {
      scheduleManualCaptureButton();
      return () => {
        if (showCaptureButtonTimeoutRef.current) {
          window.clearTimeout(showCaptureButtonTimeoutRef.current);
        }
      };
    }
  }, [scheduleManualCaptureButton]);

  useEffect(() => {
    if (!capturedImage || isCountingDown) return;
    if (!hasCapturedRef.current) return;
    if (hasAutoSubmittedRef.current) return;

    hasAutoSubmittedRef.current = true;
    const timeout = window.setTimeout(() => onCapture(capturedImage), 300);
    return () => window.clearTimeout(timeout);
  }, [capturedImage, isCountingDown, onCapture]);

  useEffect(() => {
    isCountingDownRef.current = isCountingDown;
  }, [isCountingDown]);

  const drawFacialFeatureGuides = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number
  ) => {
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1;

    // Eye guidelines
    const eyeY = centerY - radiusY * 0.2;
    const eyeSpacing = radiusX * 0.3;

    // Left eye area
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

    // Right eye area
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

    // Nose guideline
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radiusY * 0.1);
    ctx.lineTo(centerX, centerY + radiusY * 0.1);
    ctx.stroke();

    // Nose bridge curves
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 0.05, centerY);
    ctx.quadraticCurveTo(
      centerX,
      centerY + radiusY * 0.05,
      centerX + radiusX * 0.05,
      centerY
    );
    ctx.stroke();

    // Mouth area
    const mouthY = centerY + radiusY * 0.3;
    ctx.beginPath();
    ctx.ellipse(centerX, mouthY, radiusX * 0.2, radiusY * 0.06, 0, 0, Math.PI);
    ctx.stroke();

    // Jaw line enhancement
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 0.8, centerY + radiusY * 0.6);
    ctx.quadraticCurveTo(
      centerX,
      centerY + radiusY * 0.9,
      centerX + radiusX * 0.8,
      centerY + radiusY * 0.6
    );
    ctx.stroke();
  }, []);

  // Replace your drawOvalFaceMesh function with this auto-detecting version
  const drawOvalFaceMesh = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: any,
    faceBox: { x: number; y: number; width: number; height: number } | null
  ) => {
    if (!landmarks || !faceBox) return;

    let centerX, centerY, radiusX, radiusY;

    // Use landmarks to get ACTUAL face bounds (more accurate than detection box)
    if (landmarks && landmarks.positions) {
      const landmarkPoints = landmarks.positions;
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      // Find actual bounds from ALL landmark points
      landmarkPoints.forEach((point: { x: number; y: number }) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });

      // Calculate actual face dimensions from landmarks
      const landmarkWidth = maxX - minX;
      const landmarkHeight = maxY - minY;

      // Use landmark-based center
      centerX = minX + landmarkWidth / 2;
      centerY = minY + landmarkHeight / 2;

      // Add extra padding to cover the full face (forehead, chin, cheeks)
      radiusX = (landmarkWidth / 2) * 1.4; // 40% extra width
      radiusY = (landmarkHeight / 2) * 1.6; // 60% extra height (for forehead/chin)
    } else {
      // Fallback to detection box if no landmarks
      centerX = faceBox.x + faceBox.width / 2;
      centerY = faceBox.y + faceBox.height / 2;
      radiusX = (faceBox.width / 2) * 1.8;
      radiusY = (faceBox.height / 2) * 1.8;
    }

    // Additional auto-adjustment based on canvas size
    const canvas = ctx.canvas;
    const minRadius = Math.min(canvas.width, canvas.height) * 0.15; // Minimum 15% of canvas
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.45; // Maximum 45% of canvas

    // Ensure reasonable bounds
    radiusX = Math.max(minRadius, Math.min(maxRadius, radiusX));
    radiusY = Math.max(minRadius, Math.min(maxRadius, radiusY));

    // Set mesh style
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;

    // Adaptive grid density based on face size
    const faceArea = radiusX * radiusY;
    const horizontalLines = Math.max(
      10,
      Math.min(20, Math.floor(faceArea / 1000))
    );
    const verticalLines = Math.max(
      8,
      Math.min(16, Math.floor(faceArea / 1200))
    );

    // Draw horizontal curved lines following face contour
    for (let i = 0; i <= horizontalLines; i++) {
      const t = i / horizontalLines;
      const y = centerY - radiusY + 2 * radiusY * t;

      // Calculate the width of the oval at this height
      const distanceFromCenter = Math.abs(y - centerY);
      const normalizedDistance = distanceFromCenter / radiusY;

      if (normalizedDistance <= 1) {
        const widthAtHeight =
          radiusX * Math.sqrt(1 - normalizedDistance * normalizedDistance);

        ctx.beginPath();
        ctx.moveTo(centerX - widthAtHeight, y);

        // Create smooth curved line
        const segments = 20;
        for (let j = 0; j <= segments; j++) {
          const segmentT = j / segments;
          const x = centerX - widthAtHeight + 2 * widthAtHeight * segmentT;

          // Subtle curve for natural face shape
          const curve = Math.sin(segmentT * Math.PI) * 2;
          ctx.lineTo(x, y + curve);
        }
        ctx.stroke();
      }
    }

    // Draw vertical curved lines
    for (let i = 0; i <= verticalLines; i++) {
      const t = i / verticalLines;
      const angle = -Math.PI / 2 + Math.PI * t;

      ctx.beginPath();

      const segments = 25;
      for (let j = 0; j <= segments; j++) {
        const segmentT = j / segments;
        const currentAngle = -Math.PI / 2 + Math.PI * segmentT;

        // Calculate position on oval
        let x =
          centerX +
          radiusX * Math.cos(angle) * Math.sin(currentAngle + Math.PI / 2);
        const y = centerY + radiusY * Math.sin(currentAngle);

        // Face shape adjustment
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

    // Draw the main oval outline
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Add facial feature guides
    drawFacialFeatureGuides(ctx, centerX, centerY, radiusX, radiusY);

    ctx.globalAlpha = 1;
  }, [drawFacialFeatureGuides]);

  // Function to stop camera completely
  const stopCamera = useCallback(() => {
    // Stop animation loop
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    setIsCountingDown(false);
    setCountdown(3);
    validStreakRef.current = 0;
    if (countdownRef.current) {
      cancelAnimationFrame(countdownRef.current);
    }
    setTips(["Hold still and meet the checks to start the countdown again"]);
  }, []);

  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setCountdown(3);
    validStreakRef.current = 0;

    let lastTime = performance.now();

    const animate = (now: number) => {
      if (now - lastTime >= 1000) {
        setCountdown((prev) => {
          if (prev <= 1) {
            const image = captureFrame();
            if (image) setCapturedImage(image);
            setIsCountingDown(false);
            hasCapturedRef.current = true;
            stopCamera();
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

  const isLookingStraight = useCallback((landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    if (leftEye.length < 4 || rightEye.length < 4) return false;

    const left = leftEye[0];
    const right = rightEye[3];
    const nose = landmarks.getNose()[3];

    const eyeWidth = Math.max(1, Math.abs(right.x - left.x));
    const leftToNose = Math.abs(nose.x - left.x);
    const noseToRight = Math.abs(right.x - nose.x);
    const symmetry = Math.abs(leftToNose - noseToRight) / eyeWidth;
    return symmetry < 0.18;
  }, []);

  const analyze = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.readyState < 2 || !canvas) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    const now = performance.now();
    if (now - lastDetectAtRef.current < 120) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }
    lastDetectAtRef.current = now;

    // CRITICAL: Check if video has valid dimensions before proceeding
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    // Ensure canvas has the correct dimensions
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(analyze);
      return;
    }

    let bestResult: any = null;
    try {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.2,
      });

      const results = await faceapi
        .detectAllFaces(video, detectorOptions)
        .withFaceLandmarks(true);

      if (results && results.length > 0) {
        bestResult = results.reduce((best: any, curr: any) => {
          const bestScore = best?.detection?.score ?? 0;
          const currScore = curr?.detection?.score ?? 0;
          return currScore > bestScore ? curr : best;
        }, results[0]);
      }
    } catch {
      bestResult = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bestResult) {
      lastFaceSeenAtRef.current = now;
      // Double-check dimensions are valid before calling matchDimensions
      const videoHasValidDimensions =
        video.videoWidth > 0 && video.videoHeight > 0;
      const canvasHasValidDimensions = canvas.width > 0 && canvas.height > 0;

      if (!videoHasValidDimensions || !canvasHasValidDimensions) {
        console.warn("Invalid dimensions detected:", {
          video: { width: video.videoWidth, height: video.videoHeight },
          canvas: { width: canvas.width, height: canvas.height },
        });
        animationRef.current = requestAnimationFrame(analyze);
        return;
      }

      const dims = faceapi.matchDimensions(canvas, video, true);

      // Additional safety check after matchDimensions
      if (dims.width === 0 || dims.height === 0) {
        console.warn("matchDimensions returned invalid dimensions:", dims);
        animationRef.current = requestAnimationFrame(analyze);
        return;
      }

      const resized = faceapi.resizeResults(bestResult, dims);

      // Get face bounding box
      const box = bestResult.detection.box;

      // Draw the oval mesh
      drawOvalFaceMesh(ctx, resized.landmarks, box);

      const landmarks = bestResult.landmarks;

      const faceCanvasW = canvas.width;
      const faceCanvasH = canvas.height;

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      const centerTolX = faceCanvasW * 0.12;
      const centerTolY = faceCanvasH * 0.14;
      const isCentered =
        Math.abs(centerX - faceCanvasW / 2) < centerTolX &&
        Math.abs(centerY - faceCanvasH / 2) < centerTolY;

      const isBigEnough =
        box.width > 0.3 * faceCanvasW &&
        box.height > 0.4 * faceCanvasH;

      const isTooClose =
        box.width > 0.92 * faceCanvasW || box.height > 0.92 * faceCanvasH;

      const edgeMargin = Math.round(Math.min(faceCanvasW, faceCanvasH) * 0.06);
      const isFullyInside =
        box.x > edgeMargin &&
        box.y > edgeMargin &&
        box.x + box.width < faceCanvasW - edgeMargin &&
        box.y + box.height < faceCanvasH - edgeMargin;

      const hasMargin =
        box.x > faceCanvasW * 0.1 &&
        box.y > faceCanvasH * 0.1 &&
        box.x + box.width < faceCanvasW * 0.9 &&
        box.y + box.height < faceCanvasH * 0.9;

      const brightnessCanvas = ensureBrightnessCanvas();
      let brightness = 0;
      let isSharp = true;
      if (brightnessCanvas) {
        const sampleW = 180;
        const sampleH = Math.max(
          1,
          Math.round(sampleW * (video.videoHeight / video.videoWidth))
        );
        if (brightnessCanvas.width !== sampleW) brightnessCanvas.width = sampleW;
        if (brightnessCanvas.height !== sampleH) brightnessCanvas.height = sampleH;
        const bctx = brightnessCanvas.getContext("2d");
        if (bctx) {
          bctx.drawImage(video, 0, 0, sampleW, sampleH);

          const sx = Math.max(0, Math.floor((box.x / video.videoWidth) * sampleW));
          const sy = Math.max(0, Math.floor((box.y / video.videoHeight) * sampleH));
          const sw = Math.max(
            1,
            Math.floor((box.width / video.videoWidth) * sampleW)
          );
          const sh = Math.max(
            1,
            Math.floor((box.height / video.videoHeight) * sampleH)
          );

          const rx = Math.min(sampleW - 1, sx);
          const ry = Math.min(sampleH - 1, sy);
          const rw = Math.min(sampleW - rx, sw);
          const rh = Math.min(sampleH - ry, sh);

          const { data } = bctx.getImageData(rx, ry, rw, rh);

          let total = 0;
          let lCount = 0;
          for (let i = 0; i < data.length; i += 4) {
            total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            lCount += 1;
          }
          brightness = lCount > 0 ? total / lCount : 0;

          if (rw >= 12 && rh >= 12) {
            const w = rw;
            const h = rh;
            const idx = (x: number, y: number) => (y * w + x) * 4;
            const lumaAt = (x: number, y: number) => {
              const i = idx(x, y);
              return (
                0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
              );
            };

            const stride = 2;
            let n = 0;
            let sum = 0;
            let sum2 = 0;
            for (let y = 1; y < h - 1; y += stride) {
              for (let x = 1; x < w - 1; x += stride) {
                const c = lumaAt(x, y);
                const lap =
                  4 * c - lumaAt(x - 1, y) - lumaAt(x + 1, y) - lumaAt(x, y - 1) - lumaAt(x, y + 1);
                n += 1;
                sum += lap;
                sum2 += lap * lap;
              }
            }
            const mean = n > 0 ? sum / n : 0;
            const variance = n > 0 ? sum2 / n - mean * mean : 0;
            isSharp = variance >= 35;
          }
        }
      }

      const lighting = brightness >= 60 && brightness <= 210;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      const areEyesVisible = leftEye.length > 0 && rightEye.length > 0;

      const straight = areEyesVisible && isLookingStraight(landmarks);

      const isValid =
        lighting &&
        isSharp &&
        straight &&
        isFullyInside &&
        isBigEnough &&
        isCentered &&
        hasMargin &&
        !isTooClose;

      const feedback: string[] = [];
      if (!areEyesVisible) feedback.push("Keep both eyes visible");
      if (!lighting) feedback.push("Step into brighter, even light (avoid backlight)");
      if (!isSharp) feedback.push("Hold still — the image looks a bit blurry");
      if (!straight) feedback.push("Hold the phone at eye level and look straight ahead");
      if (!isCentered) feedback.push("Center your face in the frame");
      if (!isBigEnough) feedback.push("Move a little closer");
      if (isTooClose) feedback.push("Step back a touch");
      if (!hasMargin) feedback.push("Leave a little space around your face");
      if (!isFullyInside) feedback.push("Keep your full face inside the frame");
      if (feedback.length === 0) feedback.push("Perfect — hold still");

      setTips(feedback);
      setLightingOK(lighting);
      setStraightOK(straight);
      setSharpOK(isSharp);
      setFacePositionOK(
        isCentered && isFullyInside && isBigEnough && !isTooClose
      );
      setFaceValid(isValid);

      if (isValid) {
        validStreakRef.current += 1;
      } else {
        validStreakRef.current = 0;
      }

      if (
        validStreakRef.current >= 10 &&
        !isCountingDownRef.current &&
        !hasCapturedRef.current
      ) {
        startCountdown();
      } else if (!isValid && isCountingDownRef.current) {
        cancelCountdown();
      }
    } else {
      validStreakRef.current = 0;

      const graceMs = 1200;
      const withinGrace = now - lastFaceSeenAtRef.current < graceMs;

      if (withinGrace) {
        setFaceValid(false);
      } else {
        setFaceValid(false);
        setLightingOK(false);
        setFacePositionOK(false);
        setStraightOK(false);
        setSharpOK(false);
        setTips(["We can’t see your face — move closer and face the light"]);
      }

      if (!withinGrace && isCountingDownRef.current) {
        cancelCountdown();
      }
      validStreakRef.current = 0;
    }

    // Only continue animation if we haven't captured yet
    if (!hasCapturedRef.current) {
      animationRef.current = requestAnimationFrame(analyze);
    }
  }, [
    cancelCountdown,
    drawOvalFaceMesh,
    ensureBrightnessCanvas,
    isLookingStraight,
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

  // Also update the useEffect to ensure proper video loading:
  useEffect(() => {
    const loadModelsAndStart = async () => {
      try {
        if (!modelsLoadedRef.current) {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
          ]);
          modelsLoadedRef.current = true;
        }
        await startCamera();
      } catch {
        setTips([
          "We couldn’t access your camera.",
          "Allow camera permission, then refresh this page.",
        ]);
      }
    };

    loadModelsAndStart();

    return () => {
      if (showCaptureButtonTimeoutRef.current) {
        window.clearTimeout(showCaptureButtonTimeoutRef.current);
      }
      stopCamera();
      if (countdownRef.current) cancelAnimationFrame(countdownRef.current);
    };
  }, [startCamera, stopCamera]);

  const handleForceCapture = () => {
    if (hasCapturedRef.current) return;
    setLightingOK(true);
    setStraightOK(true);
    setFacePositionOK(true);
    setFaceValid(true);
    setTips(["Quick capture — hold still"]);
    startCountdown();
  };

  const handleRetake = async () => {
    hasCapturedRef.current = false;
    hasAutoSubmittedRef.current = false;
    validStreakRef.current = 0;
    setCapturedImage(null);
    setIsCountingDown(false);
    setCountdown(3);
    setLightingOK(false);
    setStraightOK(false);
    setFacePositionOK(false);
    setFaceValid(false);
    setSharpOK(false);
    setTips(["Get ready — we’ll capture automatically when everything looks good"]);
    scheduleManualCaptureButton();

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
          />
        </div>
      </div>

      <div className="text-center z-10 mb-6">
        <div className="text-pink-900 font-semibold text-lg">
          Face Scan
        </div>
        <div className="text-pink-900/70 text-sm">
          Good light, face centered, eyes visible — we’ll capture automatically
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap gap-3 mb-8 z-10">
        <StatusBox label="LIGHTING" active={lightingOK} icon="💡" />
        <StatusBox label="POSITION" active={facePositionOK} icon="🎯" />
        <StatusBox label="ALIGNMENT" active={straightOK} icon="👁️" />
        <StatusBox label="SHARPNESS" active={sharpOK} icon="✨" />
      </div>

      <div
        className={`w-full max-w-[380px] z-10 mb-6 rounded-2xl border backdrop-blur-sm shadow-lg px-5 py-4 ${
          faceValid
            ? "bg-white/80 border-pink-400/60"
            : "bg-white/70 border-pink-300/50"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-pink-900">
            Live tips
          </div>
          <div
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              faceValid
                ? "bg-pink-500 text-white"
                : "bg-pink-100 text-pink-800"
            }`}
          >
            {faceValid ? "Ready" : "Adjusting"}
          </div>
        </div>
        <div className="text-sm text-pink-900/80 space-y-1">
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
              showCaptureButton &&
              !hasCapturedRef.current &&
              !isCountingDown && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
                  <button
                    onClick={handleForceCapture}
                    className="group px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-semibold shadow-xl transition-all duration-300 hover:scale-105 border border-pink-600/50 backdrop-blur-sm"
                  >
                    <span className="flex items-center space-x-2">
                      <span>📸 Capture now</span>
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                <div className="text-8xl font-bold text-white animate-bounce drop-shadow-2xl">
                  {countdown}
                </div>
              </div>
            )}
          </div>
        </div>
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

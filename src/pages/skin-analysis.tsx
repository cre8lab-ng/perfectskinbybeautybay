import React from "react";
import { useEffect, useState, ChangeEvent, useRef } from "react";
import useAccessToken from "@/stores/useAccessToken";
import {
  uploadImage,
  analyzeSkinFeatures,
  checkSkinAnalysisStatus,
} from "@/services/skinanalysis";
import Header from "@/components/header";
import Footer from "@/components/footer";
import InstructionModal from "@/components/modal/instruction-modal";
import PrivacyConsentModal from "@/components/modal/privacy-consent-modal";
import CameraPrompt from "@/components/camera-prompt";
import {
  errorMessages,
  extractSkinAnalysisResults,
  generateSkinAnalysisResult,
  notifyError,
} from "@/util/utils";
import WebPageTitle from "@/components/webpagetitle";
import { useResultAccess } from "@/stores/useResultAccess";
import LoginModal from "@/components/modal/login";
import { loadPaystackScript } from "@/util/paystack";
import { runMediaPipeFaceDetection } from "@/util/faceValidation";
import { getRecommendedProducts } from "@/data/skinProductMap";

interface ScoreEntry {
  ui_score?: number;
  raw_score?: number;
}

interface ScoreInfo {
  wrinkle?: ScoreEntry;
  pore?: ScoreEntry;
  texture?: ScoreEntry;
  acne?: ScoreEntry;
  all?: { score?: number };
}

interface ZipImage {
  name: string;
  url: string;
}

interface UploadResponse {
  file_id?: string;
}

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

export default function FaceDetectionComponent() {
  const accessToken = useAccessToken((s) => s.accessToken);
  const [processedImagePreview, setProcessedImagePreview] = useState<
    string | null
  >(null);
  const [faceDetectionLoading, setFaceDetectionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [retake, setRetake] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [message, setMessage] = useState<React.ReactNode>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true); // 👈 toggle overlay state
  const [lastCaptureMethod, setLastCaptureMethod] = useState<
    "upload" | "camera" | null
  >(null);
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const [unitError, setUnitError] = useState(false);
  const [zipContent, setZipContent] = useState<ZipImage[]>([]);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  const routineRecommendation = getRecommendedProducts(scoreInfo);
  const [showRetryButton, setShowRetryButton] = useState(false);

  console.log(uploading, analysisStatus, uploadResponse);
  const { hasAccess, showLoginModal, setShowLoginModal } = useResultAccess();
  const userEmail = useResultAccess((s) => s.userEmail);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null); // 🆕 ADD THIS

  useEffect(() => {
    console.log("🔍 userEmail in FaceDetectionComponent:", userEmail);
  }, [userEmail]);

  function drawOverlay(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    scoreInfo: ScoreInfo
  ) {
    const scale = window.devicePixelRatio || 1;
    const width = canvas.width / scale;
    const height = canvas.height / scale;

    // Reset any previous transform before redrawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);

    // --- TEXTURE OVERLAY ---
    if (scoreInfo.texture?.ui_score && scoreInfo.texture.ui_score > 20) {
      ctx.strokeStyle = "#ff7bd7";
      ctx.lineWidth = 1.5;

      const textureLevel = Math.floor(scoreInfo.texture.ui_score / 10);
      for (let i = 0; i < textureLevel; i++) {
        const region = i % 2;

        let x1, x2, y;
        if (region === 0) {
          // Forehead patch
          y = height * 0.18 + i * 5;
          x1 = width * 0.35;
          x2 = width * 0.65;
        } else {
          // Cheek patch
          y = height * 0.58 + i * 5;
          x1 = width * 0.25;
          x2 = width * 0.75;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
    }

    // --- WRINKLE OVERLAY ---
    // --- WRINKLE OVERLAY (Always show, no vertical lines) ---
    ctx.strokeStyle = "#a86cd9";
    ctx.lineWidth = 2;

    const wrinkleCount = 4;

    for (let i = 0; i < wrinkleCount; i++) {
      const region = i % 2;

      if (region === 0) {
        // Eye crow’s feet – left side
        const startX = width * 0.28;
        const startY = height * 0.45 + i * 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
          startX + 20,
          startY + 10,
          startX + 40,
          startY - 10,
          startX + 60,
          startY
        );
        ctx.stroke();
      } else {
        // Smile lines – right side
        const startX = width * 0.6;
        const startY = height * 0.6 + i * 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(
          startX - 20,
          startY - 20,
          startX + 20,
          startY + 20,
          startX + 40,
          startY
        );
        ctx.stroke();
      }
    }

    // --- PORE OVERLAY ---
    if (scoreInfo.pore?.ui_score && scoreInfo.pore.ui_score > 20) {
      const poreLevel = Math.floor(scoreInfo.pore.ui_score / 2);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;

      for (let i = 0; i < poreLevel; i++) {
        const region = i % 2;

        let x = 0,
          y = 0;
        if (region === 0) {
          // Left cheek
          x = Math.random() * width * 0.1 + width * 0.3;
          y = Math.random() * height * 0.15 + height * 0.55;
        } else {
          // Right cheek
          x = Math.random() * width * 0.1 + width * 0.6;
          y = Math.random() * height * 0.15 + height * 0.55;
        }

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // --- ACNE OVERLAY ---
    if (scoreInfo.acne?.ui_score && scoreInfo.acne.ui_score > 20) {
      const acneLevel = Math.floor(scoreInfo.acne.ui_score / 2);
      ctx.fillStyle = "orange";

      for (let i = 0; i < acneLevel; i++) {
        const region = i % 3;

        let x = 0,
          y = 0;
        if (region === 0) {
          // Forehead
          x = Math.random() * width * 0.4 + width * 0.3;
          y = Math.random() * height * 0.15 + height * 0.05;
        } else if (region === 1) {
          // Nose
          x = Math.random() * width * 0.1 + width * 0.45;
          y = Math.random() * height * 0.2 + height * 0.4;
        } else {
          // Chin
          x = Math.random() * width * 0.2 + width * 0.4;
          y = Math.random() * height * 0.15 + height * 0.75;
        }

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  useEffect(() => {
    console.log("🔍 Running overlay draw effect");

    if (!scoreInfo || !originalImagePreview || !hasAccess || !showOverlays)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalImagePreview;

    img.onload = () => {
      requestAnimationFrame(() => {
        const displayWidth = imageRef.current?.clientWidth || img.naturalWidth;
        const displayHeight =
          imageRef.current?.clientHeight || img.naturalHeight;

        const scale = window.devicePixelRatio || 1;

        canvas.width = displayWidth * scale;
        canvas.height = displayHeight * scale;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);

        console.log("🖼️ canvas size", canvas.width, canvas.height);
        console.log(
          "📐 imageRef size",
          imageRef.current?.clientWidth,
          imageRef.current?.clientHeight
        );

        drawOverlay(ctx, canvas, scoreInfo);
      });
    };

    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [scoreInfo, originalImagePreview, hasAccess, showOverlays]);

  function resizeImageWithOverride(
    inputFile: File,
    quality = 0.6
  ): Promise<{ file: File; previewUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        const originalUrl = e.target?.result as string;
        setOriginalImagePreview(originalUrl);
        img.src = originalUrl;
      };

      img.onload = () => {
        const originalWidth = img.width;
        const originalHeight = img.height;
        const aspectRatio = originalWidth / originalHeight;

        let targetWidth, targetHeight;
        if (aspectRatio >= 1) {
          targetWidth = 1920;
          targetHeight = Math.max(720, Math.round(targetWidth / aspectRatio));
        } else {
          targetHeight = 1920;
          targetWidth = Math.max(720, Math.round(targetHeight * aspectRatio));
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not found"));

        const targetAspect = targetWidth / targetHeight;
        let sourceX = 0,
          sourceY = 0;
        let cropWidth = originalWidth;
        let cropHeight = originalHeight;

        if (aspectRatio > targetAspect) {
          cropWidth = originalHeight * targetAspect;
          sourceX = (originalWidth - cropWidth) / 2;
        } else {
          cropHeight = originalWidth / targetAspect;
          sourceY = (originalHeight - cropHeight) / 2;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        const previewUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Failed to create blob"));
            const processedFile = new File([blob], inputFile.name, {
              type: inputFile.type,
            });
            resolve({ file: processedFile, previewUrl });
          },
          inputFile.type,
          quality
        );
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(inputFile);
    });
  }

  useEffect(() => {
    loadPaystackScript();
  }, []);

  const handleCaptureWithOverride = async (
    e?: ChangeEvent<HTMLInputElement>,
    capturedFile?: File | null
  ): Promise<void> => {
    if (faceDetectionLoading) return;

    const file = capturedFile ?? e?.target?.files?.[0];
    if (!file) return;

    const { file: resizedFile, previewUrl } = await resizeImageWithOverride(
      file
    );
    setScoreInfo(null);
    setZipContent([]);
    setProcessedImagePreview(previewUrl);
    setAnalysisStatus(null);
    setUploadResponse(null);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewUrl;

    await new Promise((resolve) => (img.onload = resolve));

    setFaceDetectionLoading(true);
    try {
      img.crossOrigin = "anonymous";
      img.src = previewUrl;

      await new Promise((res) => (img.onload = res));

      const landmarks = await runMediaPipeFaceDetection(img);

      if (!landmarks || landmarks.length === 0) {
        notifyError("No face detected. Please try again.");
        setShowCameraPrompt(false);
        setShowRetryButton(true);

        if (lastCaptureMethod === "camera") {
          setShowCameraPrompt(true);
        } else if (lastCaptureMethod === "upload") {
          document.getElementById("fileInput")?.click();
        } else {
          setShowInstructionModal(true);
        }

        return;
      }

      // Optional: check bounding box from landmarks
      const xs = landmarks.map((lm) => lm.x * img.width);
      const ys = landmarks.map((lm) => lm.y * img.height);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);

      if (width < 300 || height < 300) {
        notifyError(
          "Your face is too small in the image. Please move closer or upload a clearer selfie."
        );
        return;
      }

      // ✅ If you want to re-enable blur/brightness checks later, reinsert these:
      // const box = getBoundingBox(landmarks, img.width, img.height);
      // const ctx = canvas.getContext("2d")!;
      // const brightness = getAverageBrightness(ctx, box);
      // const blurry = isImageBlurry(ctx, box);
    } catch (error) {
      console.warn("MediaPipe face detection failed", error);
    } finally {
      setFaceDetectionLoading(false);
    }

    if (!accessToken) {
      notifyError("Access token not available yet.");
      return;
    }

    setUploading(true);

    try {
      const res = await uploadImage(resizedFile, accessToken);
      if (!res?.file_id) throw new Error("Upload failed: Missing file_id.");
      setUploadResponse(res); // ✅ Store file_id for later use (delayed analysis)
    } catch (err) {
      notifyError("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  console.log(unitError);

  const runSkinAnalysis = async (fileId: string) => {
    if (!accessToken) return notifyError("Access token not available");
    setAnalyzing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // optional delay

      const analysis = await analyzeSkinFeatures(fileId, accessToken, [
        "acne",
        "wrinkle",
        "pore",
        "texture",
      ]);

      const taskId = analysis.result.task_id;
      if (!taskId) throw new Error("No task_id returned");

      const status = await pollAnalysisStatus(taskId, accessToken);
      setAnalysisStatus(status); // set UI status
    } catch (err) {
      // @ts-expect-error: Supabase typing is too strict here
      if (err && err.response?.data.status === 400) {
        setUnitError(true);
        setMessage(
          <>
            Something went wrong. Please contact support on
            <a
              href="https://www.instagram.com/beautyhubco.ng/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#f847b4", textDecoration: "underline" }}
            >
              Instagram
            </a>
            ,
            <a
              href="https://wa.me/2348162598682"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#f847b4", textDecoration: "underline" }}
            >
              WhatsApp
            </a>
            , or
            <a
              href="mailto:support@beautyhub.ng"
              style={{ color: "#f847b4", textDecoration: "underline" }}
            >
              email
            </a>
            .
          </>
        );
        setRetake(true);
      } else {
        setUnitError(true);
        setMessage(
          <>
            We couldn&apos;t analyze your skin, Please try again or
            <a
              href="mailto:support@beautyhub.ng"
              style={{
                color: "#f847b4",
                textDecoration: "underline",
                marginLeft: "0.5rem",
              }}
            >
              {" "}
              contact support{" "}
            </a>
            .
          </>
        );

        setRetake(true);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const pollAnalysisStatus = async (
    taskId: string,
    accessToken: string
  ): Promise<any> => {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    while (attempts < maxAttempts) {
      try {
        const res = await checkSkinAnalysisStatus(taskId, accessToken);
        const status = res?.result?.status;
        console.log(status, res);

        if (status === "success") {
          console.log("✅ Analysis successful");

          const zipUrl = res.result?.results?.[0]?.data?.[0]?.url;
          if (!zipUrl) throw new Error("No ZIP URL found in result");

          const { score, images } = await extractSkinAnalysisResults(zipUrl);
          if (score) setScoreInfo(score);
          if (images.length > 0) setZipContent(images);

          const currentEmail = useResultAccess.getState().userEmail;
          if (currentEmail) {
            await grantAccess(currentEmail);
          }

          return res;
        }

        if (status === "error") {
          const errorCode = res.result.error;
          console.log("❌ Analysis returned error:", errorCode);
          const humanMessage =
            errorMessages[errorCode] ||
            "Please ensure your face is clearly visible and centered.";
          setMessage(humanMessage);
          console.log("Analysis returned error");
        }

        console.log(`⏳ Polling status: ${status}, retrying...`);
      } catch (err) {
        console.error("❌ Polling failed:", err);
      }

      attempts++;
      await delay(500);
    }

    throw new Error("❌ Polling timed out after maximum retries");
  };

  const grantAccess = async (email: string) => {
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: "mark-analysis",
          source: "analysis",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        console.warn("⚠️ Access grant failed:", data.reason || data.error);
        return;
      }

      console.log("✅ Access granted successfully via mark-analysis");
    } catch (err) {
      console.error("❌ Failed to call mark-analysis:", err);
    }
  };

  useEffect(() => {
    return () => {
      console.log("👋 User left skin analysis page. Resetting access...");
      useResultAccess.getState().resetAccess();
    };
  }, []);

  // @ts-expect-error: Supabase typing is too strict here

  const getImageWithOverlays = async (baseSrc, overlays) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = baseSrc;

    await new Promise((res) => {
      baseImg.onload = () => {
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        ctx.drawImage(baseImg, 0, 0);
        res(null);
      };
    });

    for (const mask of overlays) {
      const overlay = new Image();
      overlay.crossOrigin = "anonymous";
      overlay.src = mask.url;

      const name = mask.name.toLowerCase();

      let filter = "contrast(250%) brightness(120%) saturate(180%)";
      let blendMode = "normal";

      if (name.includes("acne_output")) {
        filter =
          "hue-rotate(0deg) contrast(250%) brightness(120%) saturate(200%)";
        blendMode = "overlay";
      } else if (name.includes("wrinkle_output")) {
        filter =
          "hue-rotate(270deg) contrast(250%) brightness(120%) saturate(200%)";
        blendMode = "overlay";
      } else if (name.includes("pore_output")) {
        filter =
          "hue-rotate(180deg) contrast(250%) brightness(120%) saturate(200%)";
        blendMode = "multiply";
      } else if (name.includes("texture_output")) {
        filter =
          "hue-rotate(60deg) contrast(250%) brightness(120%) saturate(200%)";
        blendMode = "overlay";
      }

      await new Promise((res) => {
        overlay.onload = () => {
          ctx.save(); // Save canvas state

          // Apply filter and blend mode
          ctx.filter = filter;
          // @ts-expect-error: Supabase typing is too strict here
          ctx.globalCompositeOperation = blendMode;

          ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);

          ctx.restore(); // Restore to previous state (important!)
          res(null);
        };
      });
    }

    // Clear any residual filter/blend mode
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";

    return canvas.toDataURL("image/png");
  };

  return (
    <>
      {showPrivacyModal && (
        <PrivacyConsentModal
          onAgree={() => {
            setShowPrivacyModal(false);
            setShowInstructionModal(true);
          }}
        />
      )}

      {showInstructionModal && (
        <InstructionModal
          onTakeSelfie={() => {
            setLastCaptureMethod("camera");
            setShowInstructionModal(false);
            setShowCameraPrompt(true);
          }}
          onUploadPhoto={() => {
            setLastCaptureMethod("upload");
            setShowInstructionModal(false);
            document.getElementById("fileInput")?.click();
          }}
        />
      )}

      <input
        type="file"
        id="fileInput"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleCaptureWithOverride(e, null)}
      />

      {showCameraPrompt ? (
        <CameraPrompt
          onCapture={(imageData) => {
            setShowCameraPrompt(false);
            const file = dataURLtoFile(imageData, "captured.jpg");
            handleCaptureWithOverride(undefined, file);
          }}
        />
      ) : (
        <>
          <WebPageTitle title="Perfect Skin By BeautyHub" />
          <Header />
          <main
            style={{
              padding: "2rem 1rem",
              background: "linear-gradient(135deg, #ffd9f0 0%, #f847b4 100%)",
              minHeight: "100vh",
              position: "relative",
            }}
          >
            {/* Animated Background Elements */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
        radial-gradient(circle at 20% 30%, rgba(248, 71, 180, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(255, 217, 240, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(248, 71, 180, 0.05) 0%, transparent 50%)
      `,
                pointerEvents: "none",
              }}
            />

            {(showCameraPrompt ||
              faceDetectionLoading ||
              analyzing ||
              scoreInfo ||
              zipContent.length > 0 ||
              processedImagePreview ||
              routineRecommendation) && (
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Decorative Elements */}
                <div
                  style={{
                    position: "absolute",
                    top: "-50px",
                    right: "-50px",
                    width: "100px",
                    height: "100px",
                    background: "linear-gradient(45deg, #f847b4, #ffd9f0)",
                    borderRadius: "50%",
                    opacity: 0.1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "-30px",
                    left: "-30px",
                    width: "60px",
                    height: "60px",
                    background: "linear-gradient(135deg, #ffd9f0, #f847b4)",
                    borderRadius: "50%",
                    opacity: 0.1,
                  }}
                />

                {originalImagePreview && (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: "100%",
                      marginBottom: "2rem",
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={originalImagePreview}
                      alt="Analyzed Face"
                      style={{
                        width: "100%",
                        display: "block",
                        borderRadius: "8px",
                      }}
                    />

                    {/* Mask Overlays - Background layer */}
                    {showOverlays &&
                      zipContent.length > 0 &&
                      zipContent.map((mask, i) => {
                        const name = mask.name.toLowerCase();
                        let filter =
                          "contrast(250%) brightness(120%) saturate(180%)";
                        let blendMode = "normal";

                        if (name.includes("acne_output")) {
                          filter =
                            "hue-rotate(0deg) contrast(250%) brightness(120%) saturate(200%)";
                          blendMode = "overlay";
                        } else if (name.includes("wrinkle_output")) {
                          filter =
                            "hue-rotate(270deg) contrast(250%) brightness(120%) saturate(200%)";
                          blendMode = "overlay";
                        } else if (name.includes("pore_output")) {
                          filter =
                            "hue-rotate(180deg) contrast(250%) brightness(120%) saturate(200%)";
                          blendMode = "multiply";
                        } else if (name.includes("texture_output")) {
                          filter =
                            "hue-rotate(60deg) contrast(250%) brightness(120%) saturate(200%)";
                          blendMode = "overlay";
                        }

                        return (
                          <img
                            key={i}
                            src={mask.url}
                            alt={mask.name}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              opacity: 1,
                              filter,
                              // @ts-expect-error: Supabase typing is too strict here
                              mixBlendMode: blendMode,
                              pointerEvents: "none",
                              zIndex: 5,
                            }}
                          />
                        );
                      })}

                    {/* Score Overlays - UI layer */}
                    {hasAccess &&
                      !analyzing &&
                      !faceDetectionLoading &&
                      scoreInfo && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "10px",
                            left: "10px",
                            right: "10px",
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "center",
                            padding: "0",
                            gap: "0.5rem",
                            overflowX: "auto",
                            overflowY: "hidden",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                            zIndex: 8,
                          }}
                        >
                          {["acne", "wrinkle", "pore", "texture"].map((key) => {
                            // @ts-expect-error: Supabase typing is too strict here
                            const score = scoreInfo?.[key]?.ui_score ?? 0;
                            const percentage = Math.min(
                              Math.max(score, 0),
                              100
                            );

                            return (
                              <div
                                key={key}
                                style={{
                                  padding: "0.75rem",
                                  minWidth: "130px", // Increased from 100px
                                }}
                              >
                                <div
                                  style={{
                                    color: "#f847b4",
                                    fontSize: "1.5rem",
                                    fontWeight: "800",
                                    textTransform: "capitalize",
                                    marginBottom: "0.5rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {key}
                                </div>
                                <div
                                  style={{
                                    position: "relative",
                                    width: "100px", // Increased from 70px
                                    height: "100px", // Increased from 70px
                                    margin: "0 auto",
                                  }}
                                >
                                  <svg
                                    width="100" // Increased from 70
                                    height="100" // Increased from 70
                                    style={{
                                      transform: "rotate(-90deg)",
                                    }}
                                  >
                                    <circle
                                      cx="50" // Increased from 35
                                      cy="50" // Increased from 35
                                      r="40" // Increased from 28
                                      fill="none"
                                      stroke="#ffd9f0"
                                      strokeWidth="8" // Increased from 6
                                    />
                                    <circle
                                      cx="50" // Increased from 35
                                      cy="50" // Increased from 35
                                      r="40" // Increased from 28
                                      fill="none"
                                      stroke="#f847b4"
                                      strokeWidth="8" // Increased from 6
                                      strokeLinecap="round"
                                      strokeDasharray={`${2 * Math.PI * 40}`} // Updated radius
                                      strokeDashoffset={`${
                                        2 *
                                        Math.PI *
                                        40 * // Updated radius
                                        (1 - percentage / 100)
                                      }`}
                                      style={{
                                        transition:
                                          "stroke-dashoffset 0.3s ease-in-out",
                                      }}
                                    />
                                  </svg>
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "50%",
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                      color: "#f847b4",
                                      fontSize: "1.5rem", // Increased from 1rem
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {score}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* Analyzing Overlay - Higher priority */}
                    {analyzing && (
                      <div
                        style={{
                          textAlign: "center",
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, rgba(255, 217, 240, 0.7), rgba(255, 217, 240, 0.3))",
                          borderRadius: "8px",
                          border: "1px solid rgba(248, 71, 180, 0.15)",
                          overflow: "hidden",
                          zIndex: 10,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          padding: "3rem 2rem",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: "-100%",
                            width: "100%",
                            height: "100%",
                            background:
                              "linear-gradient(90deg, transparent, rgba(248, 71, 180, 0.05), transparent)",
                            animation: "shimmer 2s infinite",
                          }}
                        />

                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            border: "4px solid rgba(248, 71, 180, 0.2)",
                            borderTop: "4px solid #f847b4",
                            borderRadius: "50%",
                            animation:
                              "spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
                            margin: "0 auto 1.5rem",
                            boxShadow: "0 8px 25px rgba(248, 71, 180, 0.3)",
                          }}
                        />
                        <p
                          style={{
                            marginTop: "1rem",
                            color: "#f847b4",
                            fontWeight: "600",
                            fontSize: "1.3rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Analyzing your skin features...
                        </p>
                        <p
                          style={{
                            fontSize: "1.4rem",
                            margin: "0.5rem 0 0",
                            color: "#f847b4",
                          }}
                        >
                          Our AI is mapping your unique skin profile
                        </p>
                      </div>
                    )}

                    {showRetryButton && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, rgba(255, 217, 240, 0.8), rgba(255, 217, 240, 0.4))",
                          borderRadius: "8px",
                          border: "1px solid rgba(248, 71, 180, 0.15)",
                          zIndex: 12,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          padding: "2rem",
                        }}
                      >
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

                    {/* Login/Premium Results Overlay - Medium priority */}
                    {uploadResponse?.file_id &&
                      !scoreInfo &&
                      !retake &&
                      !analyzing && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background:
                              "linear-gradient(135deg, rgba(255, 217, 240, 0.8), rgba(255, 217, 240, 0.4))",
                            borderRadius: "8px",
                            border: "1px solid rgba(248, 71, 180, 0.15)",
                            zIndex: 12,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            padding: "2rem",
                          }}
                        >
                          <p
                            style={{
                              color: "#f847b4",
                              fontSize: "1.1rem",
                              fontWeight: "600",
                              marginBottom: "1.5rem",
                              textAlign: "center",
                            }}
                          >
                            Your image is ready for premium analysis
                          </p>
                          <button
                            disabled={analyzing}
                            onClick={() => {
                              if (!hasAccess) {
                                setShowLoginModal(true);
                              } else if (
                                !analyzing &&
                                uploadResponse?.file_id
                              ) {
                                runSkinAnalysis(uploadResponse.file_id);
                              }
                            }}
                            aria-label={
                              hasAccess
                                ? "View Premium Results"
                                : "Log In to View Results"
                            }
                            style={{
                              background: analyzing
                                ? "linear-gradient(135deg, #ccc, #999)"
                                : "linear-gradient(135deg, #f847b4, #ff6bc7)",
                              color: "white",
                              border: "none",
                              padding: "1rem 2rem",
                              borderRadius: "12px",
                              fontSize: "1rem",
                              fontWeight: "600",
                              cursor: analyzing ? "not-allowed" : "pointer",
                              boxShadow: analyzing
                                ? "none"
                                : "0 8px 25px rgba(248, 71, 180, 0.4)",
                              transition: "all 0.3s ease",
                              transform: analyzing
                                ? "none"
                                : "translateY(-2px)",
                            }}
                          >
                            {analyzing
                              ? "Analyzing..."
                              : hasAccess
                              ? "✨ View Premium Results"
                              : "🔐 Log In to View Results"}
                          </button>
                        </div>
                      )}

                    {/* Face Detection Loading Overlay - Highest priority */}
                    {faceDetectionLoading && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          background:
                            "linear-gradient(135deg, rgba(255, 217, 240, 0.8), rgba(255, 217, 240, 0.4))",
                          borderRadius: "8px",
                          border: "1px solid rgba(248, 71, 180, 0.15)",
                          zIndex: 15,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          padding: "2rem",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            border: "4px solid rgba(248, 71, 180, 0.2)",
                            borderTop: "4px solid #f847b4",
                            borderRadius: "50%",
                            animation:
                              "spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
                            margin: "0 auto 1.5rem",
                            boxShadow: "0 8px 25px rgba(248, 71, 180, 0.3)",
                          }}
                        />
                        <p
                          style={{
                            fontWeight: "700",
                            color: "#f847b4",
                            fontSize: "1.2rem",
                            marginBottom: "1.5rem",
                            textAlign: "center",
                          }}
                        >
                          Detecting your beautiful face...
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Overlay Controls - Outside image container */}
                {zipContent.length > 0 && (
                  <div
                    style={{
                      marginTop: "1rem",
                      marginBottom: "1rem",
                      textAlign: "center",
                      padding: "1rem",
                      background: "rgba(255, 217, 240, 0.3)",
                      borderRadius: "12px",
                      border: "1px solid rgba(248, 71, 180, 0.2)",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "1rem",
                        color: "#f847b4",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={showOverlays}
                        onChange={() => setShowOverlays(!showOverlays)}
                        style={{
                          width: "18px",
                          height: "18px",
                          accentColor: "#f847b4",
                        }}
                      />
                      <span>✨ Show skin concern overlays</span>
                    </label>
                  </div>
                )}
                {scoreInfo && hasAccess && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        // Create fallback image URL or use a default placeholder
                        const fallbackImageSrc =
                          "https://t4.ftcdn.net/jpg/02/79/66/93/360_F_279669366_Lk12QalYQKMczLEa4ySjhaLtx1M2u7e6.jpg";

                        const compositeImageSrc = await getImageWithOverlays(
                          originalImagePreview || fallbackImageSrc,
                          zipContent
                        );

                        try {
                          await generateSkinAnalysisResult({
                            // @ts-expect-error: Supabase typing is too strict here
                            originalImageSrc: compositeImageSrc, // Pass the actual image source, not an object
                            scoreInfo: {
                              all: {
                                score: `${scoreInfo.all?.score?.toFixed(1)}%`,
                              },
                              // @ts-expect-error: Supabase typing is too strict here

                              acne: { ui_score: scoreInfo.acne?.ui_score },

                              wrinkle: {
                                // @ts-expect-error: Supabase typing is too strict here

                                ui_score: scoreInfo.wrinkle?.ui_score,
                              },
                              // @ts-expect-error: Supabase typing is too strict here

                              pore: { ui_score: scoreInfo.pore?.ui_score },
                              texture: {
                                // @ts-expect-error: Supabase typing is too strict here

                                ui_score: scoreInfo.texture?.ui_score,
                              },
                            },
                          });
                        } catch (error) {
                          console.error(
                            "Error generating skin analysis result:",
                            error
                          );
                          // Optional: Show user-friendly error message
                          alert("Failed to generate result. Please try again.");
                        }
                      }}
                      style={{
                        background: "linear-gradient(135deg, #f847b4, #ff6bc7)",
                        color: "white",
                        border: "none",
                        padding: "1rem 2rem",
                        borderRadius: "10px",
                        fontSize: "1rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        boxShadow: "0 6px 20px rgba(248, 71, 180, 0.3)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        // @ts-expect-error: Supabase typing is too strict here

                        e.target.style.transform = "translateY(-2px)";
                        // @ts-expect-error: Supabase typing is too strict here

                        e.target.style.boxShadow =
                          "0 8px 25px rgba(248, 71, 180, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        // @ts-expect-error: Supabase typing is too strict here

                        e.target.style.transform = "translateY(0)";
                        // @ts-expect-error: Supabase typing is too strict here

                        e.target.style.boxShadow =
                          "0 6px 20px rgba(248, 71, 180, 0.3)";
                      }}
                    >
                      Download Result
                    </button>
                  </div>
                )}

                {retake ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      background:
                        "linear-gradient(135deg, #ffd9f0, rgba(255, 217, 240, 0.5))",
                      borderRadius: "16px",
                      border: "1px solid rgba(248, 71, 180, 0.2)",
                    }}
                  >
                    <p
                      style={{
                        color: "#f847b4",
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        marginBottom: "1.5rem",
                      }}
                    >
                      {message}
                    </p>

                    <button
                      onClick={() => {
                        window.location.reload();
                      }}
                      style={{
                        background: analyzing
                          ? "linear-gradient(135deg, #ccc, #999)"
                          : "linear-gradient(135deg, #f847b4, #ff6bc7)",
                        color: "white",
                        border: "none",
                        padding: "1rem 2rem",
                        borderRadius: "12px",
                        fontSize: "1rem",
                        fontWeight: "600",
                        cursor: analyzing ? "not-allowed" : "pointer",
                        boxShadow: analyzing
                          ? "none"
                          : "0 8px 25px rgba(248, 71, 180, 0.4)",
                        transition: "all 0.3s ease",
                        transform: analyzing ? "none" : "translateY(-2px)",
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : null}

                {scoreInfo && hasAccess && (
                  <div style={{ marginBottom: "3rem" }}>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        background: `
                linear-gradient(135deg, 
                  rgba(248, 71, 180, 0.1) 0%, 
                  rgba(255, 217, 240, 0.3) 50%,
                  rgba(248, 71, 180, 0.1) 100%
                )
              `,
                        borderRadius: "20px",
                        border: "2px solid rgba(248, 71, 180, 0.2)",
                        boxShadow: "0 15px 35px rgba(248, 71, 180, 0.15)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "3rem",
                          marginBottom: "1rem",
                        }}
                      >
                        ⭐️
                      </div>
                      <h3
                        style={{
                          fontSize: "1.8rem",
                          background:
                            "linear-gradient(45deg, #f847b4, #ff6bc7)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          fontWeight: "700",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        Overall Skin Score
                      </h3>
                      <div
                        style={{
                          fontSize: "3rem",
                          fontWeight: "800",
                          color: "#f847b4",
                          textShadow: "0 2px 10px rgba(248, 71, 180, 0.3)",
                        }}
                      >
                        {scoreInfo.all?.score?.toFixed(1)}%
                      </div>
                      <p
                        style={{
                          color: "#666",
                          fontSize: "1rem",
                          margin: "0.5rem 0 0",
                        }}
                      >
                        Your comprehensive skin health rating
                      </p>
                    </div>
                  </div>
                )}

                {scoreInfo && hasAccess && routineRecommendation && (
                  <div
                    style={{
                      marginTop: "3rem",
                      padding: "2rem",
                      background:
                        "linear-gradient(135deg, rgba(255, 217, 240, 0.3), rgba(248, 71, 180, 0.05))",
                      borderRadius: "20px",
                      border: "1px solid rgba(248, 71, 180, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        marginBottom: "2rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.8rem",
                          background:
                            "linear-gradient(45deg, #f847b4, #ff6bc7)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          fontWeight: "700",
                          margin: 0,
                        }}
                      >
                        {routineRecommendation.routine.name}
                      </h3>
                      <p
                        style={{
                          color: "#666",
                          fontSize: "1rem",
                          margin: "0.5rem 0 0",
                        }}
                      >
                        {routineRecommendation.routine.description}
                      </p>
                      <div
                        style={{
                          marginTop: "1rem",
                          display: "flex",
                          justifyContent: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            background: "rgba(248, 71, 180, 0.1)",
                            color: "#f847b4",
                            padding: "0.3rem 0.8rem",
                            borderRadius: "20px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {routineRecommendation.routineLevel
                            .charAt(0)
                            .toUpperCase() +
                            routineRecommendation.routineLevel.slice(1)}{" "}
                          Level
                        </span>
                        <span
                          style={{
                            background: "rgba(248, 71, 180, 0.1)",
                            color: "#f847b4",
                            padding: "0.3rem 0.8rem",
                            borderRadius: "20px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          Total: {routineRecommendation.totalCost}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        marginBottom: "3rem",
                        padding: "2rem",
                        background: "rgba(255, 255, 255, 0.7)",
                        borderRadius: "16px",
                        border: "1px solid rgba(248, 71, 180, 0.1)",
                        margin: "0 auto 3rem auto",
                        maxWidth: "1200px",
                      }}
                    >
                      <h4
                        style={{
                          color: "#f847b4",
                          fontSize: "1.4rem",
                          fontWeight: "700",
                          marginBottom: "1rem",
                          textAlign: "center",
                        }}
                      >
                        Your Complete Skincare Routine
                        <span
                          style={{
                            fontSize: "1rem",
                            fontStyle: "italic",
                            color: "#888",
                            fontWeight: "400",
                          }}
                        >
                          - Targets:
                          {routineRecommendation.routine.targets.join(", ")}
                        </span>
                      </h4>

                      {/* Group products by step */}
                      {[
                        "cleanser",
                        "toner",
                        "serum",
                        "moisturizer",
                        "sunscreen",
                      ].map((step) => {
                        const stepProducts =
                          routineRecommendation.routine.products.filter(
                            (p: any) => p.step === step
                          );

                        if (stepProducts.length === 0) return null;

                        return (
                          <div key={step} style={{ marginBottom: "2rem" }}>
                            <h5
                              style={{
                                textTransform: "capitalize",
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                margin: "1rem 0 0.5rem",
                                color: "#333",
                              }}
                            >
                              {step}
                            </h5>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "2rem",
                                marginTop: "1rem",
                                justifyContent: "center",
                                justifyItems: "center",
                              }}
                            >
                              {stepProducts.map((product: any) => (
                                <div
                                  key={product.id}
                                  style={{
                                    width: "100%",
                                    maxWidth: "250px",
                                  }}
                                >
                                  <div
                                    style={{
                                      overflow: "hidden",
                                      marginBottom: "1rem",
                                      borderRadius: "8px",
                                    }}
                                  >
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  </div>

                                  <h5
                                    style={{
                                      margin: "0 0 0.5rem",
                                      fontWeight: "600",
                                      color: "#333",
                                      fontSize: "1rem",
                                      lineHeight: "1.3",
                                      textAlign: "center",
                                    }}
                                  >
                                    {product.name}
                                  </h5>

                                  <p
                                    style={{
                                      margin: "0 0 0.5rem",
                                      color: "#888",
                                      fontSize: "0.9rem",
                                      textAlign: "center",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {product.brand}
                                  </p>

                                  <p
                                    style={{
                                      margin: "0 0 1rem",
                                      color: "#f847b4",
                                      fontWeight: "700",
                                      fontSize: "1.1rem",
                                      textAlign: "center",
                                    }}
                                  >
                                    {product.price_html}
                                  </p>

                                  <a
                                    href={product.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "inline-block",
                                      background:
                                        "linear-gradient(135deg, #f847b4, #ff6bc7)",
                                      color: "white",
                                      textDecoration: "none",
                                      padding: "0.8rem 1.5rem",
                                      borderRadius: "10px",
                                      fontSize: "0.9rem",
                                      fontWeight: "600",
                                      boxShadow:
                                        "0 4px 15px rgba(248, 71, 180, 0.3)",
                                      transition: "all 0.3s ease",
                                      width: "100%",
                                      textAlign: "center",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(-2px)";
                                      e.currentTarget.style.boxShadow =
                                        "0 6px 20px rgba(248, 71, 180, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform =
                                        "translateY(0)";
                                      e.currentTarget.style.boxShadow =
                                        "0 4px 15px rgba(248, 71, 180, 0.3)";
                                    }}
                                  >
                                    Shop Now
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <style jsx>{`
              @keyframes spin {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }

              @keyframes shimmer {
                0% {
                  left: -100%;
                }
                100% {
                  left: 100%;
                }
              }

              .premium-spinner {
                position: relative;
              }

              .premium-spinner::after {
                content: "";
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border-radius: 50%;
                background: linear-gradient(45deg, #f847b4, #ffd9f0);
                animation: pulse 1s ease-in-out infinite alternate;
              }

              /* Custom scrollbar */
              div::-webkit-scrollbar {
                width: 6px;
              }
              div::-webkit-scrollbar-track {
                background: rgba(248, 71, 180, 0.1);
                border-radius: 10px;
              }
              div::-webkit-scrollbar-thumb {
                background: linear-gradient(45deg, #f847b4, #ff6bc7);
                border-radius: 10px;
              }

              @keyframes pulse {
                0% {
                  transform: scale(0.8);
                  opacity: 0.5;
                }
                100% {
                  transform: scale(1.2);
                  opacity: 1;
                }
              }
            `}</style>
          </main>
          <Footer />
        </>
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(email, hasAccess) => {
            setShowLoginModal(false);
            if (hasAccess && uploadResponse?.file_id) {
              runSkinAnalysis(uploadResponse.file_id);
            }
          }}
        />
      )}
    </>
  );
}
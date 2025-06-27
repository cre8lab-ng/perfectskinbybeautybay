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
  extractSkinAnalysisResults,
  getGranularLevel,
  handleCustomDownload,
  notifyError,
} from "@/util/utils";
import { skinProductMap } from "@/data/skinProductMap";
import WebPageTitle from "@/components/webpagetitle";
import { useResultAccess } from "@/stores/useResultAccess";
import LoginModal from "@/components/modal/login";
import { loadPaystackScript } from "@/util/paystack";
import { runMediaPipeFaceDetection } from "@/util/faceValidation";

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

interface Product {
  id: number | string;
  name: string;
  image: string;
  price_html: string;
  link: string;
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

export function getRecommendedProducts(scoreInfo: ScoreInfo | null): {
  concern: string;
  level: string;
  products: Product[];
}[] {
  if (!scoreInfo) return [];

  const concerns = ["acne", "wrinkle", "texture", "pore"] as const;
  return concerns.map((concern) => {
    const uiScore = scoreInfo?.[concern]?.ui_score;
    const level = getGranularLevel(uiScore ? `${uiScore}%` : undefined);
    const products = skinProductMap[concern]?.[level] || [];
    return { concern, level, products };
  });
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true); // 👈 toggle overlay state
  const [lastCaptureMethod, setLastCaptureMethod] = useState<
    "upload" | "camera" | null
  >(null);
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const [zipContent, setZipContent] = useState<ZipImage[]>([]);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  const productRecommendations = getRecommendedProducts(scoreInfo);

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

  const runSkinAnalysis = async (fileId: string) => {
    if (!accessToken) return notifyError("Access token not available");
    setAnalyzing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const analysis = await analyzeSkinFeatures(fileId, accessToken, [
        "acne",
        "wrinkle",
        "pore",
        "texture",
      ]);

      const taskId = analysis.result.task_id;
      if (!taskId) throw new Error("No task_id returned");

      const status = await pollAnalysisStatus(taskId, accessToken);
      setAnalysisStatus(status);
    } catch (err) {
      console.log(err);
      setRetake(true);
      console.log(err);
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

        console.log(`🔄 Polling attempt ${attempts + 1}, status: ${status}`);

        if (status === "success") {
          console.log("✅ Analysis successful, processing results...");

          const zipUrl = res.result?.results?.[0]?.data?.[0]?.url;
          if (!zipUrl) throw new Error("No ZIP URL found in result");

          const { score, images } = await extractSkinAnalysisResults(zipUrl);
          if (score) setScoreInfo(score);
          if (images.length > 0) setZipContent(images);

          const currentEmail = useResultAccess.getState().userEmail;

          console.log("📊 Results processed, now granting access...");
          console.log("👤 Current userEmail:", currentEmail);
          console.log("🔐 Current hasAccess:", hasAccess);

          // ✅ Grant access only after successful analysis via secure API
          if (currentEmail) {
            console.log("🚀 Making API request to grant access...");

            try {
              const apiRes = await fetch("/api/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: currentEmail,
                  type: "mark-analysis",
                  source: "analysis",
                }),
              });

              console.log("📡 API Response status:", apiRes.status);
              console.log("📡 API Response ok:", apiRes.ok);

              const data = await apiRes.json();
              console.log("📄 API Response data:", data);

              if (!apiRes.ok) {
                console.error("❌ API request failed:", apiRes.status, data);
                throw new Error(
                  `API request failed: ${data.error || "Unknown error"}`
                );
              }

              if (data.success === false) {
                console.warn("❌ Failed to insert free access:", data.reason);
                // Handle specific failure reasons
                if (data.reason === "already_exists") {
                  console.log("✅ User already has access recorded");
                } else if (data.reason === "no_payment") {
                  console.error("❌ No valid payment found for user");
                  // Don't throw error for no payment - might be intentional
                  console.log("ℹ️ Continuing without database insertion");
                }
              } else if (data.success === true) {
                console.log("✅ Successfully granted free access to user!");
              }
            } catch (error) {
              console.error("❌ Error granting access:", error);
              // Don't fail the entire analysis for access issues
              console.log("⚠️ Analysis completed but access grant failed");
            }
          } else {
            console.warn("⚠️ No userEmail available - cannot grant access");
            console.log("🔍 Check if user is logged in or email is set");
          }

          console.log("✅ Analysis flow completed");
          return res;
        }

        if (status === "error") {
          console.warn("❌ Server returned error:", res.result?.error_message);
          break;
        }

        console.log(`⏳ Status: ${status}, retrying in 500ms...`);
      } catch (err) {
        console.error("❌ Polling error:", err);
      }

      attempts++;
      await delay(500);
    }

    throw new Error("❌ Polling timed out after max attempts");
  };

  useEffect(() => {
    return () => {
      console.log("👋 User left skin analysis page. Resetting access...");
      useResultAccess.getState().resetAccess();
    };
  }, []);
  console.log(analysisStatus);


  async function handleCustomDownload() {
    console.log("🚀 Starting download process...");
  
    const fallbackValues = {
      score: "N/A",
      concernScores: {
        acne: "N/A",
        wrinkle: "N/A",
        pore: "N/A",
        texture: "N/A",
      },
    };
  
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
  
      let width = 800;
      let height = 600;
      const extraHeight = 340; // Increased for better layout
  
      const loadImageSafely = (src, label = "image", timeoutMs = 10000) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const timeout = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
          img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`Failed to load ${label}`));
          };
          img.src = src;
        });
  
      let baseImage = null;
      if (originalImagePreview) {
        try {
          baseImage = await loadImageSafely(originalImagePreview, "base");
          width = baseImage.width;
          height = baseImage.height;
        } catch (err) {
          console.warn("Fallback to default base size");
        }
      }
  
      let logoImage = null;
      try {
        logoImage = await loadImageSafely("/images/bh-logo.png", "logo", 5000);
      } catch (err) {
        console.warn("Logo failed");
      }
  
      canvas.width = Math.max(width, 400);
      canvas.height = Math.max(height + extraHeight, 400);

      // 🌟 Premium gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#ffeef8");
      gradient.addColorStop(0.3, "#f8e8f5");
      gradient.addColorStop(0.7, "#f0d9eb");
      gradient.addColorStop(1, "#e8c9e0");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 🌸 Subtle pattern overlay
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < canvas.width; i += 40) {
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.fillStyle = "#d946ef";
          ctx.fillRect(i, j, 20, 20);
        }
      }
      ctx.globalAlpha = 1;

      // 📱 Modern card container
      const cardPadding = 30;
      const cardX = cardPadding;
      const cardY = 20;
      const cardWidth = canvas.width - (cardPadding * 2);
      const cardHeight = canvas.height - 40;

      // Card background with subtle shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 🌟 Header section
      let currentY = cardY + 40;

      if (logoImage) {
        const logoWidth = Math.min(180, cardWidth * 0.5);
        const logoHeight = 50;
        const logoX = cardX + (cardWidth - logoWidth) / 2;
        
        // Logo background circle
        ctx.fillStyle = "rgba(248, 71, 180, 0.1)";
        ctx.beginPath();
        ctx.arc(logoX + logoWidth/2, currentY + logoHeight/2, logoWidth/2 + 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.drawImage(logoImage, logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 30;
      } else {
        // Elegant title when no logo
        ctx.font = "bold 32px Arial, sans-serif";
        ctx.fillStyle = "#d946ef";
        ctx.textAlign = "center";
        ctx.fillText("BEAUTY HUB", canvas.width / 2, currentY);
        currentY += 50;
      }

      // ✨ Decorative divider
      ctx.strokeStyle = "rgba(248, 71, 180, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(cardX + 40, currentY);
      ctx.lineTo(cardX + cardWidth - 40, currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      currentY += 30;

      // 🖼️ Image section with elegant frame
      const imageY = currentY;
      const imageFramePadding = 15;
      const frameX = cardX + imageFramePadding;
      const frameWidth = cardWidth - (imageFramePadding * 2);
      const frameHeight = height;

      // Image frame with gradient border
      const frameGradient = ctx.createLinearGradient(frameX, imageY, frameX + frameWidth, imageY + frameHeight);
      frameGradient.addColorStop(0, "#f472b6");
      frameGradient.addColorStop(0.5, "#d946ef");
      frameGradient.addColorStop(1, "#a855f7");
      ctx.strokeStyle = frameGradient;
      ctx.lineWidth = 4;
      ctx.roundRect(frameX - 2, imageY - 2, frameWidth + 4, frameHeight + 4, 12);
      ctx.stroke();

      // White inner frame
      ctx.fillStyle = "#ffffff";
      ctx.roundRect(frameX, imageY, frameWidth, frameHeight, 8);
      ctx.fill();

      if (baseImage) {
        ctx.save();
        ctx.roundRect(frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10, 8);
        ctx.clip();
        ctx.drawImage(baseImage, frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10);
        ctx.restore();
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.roundRect(frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10, 8);
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("No Image Available", frameX + frameWidth/2, imageY + frameHeight/2);
      }

      // Apply overlays within the frame
      if (zipContent && zipContent.length) {
        for (const mask of zipContent) {
          try {
            const img = await loadImageSafely(mask.url, mask.name);
            ctx.save();
            ctx.roundRect(frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10, 8);
            ctx.clip();
            ctx.globalAlpha = 0.7;
            ctx.globalCompositeOperation = "overlay";
            ctx.drawImage(img, frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10);
            ctx.restore();
          } catch (err) {
            console.warn("Overlay fail", mask.name);
          }
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      if (canvasRef?.current) {
        try {
          ctx.save();
          ctx.roundRect(frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10, 8);
          ctx.clip();
          ctx.drawImage(canvasRef.current, frameX + 5, imageY + 5, frameWidth - 10, frameHeight - 10);
          ctx.restore();
        } catch (err) {
          console.warn("Failed to draw canvas overlay");
        }
      }

      // 📊 Results section
      currentY = imageY + frameHeight + 40;

      // 🏆 Total score with premium styling
      let totalScore = fallbackValues.score;
      if (scoreInfo?.all?.score !== undefined) {
        totalScore = `${scoreInfo.all.score.toFixed(1)}%`;
      }

      // Score background
      const scoreBoxWidth = 280;
      const scoreBoxHeight = 60;
      const scoreBoxX = cardX + (cardWidth - scoreBoxWidth) / 2;

      const scoreGradient = ctx.createLinearGradient(scoreBoxX, currentY - 10, scoreBoxX + scoreBoxWidth, currentY + scoreBoxHeight - 10);
      scoreGradient.addColorStop(0, "#f472b6");
      scoreGradient.addColorStop(1, "#d946ef");

      ctx.fillStyle = scoreGradient;
      ctx.roundRect(scoreBoxX, currentY - 10, scoreBoxWidth, scoreBoxHeight, 15);
      ctx.fill();

      // Score text
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`Total Skin Score: ${totalScore}`, canvas.width / 2, currentY + 20);

      currentY += 70;

      // 📋 Individual scores with modern card design
      const concerns = ["acne", "wrinkle", "pore", "texture"];
      const concernColors = ["#ec4899", "#d946ef", "#a855f7", "#8b5cf6"];
      const concernIcons = ["●", "◆", "▲", "■"];

      ctx.font = "18px Arial, sans-serif";
      const scoreItemWidth = (cardWidth - 60) / 2;
      const scoreItemHeight = 45;

      concerns.forEach((key, index) => {
        let score = fallbackValues.concernScores[key];
        if (scoreInfo?.[key]?.ui_score !== undefined) {
          score = `${scoreInfo[key].ui_score}%`;
        }
        
        const row = Math.floor(index / 2);
        const col = index % 2;
        const itemX = cardX + 30 + (col * (scoreItemWidth + 20));
        const itemY = currentY + (row * (scoreItemHeight + 15));
        
        // Score item background
        ctx.fillStyle = "rgba(248, 71, 180, 0.08)";
        ctx.roundRect(itemX, itemY, scoreItemWidth, scoreItemHeight, 8);
        ctx.fill();
        
        // Color accent
        ctx.fillStyle = concernColors[index];
        ctx.roundRect(itemX, itemY, 4, scoreItemHeight, 2);
        ctx.fill();
        
        // Icon and text
        ctx.fillStyle = concernColors[index];
        ctx.font = "16px Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(concernIcons[index], itemX + 15, itemY + 20);
        
        ctx.fillStyle = "#374151";
        ctx.font = "bold 16px Arial, sans-serif";
        ctx.fillText(key.charAt(0).toUpperCase() + key.slice(1), itemX + 35, itemY + 20);
        
        ctx.fillStyle = concernColors[index];
        ctx.font = "bold 18px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(score, itemX + scoreItemWidth - 15, itemY + 20);
      });

      currentY += 120;

      // ✨ Footer section with elegant styling
      ctx.strokeStyle = "rgba(248, 71, 180, 0.2)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(cardX + 40, currentY);
      ctx.lineTo(cardX + cardWidth - 40, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      currentY += 25;

      // 📅 Timestamp with icon
      const timestamp = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      ctx.font = "16px Arial, sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "center";
      ctx.fillText(`📅 Generated: ${timestamp}`, canvas.width / 2, currentY);

      currentY += 25;

      // 🏷️ Brand watermark with style
      ctx.font = "bold 18px Arial, sans-serif";
      const brandGradient = ctx.createLinearGradient(0, currentY - 10, canvas.width, currentY + 10);
      brandGradient.addColorStop(0, "#f472b6");
      brandGradient.addColorStop(1, "#d946ef");
      ctx.fillStyle = brandGradient;
      ctx.fillText("✨ Generated by Cre8Lab", canvas.width / 2, currentY);

      // 🌟 Final decorative elements
      ctx.fillStyle = "rgba(248, 71, 180, 0.1)";
      for (let i = 0; i < 5; i++) {
        const x = cardX + 20 + (i * (cardWidth - 40) / 4);
        const y = cardY + cardHeight - 20;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 🖼️ Final download
      const filename = `beautyhub-skin-result-${Date.now()}.jpg`;
      canvas.toBlob((blob) => {
        if (!blob) return alert("Download failed");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, "image/jpeg", 0.95);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Something went wrong. Please try again.");
    }
  }
  
  
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
              productRecommendations.length > 0) && (
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

                {faceDetectionLoading && (
                  <div
                    style={{
                      textAlign: "center",
                      margin: "2rem 0",
                      padding: "2rem",
                      background:
                        "linear-gradient(135deg, #ffd9f0, rgba(255, 217, 240, 0.3))",
                      borderRadius: "16px",
                      border: "1px solid rgba(248, 71, 180, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "2rem",
                        marginBottom: "1rem",
                      }}
                    >
                      ✨
                    </div>
                    <p
                      style={{
                        fontWeight: "700",
                        color: "#f847b4",
                        fontSize: "1.2rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      Detecting your beautiful face...
                    </p>
                    <div
                      className="premium-spinner"
                      style={{
                        width: "50px",
                        height: "50px",
                        border: "3px solid rgba(248, 71, 180, 0.2)",
                        borderTop: "3px solid #f847b4",
                        borderRadius: "50%",
                        animation:
                          "spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
                        margin: "0 auto",
                        boxShadow: "0 4px 15px rgba(248, 71, 180, 0.3)",
                      }}
                    />
                  </div>
                )}

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
                      ref={imageRef} // 🆕 ADD THIS
                      src={originalImagePreview}
                      alt="Analyzed Face"
                      style={{
                        width: "100%",
                        display: "block",
                        borderRadius: "8px",
                      }}
                    />

                    {/* Analyzing Div */}

                    {/* ✅ Overlay this block ON TOP of the image */}
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
                            "linear-gradient(135deg, #ffd9f0, rgba(255, 217, 240, 0.5))",
                          borderRadius: "20px",
                          border: "1px solid rgba(248, 71, 180, 0.3)",
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
                              "linear-gradient(90deg, transparent, rgba(248, 71, 180, 0.1), transparent)",
                            animation: "shimmer 2s infinite",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "3rem",
                            marginBottom: "1rem",
                            background:
                              "linear-gradient(45deg, #f847b4, #ffd9f0)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          🧬
                        </div>
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
                            fontSize: "0.9rem",
                            margin: "0.5rem 0 0",
                          }}
                        >
                          Our AI is mapping your unique skin profile
                        </p>
                      </div>
                    )}

                    {/* Overlays from backend masks */}
                    {showOverlays &&
                      zipContent.length > 0 &&
                      zipContent.map((mask, i) => {
                        const name = mask.name.toLowerCase();
                        let filter =
                          "contrast(250%) brightness(120%) saturate(180%)";
                        let blendMode = "normal"; // default unless overridden

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
                              mixBlendMode: blendMode,
                              pointerEvents: "none",
                            }}
                          />
                        );
                      })}

                    {/* {scoreInfo?.all?.score && hasAccess && (
                      <div
                        style={{
                          position: "absolute",
                          left: "10%",
                          top: "65%",
                          fontSize: "2.2rem",
                          color: "white",
                          fontWeight: "bold",
                          textShadow: "0 2px 4px rgba(0,0,0,0.6)",
                        }}
                      >
                        Skin Age {Math.round(scoreInfo.all.score)}
                      </div>
                    )} */}

                    {hasAccess && !analyzing && (
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
                        }}
                      >
                        {["acne", "wrinkle", "pore", "texture"].map((key) => {
                          // @ts-expect-error: Supabase typing is too strict here
                          const score =
                            scoreInfo?.[key as keyof ScoreInfo]?.ui_score ?? 0;
                          const percentage = Math.min(Math.max(score, 0), 100);

                          return (
                            <div
                              key={key}
                              style={{
                                padding: "0.75rem",
                                minWidth: "100px", // Increased from 80px
                              }}
                            >
                              {/* Label */}
                              <div
                                style={{
                                  color: "white",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  textTransform: "capitalize",
                                  marginBottom: "0.5rem",
                                  textAlign: "center",
                                }}
                              >
                                {key}
                              </div>

                              {/* Circular Progress */}
                              <div
                                style={{
                                  position: "relative",
                                  width: "70px", // Increased from 50px
                                  height: "70px", // Increased from 50px
                                  margin: "0 auto",
                                }}
                              >
                                <svg
                                  width="70" // Increased from 50
                                  height="70" // Increased from 50
                                  style={{
                                    transform: "rotate(-90deg)",
                                  }}
                                >
                                  {/* Background circle */}
                                  <circle
                                    cx="35" // Adjusted center (70/2)
                                    cy="35" // Adjusted center (70/2)
                                    r="28" // Increased radius from 20
                                    fill="none"
                                    stroke="#ffd9f0"
                                    strokeWidth="6" // Increased from 4
                                  />
                                  {/* Progress circle */}
                                  <circle
                                    cx="35" // Adjusted center (70/2)
                                    cy="35" // Adjusted center (70/2)
                                    r="28" // Increased radius from 20
                                    fill="none"
                                    stroke="#f847b4"
                                    strokeWidth="6" // Increased from 4
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 28}`} // Updated for new radius
                                    strokeDashoffset={`${
                                      2 * Math.PI * 28 * (1 - percentage / 100)
                                    }`} // Updated for new radius
                                    style={{
                                      transition:
                                        "stroke-dashoffset 0.3s ease-in-out",
                                    }}
                                  />
                                </svg>
                                {/* Score in center */}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    color: "#f847b4",
                                    fontSize: "1rem", // Increased from 0.7rem
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
                  </div>
                )}

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

                {uploadResponse?.file_id && !scoreInfo && !retake && (
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
                      Your image is ready for premium analysis
                    </p>
                    <button
                      disabled={analyzing}
                      onClick={() => {
                        if (!hasAccess) {
                          setShowLoginModal(true);
                        } else if (!analyzing && uploadResponse?.file_id) {
                          runSkinAnalysis(uploadResponse.file_id);
                        }
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
                      {analyzing
                        ? "Analyzing..."
                        : hasAccess
                        ? "✨ View Premium Results"
                        : "🔐 Log In to View Results"}
                    </button>
                  </div>
                )}
                {scoreInfo && hasAccess && (
                  <div style={{ textAlign: "center", marginTop: "1rem",marginBottom:"1rem" }}>
                    <button
                      onClick={handleCustomDownload}
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
                      We couldn’t analyze your face. Please ensure your face is
                      clearly visible and well-centered in the photo or better
                      still upload an image.
                    </p>
                    <button
                      onClick={() => {
                        // Reset everything and go to camera prompt
                        setUploadResponse(null);
                        setScoreInfo(null);
                        setAnalysisStatus(null);
                        setOriginalImagePreview(null);
                        setProcessedImagePreview(null);
                        setLastCaptureMethod("camera");
                        setShowCameraPrompt(true);
                        setRetake(false);
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

                {scoreInfo &&
                  hasAccess &&
                  productRecommendations.length > 0 && (
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
                          Personalized Beauty Recommendations
                        </h3>
                        <p
                          style={{
                            color: "#666",
                            fontSize: "1rem",
                            margin: "0.5rem 0 0",
                          }}
                        >
                          Curated products tailored to your unique skin profile
                        </p>
                      </div>

                      {productRecommendations.map(
                        ({ concern, level, products }) => (
                          <div
                            key={concern}
                            style={{
                              marginBottom: "3rem",
                              padding: "2rem",
                              background: "rgba(255, 255, 255, 0.7)",
                              borderRadius: "16px",
                              border: "1px solid rgba(248, 71, 180, 0.1)",
                              // Center the entire container horizontally
                              margin: "0 auto 3rem auto",
                              maxWidth: "1200px", // Optional: set max width
                            }}
                          >
                            <h4
                              style={{
                                textTransform: "capitalize",
                                color: "#f847b4",
                                fontSize: "1.4rem",
                                fontWeight: "700",
                                marginBottom: "1rem",
                                textAlign: "center",
                              }}
                            >
                              {concern} Care Solutions
                              <span
                                style={{
                                  fontSize: "1rem",
                                  fontStyle: "italic",
                                  color: "#888",
                                  fontWeight: "400",
                                }}
                              >
                                {" "}
                                - {level.replace("_", " ")} priority
                              </span>
                            </h4>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "2rem",
                                marginTop: "1.5rem",
                                // Center the grid items when there are fewer items
                                justifyContent: "center",
                                justifyItems: "center",
                              }}
                            >
                              {products.map((product) => (
                                <div
                                  key={product.id}
                                  style={{
                                    // Center each product card
                                    width: "100%",
                                    maxWidth: "250px", // Optional: limit card width
                                  }}
                                >
                                  <div
                                    style={{
                                      overflow: "hidden",
                                      marginBottom: "1rem",
                                      borderRadius: "8px", // Added for better visual
                                    }}
                                  >
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      style={{
                                        width: "100%",
                                        height: "200px",
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
                                      textAlign: "center", // Center product name
                                    }}
                                  >
                                    {product.name}
                                  </h5>

                                  <p
                                    style={{
                                      margin: "0 0 1rem",
                                      color: "#f847b4",
                                      fontWeight: "700",
                                      fontSize: "1.1rem",
                                      textAlign: "center", // Center price
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
                        )
                      )}
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

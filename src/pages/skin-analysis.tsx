import React from "react";
import { useEffect, useState, ChangeEvent, useRef } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import InstructionModal from "@/components/modal/instruction-modal";
import PrivacyConsentModal from "@/components/modal/privacy-consent-modal";
import CameraPrompt from "@/components/camera-prompt";
import {
  generateSkinAnalysisResult,
  notifyError,
} from "@/util/utils";
import WebPageTitle from "@/components/webpagetitle";
import { runMediaPipeFaceDetection } from "@/util/faceValidation";
import { getRecommendedProducts } from "@/data/skinProductMap";
import SendResultModal from "@/components/modal/send-email";

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

type SkinType = "dry" | "oily" | "combination" | "normal" | "not_sure";
type Sensitivity = "low" | "medium" | "high";
type AcneFrequency = "none" | "occasional" | "often" | "severe";
type PoreVisibility = "minimal" | "some" | "very_visible";
type TextureFeel = "smooth" | "slightly_rough" | "very_rough";
type AgeRange = "under_18" | "18_24" | "25_34" | "35_44" | "45_plus";
type SunscreenUse = "daily" | "sometimes" | "rarely";
type SunExposure = "low" | "medium" | "high";

type SkinQuestionnaire = {
  skinType: SkinType;
  sensitivity: Sensitivity;
  acneFrequency: AcneFrequency;
  poreVisibility: PoreVisibility;
  textureFeel: TextureFeel;
  ageRange: AgeRange;
  sunscreenUse: SunscreenUse;
  sunExposure: SunExposure;
};

type FaceBox = { x: number; y: number; width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toUiScore(value: number) {
  return clamp(Math.round(value), 1, 100);
}

function questionnaireToBaseScores(q: SkinQuestionnaire) {
  const acneBase =
    q.acneFrequency === "none"
      ? 8
      : q.acneFrequency === "occasional"
      ? 30
      : q.acneFrequency === "often"
      ? 60
      : 85;

  const poreFromType =
    q.skinType === "oily"
      ? 70
      : q.skinType === "combination"
      ? 55
      : q.skinType === "normal"
      ? 35
      : q.skinType === "dry"
      ? 25
      : 45;

  const poreFromVisibility =
    q.poreVisibility === "minimal"
      ? 15
      : q.poreVisibility === "some"
      ? 40
      : 70;

  const textureFromFeel =
    q.textureFeel === "smooth"
      ? 15
      : q.textureFeel === "slightly_rough"
      ? 40
      : 70;

  const wrinkleFromAge =
    q.ageRange === "under_18"
      ? 10
      : q.ageRange === "18_24"
      ? 15
      : q.ageRange === "25_34"
      ? 25
      : q.ageRange === "35_44"
      ? 45
      : 65;

  const wrinkleFromSunscreen =
    q.sunscreenUse === "daily" ? 0 : q.sunscreenUse === "sometimes" ? 10 : 20;
  const wrinkleFromExposure =
    q.sunExposure === "low" ? 0 : q.sunExposure === "medium" ? 10 : 20;

  const sensitivityPenalty = q.sensitivity === "high" ? 10 : 0;

  return {
    acne: acneBase,
    pore: clamp(Math.round(0.6 * poreFromType + 0.4 * poreFromVisibility), 1, 100),
    texture: clamp(textureFromFeel + sensitivityPenalty, 1, 100),
    wrinkle: clamp(wrinkleFromAge + wrinkleFromSunscreen + wrinkleFromExposure, 1, 100),
  };
}

type ImageMetrics = {
  brightness: number;
  contrast: number;
  redness: number;
  edge: number;
};

type AnalysisBreakdown = {
  questionnaire: SkinQuestionnaire;
  base: { acne: number; pore: number; texture: number; wrinkle: number };
  metrics: ImageMetrics;
  weights: { questionnaire: number; image: number };
  combined: { acne: number; pore: number; texture: number; wrinkle: number; overall: number };
  qualityNote: string;
};

type Severity = "minimal" | "mild" | "moderate" | "high";

function severityFromConcernScore(score: number): Severity {
  if (score < 20) return "minimal";
  if (score < 40) return "mild";
  if (score < 65) return "moderate";
  return "high";
}

function toQualityScore(m: ImageMetrics) {
  const brightnessScore =
    m.brightness < 15
      ? 0
      : m.brightness < 25
      ? 35
      : m.brightness < 80
      ? 100
      : 60;
  const contrastScore = m.contrast < 10 ? 35 : m.contrast < 25 ? 70 : 100;
  return clamp(Math.round(0.6 * brightnessScore + 0.4 * contrastScore), 0, 100);
}

function heroProductFromRoutine(
  products: any[],
  topConcern: "acne" | "pore" | "texture" | "wrinkle",
  q: SkinQuestionnaire
) {
  const byStep = (step: string) => products.filter((p) => p.step === step);
  const has = (re: RegExp) => (p: any) => re.test(`${p.brand} ${p.name}`.toLowerCase());

  if (topConcern === "wrinkle") {
    const sunscreens = byStep("sunscreen");
    const preferred = sunscreens.find(has(/anthelios|uvmune|spf/));
    return preferred || sunscreens[0] || products[0] || null;
  }

  if (topConcern === "acne") {
    if (q.sensitivity === "high") {
      const gentle = byStep("cleanser").find(has(/cerave|cera\w*/));
      return gentle || byStep("cleanser")[0] || products[0] || null;
    }

    const bp = products.find(has(/benzoyl|panoxyl/));
    const sal = products.find(has(/salicylic/));
    return bp || sal || byStep("cleanser")[0] || products[0] || null;
  }

  if (topConcern === "texture") {
    if (q.sensitivity === "high") {
      const barrier = products.find(has(/cica|ceramide|snail|moistur/));
      return barrier || byStep("moisturizer")[0] || products[0] || null;
    }
    const acids = products.find(has(/aha|bha|pha|miracle|clarifying/));
    return acids || byStep("toner")[0] || products[0] || null;
  }

  if (topConcern === "pore") {
    const niacinamide = products.find(has(/niacinamide|propolis/));
    const bha = products.find(has(/bha|salicylic/));
    return niacinamide || bha || byStep("serum")[0] || products[0] || null;
  }

  return products[0] || null;
}

async function computeImageMetrics(img: HTMLImageElement, faceBox: FaceBox) {
  const maxSide = 256;
  const scale = Math.min(1, maxSide / Math.max(faceBox.width, faceBox.height));
  const w = Math.max(1, Math.round(faceBox.width * scale));
  const h = Math.max(1, Math.round(faceBox.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(
    img,
    faceBox.x,
    faceBox.y,
    faceBox.width,
    faceBox.height,
    0,
    0,
    w,
    h
  );

  const { data } = ctx.getImageData(0, 0, w, h);

  let count = 0;
  let sumL = 0;
  let sumL2 = 0;
  let sumRedDelta = 0;
  let sumEdge = 0;

  const stride = 2;
  const idx = (x: number, y: number) => (y * w + x) * 4;
  const lumaAt = (x: number, y: number) => {
    const i = idx(x, y);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const i = idx(x, y);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumL += l;
      sumL2 += l * l;

      const redDelta = r - (g + b) / 2;
      if (redDelta > 0) sumRedDelta += redDelta;

      if (x + stride < w) {
        sumEdge += Math.abs(l - lumaAt(x + stride, y));
      }
      if (y + stride < h) {
        sumEdge += Math.abs(l - lumaAt(x, y + stride));
      }

      count++;
    }
  }

  const meanL = sumL / Math.max(1, count);
  const variance = sumL2 / Math.max(1, count) - meanL * meanL;
  const sd = Math.sqrt(Math.max(0, variance));

  const brightness = clamp((meanL / 255) * 100, 0, 100);
  const contrast = clamp((sd / 64) * 100, 0, 100);
  const redness = clamp((sumRedDelta / Math.max(1, count)) / 40 * 100, 0, 100);
  const edge = clamp((sumEdge / Math.max(1, count)) / 35 * 100, 0, 100);

  return { brightness, contrast, redness, edge };
}

function concernMeaning(concern: "acne" | "pore" | "texture" | "wrinkle") {
  if (concern === "acne")
    return "This reflects tendency toward breakouts and congestion. It is not a diagnosis.";
  if (concern === "pore")
    return "This reflects the visibility of pores (often influenced by oil production, elasticity, and texture).";
  if (concern === "texture")
    return "This reflects surface roughness/unevenness (often influenced by dryness, buildup, and irritation).";
  return "This reflects the likelihood of fine lines being visible (often influenced by age, sun exposure, and hydration).";
}

function whatToDo(concern: "acne" | "pore" | "texture" | "wrinkle", q: SkinQuestionnaire) {
  if (concern === "acne") {
    const base =
      q.sensitivity === "high"
        ? "Prioritize barrier-first acne care: gentle cleanse, moisturize, and introduce exfoliants slowly."
        : "Use an acne-targeting cleanser and keep the rest of the routine gentle and consistent.";
    return `${base} Avoid scrubbing, and use sunscreen daily to prevent dark marks.`;
  }
  if (concern === "pore") {
    return "Focus on oil control + gentle exfoliation: a BHA/clarifying toner a few nights a week and daily sunscreen. Avoid harsh stripping cleansers.";
  }
  if (concern === "texture") {
    return q.sensitivity === "high"
      ? "Texture often improves when the skin barrier is calm: moisturize consistently and avoid over-exfoliating."
      : "Texture usually improves with controlled exfoliation (AHA/BHA) plus hydration. Start slowly (2–3 nights/week).";
  }
  return "The most evidence-based anti-aging step is daily broad-spectrum sunscreen. Add antioxidants (like vitamin C) as tolerated and keep the barrier well-hydrated.";
}

function isExfoliatingProductName(productName: string) {
  const n = productName.toLowerCase();
  return (
    n.includes("aha") ||
    n.includes("bha") ||
    n.includes("pha") ||
    n.includes("clarifying") ||
    n.includes("miracle") ||
    n.includes("salicylic")
  );
}

function stepHowToUse(step: string, productName: string, q: SkinQuestionnaire) {
  if (step === "sunscreen") {
    return "Every morning: apply 2 finger-lengths to face/neck. Reapply every 2–3 hours if outdoors.";
  }
  if (step === "cleanser") {
    return q.sensitivity === "high"
      ? "AM/PM: cleanse gently for 20–30 seconds. Avoid hot water."
      : "AM/PM: cleanse gently for 20–30 seconds. If skin feels tight, reduce cleansing to once daily.";
  }
  if (step === "toner") {
    return isExfoliatingProductName(productName)
      ? q.sensitivity === "high"
        ? "Night only: start 1–2 nights/week, then increase slowly as tolerated. Skip if stinging."
        : "Night only: start 2–3 nights/week, then increase as tolerated."
      : "AM/PM: apply after cleansing, then moisturize.";
  }
  if (step === "serum") {
    return "AM or PM: apply 2–3 drops to dry skin, then moisturize. Introduce one active at a time.";
  }
  if (step === "moisturizer") {
    return "AM/PM: apply to slightly damp skin to support the barrier.";
  }
  return "Use as directed and introduce slowly.";
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
  const [processedImagePreview, setProcessedImagePreview] = useState<
    string | null
  >(null);
  const [faceDetectionLoading, setFaceDetectionLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [retake, setRetake] = useState(false);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [message, setMessage] = useState<React.ReactNode>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true); // 👈 toggle overlay state
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const [zipContent, setZipContent] = useState<ZipImage[]>([]);
  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  const routineRecommendation = getRecommendedProducts(scoreInfo);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<SkinQuestionnaire>({
    skinType: "not_sure",
    sensitivity: "medium",
    acneFrequency: "occasional",
    poreVisibility: "some",
    textureFeel: "slightly_rough",
    ageRange: "25_34",
    sunscreenUse: "sometimes",
    sunExposure: "medium",
  });
  const [analysisBreakdown, setAnalysisBreakdown] =
    useState<AnalysisBreakdown | null>(null);
  const [heroProduct, setHeroProduct] = useState<any | null>(null);
  const [topConcern, setTopConcern] = useState<
    "acne" | "pore" | "texture" | "wrinkle" | null
  >(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null); // 🆕 ADD THIS
  const [showSendModal, setShowSendModal] = useState(false);

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

    if (!scoreInfo || !originalImagePreview || !showOverlays) return;

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
  }, [scoreInfo, originalImagePreview, showOverlays]);

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
              type: "image/jpeg",
            });
            resolve({ file: processedFile, previewUrl });
          },
          "image/jpeg",
          quality
        );
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(inputFile);
    });
  }

  const handleCaptureWithOverride = async (
    e?: ChangeEvent<HTMLInputElement>,
    capturedFile?: File | null
  ): Promise<void> => {
    if (faceDetectionLoading) return;
    if (!questionnaireCompleted) {
      setShowQuestionnaire(true);
      notifyError("Please answer the skin questionnaire first.");
      return;
    }

    const file = capturedFile ?? e?.target?.files?.[0];
    if (!file) return;

    let previewUrl = "";
    try {
      ({ previewUrl } = await resizeImageWithOverride(file));
      setScoreInfo(null);
      setZipContent([]);
      setProcessedImagePreview(previewUrl);
      setMessage(null);
      setRetake(false);
      setShowRetryButton(false);
      setAnalysisBreakdown(null);
      setHeroProduct(null);
      setTopConcern(null);
    } catch (err) {
      console.error(err);
      setMessage("We couldn't process that photo. Please retake and try again.");
      setRetake(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewUrl;

    await new Promise((resolve) => (img.onload = resolve));

    setFaceDetectionLoading(true);
    try {
      img.crossOrigin = "anonymous";
      img.src = previewUrl;

      await new Promise((res) => (img.onload = res));

      let faceBox: FaceBox | null = null;
      let landmarks: any[] | null = null;

      try {
        landmarks = await runMediaPipeFaceDetection(img);
      } catch (err) {
        console.warn("Face detection failed, falling back to center crop", err);
      }

      if (landmarks && landmarks.length > 0) {
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

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const padX = (maxX - minX) * 0.15;
        const padY = (maxY - minY) * 0.2;

        faceBox = {
          x: clamp(minX - padX, 0, img.width - 1),
          y: clamp(minY - padY, 0, img.height - 1),
          width: clamp(maxX - minX + padX * 2, 1, img.width),
          height: clamp(maxY - minY + padY * 2, 1, img.height),
        };
      } else {
        const boxWidth = Math.round(img.width * 0.62);
        const boxHeight = Math.round(img.height * 0.62);
        faceBox = {
          x: clamp(Math.round((img.width - boxWidth) / 2), 0, img.width - 1),
          y: clamp(Math.round((img.height - boxHeight) / 2), 0, img.height - 1),
          width: clamp(boxWidth, 1, img.width),
          height: clamp(boxHeight, 1, img.height),
        };
      }

      setAnalyzing(true);
      try {
        const base = questionnaireToBaseScores(questionnaire);
        const metrics = await computeImageMetrics(img, faceBox);
        const qualityScore = toQualityScore(metrics);
        const imageWeight = clamp(qualityScore / 100, 0.05, 0.25);
        const qWeight = 1 - imageWeight;

        if (metrics.brightness < 15) {
          setMessage("Your photo looks too dark. Please retake in better lighting.");
          setRetake(true);
          return;
        }

        const acneSignal = metrics.redness;
        const poreSignal = clamp(0.6 * metrics.contrast + 0.4 * metrics.edge, 0, 100);
        const textureSignal = clamp(0.55 * metrics.edge + 0.45 * metrics.contrast, 0, 100);
        const wrinkleSignal = metrics.edge;

        let acne = toUiScore(base.acne * qWeight + acneSignal * imageWeight);
        const pore = toUiScore(base.pore * qWeight + poreSignal * imageWeight);
        const texture = toUiScore(
          base.texture * qWeight + textureSignal * imageWeight
        );
        let wrinkle = toUiScore(base.wrinkle * qWeight + wrinkleSignal * imageWeight);

        if (questionnaire.acneFrequency === "none") acne = Math.min(acne, 25);
        if (questionnaire.ageRange === "under_18") wrinkle = Math.min(wrinkle, 20);

        const avgConcern = (acne + pore + texture + wrinkle) / 4;
        const overall = clamp(100 - avgConcern, 0, 100);

        const combined = { acne, pore, texture, wrinkle, overall };
        const concernEntries = [
          ["acne", acne],
          ["pore", pore],
          ["texture", texture],
          ["wrinkle", wrinkle],
        ] as const;
        const top = concernEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        setTopConcern(top);

        setScoreInfo({
          acne: { ui_score: acne },
          pore: { ui_score: pore },
          texture: { ui_score: texture },
          wrinkle: { ui_score: wrinkle },
          all: { score: overall },
        });

        const recommended = getRecommendedProducts({
          acne: { ui_score: acne },
          pore: { ui_score: pore },
          texture: { ui_score: texture },
          wrinkle: { ui_score: wrinkle },
          all: { score: overall },
        });

        if (recommended?.routine?.products?.length) {
          setHeroProduct(
            heroProductFromRoutine(recommended.routine.products, top, questionnaire)
          );
        }

        const qualityNote =
          qualityScore >= 80
            ? "Good lighting and contrast. Photo signals are reliable."
            : qualityScore >= 55
            ? "Okay photo quality. Results lean more on your questionnaire answers."
            : "Low photo quality. Results rely mostly on your questionnaire answers.";

        setAnalysisBreakdown({
          questionnaire,
          base,
          metrics,
          weights: { questionnaire: qWeight, image: imageWeight },
          combined,
          qualityNote,
        });
      } catch (err) {
        console.error(err);
        setMessage(
          <>
            We couldn&apos;t analyze your skin. Please retake your photo or{" "}
            <a
              href="mailto:support@beautybayafrica.com"
              style={{
                color: "#f847b4",
                textDecoration: "underline",
                marginLeft: "0.25rem",
              }}
            >
              contact support
            </a>
            .
          </>
        );
        setRetake(true);
      } finally {
        setAnalyzing(false);
      }

      // ✅ If you want to re-enable blur/brightness checks later, reinsert these:
      // const box = getBoundingBox(landmarks, img.width, img.height);
      // const ctx = canvas.getContext("2d")!;
      // const brightness = getAverageBrightness(ctx, box);
      // const blurry = isImageBlurry(ctx, box);
    } catch (error) {
      console.warn("MediaPipe face detection failed", error);
      setMessage("We couldn't analyze that photo. Please retake and try again.");
      setRetake(true);
    } finally {
      setFaceDetectionLoading(false);
    }
  };

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

  const finalRoutine = scoreInfo
    ? getRecommendedProducts({
        acne: { ui_score: scoreInfo.acne?.ui_score ?? 0 },
        pore: { ui_score: scoreInfo.pore?.ui_score ?? 0 },
        texture: { ui_score: scoreInfo.texture?.ui_score ?? 0 },
        wrinkle: { ui_score: scoreInfo.wrinkle?.ui_score ?? 0 },
        all: { score: scoreInfo.all?.score ?? 0 },
      })
    : null;
  const topConcernScore =
    topConcern && scoreInfo ? (scoreInfo as any)[topConcern]?.ui_score ?? 0 : 0;
  const routine = (finalRoutine || routineRecommendation)?.routine ?? null;
  const routineProducts = routine?.products ?? [];

  return (
    <>
      {showPrivacyModal && (
        <PrivacyConsentModal
          onAgree={() => {
            setShowPrivacyModal(false);
            if (questionnaireCompleted) {
              setShowInstructionModal(true);
            } else {
              setShowQuestionnaire(true);
            }
          }}
        />
      )}

      {showInstructionModal && (
        <InstructionModal
          onTakeSelfie={() => {
            setShowInstructionModal(false);
            setShowCameraPrompt(true);
          }}
          onUploadPhoto={() => {
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
          <WebPageTitle title="Perfect Skin By Beauty Bay" />
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

            {showQuestionnaire && (
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  maxWidth: "720px",
                  margin: "0 auto",
                  padding: "2rem",
                  background: "rgba(255, 255, 255, 0.85)",
                  borderRadius: "20px",
                  border: "1px solid rgba(248, 71, 180, 0.2)",
                  boxShadow: "0 20px 60px rgba(248, 71, 180, 0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.8rem",
                    fontWeight: "800",
                    textAlign: "center",
                    background: "linear-gradient(45deg, #f847b4, #ff6bc7)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Quick Skin Questionnaire
                </h2>
                <p
                  style={{
                    margin: "0.75rem 0 1.75rem",
                    textAlign: "center",
                    color: "#666",
                    fontSize: "1rem",
                  }}
                >
                  Answer a few questions first, then we&apos;ll scan your photo and
                  generate your results on-device.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {[
                    {
                      label: "Skin type",
                      value: questionnaire.skinType,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          skinType: v as SkinType,
                        })),
                      options: [
                        ["not_sure", "Not sure"],
                        ["dry", "Dry"],
                        ["normal", "Normal"],
                        ["combination", "Combination"],
                        ["oily", "Oily"],
                      ] as const,
                    },
                    {
                      label: "Sensitivity",
                      value: questionnaire.sensitivity,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          sensitivity: v as Sensitivity,
                        })),
                      options: [
                        ["low", "Low"],
                        ["medium", "Medium"],
                        ["high", "High"],
                      ] as const,
                    },
                    {
                      label: "Acne frequency",
                      value: questionnaire.acneFrequency,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          acneFrequency: v as AcneFrequency,
                        })),
                      options: [
                        ["none", "None"],
                        ["occasional", "Occasional"],
                        ["often", "Often"],
                        ["severe", "Severe"],
                      ] as const,
                    },
                    {
                      label: "Pores visibility",
                      value: questionnaire.poreVisibility,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          poreVisibility: v as PoreVisibility,
                        })),
                      options: [
                        ["minimal", "Minimal"],
                        ["some", "Some"],
                        ["very_visible", "Very visible"],
                      ] as const,
                    },
                    {
                      label: "Skin texture",
                      value: questionnaire.textureFeel,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          textureFeel: v as TextureFeel,
                        })),
                      options: [
                        ["smooth", "Smooth"],
                        ["slightly_rough", "Slightly rough"],
                        ["very_rough", "Very rough"],
                      ] as const,
                    },
                    {
                      label: "Age range",
                      value: questionnaire.ageRange,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          ageRange: v as AgeRange,
                        })),
                      options: [
                        ["under_18", "Under 18"],
                        ["18_24", "18–24"],
                        ["25_34", "25–34"],
                        ["35_44", "35–44"],
                        ["45_plus", "45+"],
                      ] as const,
                    },
                    {
                      label: "Sunscreen use",
                      value: questionnaire.sunscreenUse,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          sunscreenUse: v as SunscreenUse,
                        })),
                      options: [
                        ["daily", "Daily"],
                        ["sometimes", "Sometimes"],
                        ["rarely", "Rarely"],
                      ] as const,
                    },
                    {
                      label: "Sun exposure",
                      value: questionnaire.sunExposure,
                      onChange: (v: string) =>
                        setQuestionnaire((prev) => ({
                          ...prev,
                          sunExposure: v as SunExposure,
                        })),
                      options: [
                        ["low", "Low"],
                        ["medium", "Medium"],
                        ["high", "High"],
                      ] as const,
                    },
                  ].map((field) => (
                    <div
                      key={field.label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.4rem",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          color: "#444",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {field.label}
                      </label>
                      <select
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        style={{
                          padding: "0.9rem 1rem",
                          borderRadius: "14px",
                          border: "2px solid rgba(248, 71, 180, 0.2)",
                          background: "white",
                          outline: "none",
                          fontSize: "1rem",
                        }}
                      >
                        {field.options.map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "1.75rem", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionnaireCompleted(true);
                      setShowQuestionnaire(false);
                      setShowInstructionModal(true);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #f847b4, #ff6bc7)",
                      color: "white",
                      border: "none",
                      padding: "1rem 2rem",
                      borderRadius: "14px",
                      fontSize: "1rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 10px 25px rgba(248, 71, 180, 0.35)",
                    }}
                  >
                    Continue to Scan
                  </button>
                </div>
              </div>
            )}

            {!showQuestionnaire &&
              (showCameraPrompt ||
                faceDetectionLoading ||
                analyzing ||
                scoreInfo ||
                zipContent.length > 0 ||
                processedImagePreview ||
                routineRecommendation ||
                analysisBreakdown ||
                heroProduct) && (
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
                    {!analyzing && !faceDetectionLoading && scoreInfo && (
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

                {scoreInfo && (
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

                {scoreInfo && (finalRoutine || routineRecommendation) && (
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
                        marginBottom: "3rem",
                        padding: "2rem",
                        background: "rgba(255, 255, 255, 0.7)",
                        borderRadius: "16px",
                        border: "1px solid rgba(248, 71, 180, 0.1)",
                        margin: "0 auto 3rem auto",
                        maxWidth: "1200px",
                      }}
                    >
                      {analysisBreakdown && topConcern && heroProduct && (
                        <div
                          style={{
                            marginBottom: "2rem",
                            padding: "1.5rem",
                            borderRadius: "16px",
                            border: "1px solid rgba(248, 71, 180, 0.15)",
                            background:
                              "linear-gradient(135deg, rgba(248, 71, 180, 0.06), rgba(255, 255, 255, 0.8))",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 0.5rem",
                              fontSize: "1.3rem",
                              fontWeight: "800",
                              color: "#2c3e50",
                              textAlign: "center",
                            }}
                          >
                            Best Pick For You (Derm‑style)
                          </h4>
                          <p
                            style={{
                              margin: "0 0 1rem",
                              color: "#666",
                              textAlign: "center",
                            }}
                          >
                            Top priority:{" "}
                            <span style={{ color: "#f847b4", fontWeight: 800 }}>
                              {topConcern.toUpperCase()}
                            </span>{" "}
                            ({severityFromConcernScore(
                              topConcernScore
                            )})
                          </p>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: "1rem",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ textAlign: "center" }}>
                              <img
                                src={heroProduct.image}
                                alt={heroProduct.name}
                                style={{
                                  width: "160px",
                                  height: "160px",
                                  objectFit: "contain",
                                  margin: "0 auto",
                                  borderRadius: "12px",
                                  background: "white",
                                  border: "1px solid rgba(0,0,0,0.06)",
                                }}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "1.05rem",
                                  color: "#2c3e50",
                                }}
                              >
                                {heroProduct.brand} — {heroProduct.name}
                              </div>
                              <div style={{ color: "#666", marginTop: "0.35rem" }}>
                                Why: {concernMeaning(topConcern)}
                              </div>
                              <div style={{ color: "#666", marginTop: "0.35rem" }}>
                                How to use:{" "}
                                {topConcern === "wrinkle"
                                  ? "Apply generously every morning and reapply if outdoors."
                                  : topConcern === "acne"
                                  ? analysisBreakdown.questionnaire.sensitivity ===
                                    "high"
                                    ? "Use once daily. If dryness/irritation happens, reduce frequency and moisturize."
                                    : "Start 3–4x/week, then increase as tolerated. Moisturize after."
                                  : topConcern === "texture"
                                  ? analysisBreakdown.questionnaire.sensitivity ===
                                    "high"
                                    ? "Use daily to support barrier. Avoid stacking many actives at once."
                                    : "If it’s an exfoliating toner, start 2–3 nights/week and increase slowly."
                                  : "Use as directed. Introduce one active at a time to reduce irritation."}
                              </div>
                              <div style={{ color: "#666", marginTop: "0.35rem" }}>
                                Safety: patch test first; stop if burning, swelling, or rash.
                              </div>
                              <div style={{ marginTop: "0.75rem" }}>
                                <a
                                  href={heroProduct.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-block",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "12px",
                                    background:
                                      "linear-gradient(135deg, #f847b4, #ff6bc7)",
                                    color: "white",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                  }}
                                >
                                  Shop this product
                                </a>
                              </div>
                            </div>
                          </div>

                          {analysisBreakdown && routineProducts.length > 0 && (
                            <div style={{ marginTop: "1.5rem" }}>
                              <h5
                                style={{
                                  margin: "0 0 0.75rem",
                                  fontSize: "1.1rem",
                                  fontWeight: "900",
                                  color: "#2c3e50",
                                  textAlign: "center",
                                }}
                              >
                                Your Full Routine (Derm‑built)
                              </h5>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(240px, 1fr))",
                                  gap: "1rem",
                                }}
                              >
                                {[
                                  "cleanser",
                                  "toner",
                                  "serum",
                                  "moisturizer",
                                  "sunscreen",
                                ].map((step) => {
                                  const product = routineProducts.find(
                                    (p: any) => p.step === step
                                  );
                                  if (!product) return null;
                                  return (
                                    <a
                                      key={step}
                                      href={product.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "80px 1fr",
                                        gap: "0.85rem",
                                        alignItems: "center",
                                        padding: "1rem",
                                        borderRadius: "14px",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        background: "rgba(255, 255, 255, 0.95)",
                                        textDecoration: "none",
                                      }}
                                    >
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{
                                          width: "80px",
                                          height: "80px",
                                          objectFit: "contain",
                                          borderRadius: "12px",
                                          background: "white",
                                          border: "1px solid rgba(0,0,0,0.06)",
                                        }}
                                      />
                                      <div>
                                        <div
                                          style={{
                                            fontSize: "0.85rem",
                                            textTransform: "capitalize",
                                            letterSpacing: "0.5px",
                                            fontWeight: 900,
                                            color: "#f847b4",
                                          }}
                                        >
                                          {step}
                                        </div>
                                        <div
                                          style={{
                                            fontWeight: 900,
                                            color: "#2c3e50",
                                            lineHeight: 1.2,
                                            marginTop: "0.15rem",
                                          }}
                                        >
                                          {product.brand} — {product.name}
                                        </div>
                                        <div style={{ color: "#666", marginTop: "0.35rem" }}>
                                          {stepHowToUse(
                                            step,
                                            product.name,
                                            analysisBreakdown.questionnaire
                                          )}
                                        </div>
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                              <div style={{ color: "#666", marginTop: "1rem" }}>
                                Morning: cleanser → (toner if gentle) → serum → moisturizer →
                                sunscreen. Night: cleanser → toner (if exfoliating, use on
                                alternate nights) → serum → moisturizer.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {analysisBreakdown && (
                        <div
                          style={{
                            marginBottom: "2rem",
                            padding: "1.5rem",
                            borderRadius: "16px",
                            border: "1px solid rgba(248, 71, 180, 0.12)",
                            background: "rgba(255, 255, 255, 0.9)",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 0.75rem",
                              fontSize: "1.2rem",
                              fontWeight: "800",
                              color: "#2c3e50",
                            }}
                          >
                            Explanation (based on your answers + your photo)
                          </h4>
                          <div style={{ color: "#666", marginBottom: "0.75rem" }}>
                            {analysisBreakdown.qualityNote}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: "1rem",
                              marginBottom: "1rem",
                            }}
                          >
                            <div
                              style={{
                                padding: "1rem",
                                borderRadius: "14px",
                                border: "1px solid rgba(0,0,0,0.06)",
                                background: "rgba(255, 255, 255, 0.85)",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 900,
                                  color: "#2c3e50",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                Your answers
                              </div>
                              <div style={{ color: "#666" }}>
                                Skin type:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.skinType.replace("_", " ")}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Sensitivity:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.sensitivity}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Acne frequency:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.acneFrequency.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Pores:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.poreVisibility.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Texture feel:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.textureFeel.replace(
                                    "_",
                                    " "
                                  )}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Sunscreen use:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.sunscreenUse}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Sun exposure:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.questionnaire.sunExposure}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                padding: "1rem",
                                borderRadius: "14px",
                                border: "1px solid rgba(0,0,0,0.06)",
                                background: "rgba(255, 255, 255, 0.85)",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 900,
                                  color: "#2c3e50",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                Photo signals (not a diagnosis)
                              </div>
                              <div style={{ color: "#666" }}>
                                Lighting:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.metrics.brightness >= 35
                                    ? "good"
                                    : analysisBreakdown.metrics.brightness >= 20
                                    ? "okay"
                                    : "low"}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Redness signal:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.metrics.redness >= 60
                                    ? "high"
                                    : analysisBreakdown.metrics.redness >= 35
                                    ? "moderate"
                                    : "low"}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Texture signal:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.metrics.edge >= 60
                                    ? "high"
                                    : analysisBreakdown.metrics.edge >= 35
                                    ? "moderate"
                                    : "low"}
                                </span>
                              </div>
                              <div style={{ color: "#666" }}>
                                Contrast detail:{" "}
                                <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                  {analysisBreakdown.metrics.contrast >= 45
                                    ? "high"
                                    : analysisBreakdown.metrics.contrast >= 25
                                    ? "moderate"
                                    : "low"}
                                </span>
                              </div>
                              <div style={{ color: "#666", marginTop: "0.75rem" }}>
                                The algorithm uses your answers as the primary driver and uses
                                the photo only as a small adjustment when quality is good.
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: "1rem",
                            }}
                          >
                            {(
                              [
                                ["acne", "Acne"],
                                ["pore", "Pores"],
                                ["texture", "Texture"],
                                ["wrinkle", "Wrinkles"],
                              ] as const
                            ).map(([key, label]) => {
                              const score = (scoreInfo as any)?.[key]?.ui_score ?? 0;
                              const sev = severityFromConcernScore(score);
                              return (
                                <div
                                  key={key}
                                  style={{
                                    padding: "1rem",
                                    borderRadius: "14px",
                                    border: "1px solid rgba(0,0,0,0.06)",
                                    background: "rgba(255, 217, 240, 0.25)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "baseline",
                                      gap: "0.75rem",
                                      marginBottom: "0.5rem",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 900,
                                        color: "#2c3e50",
                                      }}
                                    >
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: 900,
                                        color: "#f847b4",
                                      }}
                                    >
                                      {score} / 100
                                    </div>
                                  </div>
                                  <div style={{ color: "#666" }}>
                                    Severity:{" "}
                                    <span style={{ fontWeight: 800, color: "#2c3e50" }}>
                                      {sev}
                                    </span>
                                  </div>
                                  <div style={{ color: "#666", marginTop: "0.5rem" }}>
                                    {concernMeaning(key)}
                                  </div>
                                  <div style={{ color: "#666", marginTop: "0.5rem" }}>
                                    What to do: {whatToDo(key, analysisBreakdown.questionnaire)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ color: "#666", marginTop: "1rem" }}>
                            This tool is educational and cannot diagnose medical conditions. If
                            you have painful acne, sudden rashes, or worsening irritation, see a
                            dermatologist.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {scoreInfo && (
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

                {scoreInfo && (
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowSendModal(true)}
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "white",
                        border: "none",
                        padding: "0.875rem 1.75rem",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "500",
                        cursor: "pointer",
                        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        // @ts-expect-error: Supabase typing is too strict here
                        e.target.style.transform = "translateY(-2px)";
                        // @ts-expect-error: Supabase typing is too strict here
                        e.target.style.boxShadow =
                          "0 6px 20px rgba(99, 102, 241, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        // @ts-expect-error: Supabase typing is too strict here
                        e.target.style.transform = "translateY(0)";
                        // @ts-expect-error: Supabase typing is too strict here
                        e.target.style.boxShadow =
                          "0 4px 15px rgba(99, 102, 241, 0.3)";
                      }}
                    >
                      📧 Send Results via Email
                    </button>
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

      <SendResultModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        scoreInfo={scoreInfo}
        recommendations={
          routineRecommendation?.routine.products ?? [] // ✅ Always an array
        }
      />
    </>
  );
}

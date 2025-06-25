import { useEffect, useState, ChangeEvent } from "react";
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
  const { userEmail, hasAccess, showLoginModal, setShowLoginModal } =
    useResultAccess();

  // console.log(userEmail);
  // useEffect(() => {
  //   const loadModels = async () => {
  //     await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
  //     setModelsLoaded(true); // ✅ mark as loaded
  //   };
  //   loadModels();
  // }, []);

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
        alert(
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
      alert("Access token not available yet.");
      return;
    }

    setUploading(true);

    try {
      const res = await uploadImage(resizedFile, accessToken);
      if (!res?.file_id) throw new Error("Upload failed: Missing file_id.");
      setUploadResponse(res); // ✅ Store file_id for later use (delayed analysis)
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const runSkinAnalysis = async (fileId: string) => {
    if (!accessToken) return alert("Access token not available");
    setAnalyzing(true);

    try {
      const analysis = await analyzeSkinFeatures(fileId, accessToken, [
        "wrinkle",
        "pore",
        "texture",
        "acne",
      ]);

      const taskId = analysis.result.task_id;
      if (!taskId) throw new Error("No task_id returned");

      const status = await pollAnalysisStatus(taskId, accessToken);
      setAnalysisStatus(status);
    } catch (err) {
      alert("Analysis failed: " + (err as Error).message);
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

        if (status === "success") {
          console.log("✅ Poll success:", res);

          const zipUrl = res.result?.results?.[0]?.data?.[0]?.url;
          if (!zipUrl) throw new Error("No ZIP URL found in result");

          const { score, images } = await extractSkinAnalysisResults(zipUrl);
          if (score) setScoreInfo(score);
          if (images.length > 0) setZipContent(images);

          // ✅ Grant access only after successful analysis via secure API
          if (userEmail) {
            const apiRes = await fetch("/api/access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: userEmail,
                type: "mark-analysis",
                source: "analysis",
              }),
            });

            const data = await apiRes.json();
            if (!apiRes.ok || data.success === false) {
              console.warn(
                "❌ Failed to insert free access:",
                data.reason || data.error
              );
            }
          }

          return res;
        }

        if (status === "error") {
          console.warn("❌ Server returned error:", res.result?.error_message);
          break;
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      attempts++;
      await delay(500);
    }

    throw new Error("❌ Polling timed out after max attempts");
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
              productRecommendations.length > 0) && (
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(20px)",
                  padding: "3rem",
                  maxWidth: "800px",
                  margin: "2rem auto",
                  borderRadius: "24px",
                  boxShadow: `
          0 25px 50px rgba(248, 71, 180, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.6)
        `,
                  border: "1px solid rgba(248, 71, 180, 0.1)",
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

                {processedImagePreview && faceDetectionLoading && (
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
                      🔍
                    </div>
                    <p
                      style={{
                        color: "#f847b4",
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        margin: 0,
                      }}
                    >
                      Loading face detection model...
                    </p>
                  </div>
                )}

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

                {analyzing && (
                  <div
                    style={{
                      textAlign: "center",
                      margin: "2rem 0",
                      padding: "3rem 2rem",
                      background:
                        "linear-gradient(135deg, #ffd9f0, rgba(255, 217, 240, 0.5))",
                      borderRadius: "20px",
                      border: "1px solid rgba(248, 71, 180, 0.3)",
                      position: "relative",
                      overflow: "hidden",
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
                        background: "linear-gradient(45deg, #f847b4, #ffd9f0)",
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
                        color: "#888",
                        fontSize: "0.9rem",
                        margin: "0.5rem 0 0",
                      }}
                    >
                      Our AI is mapping your unique skin profile
                    </p>
                  </div>
                )}

                {originalImagePreview && (
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    <img
                      src={originalImagePreview}
                      alt="Original Face"
                      style={{
                        width: "100%",
                        display: "block",
                        backgroundColor: "#f5f5f5",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    />
                    {showOverlays &&
                      zipContent.length > 0 &&
                      zipContent.map((mask, i) => (
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
                            pointerEvents: "none",
                            opacity: 0.85,
                            zIndex: 2,
                            border: "1px dashed transparent",
                          }}
                        />
                      ))}
                  </div>
                )}

                {zipContent.length > 0 && (
                  <div
                    style={{
                      marginTop: "1rem",
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

                {uploadResponse?.file_id && !scoreInfo && (
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

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "2rem",
                        marginBottom: "2rem",
                      }}
                    >
                      {(["wrinkle", "pore", "texture", "acne"] as const).map(
                        (key) => {
                          const score = scoreInfo?.[key]?.ui_score ?? 0;
                          const raw =
                            scoreInfo?.[key]?.raw_score?.toFixed(2) ?? "N/A";
                          const level = getGranularLevel(`${score}%`);
                          const bgColor =
                            level === "very_high"
                              ? "#2e7d32"
                              : level === "high"
                              ? "#4caf50"
                              : level === "moderate"
                              ? "#ffa000"
                              : "#e53935";

                          return (
                            <div
                              key={key}
                              style={{
                                padding: "2rem",
                                background: `
                      linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.9) 0%, 
                        rgba(255, 217, 240, 0.3) 100%
                      )
                    `,
                                borderRadius: "20px",
                                border: "1px solid rgba(248, 71, 180, 0.1)",
                                boxShadow:
                                  "0 10px 30px rgba(248, 71, 180, 0.1)",
                                textAlign: "center",
                                position: "relative",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  top: "-20px",
                                  right: "-20px",
                                  width: "40px",
                                  height: "40px",
                                  background: "rgba(248, 71, 180, 0.1)",
                                  borderRadius: "50%",
                                }}
                              />

                              <div
                                style={{
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "50%",
                                  border: `6px solid ${bgColor}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.4rem",
                                  fontWeight: "700",
                                  margin: "0 auto 1rem",
                                  color: bgColor,
                                  position: "relative",
                                  background: `
                        conic-gradient(
                          ${bgColor} 0deg,
                          ${bgColor} ${(score / 100) * 360}deg,
                          rgba(248, 71, 180, 0.1) ${(score / 100) * 360}deg,
                          rgba(248, 71, 180, 0.1) 360deg
                        )
                      `,
                                  boxShadow: `0 8px 25px ${bgColor}30`,
                                }}
                              >
                                <div
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "50%",
                                    background: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "column",
                                  }}
                                >
                                  <span>{score}%</span>
                                  <span
                                    style={{
                                      fontSize: "0.6rem",
                                      color: "#999",
                                      marginTop: "2px",
                                    }}
                                  >
                                    Raw: {raw}
                                  </span>
                                </div>
                              </div>

                              <h4
                                style={{
                                  textTransform: "capitalize",
                                  fontSize: "1.3rem",
                                  color: "#f847b4",
                                  fontWeight: "700",
                                  margin: "0 0 0.5rem",
                                }}
                              >
                                {key}
                              </h4>
                            </div>
                          );
                        }
                      )}
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
                        <div
                          style={{
                            fontSize: "2.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          🧴
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
                              }}
                            >
                              {products.map((product) => (
                                <div
                                  key={product.id}
                                  style={{
                                    background: "white",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    border: "1px solid rgba(248, 71, 180, 0.1)",
                                    boxShadow:
                                      "0 8px 25px rgba(248, 71, 180, 0.08)",
                                    transition: "all 0.3s ease",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(-5px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 15px 35px rgba(248, 71, 180, 0.15)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(0)";
                                    e.currentTarget.style.boxShadow =
                                      "0 8px 25px rgba(248, 71, 180, 0.08)";
                                  }}
                                >
                                  <div
                                    style={{
                                      borderRadius: "12px",
                                      overflow: "hidden",
                                      marginBottom: "1rem",
                                      border:
                                        "1px solid rgba(248, 71, 180, 0.1)",
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
                                    ✨ Shop Now
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

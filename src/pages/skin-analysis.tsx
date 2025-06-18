// Modified to support face-api.js based face size check with loading spinner and fallback
import { useEffect, useState, ChangeEvent } from "react";
import * as faceapi from "face-api.js";
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
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { createWooCompletedOrder } from "@/services/woocommerce";

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

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<ScoreInfo | null>(null);
  const [zipContent, setZipContent] = useState<ZipImage[]>([]);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  console.log(setModelsLoaded);
  const productRecommendations = getRecommendedProducts(scoreInfo);

  
  console.log(uploading, analysisStatus, uploadResponse);
  const {
    userEmail,
    hasAccess,
    showLoginModal,
    setShowLoginModal,
    handleLogin,
  } = useResultAccess();

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models"); // 👈 make sure this matches your folder
    };
    loadModels();
  }, []);




  function resizeImageWithOverride(
    inputFile: File,
    quality = 0.6
  ): Promise<{ file: File; previewUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        const originalUrl = e.target?.result as string;
        setOriginalImagePreview(originalUrl); // new state to store this
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
      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      );

      if (!detection) {
        notifyError("No face detected. Please try another image.");
        return;
      }

      const box = detection.box;
      if (box.width < 300 || box.height < 300) {
        alert(
          "Your face is too small in the image. Please move closer or upload a clearer selfie."
        );
        return;
      }
    } catch (error) {
      console.warn("Face detection failed, proceeding anyway", error);
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

      <WebPageTitle title="Perfect Skin By BeautyHub" />
      <Header />
      <main
        style={{
          padding: "1rem",
          backgroundImage: "url('/images/perfectskin.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "50vh",
        }}
      >
        {(showCameraPrompt ||
          faceDetectionLoading ||
          analyzing ||
          scoreInfo ||
          zipContent.length > 0 ||
          processedImagePreview ||
          productRecommendations.length > 0) && (
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              maxWidth: "600px",
              margin: "2rem auto",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
          >
            {showCameraPrompt && (
              <CameraPrompt
                onCapture={(imageData) => {
                  setShowCameraPrompt(false);
                  const file = dataURLtoFile(imageData, "captured.jpg");
                  handleCaptureWithOverride(undefined, file);
                }}
              />
            )}

            {!modelsLoaded && (
              <div style={{ textAlign: "center", margin: "1rem" }}>
                <p>Loading face detection model...</p>
              </div>
            )}

            {faceDetectionLoading && (
              <div style={{ textAlign: "center", margin: "1rem" }}>
                <p style={{ fontWeight: "bold" }}>Detecting face...</p>
                <div
                  className="spinner"
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid #ccc",
                    borderTop: "4px solid #333",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto",
                  }}
                />
              </div>
            )}

            {analyzing && (
              <div style={{ textAlign: "center", margin: "1rem" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    border: "4px solid #ccc",
                    borderTop: "4px solid #333",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto",
                  }}
                />
                <p style={{ marginTop: "0.5rem" }}>
                  Analyzing skin features...
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
              {showOverlays && zipContent.length > 0 && zipContent.map((mask, i) => (
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
            <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
              <label style={{ fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={showOverlays}
                  onChange={() => setShowOverlays(!showOverlays)}
                  style={{ marginRight: "0.5rem" }}
                />
                Show skin concern overlays
              </label>
            </div>
          )}


            {uploadResponse?.file_id && !scoreInfo && (
              <>
                <p>
                  Your image is ready. Log in to view your skin analysis
                  results.
                </p>
                <button
  onClick={() => {
    if (!hasAccess) {
      setShowLoginModal(true);
    } else if (!analyzing && uploadResponse?.file_id) {
      runSkinAnalysis(uploadResponse.file_id);
    }
  }}
>
  {hasAccess ? "View Result" : "Log In to View Result"}
</button>

              </>
            )}

            {scoreInfo && hasAccess && (
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
                  🧪 Skin Analysis Results
                </h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
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
                        <li
                          key={key}
                          style={{
                            marginBottom: "2rem",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "50%",
                              border: `6px solid ${bgColor}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              marginRight: "1rem",
                              color: bgColor,
                              position: "relative",
                            }}
                          >
                            {score}%
                            <div
                              style={{
                                position: "absolute",
                                bottom: "-1.3rem",
                                fontSize: "0.75rem",
                                color: "#777",
                              }}
                            >
                              Raw: {raw}
                            </div>
                          </div>
                          <div>
                            <strong style={{ textTransform: "capitalize" }}>
                              {key}
                            </strong>{" "}
                            <span
                              style={{
                                fontStyle: "italic",
                                fontSize: "0.9rem",
                              }}
                            >
                              ({level.replace("_", " ")})
                            </span>
                            <div
                              style={{
                                background: "#eee",
                                borderRadius: "4px",
                                height: "8px",
                                marginTop: "4px",
                                width: "160px",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${score}%`,
                                  background: bgColor,
                                  borderRadius: "4px",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    }
                  )}
                  <li style={{ marginTop: "1rem", fontWeight: "bold" }}>
                    ⭐️ Overall Score:{" "}
                    <span style={{ fontSize: "1.1rem" }}>
                      {scoreInfo.all?.score?.toFixed(2)}%
                    </span>
                  </li>
                </ul>
              </div>
            )}

            {scoreInfo && hasAccess && productRecommendations.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <h3>🧴 Personalized Product Recommendations</h3>
                {productRecommendations.map(({ concern, level, products }) => (
                  <div key={concern} style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ textTransform: "capitalize" }}>
                      {concern} concern - <em>{level.replace("_", " ")}</em>
                    </h4>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}
                    >
                      {products.map((product) => (
                        <div key={product.id} style={{ width: "180px" }}>
                          <img
                            src={product.image}
                            alt={product.name}
                            style={{ width: "100%", borderRadius: "8px" }}
                          />
                          <p style={{ margin: "0.5rem 0", fontWeight: "bold" }}>
                            {product.name}
                          </p>
                          <p style={{ margin: 0, color: "#888" }}>
                            {product.price_html}
                          </p>
                          <a
                            href={product.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.9rem",
                              color: "#0066cc",
                              textDecoration: "underline",
                            }}
                          >
                            Shop now
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}{" "}
      </main>
      <Footer />
      {showLoginModal && (
  <LoginModal
    onClose={() => setShowLoginModal(false)}
    onLoginSuccess={(email, hasAccess) => {
      handleLogin(email);
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

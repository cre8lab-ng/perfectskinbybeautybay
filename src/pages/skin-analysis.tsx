import {  useRef, useState, ChangeEvent } from "react";
import useAccessToken from "@/stores/useAccessToken";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LoginModal from "@/components/modal/login";
import InstructionModal from "@/components/modal/instruction-modal";
import PrivacyConsentModal from "@/components/modal/privacy-consent-modal";
import CameraPrompt from "@/components/camera-feed";
import { getGranularLevel } from "@/util/utils";
import { skinProductMap } from "@/data/skinProductMap";

interface Product {
  id: number;
  name: string;
  price_html: string;
  brand: string;
  image: string;
  link: string;
}

interface AnalysisResult {
  wrinkle?: string;
  pore?: string;
  texture?: string;
  acne?: string;
}

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function getRandomPercentage(): string {
  return `${Math.floor(Math.random() * 101)}%`; // 0% - 100%
}

function generateRandomAnalysis(): AnalysisResult {
  return {
    wrinkle: getRandomPercentage(),
    pore: getRandomPercentage(),
    texture: getRandomPercentage(),
    acne: getRandomPercentage(),
  };
}

export default function Home() {
  const accessToken = useAccessToken((s) => s.accessToken);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [finalResults, setFinalResults] = useState<AnalysisResult | null>(null);
  const [productGroups, setProductGroups] = useState<{ [tag: string]: Product[] }>({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);
  const [pendingResults, setPendingResults] = useState<AnalysisResult | null>(null);
console.log(accessToken,customerEmail)
  function getRecommendedProducts(result: AnalysisResult): { [tag: string]: Product[] } {
    const recommendations: { [tag: string]: Product[] } = {};
    Object.entries(result).forEach(([concern, score]) => {
      const level = getGranularLevel(score);
      const productList = skinProductMap[concern]?.[level];
      if (productList?.length) {
        recommendations[concern] = productList;
      }
    });
    return recommendations;
  }

  const pollAnalysisStatus = async () => {
    const fakeSuccessResult = generateRandomAnalysis();
    setPendingResults(fakeSuccessResult);
    setAnalyzing(false);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = async (email: string) => {
    setCustomerEmail(email);
    setIsLoginModalOpen(false);
    setFinalResults(pendingResults);

    if (pendingResults) {
      const recommended = getRecommendedProducts(pendingResults);
      setProductGroups(recommended);
    }
  };

  const handleCapture = (
    e?: ChangeEvent<HTMLInputElement>,
    capturedFile?: File
  ) => {
    const file = capturedFile ?? e?.target?.files?.[0];
    if (!file) return;
    if (e?.target) e.target.value = ""; // allow reselecting same file

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setAnalyzing(true);
    pollAnalysisStatus();
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
            setTimeout(() => {
              fileInputRef.current?.click();
            }, 300); // ensure modal closes first
          }}
        />
      )}

      <Header />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => handleCapture(e)}
      />

      {showCameraPrompt && (
        <CameraPrompt
          onCapture={(imageData) => {
            setShowCameraPrompt(false);
            setPreview(imageData);
            const file = dataURLtoFile(imageData, "captured.jpg");
            handleCapture(undefined, file);
          }}
        />
      )}

      {!showCameraPrompt && (
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
          {(preview || isLoginModalOpen || finalResults || Object.keys(productGroups).length > 0) && (
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
              {preview && (
                <div style={{ marginBottom: "1rem", textAlign: "center" }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ maxWidth: "100%", height: "50%", borderRadius: "8px" }}
                  />
                  {analyzing && (
                    <p style={{ marginTop: "0.5rem", fontStyle: "italic" }}>
                      Analyzing image...
                    </p>
                  )}
                </div>
              )}

              {isLoginModalOpen && (
                <LoginModal
                  onClose={() => setIsLoginModalOpen(false)}
                  onLoginSuccess={handleLoginSuccess}
                />
              )}

              {finalResults && (
                <div style={{ marginTop: "1rem" }}>
                  <h2>Skin Analysis Result:</h2>
                  <ul>
                    <li>Wrinkles: {finalResults.wrinkle}</li>
                    <li>Pores: {finalResults.pore}</li>
                    <li>Texture: {finalResults.texture}</li>
                    <li>Acne: {finalResults.acne}</li>
                  </ul>
                </div>
              )}

              {Object.keys(productGroups).length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h2>Recommended Products:</h2>
                  {Object.entries(productGroups).map(([tag, products]) => (
                    <div key={tag} style={{ marginBottom: "2rem" }}>
                      <h3>{tag.toUpperCase()} Products</h3>
                      <ul style={{ listStyle: "none", padding: 0 }}>
                        {products.map((product) => (
                          <li
                            key={product.id}
                            style={{
                              background: "#f9f9f9",
                              padding: "10px",
                              marginBottom: "1rem",
                              borderRadius: "8px",
                            }}
                          >
                            <strong>{product.name}</strong>
                            <br />
                            <strong>{product.brand}</strong>
                            <div>
                              <img
                                src={product.image}
                                alt={product.name}
                                style={{ width: "100px", borderRadius: "5px" }}
                              />
                            </div>
                            <p dangerouslySetInnerHTML={{ __html: product.price_html }} />
                            <button
                              onClick={() => {
                                if (product.link) {
                                  window.open(product.link, "productDetailsTab")?.focus();
                                }
                              }}
                              style={{
                                display: "inline-block",
                                marginTop: "10px",
                                padding: "10px 20px",
                                backgroundColor: "#f847b4",
                                color: "white",
                                textDecoration: "none",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold",
                              }}
                            >
                              Shop Now
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <Footer />
    </>
  );
}

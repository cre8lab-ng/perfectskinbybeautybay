import { useEffect, useState, ChangeEvent } from "react";
import useAccessToken from "@/stores/useAccessToken";
import {
  uploadImage,
  analyzeSkinFeatures,
} from "@/services/skinanalysis";
// import { getProductsByTagName, createWooCompletedOrder } from "@/services/woocommerce";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LoginModal from "@/components/modal/login";
import InstructionModal from "@/components/modal/instruction-modal";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import PrivacyConsentModal from "@/components/modal/privacy-consent-modal";
import CameraPrompt from "@/components/camera-feed";
import ProductRecommender from "@/components/product-recommender";

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

interface AnalysisStatus {
  result: {
    status: "success" | "error" | "running";
    results?: AnalysisResult;
    error_message?: string;
  };
}

export interface UploadResponse {
  file_id: string;
  url?: string;
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

async function createWooCompletedOrder(email: string) {
  console.log(`Simulated WooCommerce order for: ${email}`);
  return { success: true };
}

export default function Home() {
  const accessToken = useAccessToken((s) => s.accessToken);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(
    null
  );
  const [finalResults, setFinalResults] = useState<AnalysisResult | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingResults, setPendingResults] = useState<AnalysisResult | null>(
    null
  );
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(true);
  const [showCameraPrompt, setShowCameraPrompt] = useState(false);

  console.log("preview:",setAnalysisStatus, setPendingProducts, preview);
  console.log("uploadResponse:", uploadResponse);
  console.log("uploading:", uploading);
  console.log("analyzing:", analyzing);
  console.log("finalResults:", finalResults);
  console.log("products:", products);
  console.log("isAuthorized:", isAuthorized);
  console.log("customerEmail:", customerEmail);

  useEffect(() => {
    loadPaystackScript();
  }, []);

  // const pollAnalysisStatus = async (
  //   taskId: string,
  //   accessToken: string
  // ): Promise<AnalysisStatus> => {
  //   let attempts = 0;
  //   const maxAttempts = 10;

  //   const delay = (ms: number) =>
  //     new Promise((resolve) => setTimeout(resolve, ms));

  //   while (attempts < maxAttempts) {
  //     try {
  //       const response = await checkSkinAnalysisStatus(taskId, accessToken);
  //       console.log(`Polling attempt ${attempts + 1}:`, response);

  //       const status = response?.result?.status;

  //       if (status === "success") {
  //         setAnalysisStatus(response);
  //         setPendingResults(response.result.results || null);
  //         return response;
  //       }

  //       if (status === "error") {
  //         throw new Error(response.result?.error_message || "Analysis failed");
  //       }
  //     } catch (err) {
  //       console.error("Poll error:", err);
  //     }

  //     attempts++;
  //     await delay(3000); 
  //   }

  //   throw new Error("Timed out while polling skin analysis task.");
  // };

  const handleLoginSuccess = async (email: string, hasAccess: boolean) => {
    setCustomerEmail(email);
    setIsLoginModalOpen(false);
    if (hasAccess) {
      setIsAuthorized(true);
      setFinalResults(pendingResults);
      setProducts(pendingProducts);
    } else {
      triggerPaystackPopup({
        email,
        amount: 500000,
        onSuccess: async () => {
          await createWooCompletedOrder(email);
          setIsAuthorized(true);
          setFinalResults(pendingResults);
          setProducts(pendingProducts);
        },
        onClose: () => alert("Payment cancelled."),
      });
    }
  };

  const handleCapture = (
    e?: ChangeEvent<HTMLInputElement>,
    capturedFile?: File
  ) => {
    const file = capturedFile ?? e?.target?.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    if (!accessToken) return alert("Access token not available yet.");
    setUploading(true);
    uploadImage(file, accessToken)
      .then((res) => {
        if (!res?.file_id) throw new Error("Upload failed: Missing file_id.");
        setUploadResponse(res);
        setAnalyzing(true);
        return analyzeSkinFeatures(res.file_id, accessToken, [
          "wrinkle",
          "pore",
          "texture",
          "acne",
        ]);
      })
      .then((analysisResult) => {
        const taskId = analysisResult.result.task_id;
        if (!taskId) throw new Error("No task_id found in analysis response");
        // return pollAnalysisStatus(taskId, accessToken);
      })
      .then(() => setPendingResults(analysisStatus?.result?.results || null))
      .catch((err) => alert(`Failed: ${err.message}`))
      .finally(() => {
        setUploading(false);
        setAnalyzing(false);
      });
  };

  console.log(LoginModal, isLoginModalOpen, handleLoginSuccess);
  return (
    <>
      {showPrivacyModal && (
        <PrivacyConsentModal
          onAgree={() => {
            setShowPrivacyModal(false);
            setShowInstructionModal(true); // 👉 show this AFTER agreeing
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

      <Header />

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
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleCapture(e)}
            />
            <ProductRecommender />
            <p>Test</p>
            {isLoginModalOpen && (
              <LoginModal
                onClose={() => setIsLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
          </div>
        </main>
      )}

      <Footer />
    </>
  );
}

import { useEffect, useState, ChangeEvent } from "react";
import useAccessToken from "@/stores/useAccessToken";
import {
  uploadImage,
  analyzeSkinFeatures,
  checkSkinAnalysisStatus,
} from "@/services/skinanalysis";
// import { getProductsByTagName, createWooCompletedOrder } from "@/services/woocommerce";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LoginModal from "@/components/modal/login";
import InstructionModal from "@/components/modal/instruction-modal";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import PrivacyConsentModal from "@/components/modal/privacy-consent-modal";
import CameraPrompt from "@/components/camera-feed";
import { notifyError } from "@/util/utils";

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
  console.log(email)
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

console.log(analysisStatus,finalResults,products,setPendingProducts,isAuthorized,customerEmail)
  

  useEffect(() => {
    loadPaystackScript();
  }, []);



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

  function resizeImage(file: File, maxWidth: number, minHeight: number, quality: number = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
  
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Failed to get canvas context"));
  
        let width = img.width;
        let height = img.height;
  
        // Resize image maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
        } else {
          if (height < minHeight) {
            width = (minHeight / height) * width;
            height = minHeight;
          }
        }
  
        canvas.width = width;
        canvas.height = height;
  
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, width, height);
  
        // Convert the canvas image to a Blob and then a File
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Compress and convert Blob to File
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              reject(new Error("Failed to convert image to blob"));
            }
          },
          file.type,
          quality // Set compression quality (0.0 to 1.0)
        );
      };
  
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
  
  const handleCapture = (
    e?: ChangeEvent<HTMLInputElement>,
    capturedFile?: File
  ) => {
    const file = capturedFile ?? e?.target?.files?.[0];
    if (!file) return;
  
    resizeImage(file, 1920, 480) // Resize image with max width of 1920px and min height of 480px
      .then((resizedFile) => {
        const previewUrl = URL.createObjectURL(resizedFile);
        setPreview(previewUrl);
        if (!accessToken) return alert("Access token not available yet.");
        setUploading(true);
        uploadImage(resizedFile, accessToken)
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
            console.log("Initial Analysis Response from Backend:", analysisResult);  // Log the backend response containing task_id
            const taskId = analysisResult.result.task_id;
            if (!taskId) throw new Error("No task_id found in analysis response");
            return pollAnalysisStatus(taskId, accessToken);  // Poll for final results
          })
          .then((finalAnalysisStatus) => {
            // Once polling is successful, log the analysis results
            console.log("Final Analysis Results from Backend:", finalAnalysisStatus);  // Log the correct final response after analysis
            setAnalysisStatus(finalAnalysisStatus);
            const results = finalAnalysisStatus?.result?.results;
            console.log("Final Analysis Results (from Polling):", results);  // Log the results from polling
             // @ts-expect-error - available_balance is a currency-formatted string (e.g. "₦ 430.00")
// We sanitize it before converting to number for comparison
            setPendingResults(results); // Store the final results
          })
          .catch((err) => alert(`Failed: ${err.message}`))
          .finally(() => {
            setUploading(false);
            setAnalyzing(false);
          });
      })
      .catch((err) => alert(`Image resizing failed: ${err.message}`));
  };
  
  const handleReRunAnalysis = () => {
    if (!uploadResponse?.file_id) {
      alert("No file uploaded to re-run the analysis.");
      return;
    }
  
    setUploading(true);
    setAnalyzing(true);
  
    analyzeSkinFeatures(uploadResponse.file_id, accessToken, [
      "wrinkle",
      "pore",
      "texture",
      "acne",
    ])
      .then((analysisResult) => {
        const taskId = analysisResult.result.task_id;
        if (!taskId) throw new Error("No task_id found in analysis response");
        return pollAnalysisStatus(taskId, accessToken); // Poll for final results
      })
      .then((finalAnalysisStatus) => {
        // Logging directly from here, right after polling returns the response
        console.log("Re-run Analysis Final Status:", finalAnalysisStatus); // Log response from polling
        setAnalysisStatus(finalAnalysisStatus);
        setPendingResults(finalAnalysisStatus?.result?.results || null);
        console.log("Re-run Analysis Results:", finalAnalysisStatus?.result?.results); // Log re-run results from polling
      })
      .catch((err) => alert(`Re-run failed: ${err.message}`))
      .finally(() => {
        setUploading(false);
        setAnalyzing(false);
      });
  };
  
  // Polling function, ensure you log the response here before state update
  const pollAnalysisStatus = async (
    taskId: string,
    accessToken: string
  ): Promise<AnalysisStatus> => {
    let attempts = 0;
    const maxAttempts = 10;
  
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  
    while (attempts < maxAttempts) {
      try {
        const response = await checkSkinAnalysisStatus(taskId, accessToken);
        const status = response?.result?.status;
  
        if (status === "success") {
          console.log("Polling Response:", response);
          return response; 
        }
  
        // Handle other cases like "running" or "error"
        if (status === "error") {
          notifyError(response.result?.error);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
  
      attempts++;
      await delay(300); // Wait before retrying
    }
  
    throw new Error("Timed out while polling skin analysis task.");
  };
  
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
              {preview && (
        <div>
          <img
            src={preview}
            alt="Image Preview"
            style={{ maxWidth: "100%", maxHeight: "500px" }}
          />
        </div>
      )}

      {/* Re-run Analysis Button */}
      <button onClick={handleReRunAnalysis} disabled={uploading || analyzing}>
        Re-run Analysis
      </button>


            {/* <ProductRecommender /> */}
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

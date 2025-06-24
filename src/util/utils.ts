import { toast } from "sonner";
import JSZip from "jszip";

export const notifySuccess = (successMessage: string) => {
  return toast.success(successMessage);
};

export const notifyError = (errorMessage: string) => {
  return toast.error(errorMessage);
};

export function getGranularLevel(score: string | undefined): "very_low" | "moderate" | "high" | "very_high" {
  if (!score) return "very_low";
  const percent = parseInt(score.replace("%", ""), 10);

  if (percent <= 30) return "very_low";
  if (percent <= 60) return "moderate";
  if (percent <= 90) return "high";
  return "very_high";
}

  export async function extractSkinAnalysisResults(zipUrl: string) {
    const zipBlob = await fetch(zipUrl).then((res) => res.blob());
    const zip = await JSZip.loadAsync(zipBlob);
  
    let parsedScoreJson = null;
    const images: { name: string; url: string }[] = [];
  
    const entries = Object.values(zip.files);
  
    for (const file of entries) {
      if (file.name.endsWith("score_info.json")) {
        const jsonText = await file.async("string");
        parsedScoreJson = JSON.parse(jsonText);
      } else if (/\.(png|jpg|jpeg)$/i.test(file.name)) {
        const blob = await file.async("blob");
        images.push({
          name: file.name,
          url: URL.createObjectURL(blob),
        });
      }
    }
  
    return { score: parsedScoreJson, images };
  }

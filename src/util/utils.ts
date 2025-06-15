import { toast } from "sonner";

export const notifySuccess = (successMessage: string) => {
  return toast.success(successMessage);
};

export function getGranularLevel(score: string | undefined): "very_low" | "moderate" | "high" | "very_high" {
  if (!score) return "very_low";
  const percent = parseInt(score.replace("%", ""), 10);

  if (percent <= 30) return "very_low";
  if (percent <= 60) return "moderate";
  if (percent <= 90) return "high";
  return "very_high";
}


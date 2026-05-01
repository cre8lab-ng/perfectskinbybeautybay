export async function sendSkinAnalysisEmail(
  to: string,
  resultsHtml: string,
  recommendations: any[]
) {
  const res = await fetch("/api/send-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, resultsHtml, recommendations }),
  });

  if (!res.ok) {
    throw new Error("Failed to send email");
  }
}

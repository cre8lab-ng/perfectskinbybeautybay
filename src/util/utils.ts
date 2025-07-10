import { toast } from "sonner";
import JSZip from "jszip";

interface ScoreInfo {
  all?: { score: string | number };
  acne?: { ui_score: string | number };
  wrinkle?: { ui_score: string | number };
  pore?: { ui_score: string | number };
  texture?: { ui_score: string | number };
}

interface GenerateSkinAnalysisParams {
  originalImageSrc: string;
  scoreInfo: ScoreInfo;
}

export const notifySuccess = (successMessage: string) => {
  return toast.success(successMessage);
};

export const notifyError = (errorMessage: string) => {
  return toast.error(errorMessage);
};

export function getGranularLevel(
  score: string | undefined
): "very_low" | "moderate" | "high" | "very_high" {
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
    console.log("Found file in ZIP:", file.name); // ✅ Helps confirm paths like 'skinanalysisResult/score_info.json'

    if (file.dir) continue; // ✅ Skip folders

    if (file.name.toLowerCase().includes("score_info.json")) {
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

export const errorMessages: Record<string, string> = {
  error_src_face_too_small:
    "your face is too far away. Please move closer to the camera",
  error_src_face_out_of_bound:
    "your face is partially outside the frame. Please center your face within the camera view",
  error_large_face_angle:
    "your face is tilted. Please look straight at the camera with your head upright",
};

export function generateSkinAnalysisResult({
  originalImageSrc,
  scoreInfo,
}: GenerateSkinAnalysisParams): void {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

  // Ultra-premium rendering settings
  ctx.textRendering = "optimizeLegibility";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const logo: HTMLImageElement = new Image();
  const productImage: HTMLImageElement = new Image();

  logo.crossOrigin = "anonymous";
  productImage.crossOrigin = "anonymous";

  logo.src = "/images/bh-logo.png";
  productImage.src = originalImageSrc;

  Promise.all([
    new Promise<void>((res) => (logo.onload = () => res())),
    new Promise<void>((res) => (productImage.onload = () => res())),
  ]).then(() => {
    canvas.width = 900;
    canvas.height = 1700;

    // BEAUTY HUB VIBRANT COLOR PALETTE - Instagram Ready
    const brandPink = "#f847b4"; // Primary brand color
    const lightPink = "#ffd9f0"; // Secondary brand color
    const deepPink = "#e239a3"; // Darker shade
    const gradientPink = "#ff6bc7"; // Gradient variation
    const pureWhite = "#ffffff";
    const brightBackground = "#fff5fc"; // Bright pink-tinted background
    const vibrantAccent = "#ff4da6"; // More vibrant accent
    const textDark = "#2c3e50";
    const textLight = "#6c757d";
    const shadowColor = "rgba(248, 71, 180, 0.2)";

    // VIBRANT GRADIENT BACKGROUND - Instagram Worthy
    const backgroundGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 3, 0,
      canvas.width / 2, canvas.height / 3, canvas.height
    );
    backgroundGradient.addColorStop(0, pureWhite);
    backgroundGradient.addColorStop(0.4, brightBackground);
    backgroundGradient.addColorStop(0.8, lightPink);
    backgroundGradient.addColorStop(1, "#ffe8f7");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ELEGANT HEADER SECTION - Fixed Logo Size
    const headerY = 40;
    const logoSize = 120; // Increased logo size to prevent shrinking
    const logoX = (canvas.width - logoSize) / 2;

    // Logo with premium shadow - Fixed size preservation
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    
    // Ensure logo maintains aspect ratio
    const logoAspectRatio = logo.width / logo.height;
    const logoWidth = logoSize;
    const logoHeight = logoSize / logoAspectRatio;
    
    ctx.drawImage(logo, logoX, headerY, logoWidth, logoHeight);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // MAGNIFICENT BRAND TYPOGRAPHY
    const titleY = headerY + logoHeight + 40;

    // Premium subtitle - Bigger and more visible
    ctx.font = "bold 36px Inconsolata, monospace";
    ctx.fillStyle = textDark;
    ctx.textAlign = "center";
    ctx.fillText("AI-Powered Skin Analysis", canvas.width / 2, titleY + 55);

    // PREMIUM DIVIDER
    const dividerY = titleY + 130;
    const dividerGradient = ctx.createLinearGradient(
      150,
      dividerY,
      750,
      dividerY
    );
    dividerGradient.addColorStop(0, "rgba(248, 71, 180, 0)");
    dividerGradient.addColorStop(0.5, brandPink);
    dividerGradient.addColorStop(1, "rgba(248, 71, 180, 0)");
    ctx.strokeStyle = dividerGradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(150, dividerY);
    ctx.lineTo(750, dividerY);
    ctx.stroke();

    // SPECTACULAR IMAGE SHOWCASE - Larger for better visual impact
    const imageY = dividerY + 60;
    const imageSize = 450;
    const imageX = (canvas.width - imageSize) / 2;

    // Premium image container with gradient border
    const borderSize = 6;
    const borderGradient = ctx.createLinearGradient(
      imageX - borderSize,
      imageY - borderSize,
      imageX + imageSize + borderSize,
      imageY + imageSize + borderSize
    );
    borderGradient.addColorStop(0, brandPink);
    borderGradient.addColorStop(0.5, gradientPink);
    borderGradient.addColorStop(1, deepPink);

    ctx.fillStyle = borderGradient;
    ctx.fillRect(
      imageX - borderSize,
      imageY - borderSize,
      imageSize + borderSize * 2,
      imageSize + borderSize * 2
    );

    // White inner border for contrast
    ctx.fillStyle = pureWhite;
    ctx.fillRect(imageX - 3, imageY - 3, imageSize + 6, imageSize + 6);

    // Premium shadow for image
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 12;

    // Main image
    ctx.drawImage(productImage, imageX, imageY, imageSize, imageSize);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // SPECTACULAR OVERALL SCORE
    const overallScoreY = imageY + imageSize + 80;
    const overallScore = scoreInfo.all?.score ?? "N/A";

    // Premium score container
    const overallBoxWidth = 650;
    const overallBoxHeight = 180;
    const overallBoxX = (canvas.width - overallBoxWidth) / 2;

    // Premium gradient background
    const scoreGradient = ctx.createLinearGradient(
      overallBoxX,
      overallScoreY,
      overallBoxX + overallBoxWidth,
      overallScoreY + overallBoxHeight
    );
    scoreGradient.addColorStop(0, brandPink);
    scoreGradient.addColorStop(0.5, gradientPink);
    scoreGradient.addColorStop(1, deepPink);

    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;

    // Rounded rectangle for modern look
    ctx.fillStyle = scoreGradient;
    ctx.beginPath();
    ctx.roundRect(
      overallBoxX,
      overallScoreY,
      overallBoxWidth,
      overallBoxHeight,
      25
    );
    ctx.fill();

    // Premium highlight effect
    const highlightGradient = ctx.createLinearGradient(
      overallBoxX,
      overallScoreY,
      overallBoxX + overallBoxWidth,
      overallScoreY + 70
    );
    highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.4)");
    highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.roundRect(
      overallBoxX,
      overallScoreY,
      overallBoxWidth,
      70,
      [25, 25, 0, 0]
    );
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Premium score display - Bigger font
    ctx.font = "bold 110px Inconsolata, monospace";
    ctx.fillStyle = pureWhite;
    ctx.textAlign = "center";
    ctx.fillText(String(overallScore), canvas.width / 2, overallScoreY + 85);

    ctx.font = "bold 32px Inconsolata, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText("OVERALL SKIN SCORE", canvas.width / 2, overallScoreY + 125);

    // PREMIUM DETAILED ANALYSIS SECTION
    const resultsY = overallScoreY + 260;

    // Section title - Bigger
    ctx.font = "bold 52px Inconsolata, monospace";
    const detailsGradient = ctx.createLinearGradient(
      0,
      resultsY,
      canvas.width,
      resultsY
    );
    detailsGradient.addColorStop(0, brandPink);
    detailsGradient.addColorStop(0.5, gradientPink);
    detailsGradient.addColorStop(1, deepPink);
    ctx.fillStyle = detailsGradient;
    ctx.textAlign = "center";
    ctx.fillText("Detailed Analysis", canvas.width / 2, resultsY);

    // Premium section divider
    const sectionDividerY = resultsY + 35;
    const sectionGradient = ctx.createLinearGradient(
      200,
      sectionDividerY,
      700,
      sectionDividerY
    );
    sectionGradient.addColorStop(0, "rgba(248, 71, 180, 0)");
    sectionGradient.addColorStop(0.5, brandPink);
    sectionGradient.addColorStop(1, "rgba(248, 71, 180, 0)");
    ctx.strokeStyle = sectionGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, sectionDividerY);
    ctx.lineTo(700, sectionDividerY);
    ctx.stroke();

    // ENHANCED SCORE CARDS - No borders, bigger text and progress
    const scoresStartY = resultsY + 100;
    const scores = [
      { label: "Acne", value: scoreInfo.acne?.ui_score ?? "N/A" },
      { label: "Wrinkles", value: scoreInfo.wrinkle?.ui_score ?? "N/A" },
      { label: "Pores", value: scoreInfo.pore?.ui_score ?? "N/A" },
      { label: "Texture", value: scoreInfo.texture?.ui_score ?? "N/A" },
    ];

    const cardWidth = 200;
    const cardHeight = 280; // Increased height for bigger elements
    const cardSpacing = 15;
    const totalWidth = cardWidth * 4 + cardSpacing * 3;
    const startX = (canvas.width - totalWidth) / 2;

    // Function to draw enhanced circular progress
    function drawCircularProgress(x: number, y: number, radius: number, percentage: number) {
      const centerX = x;
      const centerY = y;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;

      // Background circle - thicker
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255, 217, 240, 0.4)";
      ctx.lineWidth = 12;
      ctx.stroke();

      // Progress circle - thicker and more vibrant
      if (percentage > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        const progressGradient = ctx.createLinearGradient(
          centerX - radius, centerY - radius,
          centerX + radius, centerY + radius
        );
        progressGradient.addColorStop(0, brandPink);
        progressGradient.addColorStop(1, vibrantAccent);
        ctx.strokeStyle = progressGradient;
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    scores.forEach((score, index) => {
      const cardX = startX + index * (cardWidth + cardSpacing);
      const cardY = scoresStartY;
      const scoreValue =
        typeof score.value === "number"
          ? score.value
          : parseFloat(String(score.value)) || 0;

      // Clean card background - no borders
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.shadowColor = "rgba(248, 71, 180, 0.1)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 5;
      
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Enhanced circular progress - bigger
      const progressCenterX = cardX + cardWidth / 2;
      const progressCenterY = cardY + 80;
      const progressRadius = 45; // Increased radius
      
      drawCircularProgress(progressCenterX, progressCenterY, progressRadius, scoreValue);

      // Score value in center of circle - bigger
      ctx.font = "bold 36px Inconsolata, monospace";
      ctx.fillStyle = brandPink;
      ctx.textAlign = "center";
      ctx.fillText(String(score.value), progressCenterX, progressCenterY + 12);

      // Label - bigger and more prominent
      ctx.font = "bold 32px Inconsolata, monospace";
      ctx.fillStyle = textDark;
      ctx.fillText(score.label, cardX + cardWidth / 2, cardY + 180);

      // Add subtle score description
      ctx.font = "18px Inconsolata, monospace";
      ctx.fillStyle = textLight;
      ctx.fillText("Score", cardX + cardWidth / 2, cardY + 210);
    });

    // PREMIUM FOOTER - Moved to extreme bottom
    const footerY = canvas.height - 120;

    // Footer divider
    const footerDividerGradient = ctx.createLinearGradient(
      100,
      footerY - 40,
      800,
      footerY - 40
    );
    footerDividerGradient.addColorStop(0, "rgba(248, 71, 180, 0)");
    footerDividerGradient.addColorStop(0.5, brandPink);
    footerDividerGradient.addColorStop(1, "rgba(248, 71, 180, 0)");
    ctx.strokeStyle = footerDividerGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, footerY - 40);
    ctx.lineTo(800, footerY - 40);
    ctx.stroke();

    // Premium branding - Bigger
    ctx.font = "bold 38px Inconsolata, monospace";
    const brandGradient = ctx.createLinearGradient(
      0,
      footerY,
      canvas.width,
      footerY
    );
    brandGradient.addColorStop(0, brandPink);
    brandGradient.addColorStop(0.5, gradientPink);
    brandGradient.addColorStop(1, deepPink);
    ctx.fillStyle = brandGradient;
    ctx.textAlign = "center";
    ctx.fillText("Powered by CRE8LAB", canvas.width / 2, footerY);

    // Website - Bigger and more visible
    ctx.font = "bold 28px Inconsolata, monospace";
    ctx.fillStyle = textDark;
    ctx.fillText("www.beautyhub.ng", canvas.width / 2, footerY + 35);

    // Timestamp - Bigger
    const now = new Date();
    const timestamp = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    ctx.font = "22px Inconsolata, monospace";
    ctx.fillStyle = textLight;
    ctx.fillText(`Generated on ${timestamp}`, canvas.width / 2, footerY + 65);

    // Export with pristine quality
    const resultImage: string = canvas.toDataURL("image/png", 1.0);

    // Enhanced mobile-friendly download
    if (
      navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i)
    ) {
      if (navigator.share) {
        fetch(resultImage)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], "beautyhub-skin-analysis.png", {
              type: "image/png",
            });
            navigator
              .share({
                title: "Beauty Hub - Skin Analysis Result",
                text: "My personalized skin analysis from Beauty Hub",
                files: [file],
              })
              .catch((err) => {
                console.log(
                  "Native sharing failed, falling back to download",
                  err
                );
                fallbackDownload(resultImage);
              });
          })
          .catch(() => fallbackDownload(resultImage));
      } else {
        fallbackDownload(resultImage);
      }
    } else {
      fallbackDownload(resultImage);
    }

    function fallbackDownload(imageData: string) {
      const link: HTMLAnchorElement = document.createElement("a");
      link.href = imageData;
      link.download = `beautyhub-skin-analysis-${Date.now()}.png`;

      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      // Enhanced mobile instruction with Beauty Hub branding
      if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
        const instruction = document.createElement("div");
        instruction.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, ${brandPink}, ${gradientPink});
          color: white;
          padding: 25px;
          border-radius: 15px;
          text-align: center;
          z-index: 10000;
          font-family: Inconsolata, monospace;
          max-width: 320px;
          box-shadow: 0 10px 30px rgba(248, 71, 180, 0.3);
        `;
        instruction.innerHTML = `
          <h3 style="margin: 0 0 15px 0; font-size: 20px;">✨ Beauty Hub</h3>
          <p style="margin: 0 0 10px 0;">Your skin analysis is ready!</p>
          <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
            <strong>Android:</strong> Check Downloads → Move to Gallery<br>
            <strong>iOS:</strong> Long-press image → Save to Photos
          </p>
          <button onclick="this.parentElement.remove()" style="
            background: white;
            color: ${brandPink};
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            margin-top: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            font-family: Inconsolata, monospace;
          ">Got it!</button>
        `;
        document.body.appendChild(instruction);

        setTimeout(() => {
          if (instruction.parentElement) {
            instruction.remove();
          }
        }, 8000);
      }
    }
  });

  logo.onerror = () => console.error("Logo failed to load:", logo.src);
  productImage.onerror = () =>
    console.error("Product image failed to load:", productImage.src);
}
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
    canvas.height = 1600;

    // BEAUTY HUB ENHANCED COLOR PALETTE
    const brandPink = "#f847b4"; // Primary brand color
    const lightPink = "#ffd9f0"; // Secondary brand color
    const deepPink = "#e239a3"; // Darker shade
    const gradientPink = "#ff6bc7"; // Gradient variation
    const pureWhite = "#ffffff";
    const softGray = "#f8f9fa"; // Light background
    const lightGray = "#f0f4f8"; // Even lighter shade
    const textDark = "#2c3e50";
    const textLight = "#6c757d";
    const shadowColor = "rgba(248, 71, 180, 0.15)";

    // PREMIUM GRADIENT BACKGROUND - Beautiful light colors
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, pureWhite);
    backgroundGradient.addColorStop(0.3, softGray);
    backgroundGradient.addColorStop(0.7, "#fafbfc");
    backgroundGradient.addColorStop(1, pureWhite);
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ELEGANT HEADER SECTION
    const headerY = 40;
    const logoSize = 100; // Slightly smaller logo
    const logoX = (canvas.width - logoSize) / 2;

    // Logo with premium shadow
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(logo, logoX, headerY, logoSize, logoSize);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // MAGNIFICENT BRAND TYPOGRAPHY - Inconsolata font, bigger sizes
    const titleY = headerY + logoSize + 40;

    // Premium subtitle - Bigger and more visible
    ctx.font = "bold 36px Inconsolata, monospace";
    ctx.fillStyle = textDark;
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
    const imageSize = 450; // Increased from 280 to 450 for better visibility
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

    // Main image - now larger and more prominent
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

    // PREMIUM SCORE CARDS - Enhanced visibility
    const scoresStartY = resultsY + 100;
    const scores = [
      { label: "Acne", value: scoreInfo.acne?.ui_score ?? "N/A", icon: "🎯" },
      {
        label: "Wrinkles",
        value: scoreInfo.wrinkle?.ui_score ?? "N/A",
        icon: "✨",
      },
      { label: "Pores", value: scoreInfo.pore?.ui_score ?? "N/A", icon: "🔍" },
      {
        label: "Texture",
        value: scoreInfo.texture?.ui_score ?? "N/A",
        icon: "💎",
      },
    ];

    const cardWidth = 190;
    const cardHeight = 240;
    const cardSpacing = 20;
    const totalWidth = cardWidth * 4 + cardSpacing * 3;
    const startX = (canvas.width - totalWidth) / 2;

    scores.forEach((score, index) => {
      const cardX = startX + index * (cardWidth + cardSpacing);
      const cardY = scoresStartY;
      const scoreValue =
        typeof score.value === "number"
          ? score.value
          : parseFloat(String(score.value)) || 0;

      // Premium card background - More contrast
      const cardGradient = ctx.createLinearGradient(
        cardX,
        cardY,
        cardX + cardWidth,
        cardY + cardHeight
      );
      cardGradient.addColorStop(0, pureWhite);
      cardGradient.addColorStop(1, lightGray);

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;

      ctx.fillStyle = cardGradient;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 18);
      ctx.fill();

      // Premium border - Thicker
      ctx.strokeStyle = brandPink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 18);
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Icon - Bigger
      ctx.font = "40px Inconsolata, monospace";
      ctx.fillStyle = textDark;
      ctx.textAlign = "center";
      ctx.fillText(score.icon, cardX + cardWidth / 2, cardY + 50);

      // Score value - Much bigger
      ctx.font = "bold 56px Inconsolata, monospace";
      ctx.fillStyle = brandPink;
      ctx.fillText(String(score.value), cardX + cardWidth / 2, cardY + 115);

      // Label - Bigger
      ctx.font = "bold 24px Inconsolata, monospace";
      ctx.fillStyle = textDark;
      ctx.fillText(score.label, cardX + cardWidth / 2, cardY + 145);

      // Premium progress bar
      const progressY = cardY + 165;
      const progressWidth = cardWidth - 40;
      const progressHeight = 8;
      const progressX = cardX + 20;

      // Progress background
      ctx.fillStyle = lightPink;
      ctx.beginPath();
      ctx.roundRect(progressX, progressY, progressWidth, progressHeight, 4);
      ctx.fill();

      // Progress fill
      if (scoreValue > 0) {
        const fillWidth = (scoreValue / 100) * progressWidth;
        const progressFillGradient = ctx.createLinearGradient(
          progressX,
          progressY,
          progressX + fillWidth,
          progressY
        );
        progressFillGradient.addColorStop(0, brandPink);
        progressFillGradient.addColorStop(1, gradientPink);

        ctx.fillStyle = progressFillGradient;
        ctx.beginPath();
        ctx.roundRect(progressX, progressY, fillWidth, progressHeight, 4);
        ctx.fill();
      }

      // Rating text - Bigger
      ctx.font = "bold 20px Inconsolata, monospace";
      ctx.fillStyle = textDark;
      const rating =
        scoreValue >= 80
          ? "Excellent"
          : scoreValue >= 60
          ? "Good"
          : scoreValue >= 40
          ? "Fair"
          : "Needs Care";
      ctx.fillText(rating, cardX + cardWidth / 2, cardY + 200);
    });

    // PREMIUM FOOTER
    const footerY = canvas.height - 180;

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
    ctx.fillText("www.beautyhub.ng", canvas.width / 2, footerY + 45);

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
    ctx.fillText(`Generated on ${timestamp}`, canvas.width / 2, footerY + 75);

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

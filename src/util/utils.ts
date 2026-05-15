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
  routine?: {
    morning: string[];
    night: string[];
  };
}

export const notifySuccess = (successMessage: string) => {
  return toast.success(successMessage);
};

export const notifyError = (errorMessage: string) => {
  return toast.error(errorMessage);
};

export function getGranularLevel(
  score: string | undefined
): "very_low" |"low" | "moderate" | "high" | "very_high" {
  if (!score) return "very_high"; // No score = assume worst

  const percent = parseInt(score.replace("%", ""), 10);

  if (percent > 90) return "very_low";        // Excellent skin condition
  if (percent > 85) return "low";             // Above average skin
  if (percent >= 75) return "moderate";       // Normal or average
  if (percent >= 70) return "high";           // Poor skin condition
  return "very_high";                         // Severely compromised skin
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
  routine,
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

  logo.src = "/images/bb-logo.png";
  productImage.src = originalImageSrc;

  Promise.all([
    new Promise<void>((res) => (logo.onload = () => res())),
    new Promise<void>((res) => (productImage.onload = () => res())),
  ]).then(() => {
    canvas.width = 900;
    canvas.height = 2400; // Increased height for routine section

    // BEAUTY HUB VIBRANT COLOR PALETTE - Instagram Ready
    const brandPink = "#f847b4";
    const deepPink = "#e239a3";
    const gradientPink = "#ff6bc7";
    const holoPink = "#ff85d1";
    const pureWhite = "#ffffff";
    const vibrantAccent = "#ff4da6";
    const textDark = "#2c3e50";
    const textLight = "#6c757d";

    // LUXE BACKGROUND – Soft pearl-to-blush gradient with shimmer
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, "#fdfcfa");
    backgroundGradient.addColorStop(0.5, "#fbe4ef");
    backgroundGradient.addColorStop(1, "#fce1f0");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add soft shimmer overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Add holographic shimmer effect
    const shimmerGradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    shimmerGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    shimmerGradient.addColorStop(0.25, "rgba(248, 71, 180, 0.05)");
    shimmerGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
    shimmerGradient.addColorStop(0.75, "rgba(255, 107, 199, 0.08)");
    shimmerGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = shimmerGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add sparkle texture overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillRect(x - size * 2, y - 0.5, size * 4, 1);
      ctx.fillRect(x - 0.5, y - size * 2, 1, size * 4);
    }

    // PREMIUM HEADER with enhanced typography
    const headerY = 30;
    const logoSize = 160;
    const logoX = (canvas.width - logoSize) / 2;

    const logoAspectRatio = logo.width / logo.height;
    const logoWidth = logoSize;
    const logoHeight = logoSize / logoAspectRatio;

    ctx.drawImage(logo, logoX, headerY, logoWidth, logoHeight);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Enhanced typography with holographic text effect
    const titleY = headerY + logoHeight + 25;

    // Premium subtitle with holographic gradient
    ctx.font = "bold 36px Inconsolata, monospace";
    const titleGradient = ctx.createLinearGradient(
      0,
      titleY,
      canvas.width,
      titleY + 50
    );
    titleGradient.addColorStop(0, brandPink);
    titleGradient.addColorStop(0.3, holoPink);
    titleGradient.addColorStop(0.6, gradientPink);
    titleGradient.addColorStop(1, deepPink);

    ctx.shadowOffsetY = 0;
    ctx.fillStyle = titleGradient;
    ctx.textAlign = "center";
    ctx.fillText("AI-Powered Skin Analysis", canvas.width / 2, titleY + 40);

    ctx.fillText("AI-Powered Skin Analysis", canvas.width / 2, titleY + 40);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // PREMIUM IMAGE SHOWCASE with PROPER ASPECT RATIO - FIXED
    const imageY = titleY + 140;
    const maxImageSize = 680;

    // Calculate proper dimensions maintaining aspect ratio
    const imageAspectRatio = productImage.width / productImage.height;
    let imageWidth, imageHeight;

    if (imageAspectRatio > 1) {
      // Landscape image
      imageWidth = maxImageSize;
      imageHeight = maxImageSize / imageAspectRatio;
    } else {
      // Portrait or square image
      imageHeight = maxImageSize;
      imageWidth = maxImageSize * imageAspectRatio;
    }

    // Center the image
    const finalImageX = (canvas.width - imageWidth) / 2;
    const finalImageY = imageY;

    // Premium holographic frame with multiple layers
    const frameGradient = ctx.createLinearGradient(
      finalImageX - 20,
      finalImageY - 20,
      finalImageX + imageWidth + 20,
      finalImageY + imageHeight + 20
    );
    frameGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    frameGradient.addColorStop(0.25, "rgba(248, 71, 180, 0.3)");
    frameGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
    frameGradient.addColorStop(0.75, "rgba(255, 107, 199, 0.4)");
    frameGradient.addColorStop(1, "rgba(255, 255, 255, 0.6)");

    // Outer frame with premium glow
    ctx.fillStyle = frameGradient;
    ctx.beginPath();
    ctx.roundRect(finalImageX - 20, finalImageY - 20, imageWidth + 40, imageHeight + 40, 30);
    ctx.fill();

    // Inner pristine frame
    ctx.fillStyle = pureWhite;
    ctx.beginPath();
    ctx.roundRect(finalImageX - 10, finalImageY - 10, imageWidth + 20, imageHeight + 20, 20);
    ctx.fill();

    // Premium border accent
    ctx.strokeStyle = frameGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(finalImageX - 10, finalImageY - 10, imageWidth + 20, imageHeight + 20, 20);
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Main image with rounded corners - PROPERLY SCALED
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(finalImageX, finalImageY, imageWidth, imageHeight, 15);
    ctx.clip();
    ctx.drawImage(productImage, finalImageX, finalImageY, imageWidth, imageHeight);
    ctx.restore();

    // SPECTACULAR OVERALL SCORE - ADJUSTED POSITION
    const overallScoreY = finalImageY + imageHeight + 50;
    const overallScore = scoreInfo.all?.score ?? "N/A";

    // Premium score container with enhanced holographic design
    const overallBoxWidth = 700;
    const overallBoxHeight = 180;
    const overallBoxX = (canvas.width - overallBoxWidth) / 2;

    // Premium holographic gradient background
    const scoreGradient = ctx.createLinearGradient(
      overallBoxX,
      overallScoreY,
      overallBoxX + overallBoxWidth,
      overallScoreY + overallBoxHeight
    );
    scoreGradient.addColorStop(0, brandPink);
    scoreGradient.addColorStop(0.2, holoPink);
    scoreGradient.addColorStop(0.4, gradientPink);
    scoreGradient.addColorStop(0.6, vibrantAccent);
    scoreGradient.addColorStop(0.8, deepPink);
    scoreGradient.addColorStop(1, brandPink);

    ctx.fillStyle = scoreGradient;
    ctx.beginPath();
    ctx.roundRect(
      overallBoxX,
      overallScoreY,
      overallBoxWidth,
      overallBoxHeight,
      35
    );
    ctx.fill();

    // Premium holographic highlight effect
    const highlightGradient = ctx.createLinearGradient(
      overallBoxX,
      overallScoreY,
      overallBoxX + overallBoxWidth,
      overallScoreY + 90
    );
    highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    highlightGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
    highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.roundRect(
      overallBoxX,
      overallScoreY,
      overallBoxWidth,
      90,
      [35, 35, 0, 0]
    );
    ctx.fill();

    // Holographic border glow
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(
      overallBoxX + 5,
      overallScoreY + 5,
      overallBoxWidth - 10,
      overallBoxHeight - 10,
      30
    );
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Premium score display
    const overallScoreCenterX = overallBoxX + overallBoxWidth / 2;
    const overallScoreCenterY = overallScoreY + overallBoxHeight / 2;

    // Score number
    ctx.font = "bold 110px Inconsolata, monospace";
    ctx.fillStyle = pureWhite;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      String(overallScore),
      overallScoreCenterX,
      overallScoreCenterY - 15
    );

    // Label
    ctx.font = "bold 32px Inconsolata, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillText(
      " OVERALL SKIN SCORE ",
      overallScoreCenterX,
      overallScoreCenterY + 45
    );

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.textBaseline = "alphabetic";

    // PREMIUM SCORE CARDS - ADJUSTED POSITION
    const scoresStartY = overallScoreY + 200;
    const scores = [
      { label: "Acne", value: scoreInfo.acne?.ui_score ?? "N/A" },
      { label: "Wrinkles", value: scoreInfo.wrinkle?.ui_score ?? "N/A" },
      { label: "Pores", value: scoreInfo.pore?.ui_score ?? "N/A" },
      { label: "Texture", value: scoreInfo.texture?.ui_score ?? "N/A" },
    ];

    const cardWidth = 190;
    const cardSpacing = 25;
    const totalWidth = cardWidth * 4 + cardSpacing * 3;
    const startX = (canvas.width - totalWidth) / 2;

    // Enhanced holographic circular progress
    function drawCircularProgress(
      x: number,
      y: number,
      radius: number,
      percentage: number
    ) {
      const centerX = x;
      const centerY = y;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;

      ctx.shadowOffsetY = 0;

      // Background circle
      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius - 15,
        centerX,
        centerY,
        radius + 10
      );
      bgGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      bgGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.8)");
      bgGradient.addColorStop(1, "rgba(255, 255, 255, 0.6)");
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = bgGradient;
      ctx.lineWidth = 18;
      ctx.stroke();

      // Progress circle
      if (percentage > 0) {
        const progressGradient = ctx.createLinearGradient(
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius
        );
        progressGradient.addColorStop(0, brandPink);
        progressGradient.addColorStop(0.3, holoPink);
        progressGradient.addColorStop(0.6, gradientPink);
        progressGradient.addColorStop(1, vibrantAccent);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = progressGradient;
        ctx.lineWidth = 18;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 5, startAngle, endAngle);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    scores.forEach((score, index) => {
      const cardX = startX + index * (cardWidth + cardSpacing);
      const cardY = scoresStartY;
      const scoreValue =
        typeof score.value === "number"
          ? score.value
          : parseFloat(String(score.value)) || 0;

      const progressCenterX = cardX + cardWidth / 2;
      const progressCenterY = cardY + 80;
      const progressRadius = 60;

      drawCircularProgress(
        progressCenterX,
        progressCenterY,
        progressRadius,
        scoreValue
      );

      // Score value
      ctx.font = "bold 42px Inconsolata, monospace";
      const valueGradient = ctx.createLinearGradient(
        0,
        progressCenterY - 20,
        0,
        progressCenterY + 20
      );
      valueGradient.addColorStop(0, brandPink);
      valueGradient.addColorStop(0.5, holoPink);
      valueGradient.addColorStop(1, deepPink);
      ctx.fillStyle = valueGradient;
      ctx.textAlign = "center";
      ctx.fillText(String(score.value), progressCenterX, progressCenterY + 12);

      // Label
      ctx.font = "bold 30px Inconsolata, monospace";
      ctx.fillStyle = textDark;
      ctx.fillText(score.label, cardX + cardWidth / 2, cardY + 180);
    });

    // PREMIUM ROUTINE SECTION
    if (routine) {
      const routineStartY = scoresStartY + 250;
      const routineWidth = 800;
      const routineX = (canvas.width - routineWidth) / 2;

      // Routine Container
      const routineGradient = ctx.createLinearGradient(
        routineX,
        routineStartY,
        routineX + routineWidth,
        routineStartY + 500
      );
      routineGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      routineGradient.addColorStop(1, "rgba(255, 255, 255, 0.7)");

      ctx.fillStyle = routineGradient;
      ctx.beginPath();
      ctx.roundRect(routineX, routineStartY, routineWidth, 650, 40);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(248, 71, 180, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Header
      ctx.font = "bold 44px Inconsolata, monospace";
      ctx.fillStyle = brandPink;
      ctx.textAlign = "center";
      ctx.fillText("Your Personalized Routine 🧖‍♀️", canvas.width / 2, routineStartY + 70);

      // Morning Section
      const morningY = routineStartY + 140;
      ctx.textAlign = "left";
      ctx.font = "bold 36px Inconsolata, monospace";
      ctx.fillStyle = brandPink;
      ctx.fillText("☀️ Morning", routineX + 50, morningY);

      let currentX = routineX + 50;
      let currentY = morningY + 60;
      
      routine.morning.forEach((step: string, i: number) => {
        ctx.font = "bold 24px Inconsolata, monospace";
        const textWidth = ctx.measureText(step).width + 40;
        
        if (currentX + textWidth > routineX + routineWidth - 50) {
          currentX = routineX + 50;
          currentY += 60;
        }

        // Chip Background
        ctx.fillStyle = "#fff1f8";
        ctx.beginPath();
        ctx.roundRect(currentX, currentY - 30, textWidth, 45, 12);
        ctx.fill();
        ctx.strokeStyle = "#fdf4ff";
        ctx.stroke();

        // Text
        ctx.fillStyle = "#c026d3";
        ctx.fillText(step, currentX + 20, currentY);

        currentX += textWidth + 20;
        if (i < routine!.morning.length - 1) {
           ctx.fillStyle = "#fbcfe8";
           ctx.fillText("→", currentX - 10, currentY);
           currentX += 30;
        }
      });

      // Night Section
      const nightY = currentY + 120;
      ctx.font = "bold 36px Inconsolata, monospace";
      ctx.fillStyle = "#7c3aed";
      ctx.fillText("🌙 Night", routineX + 50, nightY);

      currentX = routineX + 50;
      currentY = nightY + 60;

      routine.night.forEach((step: string, i: number) => {
        ctx.font = "bold 24px Inconsolata, monospace";
        const textWidth = ctx.measureText(step).width + 40;

        if (currentX + textWidth > routineX + routineWidth - 50) {
          currentX = routineX + 50;
          currentY += 60;
        }

        // Chip Background
        ctx.fillStyle = "#f5f3ff";
        ctx.beginPath();
        ctx.roundRect(currentX, currentY - 30, textWidth, 45, 12);
        ctx.fill();
        ctx.strokeStyle = "#ede9fe";
        ctx.stroke();

        // Text
        ctx.fillStyle = "#6d28d9";
        ctx.fillText(step, currentX + 20, currentY);

        currentX += textWidth + 20;
        if (i < routine!.night.length - 1) {
           ctx.fillStyle = "#ddd6fe";
           ctx.fillText("→", currentX - 10, currentY);
           currentX += 30;
        }
      });

      // Tip
      ctx.font = "italic 22px Inconsolata, monospace";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("ℹ️ Use exfoliating toner on alternate nights", routineX + 50, currentY + 80);
    }

    // PREMIUM FOOTER
    const footerY = canvas.height - 120;

    const footerGradient = ctx.createLinearGradient(
      0,
      footerY - 20,
      0,
      canvas.height
    );
    footerGradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
    footerGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
    footerGradient.addColorStop(1, "rgba(255, 255, 255, 0.25)");

    ctx.fillStyle = footerGradient;
    ctx.beginPath();
    ctx.roundRect(0, footerY - 20, canvas.width, 140, 0);
    ctx.fill();

    // Premium branding
    ctx.font = "bold 38px Inconsolata, monospace";
    const brandGradient = ctx.createLinearGradient(
      0,
      footerY,
      canvas.width,
      footerY
    );
    brandGradient.addColorStop(0, brandPink);
    brandGradient.addColorStop(0.25, holoPink);
    brandGradient.addColorStop(0.5, gradientPink);
    brandGradient.addColorStop(0.75, vibrantAccent);
    brandGradient.addColorStop(1, deepPink);

    ctx.shadowOffsetY = 0;
    ctx.fillStyle = brandGradient;
    ctx.textAlign = "center";
    ctx.fillText(" Powered by CRE8LAB ", canvas.width / 2, footerY + 20);

    // Website
    ctx.font = "bold 28px Inconsolata, monospace";
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = textDark;
    ctx.fillText("www.beautybayafrica.com", canvas.width / 2, footerY + 55);

    // Timestamp
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
    ctx.fillText(`Generated on ${timestamp}`, canvas.width / 2, footerY + 90);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

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
            const file = new File([blob], "beautybayafrica-skin-analysis.png", {
              type: "image/png",
            });
            navigator
              .share({
                title: "Perfect Skin By Beauty Bay",
                text: "My personalized AI skin analysis from Beauty Bay! 💎",
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
      link.download = `perfectskinbybeautyhub.png`;

      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
        const instruction = document.createElement("div");
        instruction.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, ${brandPink} 0%, ${holoPink} 25%, ${gradientPink} 50%, ${vibrantAccent} 75%, ${deepPink} 100%);
          color: white;
          padding: 35px;
          border-radius: 25px;
          text-align: center;
          z-index: 10000;
          font-family: Inconsolata, monospace;
          max-width: 380px;
          box-shadow: 
            0 20px 50px rgba(248, 71, 180, 0.5), 
            0 10px 25px rgba(248, 71, 180, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        `;
        instruction.innerHTML = `
          <h3 style="margin: 0 0 20px 0; font-size: 24px; text-shadow: 0 3px 6px rgba(0,0,0,0.3);"> Beauty Bay Premium</h3>
          <p style="margin: 0 0 15px 0; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">Your Instagram-worthy skin analysis is ready! 💎</p>
          <p style="margin: 0 0 20px 0; font-size: 14px; opacity: 0.95; line-height: 1.5; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
            <strong>Android:</strong> Check Downloads → Move to Gallery<br>
            <strong>iOS:</strong> Long-press image → Save to Photos
          </p>
          <button onclick="this.parentElement.remove()" style="
            background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8));
            color: ${brandPink};
            border: none;
            padding: 18px 35px;
            border-radius: 15px;
            margin-top: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            font-family: Inconsolata, monospace;
            box-shadow: 
              0 6px 15px rgba(0,0,0,0.15),
              inset 0 1px 0 rgba(255,255,255,0.8);
            transition: all 0.3s ease;
            text-shadow: none;
          " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 15px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)'"> Perfect!</button>
        `;
        document.body.appendChild(instruction);

        setTimeout(() => {
          if (instruction.parentElement) {
            instruction.remove();
          }
        }, 10000);
      }
    }
  });

  logo.onerror = () => console.error("Logo failed to load:", logo.src);
  productImage.onerror = () =>
    console.error("Product image failed to load:", productImage.src);
}

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
  error_src_face_too_small: "your face is too far away. Please move closer to the camera",
  error_src_face_out_of_bound: "your face is partially outside the frame. Please center your face within the camera view",
  error_large_face_angle: "your face is tilted. Please look straight at the camera with your head upright",
};


export function generateSkinAnalysisResult({ originalImageSrc, scoreInfo }: GenerateSkinAnalysisParams): void {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;

  // Ultra-premium rendering settings
  ctx.textRendering = 'optimizeLegibility';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

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
    canvas.height = 1900;

    // YOUR BRAND COLOR PALETTE
    const darkPink = '#f847b4';      // Your primary brand color
    const lightPink = '#ffd9f0';     // Your secondary brand color
    const deeperPink = '#e239a3';    // Darker shade of your brand pink
    const pureWhite = '#ffffff';
    const charcoal = '#2c3e50';
    const slate = '#34495e';

    // Clean, minimal background - pure white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // CLEAN HEADER SECTION - No borders, no bullshit
    const headerY = 40;
    const logoSize = 160;
    const logoX = (canvas.width - logoSize) / 2;
    
    // Just the logo - clean and simple
    ctx.drawImage(logo, logoX, headerY, logoSize, logoSize);

    // MAGNIFICENT TYPOGRAPHY - Modern tech-forward style with your brand colors
    ctx.font = 'bold 52px Inconsolata, monospace';
    const titleGradient = ctx.createLinearGradient(0, headerY + logoSize + 70, canvas.width, headerY + logoSize + 70);
    titleGradient.addColorStop(0, darkPink);
    titleGradient.addColorStop(0.5, deeperPink);
    titleGradient.addColorStop(1, darkPink);
    ctx.fillStyle = titleGradient;
    ctx.textAlign = 'center';
    ctx.fillText('Perfect Skin By Beauty Hub', canvas.width / 2, headerY + logoSize + 70);

    // Elegant subtitle with sophisticated styling
    ctx.font = '28px Inconsolata, monospace';
    ctx.fillStyle = slate;
    ctx.fillText('AI Powered Skin Analysis', canvas.width / 2, headerY + logoSize + 110);

    // Artistic separator - flowing wave design with your brand colors
    const separatorY = headerY + logoSize + 140;
    const separatorGradient = ctx.createLinearGradient(0, separatorY, canvas.width, separatorY);
    separatorGradient.addColorStop(0, `${darkPink}00`);
    separatorGradient.addColorStop(0.2, `${darkPink}99`);
    separatorGradient.addColorStop(0.5, darkPink);
    separatorGradient.addColorStop(0.8, `${darkPink}99`);
    separatorGradient.addColorStop(1, `${darkPink}00`);
    
    ctx.strokeStyle = separatorGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, separatorY);
    ctx.bezierCurveTo(300, separatorY - 10, 600, separatorY + 10, 800, separatorY);
    ctx.stroke();

    // CLEAN IMAGE PRESENTATION - No borders, no frames
    const imageY = separatorY + 60;
    const imageSize = 340;
    const imageX = (canvas.width - imageSize) / 2;

    // Just the image - clean and simple
    ctx.drawImage(productImage, imageX, imageY, imageSize, imageSize);

    // SPECTACULAR OVERALL SCORE - The crown jewel with your brand colors
    const overallScoreY = imageY + imageSize + 100;
    const overallScore = scoreInfo.all?.score ?? 'N/A';

    // Magnificent score container - glass morphism effect with your brand colors
    const overallBoxWidth = 520;
    const overallBoxHeight = 140;
    const overallBoxX = (canvas.width - overallBoxWidth) / 2;

    // Ultra-premium glass effect with your brand colors
    ctx.shadowColor = `${darkPink}40`;
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    
    const glassGradient = ctx.createLinearGradient(overallBoxX, overallScoreY, overallBoxX + overallBoxWidth, overallScoreY + overallBoxHeight);
    glassGradient.addColorStop(0, `${darkPink}e6`);
    glassGradient.addColorStop(0.5, `${deeperPink}f2`);
    glassGradient.addColorStop(1, `${darkPink}e6`);
    ctx.fillStyle = glassGradient;
    ctx.fillRect(overallBoxX, overallScoreY, overallBoxWidth, overallBoxHeight);

    // Highlight effect on top
    const highlightGradient = ctx.createLinearGradient(overallBoxX, overallScoreY, overallBoxX + overallBoxWidth, overallScoreY + 40);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(overallBoxX, overallScoreY, overallBoxWidth, 40);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Gorgeous score display
    ctx.font = 'bold 80px Inconsolata, monospace';
    ctx.fillStyle = pureWhite;
    ctx.textAlign = 'center';
    ctx.fillText(String(overallScore), canvas.width / 2, overallScoreY + 60);

    ctx.font = '26px Inconsolata, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('OVERALL SKIN SCORE', canvas.width / 2, overallScoreY + 95);

    // ELEGANT DETAILED ANALYSIS SECTION with your brand colors
    const resultsY = overallScoreY + 200;
    
    ctx.font = '50px Inconsolata, monospace';
    const detailsGradient = ctx.createLinearGradient(0, resultsY, canvas.width, resultsY);
    detailsGradient.addColorStop(0, darkPink);
    detailsGradient.addColorStop(0.5, deeperPink);
    detailsGradient.addColorStop(1, darkPink);
    ctx.fillStyle = detailsGradient;
    ctx.textAlign = 'center';
    ctx.fillText('Detailed Analysis', canvas.width / 2, resultsY);

    // Artistic flowing divider with your brand colors
    const resultsDividerY = resultsY + 30;
    const flowingGradient = ctx.createLinearGradient(0, resultsDividerY, canvas.width, resultsDividerY);
    flowingGradient.addColorStop(0, `${darkPink}00`);
    flowingGradient.addColorStop(0.25, `${darkPink}66`);
    flowingGradient.addColorStop(0.5, darkPink);
    flowingGradient.addColorStop(0.75, `${darkPink}66`);
    flowingGradient.addColorStop(1, `${darkPink}00`);
    ctx.strokeStyle = flowingGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(150, resultsDividerY);
    ctx.bezierCurveTo(350, resultsDividerY - 8, 550, resultsDividerY + 8, 750, resultsDividerY);
    ctx.stroke();

    // SPECTACULAR SCORE CARDS - Floating gems with your brand colors
    const scoresStartY = resultsY + 120;
    const scores = [
      { label: 'Acne', value: scoreInfo.acne?.ui_score ?? 'N/A' },
      { label: 'Wrinkle', value: scoreInfo.wrinkle?.ui_score ?? 'N/A' },
      { label: 'Pore', value: scoreInfo.pore?.ui_score ?? 'N/A' },
      { label: 'Texture', value: scoreInfo.texture?.ui_score ?? 'N/A' }
    ];

    const scorePositions = [
      { x: canvas.width / 2 - 200, y: scoresStartY },
      { x: canvas.width / 2 + 200, y: scoresStartY },
      { x: canvas.width / 2 - 200, y: scoresStartY + 240 },
      { x: canvas.width / 2 + 200, y: scoresStartY + 240 }
    ];

    scores.forEach((score, index) => {
      const centerX = scorePositions[index].x;
      const centerY = scorePositions[index].y;
      const circleRadius = 90;
      const scoreValue = typeof score.value === 'number' ? score.value : parseFloat(String(score.value)) || 0;

      // Clean white circle - no borders
      ctx.fillStyle = pureWhite;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Clean progress track with your light pink
      ctx.strokeStyle = `${lightPink}66`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius - 25, 0, Math.PI * 2);
      ctx.stroke();

      // Clean progress arc with your dark pink
      if (scoreValue > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (scoreValue / 100) * 2 * Math.PI;

        ctx.strokeStyle = darkPink;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius - 25, startAngle, endAngle);
        ctx.stroke();
      }

      // Clean score display
      ctx.font = 'bold 46px Inconsolata, monospace';
      ctx.fillStyle = charcoal;
      ctx.textAlign = 'center';
      ctx.fillText(String(score.value), centerX, centerY + 15);

      // Clean label
      ctx.font = '24px Inconsolata, monospace';
      ctx.fillStyle = slate;
      ctx.fillText(score.label, centerX, centerY + circleRadius + 40);
    });

    // LUXURIOUS FOOTER with your brand colors
    const footerY = canvas.height - 160;
    
    // Elegant separator wave with your brand colors
    const footerWaveGradient = ctx.createLinearGradient(0, footerY - 30, canvas.width, footerY - 30);
    footerWaveGradient.addColorStop(0, `${darkPink}00`);
    footerWaveGradient.addColorStop(0.3, `${darkPink}4d`);
    footerWaveGradient.addColorStop(0.7, `${darkPink}4d`);
    footerWaveGradient.addColorStop(1, `${darkPink}00`);
    ctx.strokeStyle = footerWaveGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, footerY - 30);
    ctx.bezierCurveTo(300, footerY - 40, 600, footerY - 20, 800, footerY - 30);
    ctx.stroke();

    // Sophisticated branding with your brand colors
    ctx.font = '36px Inconsolata, monospace';
    const brandGradient = ctx.createLinearGradient(0, footerY, canvas.width, footerY);
    brandGradient.addColorStop(0, darkPink);
    brandGradient.addColorStop(0.5, deeperPink);
    brandGradient.addColorStop(1, darkPink);
    ctx.fillStyle = brandGradient;
    ctx.textAlign = 'center';
    ctx.fillText('Powered by CRE8LAB', canvas.width / 2, footerY);

    // Elegant timestamp
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    ctx.font = '22px Inconsolata, monospace';
    ctx.fillStyle = slate;
    ctx.fillText(`Generated on ${timestamp}`, canvas.width / 2, footerY + 45);

    ctx.font = '20px Inconsolata, monospace';
    ctx.fillStyle = charcoal;
    ctx.fillText('www.beautyhub.ng', canvas.width / 2, footerY + 75);

    // Export with pristine quality - Mobile-optimized
    const resultImage: string = canvas.toDataURL("image/png", 1.0);
    
    // Mobile-friendly download approach
    if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i)) {
      // For mobile devices - try to trigger native sharing/saving
      if (navigator.share) {
        // Convert data URL to blob for native sharing
        fetch(resultImage)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'psbbh-skinanalysis-result.png', { type: 'image/png' });
            navigator.share({
              title: 'Perfect Skin Analysis Result',
              text: 'My skin analysis result from Beauty Hub',
              files: [file]
            }).catch(err => {
              console.log('Native sharing failed, falling back to download',err);
              fallbackDownload(resultImage);
            });
          })
          .catch(() => fallbackDownload(resultImage));
      } else {
        // Fallback for mobile browsers without native sharing
        fallbackDownload(resultImage);
      }
    } else {
      // Desktop download
      fallbackDownload(resultImage);
    }
    
    function fallbackDownload(imageData: string) {
      const link: HTMLAnchorElement = document.createElement("a");
      link.href = imageData;
      link.download = `psbbh-skinanalysis-result-${Date.now()}.png`;
      
      // Better mobile support
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      // Additional mobile-specific handling
      if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
        // Show user instruction for mobile with your brand colors
        const instruction = document.createElement('div');
        instruction.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.9);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          z-index: 10000;
          font-family: Arial, sans-serif;
          max-width: 300px;
        `;
        instruction.innerHTML = `
          <h3>📱 Save to Gallery</h3>
          <p>Image downloaded! To save to your gallery:</p>
          <p><strong>Android:</strong> Check Downloads folder, then move to Gallery</p>
          <p><strong>iOS:</strong> Long-press the image and select "Save to Photos"</p>
          <button onclick="this.parentElement.remove()" style="
            background: ${darkPink};
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 10px;
            cursor: pointer;
          ">Got it!</button>
        `;
        document.body.appendChild(instruction);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
          if (instruction.parentElement) {
            instruction.remove();
          }
        }, 8000);
      }
    }
  });

  logo.onerror = () => console.error("Logo failed to load:", logo.src);
  productImage.onerror = () => console.error("Product image failed to load:", productImage.src);
}


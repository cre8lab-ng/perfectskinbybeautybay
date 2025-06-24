// utils/faceValidation.ts

import { FaceMesh } from "@mediapipe/face_mesh";

let faceMeshInstance: FaceMesh | null = null;

export async function getFaceMesh(): Promise<FaceMesh> {
  if (faceMeshInstance) return faceMeshInstance;

  faceMeshInstance = new FaceMesh({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMeshInstance.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  return faceMeshInstance;
}

export function getAverageBrightness(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number }
): number {
  const imageData = ctx.getImageData(box.x, box.y, box.width, box.height);
  const data = imageData.data;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    total += (r + g + b) / 3;
  }
  return total / (data.length / 4);
}

export function isImageBlurry(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number }
): boolean {
  const imageData = ctx.getImageData(box.x, box.y, box.width, box.height);
  const grayscale = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    const val =
      (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
    grayscale.push(val);
  }
  const mean = grayscale.reduce((a, b) => a + b, 0) / grayscale.length;
  const variance =
    grayscale.reduce((a, b) => a + (b - mean) ** 2, 0) / grayscale.length;
  return variance < 500;
}

export async function runMediaPipeFaceDetection(
  image: HTMLImageElement
): Promise<any[]> {
  const faceMesh = await getFaceMesh();

  return new Promise((resolve, reject) => {
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        resolve(results.multiFaceLandmarks[0]);
      } else {
        resolve([]);
      }
    });

    faceMesh.send({ image }).catch(reject);
  });
}

export function getBoundingBox(
  landmarks: { x: number; y: number }[],
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const xs = landmarks.map((lm) => lm.x * canvasWidth);
  const ys = landmarks.map((lm) => lm.y * canvasHeight);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  return { x, y, width, height };
}

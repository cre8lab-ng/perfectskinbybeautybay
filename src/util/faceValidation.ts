// utils/faceValidation.ts

import * as faceMeshModule from "@mediapipe/face_mesh";

let faceMeshInstance: any = null;
let faceMeshPromise: Promise<any> | null = null;

export async function getFaceMesh(): Promise<any> {
  if (faceMeshInstance) return faceMeshInstance;
  if (faceMeshPromise) return faceMeshPromise;

  faceMeshPromise = (async () => {
    try {
      // Next.js/Webpack sometimes struggle with MediaPipe's CJS/ESM hybrid exports.
      // Using a dynamic import inside the function can help resolve the constructor correctly on the client side.
      const mpFaceMesh = await import("@mediapipe/face_mesh");
      
      let FaceMeshConstructor: any = null;

      // Try all possible ways the constructor might be exported
      if (mpFaceMesh.FaceMesh) {
        FaceMeshConstructor = mpFaceMesh.FaceMesh;
      } else if ((mpFaceMesh as any).default?.FaceMesh) {
        FaceMeshConstructor = (mpFaceMesh as any).default.FaceMesh;
      } else if (typeof (mpFaceMesh as any).default === "function") {
        FaceMeshConstructor = (mpFaceMesh as any).default;
      } else if (faceMeshModule.FaceMesh) {
        FaceMeshConstructor = faceMeshModule.FaceMesh;
      } else if ((faceMeshModule as any).default?.FaceMesh) {
        FaceMeshConstructor = (faceMeshModule as any).default.FaceMesh;
      } else if (typeof (faceMeshModule as any).default === "function") {
        FaceMeshConstructor = (faceMeshModule as any).default;
      } else if (typeof window !== "undefined" && (window as any).FaceMesh) {
        FaceMeshConstructor = (window as any).FaceMesh;
      }

      if (!FaceMeshConstructor || typeof FaceMeshConstructor !== "function") {
        console.error("MediaPipe Debug - mpFaceMesh keys:", Object.keys(mpFaceMesh));
        throw new Error("Could not find a valid FaceMesh constructor in @mediapipe/face_mesh");
      }

      const instance = new FaceMeshConstructor({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
      });

      instance.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      // Wait for the instance to initialize its WASM if possible, 
      // though FaceMesh usually initializes on the first .send() call.
      faceMeshInstance = instance;
      return instance;
    } catch (err) {
      faceMeshPromise = null; // Reset promise so we can try again
      throw err;
    }
  })();

  return faceMeshPromise;
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
    // Increased timeout to 10s to match CameraPrompt and handle slow initialization
    const timeout = setTimeout(() => reject(new Error("MediaPipe detection timeout")), 10000);

    faceMesh.onResults((results: any) => {
      clearTimeout(timeout);
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        resolve(results.multiFaceLandmarks[0]);
      } else {
        resolve([]);
      }
    });

    faceMesh.send({ image }).catch((err: any) => {
      clearTimeout(timeout);
      reject(err);
    });
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

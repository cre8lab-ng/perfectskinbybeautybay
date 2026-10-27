// utils/faceValidation.ts

const MEDIAPIPE_VERSION = "0.4.1633559619";
const MEDIAPIPE_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MEDIAPIPE_VERSION}`;

let faceMeshInstance: any = null;
let faceMeshPromise: Promise<any> | null = null;

// MediaPipe's WASM loader breaks when bundled by Next.js in production
// ("Module.arguments has been replaced…"), so load its own script from the CDN instead.
function loadFaceMeshScript(): Promise<any> {
  const existing = (window as any).FaceMesh;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    let script = document.getElementById("mediapipe-face-mesh") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "mediapipe-face-mesh";
      script.src = `${MEDIAPIPE_BASE}/face_mesh.js`;
      script.crossOrigin = "anonymous";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      const ctor = (window as any).FaceMesh;
      if (ctor) resolve(ctor);
      else reject(new Error("FaceMesh not found after loading script"));
    });
    script.addEventListener("error", () => {
      script?.remove();
      reject(new Error("Failed to load face detection script"));
    });
  });
}

export async function getFaceMesh(): Promise<any> {
  if (faceMeshInstance) return faceMeshInstance;
  if (faceMeshPromise) return faceMeshPromise;

  faceMeshPromise = (async () => {
    try {
      const FaceMesh = await loadFaceMeshScript();
      const instance = new FaceMesh({
        locateFile: (file: string) => `${MEDIAPIPE_BASE}/${file}`,
      });

      instance.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      // Initialise exactly once. Letting the camera's first send() and a preload both
      // trigger initialisation crashes MediaPipe ("ErrnoError") and detection silently fails.
      await instance.initialize();
      faceMeshInstance = instance;
      return instance;
    } catch (err) {
      faceMeshPromise = null; // Reset promise so we can try again
      throw err;
    }
  })();

  return faceMeshPromise;
}

/** Downloads and initialises the face model ahead of time so the camera starts tracking instantly. */
export async function preloadFaceMesh() {
  try {
    await getFaceMesh();
  } catch (err) {
    console.warn("Face model preload failed; it will load on first use", err);
  }
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
  // The model is shared with the live camera; clear its tracking state so a still photo
  // is detected from scratch rather than from the last video frame's face position.
  faceMesh.reset?.();

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

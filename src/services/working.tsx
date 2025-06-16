// @/services/skinanalysis.ts

import api from "@/util/api";

export async function uploadImage(file: File, accessToken: string) {
  const payload = {
    files: [
      {
        content_type: file.type,
        file_name: file.name,
        file_size: file.size,
      },
    ],
  };

  const response = await fetch(
    "https://yce-api-01.perfectcorp.com/s2s/v1.1/file/skin-analysis",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();
  return result.result.files[0];
}

export interface SkinAnalysisPayload {
  request_id: number;
  payload: {
    file_sets: {
      src_ids: string[];
    };
    actions: {
      id: number;
      params: object;
      dst_actions: string[];
    }[];
  };
}

export interface SkinAnalysisResponse {
  status: number;
  result: {
    task_id: string;
  };
}

export async function runSkinAnalysis(
  payload: SkinAnalysisPayload,
  accessToken: string
): Promise<SkinAnalysisResponse> {
  const response = await api.post(
    "https://yce-api-01.perfectcorp.com/s2s/v1.0/task/skin-analysis",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    }
  );
  // @ts-expect-error - available_balance is a currency-formatted string (e.g. "₦ 430.00")
// We sanitize it before converting to number for comparison
  return response;
}

// ✅ REAL task status check using GET
export async function checkSkinAnalysisStatus(taskId: string, accessToken: string) {
  const url = `https://yce-api-01.perfectcorp.com/s2s/v1.0/task/skin-analysis?task_id=${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();
  return result;
}

// Wrapper for easier calling
export async function analyzeSkinFeatures(
  fileId: string,
  accessToken: string,
  features: string[] = ["wrinkle", "pore", "texture", "acne"]
) {
  const payload: SkinAnalysisPayload = {
    request_id: 0,
    payload: {
      file_sets: {
        src_ids: [fileId],
      },
      actions: [
        {
          id: 0,
          params: {},
          dst_actions: features,
        },
      ],
    },
  };

  return await runSkinAnalysis(payload, accessToken);
}

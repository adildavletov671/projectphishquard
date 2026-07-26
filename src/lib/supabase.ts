const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function analyzeEmail(emailText: string): Promise<AnalysisResult> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/analyze-email`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emailText }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body?.error === "invalid_json") {
      throw new Error("invalid_json");
    }
    throw new Error("request_failed");
  }

  const data = await response.json();
  if (!data.verdict || !Array.isArray(data.flags)) {
    throw new Error("invalid_json");
  }

  return {
    verdict: data.verdict,
    confidence: data.confidence,
    flags: data.flags,
    recommendation: data.recommendation,
  };
}

export type Verdict = "dangerous" | "suspicious" | "safe";

export interface Flag {
  type: string;
  description: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;
  flags: Flag[];
  recommendation: string;
}

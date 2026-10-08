const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function analyzeEmail(
  emailText: string,
  adminKey?: string,
  lang?: string
): Promise<AnalysisResult> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/analyze-email`;
  const payload: Record<string, string> = { emailText };
  if (adminKey) payload.adminKey = adminKey;
  if (lang) payload.lang = lang;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (response.status === 429 || body?.error === "rate_limit_exceeded") {
    throw new RateLimitError(body?.message ?? "rate_limit_exceeded");
  }

  if (!response.ok) {
    if (body?.error === "invalid_json") {
      throw new Error("invalid_json");
    }
    throw new Error("request_failed");
  }

  if (!body.verdict || !Array.isArray(body.flags)) {
    throw new Error("invalid_json");
  }

  return {
    verdict: body.verdict,
    confidence: body.confidence,
    flags: body.flags,
    recommendation: body.recommendation,
    remaining: typeof body.remaining === "number" ? body.remaining : undefined,
    limit: typeof body.limit === "number" ? body.limit : undefined,
  };
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
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
  remaining?: number;
  limit?: number;
}

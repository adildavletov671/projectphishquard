import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  AlertTriangle,
  Loader2,
  Send,
  Lightbulb,
  Lock,
  Clock,
  Link2,
  Languages,
  Mail,
} from "lucide-react";
import { analyzeEmail, type AnalysisResult, type Verdict } from "@/lib/supabase";

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; bg: string; border: string; glow: string; Icon: typeof ShieldCheck }
> = {
  dangerous: {
    label: "Опасно",
    bg: "bg-red-950/40",
    border: "border-red-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(239,68,68,0.5)]",
    Icon: ShieldAlert,
  },
  suspicious: {
    label: "Подозрительно",
    bg: "bg-amber-950/40",
    border: "border-amber-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.5)]",
    Icon: ShieldQuestion,
  },
  safe: {
    label: "Похоже, безопасно",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/50",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.5)]",
    Icon: ShieldCheck,
  },
};

function pickFlagIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("срочност") || t.includes("давлен") || t.includes("угроз")) return Clock;
  if (t.includes("домен") || t.includes("отправител") || t.includes("brand")) return Mail;
  if (t.includes("ссылк") || t.includes("url") || t.includes("ip")) return Link2;
  if (t.includes("парол") || t.includes("карт") || t.includes("код") || t.includes("данн")) return Lock;
  if (t.includes("граммат") || t.includes("стилист") || t.includes("аномал")) return Languages;
  return AlertTriangle;
}

export default function App() {
  const [emailText, setEmailText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!emailText.trim()) {
      setError("Вставьте текст письма для проверки");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeEmail(emailText);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg === "invalid_json" ? "Не удалось проанализировать, попробуйте ещё раз" : "Не удалось проанализировать, попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 antialiased">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #22d3ee 1px, transparent 1px), linear-gradient(to bottom, #22d3ee 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Анализатор фишинга
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              PhishGuard
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
            Проверь письмо на признаки фишинга за секунды
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-10">
          <div className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/20 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder="Вставь сюда текст подозрительного письма…"
              rows={8}
              className="relative w-full resize-y rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 shadow-2xl shadow-black/40 backdrop-blur-sm transition-colors focus:border-cyan-400/60 focus:outline-none sm:text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:shadow-cyan-500/40 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:text-base"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Анализирую…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Проверить
              </>
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-4">
            <VerdictCard result={result} />
            <FlagsList flags={result.flags} />
            <RecommendationBlock recommendation={result.recommendation} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-slate-600">
          Результат носит рекомендательный характер и не гарантирует точности.
        </footer>
      </div>
    </div>
  );
}

function VerdictCard({ result }: { result: AnalysisResult }) {
  const cfg = VERDICT_CONFIG[result.verdict];
  const { Icon } = cfg;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} ${cfg.glow} p-6 transition-all duration-500`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${cfg.border} bg-slate-950/40`}>
          <Icon className="h-7 w-7 text-slate-100" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">Вердикт</p>
          <p className="text-2xl font-bold text-slate-50 sm:text-3xl">{cfg.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">Уверенность</p>
          <p className="text-2xl font-bold tabular-nums text-slate-50 sm:text-3xl">
            {result.confidence}%
          </p>
        </div>
      </div>
    </div>
  );
}

function FlagsList({ flags }: { flags: AnalysisResult["flags"] }) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Подозрительных признаков не обнаружено.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
        Обнаруженные признаки ({flags.length})
      </p>
      <div className="space-y-2.5">
        {flags.map((flag, i) => {
          const Icon = pickFlagIcon(flag.type);
          return (
            <div
              key={i}
              className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5">
                <Icon className="h-4 w-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">{flag.type}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                  {flag.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationBlock({ recommendation }: { recommendation: string }) {
  if (!recommendation) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5">
        <Lightbulb className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-cyan-400">
          Рекомендация
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{recommendation}</p>
      </div>
    </div>
  );
}

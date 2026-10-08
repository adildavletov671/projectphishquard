import { useState, useRef } from "react";
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
  ArrowDown,
  Check,
} from "lucide-react";
import { analyzeEmail, RateLimitError, type AnalysisResult, type Verdict } from "@/lib/supabase";
import { useI18n, LANGUAGES, type Language } from "@/lib/i18n";

function useVerdictConfig(t: (key: string) => string) {
  return {
    dangerous: {
      label: t("verdictDangerous"),
      bg: "bg-red-950/40",
      border: "border-red-500/50",
      glow: "shadow-[0_0_40px_-8px_rgba(239,68,68,0.5)]",
      Icon: ShieldAlert,
    },
    suspicious: {
      label: t("verdictSuspicious"),
      bg: "bg-amber-950/40",
      border: "border-amber-500/50",
      glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.5)]",
      Icon: ShieldQuestion,
    },
    safe: {
      label: t("verdictSafe"),
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/50",
      glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.5)]",
      Icon: ShieldCheck,
    },
  } as const;
}

function LanguageSwitcher({
  lang,
  setLang,
}: {
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm transition-colors hover:border-cyan-400/40 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
        aria-label="Language"
      >
        <Languages className="h-4 w-4" />
        {LANGUAGES.find((l) => l.code === lang)?.label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-28 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/95 py-1 shadow-xl shadow-black/50 backdrop-blur-md">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onMouseDown={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-cyan-400/10 ${
                lang === l.code ? "text-cyan-300" : "text-slate-300"
              }`}
            >
              {l.label}
              {lang === l.code && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const adminKey = new URLSearchParams(window.location.search).get("admin_key") ?? undefined;
  const { lang, setLang, t } = useI18n();
  const verdictConfig = useVerdictConfig(t);
  const [emailText, setEmailText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit] = useState(5);
  const formRef = useRef<HTMLFormElement>(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!emailText.trim()) {
      setError(t("errorEmpty"));
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setRateLimited(false);
    try {
      const res = await analyzeEmail(emailText, adminKey, lang);
      setResult(res);
      if (typeof res.remaining === "number") {
        setRemaining(res.remaining);
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        setError(err.message === "rate_limit_exceeded" ? t("errorRateLimit") : err.message);
        setRateLimited(true);
        setRemaining(0);
      } else {
        setError(t("errorGeneric"));
      }
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

      <LanguageSwitcher lang={lang} setLang={setLang} />

      <div className="relative mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              PhishGuard
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
            {t("subtitle")}
          </p>
        </header>

        {/* Hero section */}
        <section className="mt-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            {t("heroTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {t("heroDescription")}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard
              Icon={Link2}
              title={t("card1Title")}
              description={t("card1Description")}
            />
            <InfoCard
              Icon={Clock}
              title={t("card2Title")}
              description={t("card2Description")}
            />
            <InfoCard
              Icon={Lock}
              title={t("card3Title")}
              description={t("card3Description")}
            />
          </div>

          <button
            onClick={scrollToForm}
            className="mt-10 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-6 py-3 text-sm font-semibold text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 sm:text-base"
          >
            {t("checkButton")}
            <ArrowDown className="h-4 w-4" />
          </button>
        </section>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="mt-16 scroll-mt-6">
          <div className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-cyan-500/20 via-transparent to-emerald-500/20 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100" />
            <textarea
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              placeholder={t("placeholder")}
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
                {t("analyzing")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("analyzeButton")}
              </>
            )}
          </button>

          {remaining !== null && !rateLimited && (
            <p className="mt-3 text-center text-xs text-slate-500">
              {t("remaining")} <span className="font-semibold text-cyan-400">{remaining}</span> {t("of")} {limit}
            </p>
          )}
          {rateLimited && (
            <p className="mt-3 text-center text-xs text-amber-400/80">
              {t("remaining")} <span className="font-semibold">0</span> {t("of")} {limit}
            </p>
          )}
        </form>

        {/* Error */}
        {error && (
          <div className={`mt-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${rateLimited ? "border-amber-500/40 bg-amber-950/30 text-amber-300" : "border-red-500/40 bg-red-950/30 text-red-300"}`}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-4">
            <VerdictCard result={result} config={verdictConfig} t={t} />
            <FlagsList flags={result.flags} t={t} />
            <RecommendationBlock recommendation={result.recommendation} t={t} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-slate-600">
          {t("footer")}
        </footer>
      </div>
    </div>
  );
}

function VerdictCard({
  result,
  config,
  t,
}: {
  result: AnalysisResult;
  config: ReturnType<typeof useVerdictConfig>;
  t: (key: string) => string;
}) {
  const cfg = config[result.verdict];
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
          <p className="text-xs uppercase tracking-wider text-slate-400">{t("verdictLabel")}</p>
          <p className="text-2xl font-bold text-slate-50 sm:text-3xl">{cfg.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wider text-slate-400">{t("confidenceLabel")}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-50 sm:text-3xl">
            {result.confidence}%
          </p>
        </div>
      </div>
    </div>
  );
}

function FlagsList({
  flags,
  t,
}: {
  flags: AnalysisResult["flags"];
  t: (key: string) => string;
}) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        {t("noFlags")}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-slate-500">
        {t("flagsTitle")} ({flags.length})
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

function InfoCard({
  Icon,
  title,
  description,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 text-center transition-colors duration-200 hover:border-cyan-400/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/5">
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function RecommendationBlock({
  recommendation,
  t,
}: {
  recommendation: string;
  t: (key: string) => string;
}) {
  if (!recommendation) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/5">
        <Lightbulb className="h-4 w-4 text-cyan-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-cyan-400">
          {t("recommendationLabel")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{recommendation}</p>
      </div>
    </div>
  );
}

function pickFlagIcon(type: string) {
  const t = type.toLowerCase();
  const urgency = ["срочност", "давлен", "угроз", "асығыст", "қауіп", "urgency", "urgent", "threat", "pressure", "жедел"];
  const domain = ["домен", "отправител", "brand", "домен", "жіберуші", "domain", "sender", "brand"];
  const link = ["ссылк", "url", "ip", "сілтеме", "link", "url", "ip"];
  const data = ["парол", "карт", "код", "данн", "құпиясөз", "карта", "код", "дерек", "password", "card", "code", "data"];
  const grammar = ["граммат", "стилист", "аномал", "грамматик", "стиль", "аномалия", "grammar", "style", "anomal"];

  if (urgency.some((kw) => t.includes(kw))) return Clock;
  if (domain.some((kw) => t.includes(kw))) return Mail;
  if (link.some((kw) => t.includes(kw))) return Link2;
  if (data.some((kw) => t.includes(kw))) return Lock;
  if (grammar.some((kw) => t.includes(kw))) return Languages;
  return AlertTriangle;
}

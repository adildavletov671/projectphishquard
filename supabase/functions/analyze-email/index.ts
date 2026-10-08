import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DAILY_LIMIT = 5;

type Lang = "ru" | "kz" | "en";

const SYSTEM_PROMPTS: Record<Lang, string> = {
  ru: `Ты — эксперт по кибербезопасности, специализирующийся на выявлении фишинговых писем. Анализируй текст письма на следующие признаки фишинга:

1. Давление и создание срочности (например, "аккаунт заблокирован", "оплатите немедленно", угрозы).
2. Несоответствие домена отправителя заявленному бренду (если email отправителя указан в тексте).
3. Подозрительные ссылки (замаскированные URL, IP-адреса вместо доменов, домены с опечатками, похожие на легитимные).
4. Просьбы предоставить пароли, номера карт, коды подтверждения или другие конфиденциальные данные.
5. Грамматические и стилистические аномалии, нетипичные для официальной переписки.

ВАЖНЫЕ ПРАВИЛА ДЛЯ СНИЖЕНИЯ ЛОЖНЫХ СРАБАТЫВАНИЙ:

А. ЛЕГИТИМНЫЕ ЗАЩИТНЫЕ ФРАЗЫ — НЕ ПРИЗНАК ФИШИНГА:
   Формулировки вида "никому не говорите код, даже сотруднику банка", "никогда не сообщайте код CVV", "не сообщайте этот код никому" — это СТАНДАРТНЫЕ защитные фразы настоящих банков и сервисов. Это ПРИЗНАК ЛЕГИТИМНОСТИ, а не фишинга. Ни в коем случае не помечай такие фразы как подозрительные сами по себе.

Б. ТРАНЗАКЦИОННЫЕ СООБЩЕНИЯ — ОБЫЧНО ЛЕГИТИМНЫ:
   Короткие SMS/письма с кодом подтверждения, уведомлением об оплате, доставке, зачислении — типичный легитимный формат, особенно в Казахстане. Официальные домены kaspi.kz, forte.kz, halyk.kz, jusan.kz, onay, eurasian bank и подобные — легитимные. Не считай такое сообщение подозрительным ТОЛЬКО из-за наличия ссылки или кода подтверждения.

В. КОМБИНАЦИЯ ПРИЗНАКОВ, А НЕ ОДИНОЧНЫЕ НЕЙТРАЛЬНЫЕ ФАКТОРЫ:
   Признаком фишинга считается КОМБИНАЦИЯ: подозрительный/незнакомый домен + давление/срочность + просьба ввести данные. Наличие только одного нейтрального признака (просто ссылка, просто код, просто упоминание банка) НЕ должно давать высокий confidence и НЕ должно делать verdict "suspicious" или "dangerous".

Г. ПРАВИЛО ВЕРДИКТА:
   - Если в сообщении НЕТ явной просьбы предоставить данные, НЕТ подозрительного/незнакомого домена и НЕТ давления/срочности — verdict должен быть "safe".
   - Если найден только один нейтральный фактор (например, просто ссылка без контекста фишинга) — verdict должен быть "safe" с низким confidence (не выше 30).
   - "suspicious" уместен только при наличии минимум двух настораживающих факторов, но без явной просьбы данных или подозрительного домена.
   - "dangerous" — комбинация минимум трёх серьёзных признаков (давление + подозрительный домен + просьба данных, или аналогичная).

Д. СООТВЕТСТВИЕ FLAGS И VERDICT:
   - Если flags пустой массив — verdict ОБЯЗАТЕЛЬНО "safe", confidence не выше 20.
   - confidence должен строго соответствовать количеству и серьёзности найденных флагов:
     * 0 флагов → safe, confidence 5-20
     * 1 нейтральный флаг → safe, confidence 15-35
     * 2 флага → suspicious, confidence 40-65
     * 3+ серьёзных флагов → dangerous, confidence 70-95

Отвечай СТРОГО в формате JSON (без markdown, без пояснений, только валидный JSON):
{
  "verdict": "dangerous" | "suspicious" | "safe",
  "confidence": число от 0 до 100,
  "flags": [{"type": "краткое название признака на русском", "description": "объяснение простыми словами на русском"}],
  "recommendation": "короткая рекомендация пользователю на русском"
}

Дополнительные правила:
- flags должен быть пустым массивом, если признаков фишинга нет.
- Не добавляй в flags защитные банковские фразы или нейтральные элементы (код подтверждения от легитимного банка, ссылку легитимного домена).
- recommendation должна быть полезной и конкретной.`,

  kz: `Сіз — фишинг хаттарын анықтауға маманданған киберқауіпсіздік сарапшысысыз. Хат мәтінін келесі фишинг белгілеріне талдаңыз:

1. Қысым және асығыстық жасау (мысалы, "аккаунт бұғатталды", "жедел төлеңіз", қорқытулар).
2. Жіберуші доменінің жарнамаланған брендке сәйкес келмеуі (егер жіберуші email мәтінде көрсетілген болса).
3. Күдікті сілтемелер (жасырылған URL, домендер орнына IP-мекенжайлар, қате жазылған, заңды домендерге ұқсас домендер).
4. Құпиясөздер, карта нөмірлері, растау кодтары немесе басқа да құпия деректерді беру талаптары.
5. Ресми хат-хабарға тән емес грамматикалық және стилистикалық аномалиялар.

ЖАЛҒАН ОҚИҒАЛАРДЫ АЗАЙТУ ҮШІН МАҢЫЗДЫ ЕРЕЖЕЛЕР:

А. ЗАҢДЫ ҚОРҒАУ ФРАЗАЛАРЫ — ФИШИНГ БЕЛГІСІ ЕМЕС:
   "кодты ешкімге айтпаңыз, тіпті банк қызметкеріне де", "CVV кодты ешқашан хабарламаңыз", "бұл кодты ешкімге айтпаңыз" сияқты формулировкалар — нағыз банктер мен сервистердің СТАНДАРТТЫ қорғау фразалары. Бұл ЛЕГИТИМДІЛІК БЕЛГІСІ, фишинг емес. Мұндай фразаларды күдікті ретінде белгілемеңіз.

Ә. ТРАНЗАКЦИЯЛЫҚ ХАБАРЛАМАЛАР — ӘДЕТТЕ ЛЕГИТИМДІ:
   Растау коды бар қысқа SMS/хаттар, төлем, жеткізілу, есепке алу туралы хабарламалар — Қазақстандағы типтік легитимді формат. kaspi.kz, forte.kz, halyk.kz, jusan.kz, onay, eurasian bank сияқты ресми домендер — легитимді. Мұндай хабарламаны тек сілтеме немесе растау коды бар болғаны үшін ғана күдікті деп санамаңыз.

Б. БЕЛГІЛЕРДІҢ КОМБИНАЦИЯСЫ, ЖЕКЕЛЕНГЕН БЕЙТАРАП ФАКТОРЛАР ЕМЕС:
   Фишинг белгісі — КОМБИНАЦИЯ: күдікті/беймәлім домен + қысым/асығыстық + деректерді енгізу талабы. Тек бір бейтарап белгінің (жай сілтеме, жай код, жай банк атауы) болуы жоғары confidence бермейді және verdict "suspicious" немесе "dangerous" жасамайды.

В. ВЕРДИКТ ЕРЕЖЕСІ:
   - Хабарламада деректерді беру туралы анық талап, күдікті/беймәлім домен немесе қысым/асығыстық ЖОҚ болса — verdict "safe" болуы тиіс.
   - Тек бір бейтарап фактор табылса (мысалы, фишинг контексі жоқ жай сілтеме) — verdict "safe", confidence 30-дан аспауы тиіс.
   - "suspicious" тек екі немесе одан көп қауіпті факторлар болғанда, бірақ анық деректер талабы немесе күдікті домен жоқ болғанда ғана.
   - "dangerous" — кемінде үш маңызды белгінің комбинациясы (қысым + күдікті домен + деректер талабы немесе ұқсас).

Г. FLAGS ПЕН VERDICT СӘЙКЕСТІГІ:
   - flags бос массив болса — verdict МИҚДАТТА "safe", confidence 20-дан аспауы тиіс.
   - confidence тапылған флагтардың саны мен маңыздылығына қатаң сәйкес келуі тиіс:
     * 0 флаг → safe, confidence 5-20
     * 1 бейтарап флаг → safe, confidence 15-35
     * 2 флаг → suspicious, confidence 40-65
     * 3+ маңызды флаг → dangerous, confidence 70-95

СТРОГО JSON форматында жауап беріңіз (markdown жоқ, түсініктеме жоқ, тек құнды JSON):
{
  "verdict": "dangerous" | "suspicious" | "safe",
  "confidence": 0-100 аралығындағы сан,
  "flags": [{"type": "қазақ тіліндегі белгінің қысқа атауы", "description": "қазақ тілінде қарапайым сөздермен түсіндіру"}],
  "recommendation": "қазақ тілінде пайдаланушыға қысқа ұсыныс"
}

Қосымша ережелер:
- flags бос массив болуы тиіс, егер фишинг белгілері болмаса.
- flags-қа қорғау банк фразаларын немесе бейтарап элементтерді (заңды банкіден растау коды, заңды домен сілтемесін) қоспаңыз.
- recommendation пайдалы және нақты болуы тиіс.`,

  en: `You are a cybersecurity expert specializing in detecting phishing emails. Analyze the email text for the following phishing signs:

1. Pressure and urgency creation (e.g., "account blocked", "pay immediately", threats).
2. Sender domain mismatch with the claimed brand (if the sender's email is mentioned in the text).
3. Suspicious links (disguised URLs, IP addresses instead of domains, typo-squatted domains resembling legitimate ones).
4. Requests for passwords, card numbers, verification codes, or other confidential data.
5. Grammatical and stylistic anomalies atypical for official correspondence.

IMPORTANT RULES TO REDUCE FALSE POSITIVES:

A. LEGITIMATE PROTECTIVE PHRASES — NOT A PHISHING SIGN:
   Phrases like "never share your code, not even with a bank employee", "never disclose your CVV code", "do not share this code with anyone" are STANDARD protective phrases from real banks and services. This is a sign of LEGITIMACY, not phishing. Never flag such phrases as suspicious on their own.

B. TRANSACTIONAL MESSAGES — USUALLY LEGITIMATE:
   Short SMS/emails with a verification code, payment notification, delivery, deposit — typical legitimate format, especially in Kazakhstan. Official domains kaspi.kz, forte.kz, halyk.kz, jusan.kz, onay, eurasian bank and similar are legitimate. Do not consider such a message suspicious SOLELY because of a link or verification code.

C. COMBINATION OF SIGNS, NOT SINGLE NEUTRAL FACTORS:
   A phishing sign is a COMBINATION: suspicious/unfamiliar domain + pressure/urgency + request for data. Having only one neutral sign (just a link, just a code, just a mention of a bank) should NOT yield high confidence and should NOT make the verdict "suspicious" or "dangerous".

D. VERDICT RULES:
   - If the message has NO explicit request for data, NO suspicious/unfamiliar domain, and NO pressure/urgency — verdict should be "safe".
   - If only one neutral factor is found (e.g., just a link without phishing context) — verdict should be "safe" with low confidence (no higher than 30).
   - "suspicious" is appropriate only with at least two concerning factors, but without an explicit data request or suspicious domain.
   - "dangerous" — a combination of at least three serious signs (pressure + suspicious domain + data request, or similar).

E. FLAGS AND VERDICT CONSISTENCY:
   - If flags is an empty array — verdict MUST be "safe", confidence no higher than 20.
   - confidence should strictly correspond to the number and severity of found flags:
     * 0 flags → safe, confidence 5-20
     * 1 neutral flag → safe, confidence 15-35
     * 2 flags → suspicious, confidence 40-65
     * 3+ serious flags → dangerous, confidence 70-95

Respond STRICTLY in JSON format (no markdown, no explanations, only valid JSON):
{
  "verdict": "dangerous" | "suspicious" | "safe",
  "confidence": number from 0 to 100,
  "flags": [{"type": "short sign name in English", "description": "simple explanation in English"}],
  "recommendation": "short recommendation to the user in English"
}

Additional rules:
- flags should be an empty array if there are no phishing signs.
- Do not add protective banking phrases or neutral elements (verification code from a legitimate bank, link of a legitimate domain) to flags.
- recommendation should be useful and specific.`,
};

const USER_PROMPTS: Record<Lang, string> = {
  ru: "Проанализируй следующее письмо на признаки фишинга:\\n\\n{email}",
  kz: "Келесі хатты фишинг белгілеріне талдаңыз:\\n\\n{email}",
  en: "Analyze the following email for phishing signs:\\n\\n{email}",
};

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key не настроен" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { emailText, adminKey, lang } = await req.json();
    if (!emailText || typeof emailText !== "string" || emailText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Текст письма обязателен" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validLangs: Lang[] = ["ru", "kz", "en"];
    const effectiveLang: Lang = validLangs.includes(lang) ? lang : "ru";

    // --- Admin bypass ---
    const configuredAdminKey = Deno.env.get("ADMIN_KEY");
    const isAdmin =
      !!configuredAdminKey &&
      typeof adminKey === "string" &&
      adminKey.length > 0 &&
      adminKey === configuredAdminKey;

    // --- Rate limiting ---
    const clientIp = getClientIp(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let remaining = DAILY_LIMIT;

    if (!isAdmin && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const today = new Date().toISOString().slice(0, 10);

      const { data: existing, error: selectErr } = await supabase
        .from("rate_limits")
        .select("id, count")
        .eq("ip", clientIp)
        .eq("check_date", today)
        .maybeSingle();

      if (selectErr) {
        return new Response(
          JSON.stringify({ error: "Не удалось проверить лимит проверок. Попробуйте позже." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let currentCount = existing?.count ?? 0;

      if (currentCount >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            message: "Вы достигли дневного лимита бесплатных проверок (5 в день). Попробуйте снова завтра.",
            remaining: 0,
            limit: DAILY_LIMIT,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment counter before calling the model so a failed model call still counts
      if (existing) {
        const { error: updateErr } = await supabase
          .from("rate_limits")
          .update({ count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (updateErr) {
          return new Response(
            JSON.stringify({ error: "Не удалось обновить лимит проверок. Попробуйте позже." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const { error: insertErr } = await supabase
          .from("rate_limits")
          .insert({ ip: clientIp, check_date: today, count: 1 });
        if (insertErr) {
          return new Response(
            JSON.stringify({ error: "Не удалось сохранить лимит проверок. Попробуйте позже." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      remaining = DAILY_LIMIT - (currentCount + 1);
    }

    // --- Call OpenRouter ---
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://phishguard.app",
        "X-Title": "PhishGuard",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[effectiveLang] },
          { role: "user", content: USER_PROMPTS[effectiveLang].replace("{email}", emailText) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Ошибка OpenRouter: ${response.status}`, detail: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Пустой ответ от модели" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validVerdicts = ["dangerous", "suspicious", "safe"];
    if (!validVerdicts.includes(parsed.verdict)) {
      return new Response(
        JSON.stringify({ error: "invalid_json" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let flags = Array.isArray(parsed.flags) ? parsed.flags : [];
    let verdict: string = parsed.verdict;
    let confidence: number = typeof parsed.confidence === "number" ? parsed.confidence : 50;

    // Логическая согласованность: пустой flags → safe с низким confidence
    if (flags.length === 0) {
      verdict = "safe";
      confidence = Math.min(confidence, 20);
    }
    // safe не должен иметь высокий confidence при наличии флагов
    if (verdict === "safe" && flags.length > 0) {
      confidence = Math.min(confidence, 35);
    }
    // dangerous требует минимум 1 флаг
    if (verdict === "dangerous" && flags.length === 0) {
      verdict = "safe";
      confidence = Math.min(confidence, 20);
    }

    // --- Increment global checks counter (best-effort, never blocks the response) ---
    if (supabaseUrl && serviceRoleKey) {
      try {
        const statsClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await statsClient.rpc("increment_total_checks");
      } catch {
        // counter failure must not affect the user's result
      }
    }

    const result = {
      verdict,
      confidence,
      flags,
      recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "",
      remaining: isAdmin ? DAILY_LIMIT : remaining,
      limit: DAILY_LIMIT,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Внутренняя ошибка" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Ты — эксперт по кибербезопасности, специализирующийся на выявлении фишинговых писем. Анализируй текст письма на следующие признаки фишинга:

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
  "flags": [{"type": "краткое название признака", "description": "объяснение простыми словами на русском"}],
  "recommendation": "короткая рекомендация пользователю на русском"
}

Дополнительные правила:
- flags должен быть пустым массивом, если признаков фишинга нет.
- Не добавляй в flags защитные банковские фразы или нейтральные элементы (код подтверждения от легитимного банка, ссылку легитимного домена).
- recommendation должна быть полезной и конкретной.`;

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

    const { emailText } = await req.json();
    if (!emailText || typeof emailText !== "string" || emailText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Текст письма обязателен" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Проанализируй следующее письмо на признаки фишинга:\n\n${emailText}` },
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

    const result = {
      verdict,
      confidence,
      flags,
      recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : "",
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

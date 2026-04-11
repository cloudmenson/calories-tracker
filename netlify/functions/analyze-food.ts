import type { Handler } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "GROQ_API_KEY не настроен" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const { image, weight, goalCalories = 2000, todayCalories = 0 } = body;
  const remaining = goalCalories - todayCalories;
  const w = Number(weight) || 100;

  const hasImage =
    image && typeof image === "string" && image.startsWith("data:");
  const groqModel = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const promptText = `Ты нутрициолог-аналитик. ${
    hasImage
      ? "Посмотри на фото и определи что за блюдо или продукт."
      : "Определи блюдо по названию."
  } Рассчитай его калорийность и БЖУ для веса ${w}г.

Контекст пользователя:
- Дневная норма: ${goalCalories} ккал
- Уже съедено сегодня: ${todayCalories} ккал
- Осталось на сегодня: ${remaining} ккал

Ответь СТРОГО JSON (без markdown, без \`\`\`):
{
  "name": "название блюда на русском",
  "calories": <число — ккал для ${w}г>,
  "protein": <число — белки г для ${w}г>,
  "fat": <число — жиры г для ${w}г>,
  "carbs": <число — углеводы г для ${w}г>,
  "caloriesPer100g": <число — ккал на 100г>,
  "proteinPer100g": <число — белки г на 100г>,
  "fatPer100g": <число — жиры г на 100г>,
  "carbsPer100g": <число — углеводы г на 100г>,
  "message": "<1–2 предложения: что за блюдо и как соотносится с дневной нормой>"
}`;

  type CPart = { type: string; text?: string; image_url?: { url: string } };
  const userContent: string | CPart[] = hasImage
    ? [
        { type: "image_url", image_url: { url: image as string } },
        { type: "text", text: promptText },
      ]
    : promptText;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: "user", content: userContent }],
        ...(hasImage ? {} : { response_format: { type: "json_object" } }),
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(clean) as unknown;
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: msg }),
    };
  }
};

import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "GEMINI_API_KEY не настроен" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const { image, weight, goalCalories = 2000, todayCalories = 0 } = body;
  const remaining = goalCalories - todayCalories;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  type Part =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const parts: Part[] = [];

  if (image && typeof image === "string" && image.startsWith("data:")) {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/s);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }

  const w = Number(weight) || 100;
  const prompt = `Ты нутрициолог-аналитик. Посмотри на фото и определи что за блюдо или продукт. Рассчитай его калорийность и БЖУ для веса ${w}г.

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

  parts.push({ text: prompt });

  try {
    const result = await model.generateContent(parts);
    const raw = result.response.text().trim();
    // Strip potential markdown fences just in case
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(clean);
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

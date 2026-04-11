import type { Handler } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `Ты — персональный AI-помощник по питанию и здоровью "NutriAI". 

ТВОИ ВОЗМОЖНОСТИ:
• Анализировать питание, калории, БЖУ за день/неделю
• Рассчитывать оптимальное питание под цели пользователя  
• Предлагать рецепты из продуктов в холодильнике
• Добавлять блюда в дневник питания
• Добавлять продукты в холодильник
• Создавать новые рецепты
• Анализировать прогресс по весу и давать рекомендации
• Рассчитывать КБЖУ любого блюда

ВАЖНО:
• Всегда отвечай на русском языке
• Будь дружелюбным, мотивирующим, конкретным  
• Используй данные из контекста для персонализации
• Предлагай практические советы, а не общие слова
• Можешь вести свободный диалог — обсуждай питание, рецепты, здоровье, мотивацию

ФОРМАТ ОТВЕТА — строго JSON:
{
  "text": "твой ответ (поддерживает markdown: **жирный**, _курсив_, • списки)",
  "actions": []
}

ТИПЫ ДЕЙСТВИЙ (добавляй только если пользователь явно просит добавить/создать):

ADD_DIARY_ENTRY — добавить блюдо в дневник:
{
  "type": "ADD_DIARY_ENTRY",
  "label": "Добавить [название] в дневник",
  "data": {
    "name": "название блюда",
    "mealType": "breakfast | lunch | dinner | snack",
    "portionWeight": 200,
    "calories": 165,
    "protein": 31.0,
    "fat": 3.6,
    "carbs": 0.0
  }
}

ADD_FRIDGE_ITEM — добавить продукт в холодильник:
{
  "type": "ADD_FRIDGE_ITEM",
  "label": "Добавить [название] в холодильник",
  "data": {
    "name": "название продукта",
    "calories": 165,
    "protein": 31.0,
    "fat": 3.6,
    "carbs": 0.0,
    "amount": 500,
    "unit": "г"
  }
}

ADD_RECIPE — создать рецепт:
{
  "type": "ADD_RECIPE",
  "label": "Создать рецепт [название]",
  "data": {
    "name": "название рецепта",
    "description": "краткое описание и способ приготовления",
    "defaultPortionWeight": 300,
    "totalCalories": 450,
    "totalProtein": 35.0,
    "totalFat": 12.0,
    "totalCarbs": 45.0,
    "caloriesPer100g": 150,
    "ingredients": [],
    "tags": ["тег1", "тег2"]
  }
}

Если действий нет — "actions": []`;

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
      body: JSON.stringify({
        text: '⚠️ **GEMINI_API_KEY не настроен**\n\nЧтобы включить AI-функции:\n\n1. Перейди на [aistudio.google.com](https://aistudio.google.com)\n2. Нажми **"Get API Key"** → **"Create API key"**\n3. Скопируй ключ\n4. В Netlify: **Site Settings → Environment Variables → Add variable**\n   - Key: `GEMINI_API_KEY`\n   - Value: твой ключ\n5. Передеплой сайт\n\nGemini 1.5 Flash полностью **бесплатный** (1500 запросов/день)!',
        actions: [],
        setupRequired: true,
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      message,
      history = [],
      context,
      image,
    } = body as {
      message: string;
      history: Array<{ role: "user" | "model"; text: string }>;
      context: Record<string, unknown> | null;
      image?: string; // base64 data-url e.g. "data:image/jpeg;base64,..."
    };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.85,
        maxOutputTokens: 2048,
      },
    });

    // Build rich context string
    let contextStr = "";
    if (context) {
      const u = context.user as Record<string, unknown>;
      const todayEntries =
        (context.todayEntries as Array<Record<string, unknown>>) ?? [];
      const recipes = (context.recipes as Array<Record<string, unknown>>) ?? [];
      const fridge = (context.fridge as Array<Record<string, unknown>>) ?? [];
      const weights =
        (context.weightHistory as Array<Record<string, unknown>>) ?? [];

      contextStr = `
ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
• Имя: ${u.name}, ${u.age} лет, ${u.gender === "male" ? "мужской" : "женский"} пол
• Рост: ${u.height} см, Текущий вес: ${u.weight} кг
• ИМТ: ${(u.bmi as number).toFixed(1)} (${(u.bmi as number) < 18.5 ? "недовес" : (u.bmi as number) < 25 ? "норма" : (u.bmi as number) < 30 ? "избыточный вес" : "ожирение"})
• TDEE (суточная потребность): ${Math.round(u.tdee as number)} ккал
• Цель по калориям: ${u.goalCalories} ккал${u.goalWeight ? `\n• Целевой вес: ${u.goalWeight} кг` : ""}
• Активность: ${u.activity}

СЕГОДНЯ (${new Date().toLocaleDateString("ru-RU")}):
• Съедено: ${Math.round(context.todayCalories as number)} ккал из ${u.goalCalories} (осталось: ${Math.round((u.goalCalories as number) - (context.todayCalories as number))} ккал)
• Приёмы пищи: ${todayEntries.length > 0 ? todayEntries.map((e) => `${e.name} (${e.portionWeight}г, ${Math.round(e.calories as number)} ккал)`).join("; ") : "ничего не добавлено"}
${todayEntries.length > 0 ? `• Белки: ${todayEntries.reduce((a, e) => a + (e.protein as number), 0).toFixed(1)}г, Жиры: ${todayEntries.reduce((a, e) => a + (e.fat as number), 0).toFixed(1)}г, Углеводы: ${todayEntries.reduce((a, e) => a + (e.carbs as number), 0).toFixed(1)}г` : ""}

ХОЛОДИЛЬНИК (${fridge.length} продуктов):
${
  fridge.length > 0
    ? fridge
        .slice(0, 12)
        .map(
          (f) => `• ${f.name}: ${f.amount}${f.unit} (${f.calories} ккал/100г)`,
        )
        .join("\n")
    : "• Пусто"
}

МОИ РЕЦЕПТЫ (${recipes.length}):
${
  recipes.length > 0
    ? recipes
        .slice(0, 8)
        .map((r) => `• ${r.name} — ${Math.round(r.calories as number)} ккал`)
        .join("\n")
    : "• Нет рецептов"
}
${
  weights.length > 1
    ? `\nИСТОРИЯ ВЕСА:\n${weights
        .slice(-5)
        .map((w) => `• ${w.date}: ${w.weight} кг`)
        .join("\n")}`
    : ""
}`;
    }

    const systemWithCtx = SYSTEM_PROMPT + "\n\n" + contextStr;

    // Build chat history (last 12 messages)
    const chatHistory = history.slice(-12).map((m) => ({
      role: m.role as "user" | "model",
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text:
                systemWithCtx +
                '\n\nПойми свои инструкции и скажи только: {"text": "Готов помочь!", "actions": []}',
            },
          ],
        },
        {
          role: "model",
          parts: [{ text: '{"text": "Готов помочь!", "actions": []}' }],
        },
        ...chatHistory,
      ],
    });

    // Build message parts — text + optional image
    const messageParts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (image && typeof image === "string" && image.startsWith("data:")) {
      // Extract mime type and base64 data from data-url
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        messageParts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }

    messageParts.push({
      text: image
        ? `${message}\n\n(Пользователь прикрепил фото блюда/продукта. Проанализируй его: определи что это, примерный вес порции, калории, БЖУ. Предложи добавить в дневник.)`
        : message,
    });

    const result = await chat.sendMessage(messageParts);
    const raw = result.response.text();

    let parsed: { text: string; actions: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw, actions: [] };
    }

    if (!parsed.text) parsed.text = raw;
    if (!Array.isArray(parsed.actions)) parsed.actions = [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error("Chat function error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        text: `Произошла ошибка: ${msg}. Попробуй ещё раз.`,
        actions: [],
      }),
    };
  }
};

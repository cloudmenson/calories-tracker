import type { Handler } from "@netlify/functions";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `Ты — персональный AI-помощник по питанию "NutriAI".

ГЛАВНОЕ ПРАВИЛО — когда пользователь присылает фото еды и/или вес блюда:
• Спроси состав блюда коротко: «Опиши состав» или «Из чего блюдо?»
• Когда пользователь описал состав — СРАЗУ считай калории и БЖУ для указанного веса, не задавай больше вопросов
• Сообщай: название блюда, ккал для указанного веса, БЖУ, сколько осталось до нормы
• Сразу предлагай действие «Добавить в дневник»
• Отвечай коротко и по делу

ОСТАЛЬНЫЕ ВОЗМОЖНОСТИ:
• Отвечать на вопросы про питание, рецепты, здоровье
• Добавлять блюда в дневник, продукты в холодильник, создавать рецепты

ВАЖНО:
• Всегда отвечай на русском языке
• Никогда не проси уточнить состав или макронутриенты — считай сам по стандартным данным
• Используй данные из контекста (норма калорий, уже съедено сегодня)

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        text: "⚠️ **GROQ_API_KEY не настроен**. Добавь ключ из console.groq.com в Netlify → Environment Variables.",
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

    // Build messages for Groq (OpenAI-compatible)
    type GContent =
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    const messages: Array<{ role: string; content: GContent }> = [
      { role: "system", content: systemWithCtx },
      ...history.slice(-12).map((m: { role: string; text: string }) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    const hasImage =
      image && typeof image === "string" && image.startsWith("data:");
    if (hasImage) {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image as string } },
          {
            type: "text",
            text: `${message}\n\nНа фото еда. Спроси у пользователя состав блюда одним коротким вопросом (например «Из чего это блюдо?»). Не считай калории пока не узнаешь состав.`,
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    const groqModel = hasImage
      ? "meta-llama/llama-4-scout-17b-16e-instruct"
      : "llama-3.3-70b-versatile";

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages,
          ...(hasImage ? {} : { response_format: { type: "json_object" } }),
          temperature: 0.85,
          max_tokens: 2048,
        }),
      },
    );

    if (!groqRes.ok) {
      throw new Error(await groqRes.text());
    }

    const groqData = (await groqRes.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const raw = groqData.choices[0].message.content;

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

import type { Handler } from "@netlify/functions";
import { getDb, isMongoConfigured } from "./_mongo";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const DOC_ID = "main";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (!isMongoConfigured()) {
    return {
      statusCode: 503,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "MONGODB_URI not configured" }),
    };
  }

  try {
    const db = await getDb();
    const col = db.collection("app_state");

    // GET — load state
    if (event.httpMethod === "GET") {
      const doc = await col.findOne({ _id: DOC_ID as unknown as never });
      if (!doc) return { statusCode: 204, headers: CORS_HEADERS, body: "" };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...state } = doc;
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(state),
      };
    }

    // POST — save state
    if (event.httpMethod === "POST") {
      const state = JSON.parse(event.body || "{}");
      // Strip chats to keep document small (can be large with many messages)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chats, activeChatId, ...rest } = state as Record<string, unknown>;
      await col.replaceOne(
        { _id: DOC_ID as unknown as never },
        {
          _id: DOC_ID as unknown as never,
          ...rest,
          updatedAt: new Date().toISOString(),
        },
        { upsert: true },
      );
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true }),
      };
    }

    return { statusCode: 405, headers: CORS_HEADERS, body: "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: msg }),
    };
  }
};

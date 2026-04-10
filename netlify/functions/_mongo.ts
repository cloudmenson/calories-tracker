import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";

// Cache client across warm function invocations (serverless best practice)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(dbName = "calories-tracker"): Promise<Db> {
  if (cachedDb) return cachedDb;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  cachedClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  await cachedClient.connect();
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  DIARY: "diary_entries",
  RECIPES: "recipes",
  FRIDGE: "fridge_items",
  WEIGHTS: "weight_history",
  CHAT: "chat_history",
} as const;

// Helper to check if MongoDB is configured
export function isMongoConfigured(): boolean {
  return Boolean(uri && uri.startsWith("mongodb"));
}

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Gender = "male" | "female";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  age: number;
  height: number; // cm
  weight: number; // kg
  gender: Gender;
  activity: ActivityLevel;
  goalCalories?: number;
  goalWeight?: number;
  createdAt: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface Ingredient {
  id: string;
  productId: string;
  name: string;
  amount: number; // grams
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Recipe {
  id: string;
  name: string;
  photo?: string;
  description?: string;
  ingredients: Ingredient[];
  defaultPortionWeight: number; // grams
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  caloriesPer100g: number;
  userId: string;
  createdAt: string;
  tags: string[];
}

export interface FridgeItem {
  id: string;
  name: string;
  calories: number; // per 100g
  protein: number; // per 100g
  fat: number; // per 100g
  carbs: number; // per 100g
  amount: number; // grams in fridge
  unit: string;
  expiresAt?: string;
  photo?: string;
  userId: string;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  name: string;
  photo?: string;
  portionWeight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  recipeId?: string;
  fridgeItemId?: string;
  createdAt: string;
}

export interface AppState {
  users: UserProfile[];
  activeUserId: string | null;
  weightHistory: Record<string, WeightEntry[]>; // userId -> entries
  recipes: Record<string, Recipe[]>; // userId -> recipes
  fridge: Record<string, FridgeItem[]>; // userId -> items
  diary: Record<string, DiaryEntry[]>; // userId -> entries
}

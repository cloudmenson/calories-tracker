import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCalories(cal: number): string {
  return Math.round(cal).toLocaleString("ru-RU");
}

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female",
): number {
  if (gender === "male") {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  }
  return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
}

export function calculateTDEE(bmr: number, activity: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return bmr * (multipliers[activity] ?? 1.2);
}

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Недовес", color: "text-blue-500" };
  if (bmi < 25) return { label: "Норма", color: "text-green-500" };
  if (bmi < 30) return { label: "Избыточный вес", color: "text-yellow-500" };
  return { label: "Ожирение", color: "text-red-500" };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

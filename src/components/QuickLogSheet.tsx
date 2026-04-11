import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  Loader2,
  Search,
  BookOpen,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/Button";
import { useAppStore } from "../store";
import { analyzeFood, type FoodAnalysis } from "../lib/api";
import { todayStr } from "../lib/utils";
import type { DiaryEntry, MealType, Recipe } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Завтрак", emoji: "🌅" },
  { value: "lunch", label: "Обед", emoji: "☀️" },
  { value: "dinner", label: "Ужин", emoji: "🌙" },
  { value: "snack", label: "Перекус", emoji: "🍎" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = dataUrl;
  });
}

function recipeMacrosPer100g(r: Recipe) {
  const totalW = r.ingredients.reduce((s, i) => s + i.amount, 0) || 100;
  return {
    protein: (r.totalProtein / totalW) * 100,
    fat: (r.totalFat / totalW) * 100,
    carbs: (r.totalCarbs / totalW) * 100,
  };
}

// ─── Sub-component: Meal type selector ───────────────────────────────────────

function MealTypeSelector({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (v: MealType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MEAL_TYPES.map(({ value: v, label, emoji }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`py-2.5 rounded-xl text-center transition-colors ${
            value === v
              ? "bg-primary-500 text-white"
              : "bg-[--surface-2] text-[--muted]"
          }`}
        >
          <div className="text-lg">{emoji}</div>
          <div className="text-xs font-medium mt-0.5">{label}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Sub-component: Macro grid ────────────────────────────────────────────────

function MacroGrid({
  protein,
  fat,
  carbs,
}: {
  protein: number;
  fat: number;
  carbs: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { l: "Белки", v: protein, c: "text-green-400" },
        { l: "Жиры", v: fat, c: "text-orange-400" },
        { l: "Углеводы", v: carbs, c: "text-blue-400" },
      ].map(({ l, v, c }) => (
        <div key={l} className="text-center bg-[--surface] rounded-xl py-2.5">
          <p className={`text-base font-bold ${c}`}>
            {v.toFixed(1)}
            <span className="text-xs font-normal text-[--muted]">г</span>
          </p>
          <p className="text-xs text-[--muted]">{l}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-component: Budget banner ─────────────────────────────────────────────

function BudgetBanner({ delta }: { delta: number }) {
  const ok = delta >= 0;
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl ${ok ? "bg-primary-500/10" : "bg-red-500/10"}`}
    >
      <span className="text-lg">{ok ? "✅" : "⚠️"}</span>
      <p
        className={`text-sm font-semibold ${ok ? "text-primary-400" : "text-red-400"}`}
      >
        {ok
          ? `После добавления останется ${Math.round(delta)} ккал`
          : `Превышение нормы на ${Math.round(-delta)} ккал`}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

type Tab = "photo" | "recipe";

export function QuickLogSheet({ isOpen, onClose, onAdded }: Props) {
  const {
    getActiveUser,
    getTodayEntries,
    addDiaryEntry,
    activeUserId,
    recipes,
  } = useAppStore();

  const [tab, setTab] = useState<Tab>("photo");
  const [mealType, setMealType] = useState<MealType>("lunch");

  // Photo tab
  const [image, setImage] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Recipe tab
  const [query, setQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeWeight, setRecipeWeight] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // Store state
  const user = getActiveUser();
  const today = todayStr();
  const todayEntries = activeUserId ? getTodayEntries(activeUserId, today) : [];
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);
  const goalCalories = user?.goalCalories ?? 2000;
  const remaining = goalCalories - todayCalories;

  // Recipes list
  const userRecipes: Recipe[] = activeUserId
    ? (recipes[activeUserId] ?? [])
    : [];
  const filtered = query.trim()
    ? userRecipes.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()),
      )
    : userRecipes;

  // Recipe live calculations
  const rw = parseFloat(recipeWeight) || 0;
  const recipeM = selectedRecipe ? recipeMacrosPer100g(selectedRecipe) : null;
  const recipeCals = selectedRecipe
    ? Math.round((selectedRecipe.caloriesPer100g / 100) * rw)
    : 0;
  const recipeProtein = recipeM
    ? Math.round((recipeM.protein / 100) * rw * 10) / 10
    : 0;
  const recipeFat = recipeM
    ? Math.round((recipeM.fat / 100) * rw * 10) / 10
    : 0;
  const recipeCarbs = recipeM
    ? Math.round((recipeM.carbs / 100) * rw * 10) / 10
    : 0;

  // Budget preview
  const photoAfter = result ? remaining - result.calories : remaining;
  const recipeAfter =
    selectedRecipe && rw > 0 ? remaining - recipeCals : remaining;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const pickImage = async (file: File) => {
    const raw = await fileToBase64(file);
    const compressed = await compressImage(raw);
    setImage(compressed);
    setResult(null);
    setAnalyzeError(null);
  };

  const handleAnalyze = async () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      setAnalyzeError("Введите вес порции");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const data = await analyzeFood({
        image: image ?? undefined,
        weight: w,
        goalCalories,
        todayCalories,
      });
      setResult(data);
    } catch {
      setAnalyzeError("Ошибка анализа. Проверьте фото и попробуйте ещё раз.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddPhoto = () => {
    if (!result || !activeUserId) return;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: today,
      mealType,
      name: result.name,
      portionWeight: parseFloat(weight),
      calories: result.calories,
      protein: result.protein,
      fat: result.fat,
      carbs: result.carbs,
      createdAt: new Date().toISOString(),
    };
    addDiaryEntry(activeUserId, entry);
    onAdded?.();
    handleClose();
  };

  const handleAddRecipe = () => {
    if (!selectedRecipe || rw <= 0 || !activeUserId) return;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: today,
      mealType,
      name: selectedRecipe.name,
      portionWeight: rw,
      calories: recipeCals,
      protein: recipeProtein,
      fat: recipeFat,
      carbs: recipeCarbs,
      createdAt: new Date().toISOString(),
    };
    addDiaryEntry(activeUserId, entry);
    onAdded?.();
    handleClose();
  };

  const handleClose = () => {
    setImage(null);
    setWeight("");
    setResult(null);
    setAnalyzeError(null);
    setAnalyzing(false);
    setQuery("");
    setSelectedRecipe(null);
    setRecipeWeight("");
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[--surface] rounded-t-3xl max-h-[92dvh] flex flex-col shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[--border]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 shrink-0">
              <h2 className="text-lg font-bold text-[--text]">Добавить еду</h2>
              <button
                onClick={handleClose}
                className="h-8 w-8 rounded-full bg-[--surface-2] flex items-center justify-center"
              >
                <X className="h-4 w-4 text-[--muted]" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 px-5 pb-4 shrink-0">
              <button
                onClick={() => setTab("photo")}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  tab === "photo"
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                    : "bg-[--surface-2] text-[--muted]"
                }`}
              >
                📷 Фото + ИИ
              </button>
              <button
                onClick={() => setTab("recipe")}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  tab === "recipe"
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                    : "bg-[--surface-2] text-[--muted]"
                }`}
              >
                📋 Рецепты
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
              {/* ─── PHOTO TAB ─── */}
              {tab === "photo" && (
                <>
                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        await pickImage(f);
                        e.target.value = "";
                      }
                    }}
                  />

                  {/* Photo picker */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center ${
                      image
                        ? "border-transparent p-0 overflow-hidden"
                        : "border-[--border] py-10 bg-[--surface-2] active:bg-[--border]"
                    }`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt="Фото еды"
                        className="w-full object-cover rounded-2xl"
                        style={{ maxHeight: 220 }}
                      />
                    ) : (
                      <>
                        <div className="h-16 w-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-3">
                          <Camera className="h-8 w-8 text-primary-500" />
                        </div>
                        <p className="font-semibold text-[--text] text-sm">
                          Добавить фото
                        </p>
                        <p className="text-xs text-[--muted] mt-1">
                          Из галереи или камера
                        </p>
                      </>
                    )}
                  </button>

                  {image && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-primary-500 font-medium w-full text-center"
                    >
                      Сменить фото
                    </button>
                  )}

                  {/* Weight + analyze row */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-[--muted] block mb-1.5">
                        Вес порции
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="250"
                          value={weight}
                          onChange={(e) => {
                            setWeight(e.target.value);
                            setResult(null);
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAnalyze()
                          }
                          className="h-12 w-full rounded-xl border border-[--border] bg-[--surface-2] px-4 pr-10 text-sm text-[--text] placeholder:text-[--muted] outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[--muted] font-medium">
                          г
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing || !weight}
                      className="h-12 px-5 shrink-0"
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {analyzing ? "Анализ…" : "Считать"}
                    </Button>
                  </div>

                  {/* Hint: no photo = text only analysis */}
                  {!image && (
                    <p className="text-xs text-[--muted] text-center -mt-1">
                      Можно без фото — ИИ спросит что за блюдо
                    </p>
                  )}

                  {/* Error */}
                  {analyzeError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-xl">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400">{analyzeError}</p>
                    </div>
                  )}

                  {/* Result card */}
                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="bg-[--surface-2] rounded-2xl p-4 space-y-3">
                          {/* Name + weight badge */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-[--text] text-base leading-tight">
                              {result.name}
                            </p>
                            <span className="shrink-0 text-xs bg-[--surface] text-[--muted] px-2 py-0.5 rounded-full">
                              {weight}г
                            </span>
                          </div>

                          {/* Big calorie number */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-5xl font-black text-primary-500 tabular-nums">
                              {Math.round(result.calories)}
                            </span>
                            <span className="text-[--muted] text-base font-medium">
                              ккал
                            </span>
                          </div>

                          <MacroGrid
                            protein={result.protein}
                            fat={result.fat}
                            carbs={result.carbs}
                          />

                          {result.message && (
                            <p className="text-sm text-[--muted]">
                              {result.message}
                            </p>
                          )}

                          <BudgetBanner delta={photoAfter} />
                        </div>

                        {/* Meal type + add */}
                        <MealTypeSelector
                          value={mealType}
                          onChange={setMealType}
                        />
                        <Button
                          onClick={handleAddPhoto}
                          className="w-full h-13 text-base font-semibold"
                        >
                          <Check className="h-5 w-5" />
                          Добавить в дневник
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* ─── RECIPE TAB ─── */}
              {tab === "recipe" && (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[--muted]" />
                    <input
                      type="text"
                      placeholder="Поиск рецептов…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="h-12 w-full pl-10 pr-4 bg-[--surface-2] border border-[--border] rounded-xl text-[--text] placeholder:text-[--muted] outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    />
                  </div>

                  {/* Empty state */}
                  {userRecipes.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="h-10 w-10 text-[--border] mx-auto mb-3" />
                      <p className="font-semibold text-[--muted] text-sm">
                        Нет сохранённых рецептов
                      </p>
                      <p className="text-xs text-[--border] mt-1">
                        Добавьте рецепты в разделе «Рецепты»
                      </p>
                    </div>
                  )}

                  {/* Recipe list */}
                  {filtered.length > 0 && (
                    <div className="space-y-2">
                      {filtered.map((recipe) => {
                        const isSelected = selectedRecipe?.id === recipe.id;
                        return (
                          <button
                            key={recipe.id}
                            onClick={() => {
                              setSelectedRecipe(isSelected ? null : recipe);
                              setRecipeWeight("");
                            }}
                            className={`w-full p-4 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? "border-primary-500 bg-primary-500/8"
                                : "border-[--border] bg-[--surface-2]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[--text] text-sm truncate">
                                  {recipe.name}
                                </p>
                                <p className="text-xs text-[--muted] mt-0.5">
                                  {Math.round(recipe.caloriesPer100g)} ккал · Б{" "}
                                  {Math.round(
                                    recipeMacrosPer100g(recipe).protein,
                                  )}
                                  г · Ж{" "}
                                  {Math.round(recipeMacrosPer100g(recipe).fat)}г
                                  · У{" "}
                                  {Math.round(
                                    recipeMacrosPer100g(recipe).carbs,
                                  )}
                                  г — на 100г
                                </p>
                              </div>
                              {isSelected && (
                                <div className="h-6 w-6 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Weight + result */}
                  <AnimatePresence>
                    {selectedRecipe && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 pt-1"
                      >
                        <div>
                          <label className="text-sm font-medium text-[--muted] block mb-1.5">
                            Вес порции «{selectedRecipe.name}»
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="300"
                              value={recipeWeight}
                              onChange={(e) => setRecipeWeight(e.target.value)}
                              autoFocus
                              className="h-12 w-full rounded-xl border border-[--border] bg-[--surface-2] px-4 pr-10 text-sm text-[--text] placeholder:text-[--muted] outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[--muted] font-medium">
                              г
                            </span>
                          </div>
                        </div>

                        {rw > 0 && (
                          <div className="bg-[--surface-2] rounded-2xl p-4 space-y-3">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-5xl font-black text-primary-500 tabular-nums">
                                {recipeCals}
                              </span>
                              <span className="text-[--muted] text-base font-medium">
                                ккал
                              </span>
                              <span className="text-xs text-[--muted] ml-1">
                                для {rw}г
                              </span>
                            </div>
                            <MacroGrid
                              protein={recipeProtein}
                              fat={recipeFat}
                              carbs={recipeCarbs}
                            />
                            <BudgetBanner delta={recipeAfter} />
                          </div>
                        )}

                        <MealTypeSelector
                          value={mealType}
                          onChange={setMealType}
                        />

                        <Button
                          onClick={handleAddRecipe}
                          disabled={rw <= 0}
                          className="w-full h-13 text-base font-semibold"
                        >
                          <Check className="h-5 w-5" />
                          Добавить в дневник
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

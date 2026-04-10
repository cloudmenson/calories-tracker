import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/Select";
import {
  CalendarDays,
  Plus,
  Trash2,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import type { DiaryEntry, MealType } from "../types";
import { format, addDays, subDays } from "date-fns";
import { ru } from "date-fns/locale";

const mealTypes: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Завтрак", emoji: "🌅" },
  { value: "lunch", label: "Обед", emoji: "☀️" },
  { value: "dinner", label: "Ужин", emoji: "🌙" },
  { value: "snack", label: "Перекус", emoji: "🍎" },
];

interface DiaryForm {
  name: string;
  mealType: MealType;
  portionWeight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function DiaryPage() {
  const { activeUserId, diary, addDiaryEntry, deleteDiaryEntry, recipes } =
    useAppStore();
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [recipePickOpen, setRecipePickOpen] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");
  const entries: DiaryEntry[] = activeUserId
    ? (diary[activeUserId] ?? []).filter((e) => e.date === dateStr)
    : [];
  const userRecipes = activeUserId ? (recipes[activeUserId] ?? []) : [];

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const { register, handleSubmit, control, reset } = useForm<DiaryForm>({
    defaultValues: {
      mealType: "lunch",
      portionWeight: 100,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    },
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: DiaryForm) => {
    if (!activeUserId) return;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: dateStr,
      mealType: data.mealType,
      name: data.name,
      photo,
      portionWeight: data.portionWeight,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      createdAt: new Date().toISOString(),
    };
    addDiaryEntry(activeUserId, entry);
    setPhoto(undefined);
    reset();
    setOpen(false);
  };

  const logFromRecipe = (recipeId: string) => {
    const recipe = userRecipes.find((r) => r.id === recipeId);
    if (!recipe || !activeUserId) return;
    const w = recipe.defaultPortionWeight;
    addDiaryEntry(activeUserId, {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: dateStr,
      mealType: "lunch",
      name: recipe.name,
      photo: recipe.photo,
      portionWeight: w,
      calories: (recipe.caloriesPer100g * w) / 100,
      protein:
        (recipe.totalProtein /
          recipe.ingredients.reduce((a, i) => a + i.amount, 0) || 0) * w,
      fat:
        (recipe.totalFat /
          recipe.ingredients.reduce((a, i) => a + i.amount, 0) || 0) * w,
      carbs:
        (recipe.totalCarbs /
          recipe.ingredients.reduce((a, i) => a + i.amount, 0) || 0) * w,
      recipeId: recipe.id,
      createdAt: new Date().toISOString(),
    });
    setRecipePickOpen(false);
  };

  const groupedEntries = mealTypes.map(({ value, label, emoji }) => ({
    mealType: value,
    label,
    emoji,
    entries: entries.filter((e) => e.mealType === value),
  }));

  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen">
      <TopBar
        title="Дневник питания"
        right={
          <div className="flex gap-1">
            {userRecipes.length > 0 && (
              <Button
                size="icon-sm"
                variant="secondary"
                onClick={() => setRecipePickOpen(true)}
              >
                📖
              </Button>
            )}
            <Button size="icon-sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Date Picker */}
        <div className="flex items-center justify-between bg-white dark:bg-[#161622] rounded-2xl shadow-soft border border-transparent dark:border-[#27273a] px-4 py-3">
          <button
            onClick={() => setDate((d) => subDays(d, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27273a] transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-900 capitalize">
              {format(date, "EEEE", { locale: ru })}
            </p>
            <p className="text-sm text-gray-500">
              {format(date, "d MMMM yyyy", { locale: ru })}
            </p>
            {isToday && (
              <span className="inline-block mt-0.5 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                Сегодня
              </span>
            )}
          </div>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-[#27273a] transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Daily summary */}
        {entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      label: "Калории",
                      val: Math.round(totals.calories),
                      unit: "ккал",
                      color: "text-orange-600 bg-orange-50",
                    },
                    {
                      label: "Белки",
                      val: totals.protein.toFixed(1),
                      unit: "г",
                      color: "text-green-600 bg-green-50",
                    },
                    {
                      label: "Жиры",
                      val: totals.fat.toFixed(1),
                      unit: "г",
                      color: "text-yellow-600 bg-yellow-50",
                    },
                    {
                      label: "Углев",
                      val: totals.carbs.toFixed(1),
                      unit: "г",
                      color: "text-blue-600 bg-blue-50",
                    },
                  ].map(({ label, val, unit, color }) => (
                    <div
                      key={label}
                      className={`${color} rounded-xl p-2.5 text-center`}
                    >
                      <p className="text-[10px] font-medium opacity-70">
                        {label}
                      </p>
                      <p className="text-sm font-bold leading-tight">{val}</p>
                      <p className="text-[9px] opacity-60">{unit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Meal groups */}
        {groupedEntries.map(
          ({ mealType, label, emoji, entries: mealEntries }) =>
            mealEntries.length > 0 && (
              <motion.div
                key={mealType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{emoji}</span>
                  <h3 className="font-bold text-gray-800 text-sm">{label}</h3>
                  <Badge variant="secondary">
                    {Math.round(
                      mealEntries.reduce((a, e) => a + e.calories, 0),
                    )}{" "}
                    ккал
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {mealEntries.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -80 }}
                      >
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              {entry.photo ? (
                                <img
                                  src={entry.photo}
                                  alt={entry.name}
                                  className="h-14 w-14 rounded-xl object-cover shrink-0"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                                  {emoji}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">
                                  {entry.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {entry.portionWeight}г
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge variant="default">
                                    {Math.round(entry.calories)} ккал
                                  </Badge>
                                  <Badge variant="secondary">
                                    Б {entry.protein.toFixed(1)}г
                                  </Badge>
                                  <Badge variant="accent">
                                    Ж {entry.fat.toFixed(1)}г
                                  </Badge>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  activeUserId &&
                                  deleteDiaryEntry(activeUserId, entry.id)
                                }
                                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-200 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ),
        )}

        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <CalendarDays className="h-16 w-16 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Нет записей</p>
            <p className="text-gray-400 text-sm mb-4">
              Добавьте что вы ели в этот день
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Добавить запись
            </Button>
          </motion.div>
        )}
      </div>

      {/* Add diary entry dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить приём пищи</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Photo */}
            {photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt="food"
                  className="w-full h-36 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="absolute top-2 right-2 h-7 w-7 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-16 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <Camera className="h-5 w-5 text-gray-300" />
                <span className="text-sm text-gray-400">
                  Сфотографировать еду
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
            )}

            <Input
              label="Название блюда"
              placeholder="Овсяная каша с ягодами..."
              {...register("name", { required: true })}
            />

            <Controller
              name="mealType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger label="Приём пищи">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map(({ value, label, emoji }) => (
                      <SelectItem key={value} value={value}>
                        {emoji} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Порция (г)"
                type="number"
                {...register("portionWeight")}
              />
              <Input label="Калории" type="number" {...register("calories")} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Белки (г)" type="number" {...register("protein")} />
              <Input label="Жиры (г)" type="number" {...register("fat")} />
              <Input
                label="Углеводы (г)"
                type="number"
                {...register("carbs")}
              />
            </div>

            <Button type="submit">Добавить в дневник</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pick recipe dialog */}
      <Dialog open={recipePickOpen} onOpenChange={setRecipePickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выбрать рецепт</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {userRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => logFromRecipe(recipe.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors text-left border border-gray-100 dark:border-[#27273a] dark:hover:bg-primary-500/10"
              >
                {recipe.photo ? (
                  <img
                    src={recipe.photo}
                    alt={recipe.name}
                    className="h-12 w-12 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                    🍽️
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {recipe.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {recipe.defaultPortionWeight}г ·{" "}
                    {Math.round(
                      (recipe.caloriesPer100g * recipe.defaultPortionWeight) /
                        100,
                    )}{" "}
                    ккал
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

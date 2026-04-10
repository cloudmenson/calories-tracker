import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardContent } from "../components/ui/Card";
import { Progress } from "../components/ui/Progress";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/Dialog";
import { Input } from "../components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/Select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Flame,
  Droplets,
  Beef,
  Wheat,
  Plus,
  Camera,
  Target,
  TrendingUp,
  Refrigerator,
} from "lucide-react";
import {
  calculateBMR,
  calculateTDEE,
  todayStr,
  formatCalories,
} from "../lib/utils";
import type { DiaryEntry, MealType } from "../types";
import { Controller, useForm } from "react-hook-form";

const mealLabels: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: "Завтрак", emoji: "🌅" },
  lunch: { label: "Обед", emoji: "☀️" },
  dinner: { label: "Ужин", emoji: "🌙" },
  snack: { label: "Перекус", emoji: "🍎" },
};

interface QuickAddForm {
  name: string;
  mealType: MealType;
  portionWeight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    getActiveUser,
    getTodayEntries,
    addDiaryEntry,
    activeUserId,
    weightHistory,
  } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);

  const user = getActiveUser();
  const today = todayStr();
  const entries = activeUserId ? getTodayEntries(activeUserId, today) : [];

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const goalCal = user?.goalCalories ?? 2000;
  const calPct = Math.min((totals.calories / goalCal) * 100, 100);

  const weightArr = activeUserId ? (weightHistory[activeUserId] ?? []) : [];
  const latestWeight =
    weightArr.length > 0
      ? weightArr[weightArr.length - 1].weight
      : user?.weight;

  const { register, handleSubmit, control, reset } = useForm<QuickAddForm>({
    defaultValues: {
      mealType: "lunch",
      portionWeight: 100,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
    },
  });

  const onQuickAdd = (data: QuickAddForm) => {
    if (!activeUserId) return;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: today,
      mealType: data.mealType,
      name: data.name,
      portionWeight: data.portionWeight,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      createdAt: new Date().toISOString(),
    };
    addDiaryEntry(activeUserId, entry);
    reset();
    setAddOpen(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80svh] p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="h-24 w-24 bg-gradient-to-br from-primary-400 to-emerald-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        >
          <Flame className="h-12 w-12 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Добро пожаловать!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
          Создайте профиль чтобы начать отслеживать питание
        </p>
        <Button onClick={() => navigate("/users")} className="px-6">
          <Plus className="h-4 w-4" /> Создать профиль
        </Button>
      </div>
    );
  }

  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
  const tdee = calculateTDEE(bmr, user.activity);
  const remaining = goalCal - totals.calories;

  return (
    <div>
      <TopBar
        title="Главная"
        right={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="icon-sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Быстрое добавление</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onQuickAdd)}
                className="flex flex-col gap-3"
              >
                <Input
                  label="Название"
                  placeholder="Куриная грудка..."
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
                        {Object.entries(mealLabels).map(
                          ([val, { label, emoji }]) => (
                            <SelectItem key={val} value={val}>
                              {emoji} {label}
                            </SelectItem>
                          ),
                        )}
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
                  <Input
                    label="Калории"
                    type="number"
                    {...register("calories")}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Белки" type="number" {...register("protein")} />
                  <Input label="Жиры" type="number" {...register("fat")} />
                  <Input
                    label="Углеводы"
                    type="number"
                    {...register("carbs")}
                  />
                </div>
                <Button type="submit" className="mt-1">Добавить</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-gray-900">
            Привет, {user.name.split(" ")[0]}! 👋
          </h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </motion.div>

        {/* Calorie ring card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: totals.calories },
                          { value: Math.max(goalCal - totals.calories, 0) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={52}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#f3f4f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-gray-900 leading-none">
                      {formatCalories(totals.calories)}
                    </span>
                    <span className="text-[10px] text-gray-400">ккал</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      Калории сегодня
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCalories(totals.calories)}
                    <span className="text-sm text-gray-400 font-normal">
                      {" "}
                      / {formatCalories(goalCal)}
                    </span>
                  </p>
                  <Progress value={calPct} className="mt-2" />
                  <p
                    className={`text-xs mt-1 font-medium ${remaining >= 0 ? "text-primary-600" : "text-red-500"}`}
                  >
                    {remaining >= 0
                      ? `Осталось: ${formatCalories(remaining)} ккал`
                      : `Превышение: ${formatCalories(-remaining)} ккал`}
                  </p>
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                {[
                  {
                    label: "Белки",
                    value: totals.protein,
                    color: "text-green-600",
                    bg: "bg-green-50",
                    icon: <Beef className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Жиры",
                    value: totals.fat,
                    color: "text-orange-600",
                    bg: "bg-orange-50",
                    icon: <Droplets className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Углеводы",
                    value: totals.carbs,
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                    icon: <Wheat className="h-3.5 w-3.5" />,
                  },
                ].map(({ label, value, color, bg, icon }) => (
                  <div
                    key={label}
                    className={`${bg} rounded-xl p-2.5 text-center`}
                  >
                    <div
                      className={`flex items-center justify-center gap-1 ${color} mb-0.5`}
                    >
                      {icon}
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                    <p className={`text-base font-bold ${color}`}>
                      {value.toFixed(1)}
                      <span className="text-xs font-normal">г</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-gray-500 font-medium">TDEE</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatCalories(tdee)}
              </p>
              <p className="text-xs text-gray-400">ккал/день</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 font-medium">Вес</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {latestWeight}{" "}
                <span className="text-sm text-gray-400 font-normal">кг</span>
              </p>
              {user.goalWeight && (
                <p className="text-xs text-gray-400">
                  Цель: {user.goalWeight} кг
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-2 gap-3"
        >
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/fridge")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Refrigerator className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Холодильник</p>
                <p className="text-xs text-gray-400">Продукты</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/recipes")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Camera className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Рецепты</p>
                <p className="text-xs text-gray-400">Блюда</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's meals */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Сегодня</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/diary")}
            >
              Все записи
            </Button>
          </div>
          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Camera className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Ещё нет записей</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Добавить еду
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 5).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg shrink-0">
                      {mealLabels[entry.mealType].emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {entry.portionWeight}г ·{" "}
                        {mealLabels[entry.mealType].label}
                      </p>
                    </div>
                    <Badge variant="default">
                      {Math.round(entry.calories)} ккал
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {entries.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/diary")}
                >
                  Ещё {entries.length - 5} записей
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

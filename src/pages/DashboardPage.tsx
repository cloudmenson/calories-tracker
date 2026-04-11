import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardContent } from "../components/ui/Card";
import { Progress } from "../components/ui/Progress";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { QuickLogSheet } from "../components/QuickLogSheet";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Flame,
  Droplets,
  Beef,
  Wheat,
  Plus,
  Target,
  TrendingUp,
  Refrigerator,
  UtensilsCrossed,
} from "lucide-react";
import {
  calculateBMR,
  calculateTDEE,
  todayStr,
  formatCalories,
} from "../lib/utils";
import type { MealType } from "../types";

const mealLabels: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: "Завтрак", emoji: "🌅" },
  lunch: { label: "Обед", emoji: "☀️" },
  dinner: { label: "Ужин", emoji: "🌙" },
  snack: { label: "Перекус", emoji: "🍎" },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { getActiveUser, getTodayEntries, activeUserId, weightHistory } =
    useAppStore();
  const [logOpen, setLogOpen] = useState(false);

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
    <div className="relative">
      <TopBar title="Главная" />
      <QuickLogSheet isOpen={logOpen} onClose={() => setLogOpen(false)} />

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-[--text]">
            Привет, {user.name.split(" ")[0]}! 👋
          </h2>
          <p className="text-sm text-[--muted]">
            {new Date().toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </motion.div>

        {/* Calorie hero card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              {/* Ring + stats row */}
              <div className="flex items-center gap-5">
                {/* Ring */}
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: totals.calories },
                          { value: Math.max(goalCal - totals.calories, 0) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={58}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill={remaining < 0 ? "#ef4444" : "#22c55e"} />
                        <Cell fill="#27273a" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-[--text] leading-none">
                      {formatCalories(totals.calories)}
                    </span>
                    <span className="text-xs text-[--muted]">съедено</span>
                  </div>
                </div>

                {/* Text stats */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[--muted] font-medium uppercase tracking-wide mb-1">
                    {remaining >= 0 ? "Осталось сегодня" : "Превышение"}
                  </p>
                  <p
                    className={`text-4xl font-black tabular-nums leading-none ${
                      remaining >= 0 ? "text-primary-500" : "text-red-400"
                    }`}
                  >
                    {formatCalories(Math.abs(remaining))}
                  </p>
                  <p className="text-sm text-[--muted] mt-0.5">
                    из {formatCalories(goalCal)} ккал
                  </p>
                  <Progress value={calPct} className="mt-3" />
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[--border]">
                {[
                  {
                    label: "Белки",
                    value: totals.protein,
                    color: "text-green-400",
                    bg: "bg-green-500/8",
                    icon: <Beef className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Жиры",
                    value: totals.fat,
                    color: "text-orange-400",
                    bg: "bg-orange-500/8",
                    icon: <Droplets className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Углеводы",
                    value: totals.carbs,
                    color: "text-blue-400",
                    bg: "bg-blue-500/8",
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
                      <span className="text-xs font-normal text-[--muted]">
                        г
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => setLogOpen(true)}
                className="mt-4 w-full h-14 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] rounded-2xl flex items-center justify-center gap-2.5 font-bold text-white text-base shadow-lg shadow-primary-500/30 transition-all"
              >
                <Plus className="h-6 w-6" />
                Добавить еду
              </button>
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
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-[--muted] font-medium">TDEE</span>
              </div>
              <p className="text-xl font-bold text-[--text]">
                {formatCalories(tdee)}
              </p>
              <p className="text-xs text-[--muted]">ккал/день</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-[--muted] font-medium">Вес</span>
              </div>
              <p className="text-xl font-bold text-[--text]">
                {latestWeight}{" "}
                <span className="text-sm text-[--muted] font-normal">кг</span>
              </p>
              {user.goalWeight && (
                <p className="text-xs text-[--muted]">
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
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Refrigerator className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[--text]">
                  Холодильник
                </p>
                <p className="text-xs text-[--muted]">Продукты</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/recipes")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[--text]">Рецепты</p>
                <p className="text-xs text-[--muted]">Блюда</p>
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
            <h3 className="font-bold text-[--text]">Сегодня</h3>
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
                <Flame className="h-10 w-10 text-[--border] mx-auto mb-2" />
                <p className="text-[--muted] text-sm">Ещё нет записей</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLogOpen(true)}
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
                    <div className="h-10 w-10 rounded-xl bg-[--surface-2] flex items-center justify-center text-lg shrink-0">
                      {mealLabels[entry.mealType].emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[--text] text-sm truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs text-[--muted]">
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

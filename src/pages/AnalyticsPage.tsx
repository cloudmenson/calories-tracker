import { useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/Tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  Target,
  Activity,
  Plus,
  Scale,
} from "lucide-react";
import {
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  getBMICategory,
  todayStr,
} from "../lib/utils";
import type { WeightEntry } from "../types";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";

const activityLabels: Record<string, string> = {
  sedentary: "Сидячий",
  light: "Лёгкая",
  moderate: "Умеренная",
  active: "Высокая",
  very_active: "Очень высокая",
};

export function AnalyticsPage() {
  const { getActiveUser, activeUserId, weightHistory, addWeightEntry, diary } =
    useAppStore();
  const [weightOpen, setWeightOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  const user = getActiveUser();
  const weightArr: WeightEntry[] = activeUserId
    ? (weightHistory[activeUserId] ?? [])
    : [];
  const diaryEntries = activeUserId ? (diary[activeUserId] ?? []) : [];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Activity className="h-16 w-16 text-gray-200 mb-4" />
        <p className="text-gray-500">Нет активного профиля</p>
      </div>
    );
  }

  const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
  const tdee = calculateTDEE(bmr, user.activity);
  const bmi = calculateBMI(user.weight, user.height);
  const bmiInfo = getBMICategory(bmi);

  const latestWeight =
    weightArr.length > 0 ? weightArr[weightArr.length - 1].weight : user.weight;
  const firstWeight = weightArr.length > 0 ? weightArr[0].weight : user.weight;
  const weightDiff = latestWeight - firstWeight;

  // Last 30 days calories
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    const dayEntries = diaryEntries.filter((e) => e.date === date);
    const cal = dayEntries.reduce((acc, e) => acc + e.calories, 0);
    return {
      date: format(subDays(new Date(), 29 - i), "dd.MM", { locale: ru }),
      calories: Math.round(cal),
    };
  });

  // Weight chart data
  const weightChartData = weightArr.slice(-30).map((e) => ({
    date: format(new Date(e.date), "dd.MM", { locale: ru }),
    weight: e.weight,
  }));

  const handleAddWeight = () => {
    if (!activeUserId || !newWeight) return;
    addWeightEntry(activeUserId, {
      date: todayStr(),
      weight: parseFloat(newWeight),
    });
    setNewWeight("");
    setWeightOpen(false);
  };

  const statCards = [
    {
      label: "ИМТ",
      value: bmi.toFixed(1),
      sub: bmiInfo.label,
      color: "bg-blue-50",
      icon: <Scale className="h-5 w-5 text-blue-500" />,
      textColor: bmiInfo.color,
    },
    {
      label: "TDEE",
      value: `${Math.round(tdee)}`,
      sub: "ккал/день",
      color: "bg-orange-50",
      icon: <Activity className="h-5 w-5 text-orange-500" />,
      textColor: "text-orange-600",
    },
    {
      label: "Базальный обмен",
      value: `${Math.round(bmr)}`,
      sub: "ккал покоя",
      color: "bg-purple-50",
      icon: <Target className="h-5 w-5 text-purple-500" />,
      textColor: "text-purple-600",
    },
    {
      label: "Изменение веса",
      value: `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)} кг`,
      sub: "за всё время",
      color: weightDiff <= 0 ? "bg-green-50" : "bg-red-50",
      icon:
        weightDiff <= 0 ? (
          <TrendingDown className="h-5 w-5 text-green-500" />
        ) : (
          <TrendingUp className="h-5 w-5 text-red-500" />
        ),
      textColor: weightDiff <= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen">
      <TopBar
        title="Аналитика"
        right={
          <Button size="icon-sm" onClick={() => setWeightOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Profile summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600 shrink-0">
                  {user.name[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">
                    {user.age} лет · {user.height} см · {latestWeight} кг
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.gender === "male" ? "👨 Мужской" : "👩 Женский"} ·{" "}
                    {activityLabels[user.activity]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`${card.color} h-8 w-8 rounded-lg flex items-center justify-center`}
                  >
                    {card.icon}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {card.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Goal weight progress */}
        {user.goalWeight && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Прогресс к цели
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Стартовый: {firstWeight} кг
                  </span>
                  <span className="text-sm text-gray-500">
                    Цель: {user.goalWeight} кг
                  </span>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        Math.abs(
                          (firstWeight - latestWeight) /
                            (firstWeight - user.goalWeight),
                        ) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Текущий вес: <strong>{latestWeight} кг</strong> · Осталось:{" "}
                  {Math.abs(latestWeight - user.goalWeight).toFixed(1)} кг
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="calories">
                <TabsList className="mb-4">
                  <TabsTrigger value="calories">Калории</TabsTrigger>
                  <TabsTrigger value="weight">Вес</TabsTrigger>
                </TabsList>

                <TabsContent value="calories">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Калории за 30 дней
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={last30} margin={{ left: -20, right: 5 }}>
                      <defs>
                        <linearGradient
                          id="calGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#22c55e"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                        formatter={(v) => [`${v} ккал`, "Калории"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="calories"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray={undefined}
                      />
                      <Area
                        type="monotone"
                        dataKey="calories"
                        stroke="#22c55e"
                        fill="url(#calGrad)"
                        strokeWidth={2}
                        dot={false}
                      />
                      {/* Goal line */}
                      <Line
                        type="monotone"
                        data={last30.map((d) => ({
                          ...d,
                          goal: user.goalCalories ?? tdee,
                        }))}
                        dataKey="goal"
                        stroke="#f97316"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="weight">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    История веса ({weightChartData.length} записей)
                  </p>
                  {weightChartData.length < 2 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Scale className="h-10 w-10 text-gray-200 mb-2" />
                      <p className="text-gray-400 text-sm">
                        Добавьте минимум 2 записи веса
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setWeightOpen(true)}
                      >
                        <Plus className="h-4 w-4" /> Записать вес
                      </Button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart
                        data={weightChartData}
                        margin={{ left: -20, right: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          tickLine={false}
                          axisLine={false}
                          domain={["dataMin - 1", "dataMax + 1"]}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                          }}
                          formatter={(v) => [`${v} кг`, "Вес"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ fill: "#3b82f6", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Macros breakdown */}
        {diaryEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  Среднее за 7 дней
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const last7 = Array.from({ length: 7 }, (_, i) =>
                      format(subDays(new Date(), i), "yyyy-MM-dd"),
                    );
                    const entries7 = diaryEntries.filter((e) =>
                      last7.includes(e.date),
                    );
                    const days = new Set(entries7.map((e) => e.date)).size || 1;
                    return [
                      {
                        label: "Ккал/день",
                        value: Math.round(
                          entries7.reduce((a, e) => a + e.calories, 0) / days,
                        ),
                        color: "text-orange-600",
                      },
                      {
                        label: "Белки/день",
                        value: `${(entries7.reduce((a, e) => a + e.protein, 0) / days).toFixed(1)}г`,
                        color: "text-green-600",
                      },
                      {
                        label: "Жиры/день",
                        value: `${(entries7.reduce((a, e) => a + e.fat, 0) / days).toFixed(1)}г`,
                        color: "text-yellow-600",
                      },
                      {
                        label: "Углев/день",
                        value: `${(entries7.reduce((a, e) => a + e.carbs, 0) / days).toFixed(1)}г`,
                        color: "text-blue-600",
                      },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-lg font-bold ${color}`}>{value}</p>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Add weight dialog */}
      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Записать вес</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              label="Вес (кг)"
              type="number"
              placeholder={`${latestWeight}`}
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
            />
            <Button onClick={handleAddWeight}>Сохранить</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

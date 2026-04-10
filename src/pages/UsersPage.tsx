import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store";
import { useNavigate } from "react-router-dom";
import { User, Plus, Trash2, ChevronRight, Check } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/Dialog";
import { Card, CardContent } from "../components/ui/Card";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UserProfile, ActivityLevel, Gender } from "../types";
import {
  calculateBMR,
  calculateTDEE,
  calculateBMI,
  getBMICategory,
} from "../lib/utils";

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  age: z.coerce.number().min(5).max(120),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(20).max(300),
  gender: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goalWeight: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "🪑 Сидячий образ жизни",
  light: "🚶 Лёгкая активность",
  moderate: "🏃 Умеренная активность",
  active: "🏋️ Высокая активность",
  very_active: "🔥 Очень высокая активность",
};

const avatarColors = [
  "bg-green-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-orange-400",
  "bg-teal-400",
];

function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

export function UsersPage() {
  const navigate = useNavigate();
  const { users, activeUserId, addUser, deleteUser, setActiveUser } =
    useAppStore();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { gender: "male", activity: "moderate" },
  });

  const onSubmit = (data: FormValues) => {
    const bmr = calculateBMR(
      data.weight,
      data.height,
      data.age,
      data.gender as Gender,
    );
    const tdee = calculateTDEE(bmr, data.activity);
    const user: UserProfile = {
      id: crypto.randomUUID(),
      name: data.name,
      age: data.age,
      height: data.height,
      weight: data.weight,
      gender: data.gender as Gender,
      activity: data.activity as ActivityLevel,
      goalCalories: Math.round(tdee),
      goalWeight: data.goalWeight,
      createdAt: new Date().toISOString(),
    };
    addUser(user);
    setActiveUser(user.id);
    reset();
    setOpen(false);
  };

  const handleSelect = (id: string) => {
    setActiveUser(id);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-500/5 dark:via-[#0d0d14] dark:to-blue-500/5 p-5">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Профили</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Выберите или создайте профиль
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый профиль</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <Input
                  label="Имя"
                  placeholder="Александр"
                  {...register("name")}
                  error={errors.name?.message}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Возраст"
                    type="number"
                    placeholder="25"
                    {...register("age")}
                    error={errors.age?.message}
                  />
                  <Input
                    label="Рост (см)"
                    type="number"
                    placeholder="175"
                    {...register("height")}
                    error={errors.height?.message}
                  />
                  <Input
                    label="Вес (кг)"
                    type="number"
                    placeholder="70"
                    {...register("weight")}
                    error={errors.weight?.message}
                  />
                </div>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Пол
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["male", "female"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => field.onChange(g)}
                            className={`h-11 rounded-xl border-2 text-sm font-medium transition-all ${
                              field.value === g
                                ? "border-primary-500 bg-primary-50 text-primary-700"
                                : "border-gray-200 dark:border-[#27273a] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1e1e2c]"
                            }`}
                          >
                            {g === "male" ? "👨 Мужской" : "👩 Женский"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />
                <Controller
                  name="activity"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger label="Уровень активности">
                        <SelectValue placeholder="Выберите активность" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(activityLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  label="Целевой вес (кг, необязательно)"
                  type="number"
                  placeholder="65"
                  {...register("goalWeight")}
                />
                <Button type="submit" className="mt-2">
                  Создать профиль
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users list */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {users.map((user, i) => {
              const isActive = user.id === activeUserId;
              const bmi = calculateBMI(user.weight, user.height);
              const bmiInfo = getBMICategory(bmi);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-primary-500 shadow-glow"
                        : "hover:shadow-card"
                    }`}
                    onClick={() => handleSelect(user.id)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 ${getAvatarColor(user.name)}`}
                      >
                        {user.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-base truncate">
                            {user.name}
                          </p>
                          {isActive && (
                            <span className="shrink-0 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {user.age} лет · {user.height} см · {user.weight} кг
                        </p>
                        <p
                          className={`text-xs font-medium mt-0.5 ${bmiInfo.color}`}
                        >
                          ИМТ {bmi.toFixed(1)} · {bmiInfo.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUser(user.id);
                          }}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {users.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-20 w-20 bg-gray-100 dark:bg-[#1e1e2c] rounded-full flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Нет профилей</p>
              <p className="text-gray-400 text-sm mt-1">
                Нажмите + чтобы создать первый профиль
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

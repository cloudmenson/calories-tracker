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
  Plus,
  Trash2,
  Refrigerator,
  Camera,
  X,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { FridgeItem } from "../types";

interface FridgeForm {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  amount: number;
  unit: string;
  expiresAt: string;
}

function getFridgeEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("курин") || n.includes("мяс") || n.includes("говяд"))
    return "🍗";
  if (n.includes("рыб") || n.includes("лосос")) return "🐟";
  if (n.includes("молок") || n.includes("кефир")) return "🥛";
  if (n.includes("яйц")) return "🥚";
  if (n.includes("овощ") || n.includes("морков") || n.includes("брокол"))
    return "🥦";
  if (n.includes("фрукт") || n.includes("яблок") || n.includes("банан"))
    return "🍎";
  if (n.includes("сыр")) return "🧀";
  if (n.includes("творог")) return "🥣";
  if (n.includes("масл")) return "🧈";
  if (n.includes("хлеб")) return "🍞";
  return "🥗";
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const exp = new Date(date);
  const diff = (exp.getTime() - Date.now()) / (1000 * 3600 * 24);
  return diff <= 2 && diff >= 0;
}

function isExpired(date?: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export function FridgePage() {
  const { activeUserId, fridge, addFridgeItem, deleteFridgeItem } =
    useAppStore();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const fridgeItems: FridgeItem[] = activeUserId
    ? (fridge[activeUserId] ?? [])
    : [];

  const filtered = fridgeItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const { register, handleSubmit, reset } = useForm<FridgeForm>({
    defaultValues: { unit: "г", amount: 500 },
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: FridgeForm) => {
    if (!activeUserId) return;
    const item: FridgeItem = {
      id: crypto.randomUUID(),
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      amount: data.amount,
      unit: data.unit,
      expiresAt: data.expiresAt || undefined,
      photo,
      userId: activeUserId,
    };
    addFridgeItem(activeUserId, item);
    setPhoto(undefined);
    reset();
    setOpen(false);
  };

  const expiringSoon = filtered.filter((i) => isExpiringSoon(i.expiresAt));
  const expired = filtered.filter((i) => isExpired(i.expiresAt));
  const normal = filtered.filter(
    (i) => !isExpiringSoon(i.expiresAt) && !isExpired(i.expiresAt),
  );

  const renderItem = (item: FridgeItem) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -80 }}
    >
      <Card
        className={`${isExpired(item.expiresAt) ? "opacity-60 border-red-200" : ""}`}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {item.photo ? (
            <img
              src={item.photo}
              alt={item.name}
              className="h-12 w-12 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
              {getFridgeEmoji(item.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {item.name}
              </p>
              {isExpiringSoon(item.expiresAt) && (
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              )}
              {isExpired(item.expiresAt) && (
                <Badge variant="destructive">Просрочен</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {item.amount}
              {item.unit} · {item.calories} ккал/100г
            </p>
            {item.expiresAt && (
              <p
                className={`text-xs ${isExpiringSoon(item.expiresAt) ? "text-orange-500 font-medium" : "text-gray-400"}`}
              >
                Годен до: {new Date(item.expiresAt).toLocaleDateString("ru-RU")}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex gap-1 text-xs">
              <Badge variant="blue">Б {item.protein}г</Badge>
            </div>
            <div className="flex gap-1 text-xs">
              <Badge variant="accent">Ж {item.fat}г</Badge>
            </div>
            <button
              onClick={() =>
                activeUserId && deleteFridgeItem(activeUserId, item.id)
              }
              className="mt-1 h-6 w-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-200 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <TopBar
        title="Холодильник"
        right={
          <Button size="icon-sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Input
          placeholder="🔍 Поиск продуктов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {fridgeItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <Refrigerator className="h-16 w-16 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Холодильник пуст</p>
            <p className="text-gray-400 text-sm mb-4">
              Добавьте продукты для составления рецептов
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Добавить продукт
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {expired.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> ПРОСРОЧЕННЫЕ
                </p>
                <AnimatePresence>{expired.map(renderItem)}</AnimatePresence>
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> ИСТЕКАЕТ СКОРО
                </p>
                <AnimatePresence>
                  {expiringSoon.map(renderItem)}
                </AnimatePresence>
              </div>
            )}
            {normal.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  ВСЕ ПРОДУКТЫ
                </p>
                <AnimatePresence>{normal.map(renderItem)}</AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить продукт</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt="preview"
                  className="w-full h-32 object-cover rounded-xl"
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
                <span className="text-sm text-gray-400">Фото продукта</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
            )}

            <Input
              label="Название"
              placeholder="Куриная грудка"
              {...register("name", { required: true })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Количество" type="number" {...register("amount")} />
              <Input
                label="Единица"
                placeholder="г, кг, мл, шт"
                {...register("unit")}
              />
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              Всё ниже указывается на 100г
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Калории/100г"
                type="number"
                {...register("calories")}
              />
              <Input
                label="Белки/100г"
                type="number"
                {...register("protein")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Жиры/100г" type="number" {...register("fat")} />
              <Input
                label="Углеводы/100г"
                type="number"
                {...register("carbs")}
              />
            </div>
            <Input
              label="Срок годности (необязательно)"
              type="date"
              {...register("expiresAt")}
            />
            <Button type="submit">Добавить в холодильник</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store";
import { TopBar } from "../components/layout/TopBar";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input, TextArea } from "../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import {
  Plus,
  Trash2,
  Camera,
  ChefHat,
  Edit3,
  X,
  UtensilsCrossed,
  Scale,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { Recipe, Ingredient, FridgeItem } from "../types";
import { todayStr } from "../lib/utils";

interface RecipeForm {
  name: string;
  description: string;
  defaultPortionWeight: number;
  tags: string;
}

interface IngredientForm {
  name: string;
  amount: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export function RecipesPage() {
  const {
    activeUserId,
    recipes,
    addRecipe,
    deleteRecipe,
    fridge,
    addDiaryEntry,
  } = useAppStore();
  const [open, setOpen] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingOpen, setIngOpen] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [logOpen, setLogOpen] = useState<Recipe | null>(null);
  const [logWeight, setLogWeight] = useState("");
  const [fromFridgeOpen, setFromFridgeOpen] = useState(false);
  const [selectedFridge, setSelectedFridge] = useState<string[]>([]);

  const userRecipes = activeUserId ? (recipes[activeUserId] ?? []) : [];
  const fridgeItems: FridgeItem[] = activeUserId
    ? (fridge[activeUserId] ?? [])
    : [];

  const { register, handleSubmit, reset } = useForm<RecipeForm>({
    defaultValues: { defaultPortionWeight: 200 },
  });
  const ingForm = useForm<IngredientForm>({
    defaultValues: { amount: 100 },
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addIngredient = (data: IngredientForm) => {
    const cal100 = data.calories;
    const factor = data.amount / 100;
    setIngredients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        name: data.name,
        amount: data.amount,
        calories: cal100 * factor,
        protein: data.protein * factor,
        fat: data.fat * factor,
        carbs: data.carbs * factor,
      },
    ]);
    ingForm.reset({ amount: 100 });
    setIngOpen(false);
  };

  const addFromFridge = () => {
    const items = fridgeItems.filter((i) => selectedFridge.includes(i.id));
    const newIngs: Ingredient[] = items.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.id,
      name: item.name,
      amount: 100,
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
    }));
    setIngredients((prev) => [...prev, ...newIngs]);
    setSelectedFridge([]);
    setFromFridgeOpen(false);
  };

  const totalNutrition = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein: acc.protein + ing.protein,
      fat: acc.fat + ing.fat,
      carbs: acc.carbs + ing.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );

  const totalWeight = ingredients.reduce((acc, ing) => acc + ing.amount, 0);

  const onSubmit = (data: RecipeForm) => {
    if (!activeUserId) return;
    const cal100 =
      totalWeight > 0 ? (totalNutrition.calories / totalWeight) * 100 : 0;
    const recipe: Recipe = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      photo,
      ingredients,
      defaultPortionWeight: data.defaultPortionWeight,
      totalCalories: totalNutrition.calories,
      totalProtein: totalNutrition.protein,
      totalFat: totalNutrition.fat,
      totalCarbs: totalNutrition.carbs,
      caloriesPer100g: cal100,
      userId: activeUserId,
      createdAt: new Date().toISOString(),
      tags: data.tags
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
    addRecipe(activeUserId, recipe);
    setIngredients([]);
    setPhoto(undefined);
    reset();
    setOpen(false);
  };

  const logRecipe = () => {
    if (!activeUserId || !logOpen) return;
    const w = parseFloat(logWeight) || logOpen.defaultPortionWeight;
    const factor = w / totalNutritionOf(logOpen);
    addDiaryEntry(activeUserId, {
      id: crypto.randomUUID(),
      userId: activeUserId,
      date: todayStr(),
      mealType: "lunch",
      name: logOpen.name,
      portionWeight: w,
      calories: (logOpen.caloriesPer100g * w) / 100,
      protein:
        (((logOpen.totalProtein / (logOpen.totalCalories || 1)) *
          (logOpen.caloriesPer100g * w)) /
          100) *
        4,
      fat: logOpen.totalFat * factor,
      carbs: logOpen.totalCarbs * factor,
      recipeId: logOpen.id,
      createdAt: new Date().toISOString(),
    });
    setLogOpen(null);
    setLogWeight("");
  };

  function totalNutritionOf(r: Recipe) {
    return r.ingredients.reduce((acc, i) => acc + i.amount, 0);
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <TopBar
        title="Рецепты"
        right={
          <Button size="icon-sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {userRecipes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <ChefHat className="h-16 w-16 text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Нет рецептов</p>
            <p className="text-gray-400 text-sm mb-4">
              Сохраните любимые блюда с весом порций
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Добавить рецепт
            </Button>
          </motion.div>
        )}

        <AnimatePresence>
          {userRecipes.map((recipe, i) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="overflow-hidden">
                {recipe.photo && (
                  <img
                    src={recipe.photo}
                    alt={recipe.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{recipe.name}</h3>
                      {recipe.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {recipe.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                        <Badge variant="default">
                          {Math.round(recipe.caloriesPer100g)} ккал/100г
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        activeUserId && deleteRecipe(activeUserId, recipe.id)
                      }
                      className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {[
                      {
                        label: "Ккал",
                        val: Math.round(recipe.totalCalories),
                        color: "bg-orange-50 text-orange-700",
                      },
                      {
                        label: "Белки",
                        val: `${recipe.totalProtein.toFixed(1)}г`,
                        color: "bg-green-50 text-green-700",
                      },
                      {
                        label: "Жиры",
                        val: `${recipe.totalFat.toFixed(1)}г`,
                        color: "bg-yellow-50 text-yellow-700",
                      },
                      {
                        label: "Угл",
                        val: `${recipe.totalCarbs.toFixed(1)}г`,
                        color: "bg-blue-50 text-blue-700",
                      },
                    ].map(({ label, val, color }) => (
                      <div
                        key={label}
                        className={`${color} rounded-lg p-2 text-center`}
                      >
                        <p className="text-xs font-medium opacity-70">
                          {label}
                        </p>
                        <p className="text-sm font-bold">{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Scale className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Порция по умолчанию:{" "}
                      <strong>{recipe.defaultPortionWeight}г</strong>
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setLogOpen(recipe);
                        setLogWeight(String(recipe.defaultPortionWeight));
                      }}
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5" /> Съесть
                    </Button>
                  </div>

                  {/* Ingredients */}
                  {recipe.ingredients.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        Ингредиенты
                      </p>
                      <div className="space-y-1">
                        {recipe.ingredients.map((ing) => (
                          <div
                            key={ing.id}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs text-gray-700">
                              {ing.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {ing.amount}г · {Math.round(ing.calories)} ккал
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Recipe Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый рецепт</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Photo */}
            <div className="relative">
              {photo ? (
                <div className="relative">
                  <img
                    src={photo}
                    alt="preview"
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
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="h-7 w-7 text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">Добавить фото</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </label>
              )}
            </div>

            <Input
              label="Название рецепта"
              placeholder="Куриная грудка с овощами"
              {...register("name", { required: true })}
            />
            <TextArea
              label="Описание (необязательно)"
              placeholder="Способ приготовления..."
              rows={2}
              {...register("description")}
            />
            <Input
              label="Порция по умолчанию (г)"
              type="number"
              {...register("defaultPortionWeight")}
            />
            <Input
              label="Теги (через запятую)"
              placeholder="завтрак, быстро, диета"
              {...register("tags")}
            />

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Ингредиенты
                </label>
                <div className="flex gap-2">
                  {fridgeItems.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setFromFridgeOpen(true)}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Из холодильника
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIngOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Добавить
                  </Button>
                </div>
              </div>
              {ingredients.length > 0 && (
                <div className="space-y-1 mb-2">
                  {ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-800">
                        {ing.name} — {ing.amount}г
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {Math.round(ing.calories)} ккал
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setIngredients((p) =>
                              p.filter((i) => i.id !== ing.id),
                            )
                          }
                          className="text-gray-300 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {ingredients.length > 0 && (
                <div className="bg-primary-50 rounded-xl p-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-primary-600">Ккал</p>
                    <p className="text-sm font-bold text-primary-700">
                      {Math.round(totalNutrition.calories)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-green-600">Белки</p>
                    <p className="text-sm font-bold text-green-700">
                      {totalNutrition.protein.toFixed(1)}г
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-orange-600">Жиры</p>
                    <p className="text-sm font-bold text-orange-700">
                      {totalNutrition.fat.toFixed(1)}г
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600">Угл</p>
                    <p className="text-sm font-bold text-blue-700">
                      {totalNutrition.carbs.toFixed(1)}г
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit">Сохранить рецепт</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Ingredient Dialog */}
      <Dialog open={ingOpen} onOpenChange={setIngOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ингредиент</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={ingForm.handleSubmit(addIngredient)}
            className="flex flex-col gap-4"
          >
            <Input
              label="Название"
              placeholder="Куриная грудка"
              {...ingForm.register("name", { required: true })}
            />
            <Input
              label="Количество (г)"
              type="number"
              {...ingForm.register("amount")}
            />
            <p className="text-xs text-gray-500 -mt-2">
              Ккал/белки/жиры/углеводы указывайте на 100г
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Калории/100г"
                type="number"
                {...ingForm.register("calories")}
              />
              <Input
                label="Белки/100г"
                type="number"
                {...ingForm.register("protein")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Жиры/100г"
                type="number"
                {...ingForm.register("fat")}
              />
              <Input
                label="Углеводы/100г"
                type="number"
                {...ingForm.register("carbs")}
              />
            </div>
            <Button type="submit">Добавить</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* From fridge dialog */}
      <Dialog open={fromFridgeOpen} onOpenChange={setFromFridgeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выбрать из холодильника</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {fridgeItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  selectedFridge.includes(item.id)
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedFridge.includes(item.id)}
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedFridge((p) => [...p, item.id]);
                    else
                      setSelectedFridge((p) => p.filter((x) => x !== item.id));
                  }}
                />
                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm">
                  🥗
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.calories} ккал/100г
                  </p>
                </div>
                {selectedFridge.includes(item.id) && (
                  <div className="h-5 w-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </label>
            ))}
          </div>
          <Button
            onClick={addFromFridge}
            disabled={selectedFridge.length === 0}
          >
            Добавить выбранные ({selectedFridge.length})
          </Button>
        </DialogContent>
      </Dialog>

      {/* Log portion dialog */}
      <Dialog open={!!logOpen} onOpenChange={(v) => !v && setLogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Съесть: {logOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              label="Вес порции (г)"
              type="number"
              value={logWeight}
              onChange={(e) => setLogWeight(e.target.value)}
            />
            {logOpen && (
              <div className="bg-primary-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">
                  {Math.round(
                    (logOpen.caloriesPer100g *
                      (parseFloat(logWeight) || logOpen.defaultPortionWeight)) /
                      100,
                  )}{" "}
                  ккал
                </p>
                <p className="text-xs text-gray-500">
                  за {parseFloat(logWeight) || logOpen.defaultPortionWeight}г
                </p>
              </div>
            )}
            <Button onClick={logRecipe}>Добавить в дневник</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

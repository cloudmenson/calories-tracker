import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { DiaryPage } from "./pages/DiaryPage";
import { RecipesPage } from "./pages/RecipesPage";
import { FridgePage } from "./pages/FridgePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { UsersPage } from "./pages/UsersPage";
import { ChatPage } from "./pages/ChatPage";
import { useSyncWithMongo } from "./lib/sync";

function App() {
  useSyncWithMongo();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/users" element={<UsersPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/fridge" element={<FridgePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

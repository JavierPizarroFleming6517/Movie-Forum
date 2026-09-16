import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/Auth";
import { CatalogPage } from "./pages/Catalog";
import { DetailPage } from "./pages/Detail";
import { HomePage } from "./pages/Home";
import { MetricsPage } from "./pages/Metrics";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<HomePage />} />
            <Route path="/catalogo" element={<Navigate to="/inicio" replace />} />
            <Route path="/series" element={<CatalogPage />} />
            <Route path="/series/genero/:genreId" element={<CatalogPage />} />
            <Route path="/series/:collection" element={<CatalogPage />} />
            <Route path="/peliculas/:collection" element={<CatalogPage />} />
            <Route path="/genero/:genreId" element={<CatalogPage />} />
            <Route path="/buscar" element={<CatalogPage />} />
            <Route path="/foro/:kind" element={<CatalogPage />} />
            <Route path="/pelicula/:id" element={<DetailPage />} />
            <Route path="/serie/:id" element={<DetailPage />} />
            <Route path="/cuenta" element={<AuthPage />} />
            <Route path="/metricas" element={<MetricsPage />} />
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

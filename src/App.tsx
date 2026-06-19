import { BrowserRouter as Router, Routes, Route as RouterRoute, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Members from '@/pages/Members';
import Boxes from '@/pages/Boxes';
import Scan from '@/pages/Scan';
import Packing from '@/pages/Packing';
import RoutePage from '@/pages/Route';
import Cost from '@/pages/Cost';
import ProjectLayout from '@/components/Layout';
import { useAppStore } from '@/store';

function AppInitializer() {
  const initApp = useAppStore(s => s.initApp);
  useEffect(() => {
    initApp();
  }, [initApp]);
  return null;
}

export default function App() {
  return (
    <Router>
      <AppInitializer />
      <Routes>
        <RouterRoute path="/" element={<Home />} />
        <RouterRoute path="/project/:id" element={<ProjectLayout />}>
          <RouterRoute index element={<Dashboard />} />
          <RouterRoute path="members" element={<Members />} />
          <RouterRoute path="boxes" element={<Boxes />} />
          <RouterRoute path="scan" element={<Scan />} />
          <RouterRoute path="packing" element={<Packing />} />
          <RouterRoute path="route" element={<RoutePage />} />
          <RouterRoute path="cost" element={<Cost />} />
        </RouterRoute>
        <RouterRoute path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

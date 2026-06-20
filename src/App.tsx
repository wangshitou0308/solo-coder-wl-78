import { BrowserRouter as Router, Routes, Route as RouterRoute, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import Members from '@/pages/Members';
import Boxes from '@/pages/Boxes';
import Scan from '@/pages/Scan';
import Packing from '@/pages/Packing';
import RoutePage from '@/pages/Route';
import Cost from '@/pages/Cost';
import ProjectLayout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAppStore } from '@/store';
import { Truck } from 'lucide-react';

function AppInitializer() {
  const initApp = useAppStore(s => s.initApp);
  useEffect(() => {
    initApp();
  }, [initApp]);
  return null;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <Truck className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-bounce-subtle" />
        <p className="text-slate-500">加载中...</p>
      </div>
    </div>
  );
}

function withErrorBoundary(Component: React.ComponentType<any>, name: string) {
  return function WrappedComponent(props: any) {
    return (
      <ErrorBoundary name={name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

const DashboardPage = withErrorBoundary(Dashboard, '总览看板');
const MembersPage = withErrorBoundary(Members, '成员协作');
const BoxesPage = withErrorBoundary(Boxes, '纸箱管理');
const ScanPage = withErrorBoundary(Scan, '扫码识别');
const PackingPage = withErrorBoundary(Packing, '3D装箱');
const RoutePageWrapped = withErrorBoundary(RoutePage, '路线规划');
const CostPage = withErrorBoundary(Cost, '费用预估');

export default function App() {
  return (
    <Router>
      <AppInitializer />
      <ErrorBoundary name="应用">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <RouterRoute path="/" element={<Home />} />
            <RouterRoute path="/project/:id" element={<ProjectLayout />}>
              <RouterRoute index element={<DashboardPage />} />
              <RouterRoute path="members" element={<MembersPage />} />
              <RouterRoute path="boxes" element={<BoxesPage />} />
              <RouterRoute path="scan" element={<ScanPage />} />
              <RouterRoute path="packing" element={<PackingPage />} />
              <RouterRoute path="route" element={<RoutePageWrapped />} />
              <RouterRoute path="cost" element={<CostPage />} />
            </RouterRoute>
            <RouterRoute path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

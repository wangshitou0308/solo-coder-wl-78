import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  LayoutDashboard, Users, Package, QrCode, Boxes, MapPin, Calculator,
  ChevronRight, ArrowLeft, Truck, Bell, LogOut, Menu, X, Play,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { TRUCK_SPECS } from '@/types';

const NAV_ITEMS = [
  { to: '', icon: LayoutDashboard, label: '总览看板' },
  { to: 'members', icon: Users, label: '成员协作' },
  { to: 'boxes', icon: Package, label: '纸箱与物品' },
  { to: 'scan', icon: QrCode, label: '扫码与AI识别' },
  { to: 'packing', icon: Boxes, label: '3D装箱规划' },
  { to: 'execution', icon: Play, label: '搬家执行模式' },
  { to: 'route', icon: MapPin, label: '路线与优先级' },
  { to: 'cost', icon: Calculator, label: '费用与保险' },
];

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useAppStore(s => s.projects.find(p => p.id === id));
  const stats = useAppStore(s => s.getProjectStats());
  const alerts = useAppStore(s => s.alerts.filter(a => !a.resolved));
  const members = useAppStore(s => s.members);
  const setCurrentProject = useAppStore(s => s.setCurrentProject);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (id) setCurrentProject(id);
  }, [id, setCurrentProject]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-pulse">
          <Truck className="w-16 h-16 text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">项目加载中...</p>
        </div>
      </div>
    );
  }

  const truck = TRUCK_SPECS[project.truck_spec];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 glass border-b border-slate-200/60">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost !p-2 shrink-0"
              title="返回项目列表"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg text-slate-900 truncate">
                  {project.name}
                </h1>
                <span className="badge bg-primary-50 text-primary-700 border border-primary-100">
                  项目码: {project.project_code}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="truncate">{project.from_address}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{project.to_address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-primary-50/70 rounded-xl border border-primary-100">
              <span className="text-lg">{truck.image}</span>
              <div className="text-xs leading-tight">
                <div className="font-semibold text-primary-800">{truck.name}</div>
                <div className="text-primary-600">{truck.volume}m³ / {truck.maxWeight}kg</div>
              </div>
            </div>

            <div className="relative">
              <button className="btn-ghost !p-2.5 relative">
                <Bell className="w-5 h-5 text-slate-600" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-subtle">
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex -space-x-2">
              {members.slice(0, 4).map(m => (
                <div
                  key={m.id}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-sm border-2 border-white shadow-sm ${
                    m.is_online ? 'ring-2 ring-success ring-offset-1' : ''
                  }`}
                  title={`${m.name} ${m.is_online ? '(在线)' : ''}`}
                >
                  {m.avatar}
                </div>
              ))}
              {members.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold border-2 border-white">
                  +{members.length - 4}
                </div>
              )}
            </div>

            <button
              className="btn-ghost !p-2 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 pb-3">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
              <span className="font-semibold text-primary-700">{stats.progress}%</span>
              <span className="text-slate-400">总进度</span>
            </div>
            <div className="text-slate-500">
              📦 <span className="font-medium text-slate-700">{stats.packedBoxes}</span>/{stats.totalBoxes} 已封箱
            </div>
            <div className="text-slate-500 hidden sm:block">
              🎯 <span className="font-medium text-slate-700">{stats.totalItems}</span> 件物品
            </div>
            <div className="text-slate-500 hidden lg:block">
              ⚖️ <span className="font-medium text-slate-700">{stats.totalWeight}</span>kg 总计
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 flex gap-6">
        <aside
          className={`
            ${menuOpen ? 'block' : 'hidden'} md:block
            md:sticky md:top-36 md:self-start shrink-0 md:w-56
          `}
        >
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ''}
                className={({ isActive }) =>
                  isActive ? 'nav-item-active' : 'nav-item'
                }
                onClick={() => setMenuOpen(false)}
              >
                <item.icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-emerald-50 border border-primary-100">
            <div className="text-xs font-semibold text-primary-800 mb-2 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> 搬运日历
            </div>
            <div className="text-sm font-bold text-primary-900">
              {new Date(project.move_date).toLocaleDateString('zh-CN', {
                month: 'long', day: 'numeric', weekday: 'short',
              })}
            </div>
            <div className="text-xs text-primary-600 mt-0.5">
              {Math.max(0, Math.ceil((new Date(project.move_date).getTime() - Date.now()) / 86400000))} 天后
            </div>
          </div>

          <button
            onClick={() => { navigate('/'); setCurrentProject(null); }}
            className="mt-4 w-full nav-item text-slate-500 !text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>退出此项目</span>
          </button>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

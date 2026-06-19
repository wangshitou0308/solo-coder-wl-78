import { useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { computeRoutePlan } from '@/utils/route';
import { TRUCK_SPECS, ROOM_COLORS } from '@/types';
import type { RouteStop } from '@/types';
import {
  MapPin, ArrowRight, Clock, Users, Navigation,
  Building2, ArrowDownToLine, ArrowUpFromLine,
  ChevronRight, Package, AlertCircle, LocateFixed,
  Timer, Calendar, Route as RouteIcon, TrendingUp,
  CircleCheck, Circle, Play,
} from 'lucide-react';

export default function RoutePage() {
  const project = useAppStore(s => s.projects.find(p => p.id === s.currentProjectId));
  const boxes = useAppStore(s => s.boxes);
  const rooms = useAppStore(s => s.rooms);
  const stats = useAppStore(s => s.getProjectStats());

  const [activeTab, setActiveTab] = useState<'load' | 'unload'>('load');
  const [expandedStop, setExpandedStop] = useState<string | null>(null);

  const routePlan = useMemo(() => {
    if (!project) return null;
    return computeRoutePlan(project, boxes, rooms);
  }, [project, boxes, rooms]);

  const truck = project ? TRUCK_SPECS[project.truck_spec] : null;
  const roomColorMap = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r, i) => { m.set(r.id, ROOM_COLORS[i % ROOM_COLORS.length]); });
    return m;
  }, [rooms]);

  const formatTime = (min: number) => {
    if (min < 60) return `${min}分钟`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
  };

  const StopCard = ({ stop, type }: { stop: RouteStop; type: 'load' | 'unload' }) => {
    const color = roomColorMap.get(stop.room_id) || '#64748b';
    const isExpanded = expandedStop === stop.id;
    const totalWeight = stop.boxes.reduce((s, b) => s + b.weight_kg, 0);
    const fragileCount = stop.boxes.filter(b => b.is_fragile).length;
    const heavyCount = stop.boxes.filter(b => b.weight_kg > 20).length;

    return (
      <div className={`card !p-0 overflow-hidden transition-all ${
        isExpanded ? 'ring-2 ring-primary-200' : ''
      }`}>
        <button
          className="w-full p-4 flex items-center gap-4 text-left"
          onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
        >
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
              style={{ backgroundColor: color }}
            >
              {stop.order}
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              {type === 'load' ? (
                <ArrowUpFromLine className="w-5 h-5 text-primary-600" />
              ) : (
                <ArrowDownToLine className="w-5 h-5 text-accent-600" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">{stop.room_name}</h3>
              {fragileCount > 0 && (
                <span className="badge bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                  💎 {fragileCount}件易碎
                </span>
              )}
              {heavyCount > 0 && (
                <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  ⚖️ {heavyCount}件重物
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {stop.boxes.length} 箱
              </span>
              <span className="flex items-center gap-1">
                {stop.floor}F
                {stop.has_elevator ? '🛗' : '🚶'}
              </span>
              <span className="flex items-center gap-1">
                ⚖️ {totalWeight}kg
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold">
              <Timer className="w-3 h-3" />
              {stop.estimated_time_min}分钟
            </div>
          </div>

          <ChevronRight
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">纸箱总数</div>
                <div className="text-xl font-bold text-slate-900">{stop.boxes.length}</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">总重量</div>
                <div className="text-xl font-bold text-slate-900">{totalWeight}<span className="text-xs text-slate-400 ml-1">kg</span></div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">物品件数</div>
                <div className="text-xl font-bold text-slate-900">
                  {stop.boxes.reduce((s, b) => s + b.items_count, 0)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">楼层情况</div>
                <div className="text-lg font-bold text-slate-900 flex items-center gap-1">
                  {stop.floor}F
                  <span className="text-xs font-normal text-slate-500">
                    {stop.has_elevator ? '🛗 电梯' : '🚶 爬楼'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary-600" />
              本房间纸箱清单
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {stop.boxes.map(box => (
                <div
                  key={box.id}
                  className="bg-white rounded-lg p-2.5 border border-slate-100 flex items-center gap-2"
                >
                  <div
                    className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    📦
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs text-slate-800 truncate">{box.box_code}</div>
                    <div className="text-[10px] text-slate-500">
                      {box.items_count}件 · {box.weight_kg}kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!project || !routePlan || !truck) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">加载路线规划数据...</div>
      </div>
    );
  }

  const currentStops = activeTab === 'load' ? routePlan.loadStops : routePlan.unloadStops;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <RouteIcon className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-display font-bold text-slate-900">路线规划与装载优先级</h2>
        </div>
        <p className="text-sm text-slate-500">基于距离权重与楼层计算的最优搬运路线 · 按房间分组确定装载优先级</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Navigation className="w-4.5 h-4.5 text-primary-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(routePlan.totalDistanceM / 1000).toFixed(1)}<span className="text-sm text-slate-400 ml-1">km</span>
          </div>
          <div className="text-sm text-slate-500">单程距离</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-accent-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatTime(routePlan.totalTimeMin)}
          </div>
          <div className="text-sm text-slate-500">预计总工时</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <span className="badge bg-violet-100 text-violet-700 border-violet-200 text-[10px]">推荐</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {routePlan.workersRecommended}<span className="text-sm text-slate-400 ml-1">人</span>
          </div>
          <div className="text-sm text-slate-500">搬运工配置</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 leading-tight mt-1">
            {new Date(project.move_date).toLocaleDateString('zh-CN', {
              month: 'long', day: 'numeric',
            })}
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {Math.max(0, Math.ceil((new Date(project.move_date).getTime() - Date.now()) / 86400000))} 天后搬入
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="relative p-6 bg-gradient-to-r from-primary-600 via-primary-700 to-teal-700 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
              <path d="M0 100 Q50 60 100 90 T200 85 T300 95 T400 80 L400 200 L0 200 Z" fill="white" />
              <path d="M0 130 Q60 100 120 120 T240 115 T360 125 T400 115 L400 200 L0 200 Z" fill="white" opacity="0.5" />
            </svg>
          </div>

          <div className="relative">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-2 mb-4">
                  <LocateFixed className="w-4 h-4 text-primary-200" />
                  <span className="text-xs font-semibold text-primary-200 tracking-wide uppercase">最优搬运路线</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                      <CircleCheck className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="w-0.5 h-12 bg-white/30" />
                    <div className="w-3 h-3 rounded-full bg-amber-400 ring-4 ring-amber-400/30" />
                    <div className="w-0.5 h-12 bg-white/30" />
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                      <Circle className="w-5 h-5 text-primary-200" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="text-xs text-primary-200 mb-0.5">起点 · 搬出地址</div>
                      <div className="font-bold text-base">{project.from_address}</div>
                      <div className="text-xs text-primary-200 mt-0.5 flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {project.from_floor}楼 {project.from_has_elevator ? '🛗 有电梯' : '🚶 无电梯'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-primary-100/80">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10">
                        <ArrowRight className="w-3 h-3" />
                        {(routePlan.totalDistanceM / 1000).toFixed(1)}km
                      </span>
                      <span>·</span>
                      <span>预计行驶 {Math.round((project.distance_km ?? 10) / 30 * 60)} 分钟</span>
                    </div>
                    <div>
                      <div className="text-xs text-primary-200 mb-0.5">终点 · 搬入地址</div>
                      <div className="font-bold text-base">{project.to_address}</div>
                      <div className="text-xs text-primary-200 mt-0.5 flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {project.to_floor}楼 {project.to_has_elevator ? '🛗 有电梯' : '🚶 无电梯'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 min-w-[160px]">
                <div className="text-center">
                  <div className="text-4xl mb-2">{truck.image}</div>
                  <div className="font-bold text-sm">{truck.name}</div>
                  <div className="text-xs text-primary-200 mt-1">{truck.volume}m³ · {truck.maxWeight}kg</div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/15 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-primary-200">已打包</span>
                    <span className="font-semibold">{stats.packedBoxes}/{stats.totalBoxes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-200">总重量</span>
                    <span className="font-semibold">{stats.totalWeight}kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-200">搬运站点</span>
                    <span className="font-semibold">{routePlan.loadStops.length}个</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="border-b border-slate-100 flex">
          <button
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
              activeTab === 'load'
                ? 'text-primary-700 bg-primary-50 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('load'); setExpandedStop(null); }}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>装货顺序</span>
            <span className="ml-1 badge bg-primary-100 text-primary-700 border-primary-200 text-[10px]">
              {routePlan.loadStops.length}站
            </span>
          </button>
          <button
            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 font-semibold text-sm transition-all ${
              activeTab === 'unload'
                ? 'text-accent-700 bg-accent-50 border-b-2 border-accent-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('unload'); setExpandedStop(null); }}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>卸货顺序</span>
            <span className="ml-1 badge bg-accent-100 text-accent-700 border-accent-200 text-[10px]">
              {routePlan.unloadStops.length}站
            </span>
          </button>
        </div>

        <div className="p-4 bg-slate-50/60 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-info-600 shrink-0" />
            <span>
              {activeTab === 'load'
                ? '按距离权重排序：离门口最远的房间优先打包，确保先搬的箱子装在货车最里面'
                : '卸货顺序与装货相反：最后装的箱子最先卸，方便就近安置'}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="relative">
            <div className="absolute left-[38px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-primary-100" />
            <div className="space-y-4">
              {currentStops.map((stop, idx) => (
                <div key={stop.id} className="relative">
                  {idx < currentStops.length - 1 && (
                    <div className="absolute left-[60px] -bottom-4 flex items-center gap-2 z-10">
                      <div className="h-px w-10 bg-slate-200" />
                      <Play className="w-3 h-3 text-slate-300 rotate-90" />
                    </div>
                  )}
                  <StopCard stop={stop} type={activeTab} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-bold text-emerald-900 mb-1">路线优化建议</div>
                <ul className="space-y-1.5 text-sm text-emerald-800">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    建议在搬入日提前1天完成打包标记，便于当日按序搬运
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {routePlan.workersRecommended > 2
                      ? `当前配置推荐 ${routePlan.workersRecommended} 名搬运工，可分两组并行作业提升效率`
                      : '当前货物量适中，2名搬运工即可高效完成'}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    搬运全程预计 {formatTime(routePlan.totalTimeMin)}，建议预约上午9点时段避开电梯高峰
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

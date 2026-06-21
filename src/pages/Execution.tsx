import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Truck, Package, CheckCircle2, Clock, MapPin, User,
  Gem, Scale, ArrowRight, CheckCircle, AlertCircle,
  QrCode, FileText,
} from 'lucide-react';
import { TRUCK_SPECS, ROOM_COLORS } from '@/types';

type Stage = 'load' | 'transit' | 'unload' | 'sign';

const STAGE_INFO: Record<Stage, { label: string; sub: string; icon: typeof Truck; color: string }> = {
  load: { label: '装车', sub: '清点装载', icon: Package, color: 'from-primary-500 to-accent-500' },
  transit: { label: '运输', sub: '在途追踪', icon: Truck, color: 'from-sky-500 to-violet-500' },
  unload: { label: '卸货', sub: '核对清点', icon: MapPin, color: 'from-violet-500 to-rose-500' },
  sign: { label: '签收', sub: '确认完成', icon: CheckCircle2, color: 'from-emerald-500 to-green-500' },
};

export default function ExecutionPage() {
  const { id = '' } = useParams();
  const project = useAppStore(s => s.projects.find(p => p.id === s.currentProjectId));
  const boxes = useAppStore(s => s.boxes);
  const rooms = useAppStore(s => s.rooms);
  const items = useAppStore(s => s.items);
  const members = useAppStore(s => s.members);
  const tasks = useAppStore(s => s.tasks);
  const getExecutionStats = useAppStore(s => s.getExecutionStats);
  const confirmBoxLoaded = useAppStore(s => s.confirmBoxLoaded);
  const confirmBoxUnloaded = useAppStore(s => s.confirmBoxUnloaded);
  const confirmBoxSigned = useAppStore(s => s.confirmBoxSigned);
  const updateBoxStatus = useAppStore(s => s.updateBoxStatus);
  const getItemsByBox = useAppStore(s => s.getItemsByBox);

  const [activeStage, setActiveStage] = useState<Stage>('load');

  const stats = useMemo(() => getExecutionStats(), [getExecutionStats, boxes]);
  const truck = project ? TRUCK_SPECS[project.truck_spec] : null;
  const roomColorMap = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r, i) => { m.set(r.id, ROOM_COLORS[i % ROOM_COLORS.length]); });
    return m;
  }, [rooms]);

  const stages: { key: Stage; pct: number }[] = [
    { key: 'load', pct: stats.totalBoxes > 0 ? Math.round((stats.loadedBoxes / stats.totalBoxes) * 100) : 0 },
    { key: 'transit', pct: stats.totalBoxes > 0 && stats.loadedBoxes === stats.totalBoxes ? 100 : stats.loadedBoxes > 0 ? 50 : 0 },
    { key: 'unload', pct: stats.totalBoxes > 0 ? Math.round((stats.unloadedBoxes / stats.totalBoxes) * 100) : 0 },
    { key: 'sign', pct: stats.totalBoxes > 0 ? Math.round((stats.signedBoxes / stats.totalBoxes) * 100) : 0 },
  ];

  const totalValue = items.reduce((s, it) => s + it.estimated_value, 0);
  const fragileCount = items.filter(i => i.is_fragile).length;
  const heavyBoxes = boxes.filter(b => b.is_overweight).length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const onSiteMembers = members.filter(m => m.is_online).length;

  const renderBoxList = (filterFn: (b: typeof boxes[0]) => boolean, actionLabel: string, onAction: (id: string) => Promise<void>) => {
    const list = boxes.filter(filterFn).sort((a, b) => (a.load_order || 999) - (b.load_order || 999));
    if (list.length === 0) {
      return (
        <div className="p-10 text-center rounded-2xl bg-emerald-50/60 border-2 border-dashed border-emerald-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <div className="text-lg font-display font-bold text-emerald-800">全部完成！</div>
          <div className="text-sm text-emerald-600 mt-1">当前阶段所有纸箱已处理完毕</div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {list.map(b => {
          const room = rooms.find(r => r.id === b.room_id);
          const color = roomColorMap.get(b.room_id) || '#64748b';
          const boxItems = getItemsByBox(b.id);
          return (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-primary-200 hover:shadow-sm transition group"
            >
              <div className="w-1 h-12 rounded-full shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display font-bold text-base text-slate-900">{b.box_code}</span>
                  {b.is_fragile && <Gem className="w-3.5 h-3.5 text-violet-500" />}
                  {b.is_overweight && <Scale className="w-3.5 h-3.5 text-rose-500" />}
                </div>
                <div className="text-xs text-slate-500">
                  {room?.name} · {b.items_count}件 · {b.weight_kg}kg
                </div>
                {boxItems.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {boxItems.slice(0, 4).map(it => (
                      <span key={it.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {it.name}
                      </span>
                    ))}
                    {boxItems.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        +{boxItems.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onAction(b.id)}
                className="btn-primary !py-2 !px-3 !text-xs flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  if (!project || !truck) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">加载执行数据...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card !p-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium text-white/90 mb-4">
                <Truck className="w-3.5 h-3.5 animate-pulse" />
                搬家当天执行模式
              </div>
              <h1 className="font-display font-bold text-3xl lg:text-4xl mb-2">
                {project.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {project.from_address} → {project.to_address}
                </span>
                <span>·</span>
                <span>{truck.image} {truck.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-1 mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-lg font-bold">{onSiteMembers}</div>
                <div className="text-[11px] text-white/60">在场成员</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-1 mx-auto">
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-lg font-bold">{stats.totalBoxes}</div>
                <div className="text-[11px] text-white/60">总纸箱</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-1 mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-lg font-bold">{pendingTasks}</div>
                <div className="text-[11px] text-white/60">待办任务</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-8 pb-6">
          <div className="flex items-center justify-between gap-2">
            {stages.map((s, idx) => {
              const info = STAGE_INFO[s.key];
              const SI = info.icon;
              const isActive = activeStage === s.key;
              const isDone = s.pct >= 100;
              return (
                <div key={s.key} className="flex-1 flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setActiveStage(s.key)}
                    className={`flex-1 min-w-0 p-3 lg:p-4 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-white/15 backdrop-blur border border-white/20 shadow-lg'
                        : isDone
                        ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                        : 'bg-white/5 border border-white/5 hover:bg-white/10 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2 lg:gap-3 mb-1.5">
                      <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center shrink-0 ${
                        isDone ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''
                      }`}>
                        {isDone ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-white" /> : <SI className="w-4 h-4 lg:w-5 lg:h-5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm lg:text-base font-bold text-white">{info.label}</div>
                        <div className="text-[10px] lg:text-xs text-white/60">{info.sub}</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${info.color} transition-all`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-white/60 mt-1">{s.pct}%</div>
                  </button>
                  {idx < stages.length - 1 && (
                    <ArrowRight className={`w-4 h-4 lg:w-5 lg:h-5 shrink-0 transition ${s.pct >= 100 ? 'text-emerald-400' : 'text-white/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Package className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <span className="text-xs font-bold text-primary-600">{stats.loadedBoxes}/{stats.totalBoxes}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">已装载</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
              style={{ width: `${stats.totalBoxes > 0 ? (stats.loadedBoxes / stats.totalBoxes) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5 text-sky-600" />
            </div>
            <span className="text-xs font-bold text-sky-600">
              {stats.loadedBoxes === stats.totalBoxes && stats.totalBoxes > 0 ? '进行中' : '待出发'}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900">运输中</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-violet-500 transition-all"
              style={{ width: `${stats.loadedBoxes === stats.totalBoxes && stats.totalBoxes > 0 ? 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <span className="text-xs font-bold text-violet-600">{stats.unloadedBoxes}/{stats.totalBoxes}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">已卸货</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-rose-500 transition-all"
              style={{ width: `${stats.totalBoxes > 0 ? (stats.unloadedBoxes / stats.totalBoxes) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-emerald-600">{stats.signedBoxes}/{stats.totalBoxes}</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">已签收</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all"
              style={{ width: `${stats.totalBoxes > 0 ? (stats.signedBoxes / stats.totalBoxes) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {(heavyBoxes > 0 || fragileCount > 0 || pendingTasks > 0) && (
        <div className="card !p-0 overflow-hidden !bg-amber-50/70 border-amber-200">
          <div className="flex items-center gap-3 p-4 border-b border-amber-200/60">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="font-semibold text-amber-900">执行注意事项</div>
              <div className="text-xs text-amber-700">请关注以下提醒事项</div>
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {heavyBoxes > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-xs font-medium">
                <Scale className="w-3.5 h-3.5" /> {heavyBoxes} 箱超重，需多人搬运
              </span>
            )}
            {fragileCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-100 text-violet-700 text-xs font-medium">
                <Gem className="w-3.5 h-3.5" /> {fragileCount} 件易碎品，小心轻放
              </span>
            )}
            {pendingTasks > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-100 text-sky-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" /> {pendingTasks} 项任务待完成
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-medium">
              💰 总估值 ¥{totalValue.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              {(() => {
                const info = STAGE_INFO[activeStage];
                const SI = info.icon;
                return (
                  <>
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center`}>
                      <SI className="w-4 h-4 text-white" />
                    </div>
                    {info.label}阶段清单
                  </>
                );
              })()}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeStage === 'load' && '按照装箱算法的最优顺序，逐一确认装车'}
              {activeStage === 'transit' && '运输途中状态监控，所有纸箱已装车后自动标记为运输中'}
              {activeStage === 'unload' && '到达搬入地址后，按反向顺序卸货并核对'}
              {activeStage === 'sign' && '客户逐箱验收确认，全部签收后搬家完成'}
            </p>
          </div>
        </div>
        <div className="p-5">
          {activeStage === 'load' && renderBoxList(
            b => b.status < 3,
            '确认装车',
            async (id) => { await confirmBoxLoaded(id); }
          )}
          {activeStage === 'transit' && (
            <div className="p-10 text-center">
              <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-sky-100 to-violet-100 mb-4">
                <Truck className="w-14 h-14 text-sky-600 animate-bounce-subtle" />
              </div>
              <div className="text-xl font-display font-bold text-slate-900 mb-2">
                {stats.loadedBoxes === stats.totalBoxes && stats.totalBoxes > 0 ? '正在运输途中' : '等待装车完成'}
              </div>
              <div className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                {stats.loadedBoxes === stats.totalBoxes && stats.totalBoxes > 0
                  ? `所有 ${stats.totalBoxes} 个纸箱已装车出发，正在运往 ${project.to_address}`
                  : `当前已装载 ${stats.loadedBoxes}/${stats.totalBoxes} 箱，装车完成后将自动进入运输阶段`
                }
              </div>
              {stats.loadedBoxes === stats.totalBoxes && stats.totalBoxes > 0 && stats.unloadedBoxes === 0 && (
                <button
                  onClick={async () => {
                    for (const b of boxes) {
                      if (b.status === 3) await updateBoxStatus(b.id, 4, '开始运输');
                    }
                  }}
                  className="btn-primary"
                >
                  <Truck className="w-4 h-4" /> 确认出发，标记为运输中
                </button>
              )}
            </div>
          )}
          {activeStage === 'unload' && renderBoxList(
            b => b.status < 4,
            '确认卸货',
            async (id) => { await confirmBoxUnloaded(id); }
          )}
          {activeStage === 'sign' && renderBoxList(
            b => b.status < 5,
            '确认签收',
            async (id) => { await confirmBoxSigned(id); }
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button className="card p-5 text-left hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition">
              <QrCode className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">扫码核对</div>
              <div className="text-xs text-slate-500">扫描纸箱二维码快速定位</div>
            </div>
          </div>
        </button>
        <button className="card p-5 text-left hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center group-hover:bg-accent-100 transition">
              <Package className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">纸箱与物品</div>
              <div className="text-xs text-slate-500">查看完整清单与详情</div>
            </div>
          </div>
        </button>
        <button className="card p-5 text-left hover:shadow-md transition group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">装载清单</div>
              <div className="text-xs text-slate-500">3D装箱与装车执行顺序</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

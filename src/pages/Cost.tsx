import { useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { computeCostEstimate } from '@/utils/cost';
import { computeRoutePlan } from '@/utils/route';
import { TRUCK_SPECS, ITEM_CATEGORIES } from '@/types';
import type { InsurancePlan, TruckSpec } from '@/types';
import {
  Calculator, Shield, ShieldCheck, Sparkles, Truck,
  Receipt, Lightbulb, ChevronRight, Check, Star,
  CreditCard, Wallet, ArrowUpRight, AlertCircle,
  Package, Users, Building2, ArrowDownToLine,
  FileText, Zap, Gift, Crown,
} from 'lucide-react';

export default function CostPage() {
  const project = useAppStore(s => s.projects.find(p => p.id === s.currentProjectId));
  const boxes = useAppStore(s => s.boxes);
  const items = useAppStore(s => s.items);
  const rooms = useAppStore(s => s.rooms);
  const stats = useAppStore(s => s.getProjectStats());
  const updateProject = useAppStore(s => s.updateProject);

  const [selectedTruck, setSelectedTruck] = useState<TruckSpec | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const routePlan = useMemo(() => {
    if (!project) return null;
    return computeRoutePlan(project, boxes, rooms);
  }, [project, boxes, rooms]);

  const currentTruckSpec = selectedTruck || project?.truck_spec || 'medium';

  const costEstimate = useMemo(() => {
    if (!project || !routePlan) return null;
    const tempProject = { ...project, truck_spec: currentTruckSpec };
    return computeCostEstimate(
      tempProject, boxes, items,
      routePlan.totalTimeMin, routePlan.workersRecommended,
    );
  }, [project, routePlan, boxes, items, currentTruckSpec]);

  const truck = project ? TRUCK_SPECS[currentTruckSpec] : null;

  const totalWithInsurance = useMemo(() => {
    if (!costEstimate) return 0;
    const insurance = selectedInsurance
      ? costEstimate.insurancePlans.find(p => p.id === selectedInsurance)?.premium || 0
      : 0;
    return costEstimate.subtotal + insurance;
  }, [costEstimate, selectedInsurance]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    });
    return map;
  }, [items]);

  const handleUpgradeTruck = async (spec: TruckSpec) => {
    setSelectedTruck(spec);
    if (project) {
      await updateProject(project.id, { truck_spec: spec });
    }
  };

  if (!project || !costEstimate || !routePlan || !truck) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">加载费用预估数据...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-display font-bold text-slate-900">费用预估与保险方案</h2>
          </div>
          <p className="text-sm text-slate-500">基于物品量、车型、距离的智能费用计算 · 三档保险方案按需选择</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !py-2">
            <FileText className="w-4 h-4" />
            导出报价单
          </button>
          <button className="btn-ai">
            <Sparkles className="w-4 h-4" />
            AI智能优化
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card !p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-slate-900">车型选择</h3>
              </div>
              <div className="text-xs text-slate-500">
                当前货物约 <span className="font-semibold text-slate-700">{stats.totalVolume.toFixed(1)}m³</span>
                · <span className="font-semibold text-slate-700">{stats.totalWeight}kg</span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(TRUCK_SPECS) as [TruckSpec, typeof TRUCK_SPECS[TruckSpec]][]).map(([key, spec]) => {
                const isActive = currentTruckSpec === key;
                const isRecommended = key === 'large' && stats.totalVolume >= 10;
                const isSmall = stats.totalVolume > spec.volume;
                return (
                  <button
                    key={key}
                    onClick={() => handleUpgradeTruck(key)}
                    className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-primary-500 bg-primary-50/60 shadow-card'
                        : isSmall
                        ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                        : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
                        <Star className="w-2.5 h-2.5" />
                        推荐
                      </div>
                    )}
                    <div className="text-4xl mb-2">{spec.image}</div>
                    <div className="font-bold text-slate-900 text-sm">{spec.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {spec.volume}m³ · {spec.maxWeight}kg
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="text-lg font-display font-bold text-slate-900">
                        ¥{spec.basePrice}<span className="text-xs text-slate-400 font-normal">起</span>
                      </div>
                    </div>
                    {isSmall && (
                      <div className="mt-2 text-[10px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        容量偏小
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <button
              className="w-full p-5 border-b border-slate-100 flex items-center justify-between"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-slate-900">费用明细</h3>
                <span className="badge bg-primary-50 text-primary-700 border-primary-200">
                  {costEstimate.items.length}项
                </span>
              </div>
              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
            </button>
            {showBreakdown && (
              <div className="divide-y divide-slate-50">
                {costEstimate.items.map(item => (
                  <div key={item.id} className="p-5 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-50 to-teal-50 border border-primary-100 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        {item.quantity && item.unit && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-slate-900 font-display">¥{item.amount}</div>
                    </div>
                  </div>
                ))}
                <div className="p-5 bg-slate-50/80 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">小计（不含保险）</span>
                  <span className="text-xl font-bold text-slate-900 font-display">¥{costEstimate.subtotal}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              <h3 className="font-bold text-slate-900">保障方案选择</h3>
              <span className="text-xs text-slate-500 ml-1">
                物品总估值 <span className="font-semibold text-slate-700">¥{costEstimate.totalValue.toLocaleString()}</span>
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {costEstimate.insurancePlans.map((plan: InsurancePlan, idx) => {
                const isSelected = selectedInsurance === plan.id;
                const icons = [Shield, ShieldCheck, Crown];
                const Icon = icons[idx] || Shield;
                const gradients = [
                  'from-slate-500 to-slate-700',
                  'from-primary-500 to-teal-600',
                  'from-amber-500 to-orange-600',
                ];
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedInsurance(isSelected ? null : plan.id)}
                    className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 ring-4 ring-primary-100 shadow-card'
                        : 'border-slate-200 hover:border-primary-300'
                    }`}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-accent-500 to-orange-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-md">
                        <Zap className="w-3 h-3" />
                        方案推荐
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[idx]} text-white flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="font-bold text-slate-900 text-lg">{plan.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      保价 ¥{plan.coverage.toLocaleString()}
                    </div>

                    <div className="my-4 py-3 border-t border-b border-slate-100 space-y-2">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        {plan.premium === 0 ? (
                          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">免费赠送</span>
                        ) : (
                          <>
                            <div className="text-xs text-slate-400">保费</div>
                            <div className="text-2xl font-display font-bold text-slate-900">¥{plan.premium}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent-600" />
              <h3 className="font-bold text-slate-900">省钱小贴士</h3>
              <Gift className="w-4 h-4 text-rose-500" />
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {costEstimate.savingsTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-amber-900 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card !p-0 overflow-hidden sticky top-36">
            <div className="p-5 bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span className="font-bold">费用总计</span>
                </div>
                <span className="text-xs bg-white/15 px-2 py-1 rounded-full">预估报价</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm opacity-80">¥</span>
                <span className="text-5xl font-display font-bold tracking-tight">
                  {totalWithInsurance.toLocaleString()}
                </span>
              </div>
              {selectedInsurance && (
                <div className="mt-3 pt-3 border-t border-white/20 text-xs opacity-90 flex items-center justify-between">
                  <span>含保险方案</span>
                  <span className="font-semibold">
                    +¥{(costEstimate.insurancePlans.find(p => p.id === selectedInsurance)?.premium || 0)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4 border-b border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">基础费用</span>
                <span className="font-semibold text-slate-900">¥{costEstimate.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  保险费
                </span>
                <span className="font-semibold text-slate-900">
                  +¥{(costEstimate.insurancePlans.find(p => p.id === selectedInsurance)?.premium || 0).toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">应付总额</span>
                <span className="text-2xl font-display font-bold text-primary-700">
                  ¥{totalWithInsurance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <button className="w-full btn-primary !py-3.5 text-base justify-center">
                <Wallet className="w-5 h-5" />
                立即预约 · 锁定报价
              </button>
              <button className="w-full btn-ghost !py-2.5 justify-center">
                <ArrowUpRight className="w-4 h-4" />
                查看详细报价单
              </button>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-1">
                报价30天内有效 · 预约后24小时内专属顾问对接<br />
                支持微信/支付宝/对公转账 · 开具正规发票
              </p>
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" />
              <h4 className="font-bold text-slate-900 text-sm">物品分布</h4>
            </div>
            <div className="p-4 space-y-2.5">
              {ITEM_CATEGORIES.map(cat => {
                const count = itemsByCategory.get(cat.id) || 0;
                const total = items.length || 1;
                const pct = Math.round((count / total) * 100);
                if (count === 0) return null;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{cat.name}</span>
                      <span className="text-slate-500">{count}件 · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-600" />
              <h4 className="font-bold text-slate-900 text-sm">搬家配置摘要</h4>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  车型
                </span>
                <span className="text-slate-900 font-medium text-right">
                  {truck.image} {truck.name}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  搬运工
                </span>
                <span className="text-slate-900 font-medium">{routePlan.workersRecommended}人团队</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  楼层
                </span>
                <span className="text-slate-900 font-medium text-right text-xs">
                  {project.from_floor}F{project.from_has_elevator ? '🛗' : '🚶'}
                  <span className="mx-1 text-slate-400">→</span>
                  {project.to_floor}F{project.to_has_elevator ? '🛗' : '🚶'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  距离
                </span>
                <span className="text-slate-900 font-medium">{(routePlan.totalDistanceM / 1000).toFixed(1)}km</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">纸箱数</span>
                <span className="text-slate-900 font-medium">{boxes.length}箱</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">物品总数</span>
                <span className="text-slate-900 font-medium">{items.length}件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

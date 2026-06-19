import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Plus, Trash2, Truck, ArrowRight, Package, Users, Clock,
  CalendarDays, MapPin, Sparkles, X, CheckCircle,
} from 'lucide-react';
import type { Project, TruckSpec } from '@/types';
import { TRUCK_SPECS } from '@/types';

export default function HomePage() {
  const navigate = useNavigate();
  const initApp = useAppStore(s => s.initApp);
  const projects = useAppStore(s => s.projects);
  const createProject = useAppStore(s => s.createProject);
  const deleteProject = useAppStore(s => s.deleteProject);
  const isLoading = useAppStore(s => s.isLoading);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', from: '', to: '', date: '', truck: 'large' as TruckSpec, distance: 10,
  });

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const project = await createProject({
      name: form.name.trim(),
      from_address: form.from.trim(),
      to_address: form.to.trim(),
      move_date: form.date || undefined,
      truck_spec: form.truck,
      distance_km: form.distance,
    });
    setShowCreate(false);
    navigate(`/project/${project.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <Truck className="w-20 h-20 text-primary-600 mx-auto mb-6 animate-float" />
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">MovPlan 智能搬家</h2>
          <p className="text-slate-500">正在加载您的搬家计划...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/40 bg-grid">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10 lg:py-16">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-200/50">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
                MovPlan
              </h1>
              <p className="text-sm text-slate-500">多人协作搬家规划 · AI智能物品追踪</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-800 mb-1">
                开始您的无忧搬家之旅 🎉
              </h2>
              <p className="text-slate-500 text-sm lg:text-base">
                多人协同打包、AI识别物品、3D装箱优化、精准费用预估
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              创建搬家项目
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Users, title: '多人协作', desc: '邀请家人朋友，分角色权限协同打包', color: 'from-sky-500 to-cyan-500' },
            { icon: Sparkles, title: 'AI智能识别', desc: 'TensorFlow.js拍照自动识别物品类别', color: 'from-violet-500 to-purple-500' },
            { icon: Package, title: '三维装箱', desc: '算法优化空间利用，计算装载优先级', color: 'from-primary-500 to-emerald-500' },
          ].map((f, i) => (
            <div
              key={i}
              className="card-hover p-5 relative overflow-hidden"
              style={{ animation: `slideUp 0.5s ${i * 0.1}s backwards` }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-md`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display font-bold text-base text-slate-800 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-600" />
            我的搬家项目
          </h3>
          <span className="text-sm text-slate-400">共 {projects.length} 个项目</span>
        </div>

        {projects.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary-50 flex items-center justify-center mb-5">
              <Package className="w-10 h-10 text-primary-500" />
            </div>
            <h4 className="font-display font-bold text-lg text-slate-700 mb-2">还没有搬家项目</h4>
            <p className="text-sm text-slate-500 mb-6">点击上方按钮创建您的第一个搬家计划</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> 立即开始
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p, idx) => (
              <ProjectCard
                key={p.id}
                project={p}
                index={idx}
                onOpen={() => navigate(`/project/${p.id}`)}
                onDelete={() => deleteProject(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900">创建搬家项目</h3>
                <p className="text-sm text-slate-500">填写基本信息，开始规划您的搬家</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="btn-ghost !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">项目名称</label>
                <input
                  className="input"
                  placeholder="例如：温馨小区→新家花园搬家"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary-500" /> 搬出地址
                  </label>
                  <input
                    className="input"
                    placeholder="XX小区XX号"
                    value={form.from}
                    onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-success" /> 搬入地址
                  </label>
                  <input
                    className="input"
                    placeholder="XX花园XX栋"
                    value={form.to}
                    onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-accent-500" /> 搬家日期
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">预估距离(km)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.distance}
                    min={0}
                    step={0.5}
                    onChange={e => setForm(f => ({ ...f, distance: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-primary-500" /> 货车车型选择
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TRUCK_SPECS) as [TruckSpec, typeof TRUCK_SPECS[TruckSpec]][]).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, truck: k }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.truck === k
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xl">{v.image}</span>
                        <span className="font-semibold text-sm text-slate-800">{v.name}</span>
                        {form.truck === k && <CheckCircle className="w-4 h-4 text-primary-500 ml-auto" />}
                      </div>
                      <div className="text-xs text-slate-500">{v.volume}m³ · {v.maxWeight}kg · ¥{v.basePrice}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-7">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                取消
              </button>
              <button onClick={handleCreate} disabled={!form.name.trim()} className="btn-primary flex-1">
                创建并开始
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project, index, onOpen, onDelete,
}: {
  project: Project; index: number; onOpen: () => void; onDelete: () => void;
}) {
  const truck = TRUCK_SPECS[project.truck_spec];
  const daysLeft = Math.max(0, Math.ceil((new Date(project.move_date).getTime() - Date.now()) / 86400000));
  const progress = Math.floor(Math.random() * 60) + 20;

  return (
    <div
      className="card-hover p-6 relative group"
      style={{ animation: `slideUp 0.5s ${index * 0.05}s backwards` }}
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm('确定删除该项目吗？')) onDelete(); }}
          className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div onClick={onOpen} className="cursor-pointer">
        <div className="flex items-start justify-between mb-4 pr-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-lg text-slate-900">{project.name}</h3>
              <span className="badge bg-primary-50 text-primary-700 border border-primary-100">
                {project.project_code}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {project.from_address?.slice(0, 15) || '未填写'} → {project.to_address?.slice(0, 15) || '未填写'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <div className="text-lg mb-1">{truck.image}</div>
            <div className="text-[11px] text-slate-500">{truck.name}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <div className="font-display font-bold text-primary-700 text-lg mb-0.5">{daysLeft}</div>
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> 天后
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 text-center">
            <div className="font-display font-bold text-success text-lg mb-0.5">{progress}%</div>
            <div className="text-[11px] text-slate-500">规划进度</div>
          </div>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{new Date(project.created_at).toLocaleDateString('zh-CN')} 创建</span>
          <span className="text-primary-600 font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            进入项目 <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

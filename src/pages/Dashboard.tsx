import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Package, Boxes, Scale, Gem, AlertTriangle, CheckCircle2, Clock,
  User, TrendingUp, AlertCircle, XCircle, ChevronRight, Zap,
} from 'lucide-react';
import type { Room, Task } from '@/types';

export default function Dashboard() {
  const { id = '' } = useParams();
  const stats = useAppStore(s => s.getProjectStats());
  const rooms = useAppStore(s => s.rooms);
  const tasks = useAppStore(s => s.tasks);
  const boxes = useAppStore(s => s.boxes);
  const members = useAppStore(s => s.members);
  const alerts = useAppStore(s => s.alerts.filter(a => !a.resolved));
  const resolveAlert = useAppStore(s => s.resolveAlert);
  const project = useAppStore(s => s.projects.find(p => p.id === id));

  const ganttData = useMemo(() => {
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (sortedTasks.length === 0) return { tasks: sortedTasks, min: 0, max: 100, totalDays: 7 };

    const allStarts = sortedTasks.map(t => new Date(t.start_time).getTime());
    const allEnds = sortedTasks.map(t => new Date(t.end_time).getTime());
    const min = Math.min(...allStarts);
    const max = Math.max(...allEnds);
    const totalDays = Math.max(1, Math.ceil((max - min) / 86400000));
    return { tasks: sortedTasks, min, max, totalDays };
  }, [tasks]);

  const roomProgress = useMemo(() => {
    return rooms.map(room => {
      const roomBoxes = boxes.filter(b => b.room_id === room.id);
      const packed = roomBoxes.filter(b => b.status >= 2).length;
      const pct = roomBoxes.length > 0 ? Math.round((packed / roomBoxes.length) * 100) : 0;
      return { room, boxes: roomBoxes.length, packed, pct };
    }).sort((a, b) => a.room.sort_order - b.room.sort_order);
  }, [rooms, boxes]);

  const taskByMember = useMemo(() => {
    return members.map(m => {
      const mt = tasks.filter(t => t.assignee_id === m.id);
      return { member: m, total: mt.length, done: mt.filter(t => t.status === 'completed').length };
    });
  }, [members, tasks]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Package, label: '纸箱总数', value: stats.totalBoxes, sub: `${stats.packedBoxes} 已封箱`, bgClass: 'bg-primary-50', textClass: 'text-primary-600', subColorClass: stats.packedBoxes === stats.totalBoxes ? 'text-success' : 'text-primary-600' },
          { icon: Boxes, label: '物品总数', value: stats.totalItems, sub: `${rooms.length} 个房间`, bgClass: 'bg-violet-50', textClass: 'text-violet-600', subColorClass: 'text-violet-600' },
          { icon: Scale, label: '总重量', value: `${stats.totalWeight}`, sub: `公斤 / ${project?.max_weight || 0}kg`, unit: 'kg', bgClass: 'bg-amber-50', textClass: 'text-amber-600', subColorClass: 'text-amber-600' },
          { icon: Gem, label: '易碎品', value: stats.fragileCount, sub: `价值 ¥${stats.totalValue.toLocaleString()}`, bgClass: 'bg-rose-50', textClass: 'text-rose-600', subColorClass: 'text-rose-600' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bgClass} ${s.textClass} flex items-center justify-center`}>
                <s.icon className="w-5 h-5" />
              </div>
              <TrendingUp className={`w-4 h-4 ${s.subColorClass}`} />
            </div>
            <div className="font-display font-bold text-2xl lg:text-3xl text-slate-900 leading-none">
              {s.value}{s.unit ? <span className="text-base font-medium text-slate-400 ml-0.5">{s.unit}</span> : null}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              {s.label}
              <span className="text-slate-300">·</span>
              <span className={s.subColorClass}>{s.sub}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" /> 打包进度甘特图
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">按房间/任务分组显示，拖拽可调整进度</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {['待办', '进行中', '已完成'].map((l, i) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${
                    i === 0 ? 'bg-slate-200' : i === 1 ? 'bg-accent-500' : 'bg-success'
                  }`} />
                  <span className="text-slate-600">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {ganttData.tasks.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">暂无任务数据</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 pl-40">
                {Array.from({ length: ganttData.totalDays + 1 }).map((_, i) => {
                  const d = new Date(ganttData.min + i * 86400000);
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={i}
                      className={`text-[10px] font-medium flex-1 text-center ${
                        isToday ? 'text-primary-700 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {d.getMonth() + 1}/{d.getDate()}
                    </div>
                  );
                })}
              </div>

              {ganttData.tasks.map((task, idx) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  room={rooms.find(r => r.id === task.room_id)}
                  assignee={members.find(m => m.id === task.assignee_id)}
                  range={ganttData}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-500" /> 异常提醒
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">需及时关注处理的事项</p>
            </div>
            {alerts.length > 0 && (
              <span className="badge bg-rose-50 text-rose-600 border border-rose-100">
                {alerts.length} 条
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-2">
            {alerts.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-success/50 mb-3" />
                <p className="text-sm text-slate-400">太棒了！暂无异常事项</p>
              </div>
            ) : (
              alerts.map((a, idx) => {
                const sevConfig = a.severity === 'high'
                  ? { bgBar: 'bg-rose-500', bgBox: 'bg-rose-50', text: 'text-rose-600', Icon: XCircle }
                  : a.severity === 'medium'
                  ? { bgBar: 'bg-amber-500', bgBox: 'bg-amber-50', text: 'text-amber-600', Icon: AlertCircle }
                  : { bgBar: 'bg-sky-500', bgBox: 'bg-sky-50', text: 'text-sky-600', Icon: AlertCircle };
                const Icon = sevConfig.Icon;
                return (
                  <div
                    key={a.id}
                    className="group relative rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 hover:shadow-sm transition animate-slide-up"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className={`absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full ${sevConfig.bgBar}`} />
                    <div className="flex items-start gap-3 pl-2">
                      <div className={`w-8 h-8 shrink-0 rounded-lg ${sevConfig.bgBox} ${sevConfig.text} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800">{a.title}</div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.message}</p>
                        <button
                          onClick={() => resolveAlert(a.id)}
                          className="mt-2 text-[11px] text-primary-600 font-medium hover:text-primary-700 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          标记已处理 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="font-display font-bold text-lg text-slate-900 mb-5 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary-600" /> 各房间打包进度
          </h2>
          <div className="space-y-4">
            {roomProgress.map(({ room, boxes: bc, packed, pct }, i) => (
              <div key={room.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: room.color }} />
                    <span className="text-sm font-medium text-slate-700">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">{packed}/{bc} 箱</span>
                    <span className={`font-semibold ${
                      pct === 100 ? 'text-success' : pct >= 60 ? 'text-primary-600' : 'text-slate-600'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${room.color}, ${room.color}dd)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display font-bold text-lg text-slate-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" /> 成员任务分配
          </h2>
          <div className="space-y-4">
            {taskByMember.map(({ member, total, done }, i) => {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={member.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center shadow-sm">
                          <span className="text-base">{member.avatar}</span>
                        </div>
                        {member.is_online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-700">{member.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span className={`px-1.5 py-px rounded text-[10px] ${
                            member.role === 'owner' ? 'bg-primary-100 text-primary-700' :
                            member.role === 'member' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {member.role === 'owner' ? '负责人' : member.role === 'member' ? '协作成员' : '查看者'}
                          </span>
                          {member.tasks_count} 项任务
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{done}/{total} 完成</div>
                      <div className={`text-sm font-bold ${pct === 100 ? 'text-success' : 'text-primary-600'}`}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function GanttRow({
  task, room, assignee, range, index,
}: {
  task: Task; room?: Room; assignee?: { name: string; avatar: string };
  range: { min: number; max: number; totalDays: number }; index: number;
}) {
  const updateTask = useAppStore(s => s.updateTask);
  const start = (new Date(task.start_time).getTime() - range.min) / 86400000;
  const end = (new Date(task.end_time).getTime() - range.min) / 86400000;
  const dur = Math.max(0.5, end - start);
  const leftPct = (start / range.totalDays) * 100;
  const widthPct = (dur / range.totalDays) * 100;
  const pct = task.progress;

  const bg = task.status === 'completed' ? 'bg-success'
    : task.status === 'delayed' ? 'bg-rose-500'
    : task.status === 'in_progress' ? 'bg-accent-500' : 'bg-slate-300';

  return (
    <div
      className="group flex items-center gap-4 py-2 rounded-xl hover:bg-slate-50 transition pr-2 animate-slide-up"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="w-40 shrink-0 flex items-center gap-2.5 pl-1 pr-2">
        <div
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ background: room?.color || '#94a3b8' }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-700 truncate">{task.title}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            {assignee && (
              <>
                <span>{assignee.avatar}</span>
                <span className="truncate">{assignee.name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 relative h-9 bg-slate-50 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex">
          {Array.from({ length: range.totalDays }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-slate-100 last:border-0" />
          ))}
        </div>
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${bg} shadow-sm cursor-pointer transition-all group-hover:shadow-md group-hover:scale-[1.02]`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          onClick={() => {
            const newPct = pct >= 100 ? 0 : Math.min(100, pct + 25);
            updateTask(task.id, { progress: newPct });
          }}
          title="点击更新进度"
        >
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-md transition-all"
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-white">
            <span className="truncate flex items-center gap-1">
              {pct >= 100 && <CheckCircle2 className="w-3 h-3 shrink-0" />}
              {pct > 0 && pct < 100 && <Zap className="w-3 h-3 shrink-0" />}
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

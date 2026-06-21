import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Package, Boxes, Scale, Gem, AlertTriangle, CheckCircle2, Clock,
  User, TrendingUp, AlertCircle, XCircle, ChevronRight, Zap,
  Plus, ListTodo, Activity, Users, CheckSquare, Calendar,
  MoreHorizontal, Pencil, X as XIcon, Hash, Crown, Eye,
  Inbox, UserPlus,
} from 'lucide-react';
import type { Room, Task, TaskStatus, ActionType } from '@/types';

const TASK_STATUS_LABEL: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: '待办', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pool: { label: '待领取', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: '进行中', cls: 'bg-accent-50 text-accent-700 border-accent-200' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  delayed: { label: '已延期', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const ACTION_ICON: Record<ActionType, { icon: typeof Package; cls: string }> = {
  create_project: { icon: Package, cls: 'bg-primary-100 text-primary-600' },
  update_project: { icon: Pencil, cls: 'bg-slate-100 text-slate-600' },
  create_box: { icon: Boxes, cls: 'bg-sky-100 text-sky-600' },
  add_item: { icon: Package, cls: 'bg-violet-100 text-violet-600' },
  update_item: { icon: Pencil, cls: 'bg-slate-100 text-slate-600' },
  delete_item: { icon: XCircle, cls: 'bg-rose-100 text-rose-600' },
  seal_box: { icon: CheckCircle2, cls: 'bg-primary-100 text-primary-600' },
  load_box: { icon: Package, cls: 'bg-emerald-100 text-emerald-600' },
  unload_box: { icon: Package, cls: 'bg-amber-100 text-amber-600' },
  sign_box: { icon: CheckSquare, cls: 'bg-green-100 text-green-600' },
  change_status: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-600' },
  add_member: { icon: UserPlus, cls: 'bg-cyan-100 text-cyan-600' },
  assign_task: { icon: ListTodo, cls: 'bg-primary-100 text-primary-600' },
  claim_task: { icon: User, cls: 'bg-accent-100 text-accent-600' },
  complete_task: { icon: CheckSquare, cls: 'bg-emerald-100 text-emerald-600' },
};

type TaskTab = 'mine' | 'pool' | 'all';

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
  const moveRecords = useAppStore(s => s.moveRecords);
  const currentUserId = useAppStore(s => s.currentUserId);
  const claimTask = useAppStore(s => s.claimTask);
  const completeTask = useAppStore(s => s.completeTask);
  const addTask = useAppStore(s => s.addTask);
  const assignTask = useAppStore(s => s.assignTask);

  const [taskTab, setTaskTab] = useState<TaskTab>('mine');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', priority: 2 as 1 | 2 | 3, type: 'packing' as Task['type'], room_id: '', assignee_id: '',
  });

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

  const filteredTasks = useMemo(() => {
    switch (taskTab) {
      case 'mine':
        return tasks.filter(t => t.assignee_id === currentUserId && t.status !== 'completed');
      case 'pool':
        return tasks.filter(t => t.status === 'pool');
      case 'all':
        return tasks;
    }
  }, [tasks, taskTab, currentUserId]);

  const taskCount = {
    mine: tasks.filter(t => t.assignee_id === currentUserId && t.status !== 'completed').length,
    pool: tasks.filter(t => t.status === 'pool').length,
    all: tasks.length,
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    await addTask(id, {
      title: newTask.title.trim(),
      priority: newTask.priority,
      type: newTask.type,
      room_id: newTask.room_id || undefined,
      assignee_id: newTask.assignee_id || undefined,
    });
    setNewTask({ title: '', priority: 2, type: 'packing', room_id: '', assignee_id: '' });
    setShowNewTask(false);
  };

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
              <p className="text-xs text-slate-500 mt-0.5">点击任务条可更新进度</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary-600" /> 任务面板
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                {([
                  { k: 'mine', label: '我的', icon: User, count: taskCount.mine },
                  { k: 'pool', label: '待办池', icon: Inbox, count: taskCount.pool },
                  { k: 'all', label: '全部', icon: ListTodo, count: taskCount.all },
                ] as { k: TaskTab; label: string; icon: typeof User; count: number }[]).map(t => (
                  <button
                    key={t.k}
                    onClick={() => setTaskTab(t.k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 transition ${
                      taskTab === t.k ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.count > 0 && <span className={`text-[10px] ${taskTab === t.k ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-600'} px-1.5 py-0.5 rounded-full`}>{t.count}</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowNewTask(true)} className="btn-primary !py-1.5 !px-3 text-xs">
                <Plus className="w-3.5 h-3.5" /> 新建任务
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-thin pr-2">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">
                  {taskTab === 'pool' ? '待办池暂无任务，点击右上角分配新任务' : '暂无相关任务'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={idx}
                  room={rooms.find(r => r.id === task.room_id)}
                  assignee={members.find(m => m.id === task.assignee_id)}
                  members={members}
                  onClaim={() => claimTask(task.id)}
                  onComplete={() => completeTask(task.id)}
                  onAssign={(mid) => assignTask(task.id, mid)}
                />
              ))
            )}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" /> 项目动态
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">团队操作实时记录</p>
            </div>
          </div>

          <div className="relative space-y-0 max-h-[520px] overflow-y-auto scrollbar-thin pr-2">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-100" />
            {moveRecords.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">暂无动态</p>
              </div>
            ) : (
              moveRecords.slice(0, 30).map((r, idx) => {
                const iconInfo = ACTION_ICON[r.action_type] || { icon: Activity, cls: 'bg-slate-100 text-slate-600' };
                const Icon = iconInfo.icon;
                const time = new Date(r.created_at);
                return (
                  <div key={r.id} className="relative flex gap-3 py-3 animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <div className={`w-9 h-9 shrink-0 rounded-full ${iconInfo.cls} flex items-center justify-center z-10`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-800">{r.operator_name}</span>
                        <span className="text-slate-500"> </span>
                        {r.details}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
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
            <Users className="w-5 h-5 text-primary-600" /> 成员任务分配
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

      {showNewTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-bold text-slate-900">新建任务</h3>
              <button onClick={() => setShowNewTask(false)} className="btn-ghost !p-2">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">任务名称</label>
                <input
                  className="input"
                  placeholder="例如：主卧衣物打包"
                  value={newTask.title}
                  onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">关联房间</label>
                  <select
                    className="input"
                    value={newTask.room_id}
                    onChange={e => setNewTask(t => ({ ...t, room_id: e.target.value }))}
                  >
                    <option value="">不指定</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">分配给</label>
                  <select
                    className="input"
                    value={newTask.assignee_id}
                    onChange={e => setNewTask(t => ({ ...t, assignee_id: e.target.value }))}
                  >
                    <option value="">放入待办池</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">类型</label>
                  <select
                    className="input"
                    value={newTask.type}
                    onChange={e => setNewTask(t => ({ ...t, type: e.target.value as Task['type'] }))}
                  >
                    <option value="packing">打包</option>
                    <option value="disassembly">拆卸</option>
                    <option value="loading">装车</option>
                    <option value="cleaning">清洁</option>
                    <option value="documentation">文档</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">优先级</label>
                  <div className="flex gap-2 h-[42px]">
                    {([3, 2, 1] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTask(t => ({ ...t, priority: p }))}
                        className={`flex-1 rounded-xl border text-sm transition ${
                          newTask.priority === p
                            ? p === 1 ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : p === 2 ? 'border-amber-500 bg-amber-50 text-amber-700'
                              : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {p === 1 ? '高' : p === 2 ? '中' : '低'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewTask(false)} className="btn-secondary flex-1">取消</button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim()}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task, room, assignee, members, index, onClaim, onComplete, onAssign,
}: {
  task: Task; room?: Room; assignee?: { name: string; avatar: string; id: string };
  members: { id: string; name: string; avatar: string; role: string }[]; index: number;
  onClaim: () => void; onComplete: () => void; onAssign: (mid: string) => void;
}) {
  const unassignTask = useAppStore(s => s.unassignTask);
  const [showAssign, setShowAssign] = useState(false);
  const statusInfo = TASK_STATUS_LABEL[task.status];
  const priorityLabel = task.priority === 1 ? '高' : task.priority === 2 ? '中' : '低';
  const priorityCls = task.priority === 1 ? 'text-rose-600 bg-rose-50' : task.priority === 2 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

  return (
    <div
      className="group relative rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition animate-slide-up"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-1 h-14 rounded-full shrink-0" style={{ background: room?.color || '#cbd5e1' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{task.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${priorityCls}`}>{priorityLabel}优先级</span>
              <span className={`badge text-[10px] ${statusInfo.cls}`}>{statusInfo.label}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              {task.status === 'pool' && (
                <button
                  onClick={onClaim}
                  className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center"
                  title="领取任务"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}
              {task.status !== 'completed' && task.status !== 'pool' && (
                <button
                  onClick={onComplete}
                  className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center"
                  title="完成任务"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowAssign(s => !s)}
                className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                title="重新分配"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
            {room && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" /> {room.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.start_time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - {new Date(task.end_time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {assignee ? (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{assignee.avatar}</span>
                <span className="text-xs text-slate-600">{assignee.name}</span>
              </div>
            ) : (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <Inbox className="w-3 h-3" /> 待办池中
              </span>
            )}
            <div className="flex items-center gap-1.5 flex-1 max-w-[120px] ml-3">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${task.progress >= 100 ? 'bg-success' : 'bg-primary-500'}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-8 text-right">{task.progress}%</span>
            </div>
          </div>
          {showAssign && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 mb-2">重新分配给：</div>
              <div className="flex flex-wrap gap-1.5">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onAssign(m.id); setShowAssign(false); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-xs transition"
                  >
                    <span>{m.avatar}</span>
                    <span className="text-slate-700">{m.name}</span>
                  </button>
                ))}
                {task.assignee_id && (
                  <button
                    onClick={() => { unassignTask(task.id); setShowAssign(false); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs text-rose-600 transition"
                  >
                    <Inbox className="w-3 h-3" /> 放入待办池
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
            {!assignee && <span className="text-amber-600">待领取</span>}
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

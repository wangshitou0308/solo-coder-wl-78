import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  UserPlus, Copy, Share2, Crown, Shield, Eye, MoreVertical,
  CheckCircle, X, QrCode, Sparkles, ListTodo, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import type { UserRole, TaskStatus } from '@/types';

const ROLE_INFO: Record<UserRole, { label: string; cls: string; icon: typeof Crown }> = {
  owner: { label: '负责人', cls: 'bg-primary-100 text-primary-700 border-primary-200', icon: Crown },
  member: { label: '协作成员', cls: 'bg-sky-100 text-sky-700 border-sky-200', icon: Shield },
  viewer: { label: '查看者', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: Eye },
};

export default function Members() {
  const { id = '' } = useParams();
  const project = useAppStore(s => s.projects.find(p => p.id === id));
  const members = useAppStore(s => s.members);
  const rooms = useAppStore(s => s.rooms);
  const addMember = useAppStore(s => s.addMember);
  const updateMemberRole = useAppStore(s => s.updateMemberRole);
  const removeMember = useAppStore(s => s.removeMember);
  const tasks = useAppStore(s => s.tasks);

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'member' as UserRole });
  const [copied, setCopied] = useState(false);

  const inviteLink = `https://movplan.app/join/${project?.project_code || ''}`;
  const joinCode = project?.project_code || '';

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addMember(id, form.name.trim(), form.role);
    setForm({ name: '', role: 'member' });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-primary-50/60 via-white to-violet-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2 mb-1">
              <Share2 className="w-5 h-5 text-primary-600" /> 协作邀请
            </h2>
            <p className="text-sm text-slate-500">
              分享链接或项目码，邀请家人朋友一起协作打包搬家
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="btn-primary self-start lg:self-auto"
          >
            <UserPlus className="w-4 h-4" /> 添加成员
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> 邀请链接
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate">
                {inviteLink}
              </code>
              <button onClick={copyLink} className="btn-secondary !px-3 !py-2">
                {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-accent-50 to-primary-50 border border-primary-100">
            <div className="text-xs font-semibold text-slate-500 mb-2">6位项目码（手动加入）</div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                {joinCode.split('').map((c, i) => (
                  <div
                    key={i}
                    className="w-9 h-11 rounded-lg bg-white border-2 border-primary-200 flex items-center justify-center font-display font-bold text-lg text-primary-700 shadow-sm"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(joinCode)}
                className="text-xs text-primary-600 font-medium hover:text-primary-700"
              >
                复制项目码
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              团队成员
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">共 {members.length} 人加入此项目</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {(['owner', 'member', 'viewer'] as UserRole[]).map(r => {
              const count = members.filter(m => m.role === r).length;
              const info = ROLE_INFO[r];
              return (
                <div key={r} className="flex items-center gap-1.5">
                  <info.icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-500">{info.label}</span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m, idx) => {
            const mt = tasks.filter(t => t.assignee_id === m.id);
            const info = ROLE_INFO[m.role];
            const done = mt.filter(t => t.status === 'completed').length;
            const pct = mt.length > 0 ? Math.round((done / mt.length) * 100) : 0;

            return (
              <div
                key={m.id}
                className="group relative p-5 rounded-2xl border border-slate-200 hover:border-primary-200 hover:shadow-md transition animate-slide-up"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
                  {m.role !== 'owner' && (
                    <select
                      value={m.role}
                      onChange={e => updateMemberRole(m.id, e.target.value as UserRole)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary-400"
                    >
                      <option value="member">协作成员</option>
                      <option value="viewer">查看者</option>
                    </select>
                  )}
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => { if (confirm(`移除 ${m.name}？`)) removeMember(m.id); }}
                      className="ml-1 w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 inline-flex items-center justify-center transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 text-white flex items-center justify-center text-2xl shadow-md">
                      {m.avatar}
                    </div>
                    {m.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 truncate">{m.name}</h3>
                    </div>
                    <span className={`badge border ${info.cls}`}>
                      <info.icon className="w-3 h-3" />
                      {info.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <div className="font-display font-bold text-lg text-slate-800">{mt.length}</div>
                    <div className="text-[10px] text-slate-500">总任务</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <div className="font-display font-bold text-lg text-success">{done}</div>
                    <div className="text-[10px] text-emerald-600">已完成</div>
                  </div>
                  <div className="p-2 rounded-xl bg-primary-50">
                    <div className="font-display font-bold text-lg text-primary-700">{pct}%</div>
                    <div className="text-[10px] text-primary-600">完成率</div>
                  </div>
                </div>

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>加入于 {new Date(m.joined_at).toLocaleDateString('zh-CN')}</span>
                  {m.is_online ? (
                    <span className="text-success font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                      在线
                    </span>
                  ) : (
                    <span className="text-slate-400">离线</span>
                  )}
                </div>

                {mt.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                      <ListTodo className="w-3 h-3" /> 任务分配
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                      {mt.map(t => {
                        const statusMap: Record<TaskStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
                          pending: { label: '待开始', icon: Clock, cls: 'text-slate-500 bg-slate-100' },
                          pool: { label: '待领取', icon: AlertCircle, cls: 'text-amber-600 bg-amber-50' },
                          in_progress: { label: '进行中', icon: Clock, cls: 'text-primary-600 bg-primary-50' },
                          completed: { label: '已完成', icon: CheckCircle2, cls: 'text-success bg-emerald-50' },
                          delayed: { label: '已延期', icon: AlertCircle, cls: 'text-rose-600 bg-rose-50' },
                        };
                        const s = statusMap[t.status];
                        const SIcon = s.icon;
                        return (
                          <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/70 hover:bg-slate-50 transition">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-700 truncate">{t.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {rooms.find(r => r.id === t.room_id)?.name || '未分配房间'}
                              </div>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5 ${s.cls}`}>
                              <SIcon className="w-2.5 h-2.5" />
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  添加协作成员
                </h3>
                <p className="text-sm text-slate-500">输入成员信息，分配角色权限</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="btn-ghost !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">成员昵称</label>
                <input
                  className="input"
                  placeholder="例如：张小明"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">角色权限</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['owner', 'member', 'viewer'] as UserRole[]).map(r => {
                    const info = ROLE_INFO[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r }))}
                        disabled={r === 'owner'}
                        className={`p-3 rounded-xl border-2 text-left transition-all disabled:opacity-50 ${
                          form.role === r
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <info.icon className={`w-4 h-4 mb-1 ${r === 'owner' ? 'text-amber-500' : r === 'member' ? 'text-sky-600' : 'text-slate-500'}`} />
                        <div className="font-semibold text-sm text-slate-800">{info.label}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  负责人：全权限；协作成员：打包录入；查看者：只读浏览
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleAdd} disabled={!form.name.trim()} className="btn-primary flex-1">
                <CheckCircle className="w-4 h-4" /> 确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

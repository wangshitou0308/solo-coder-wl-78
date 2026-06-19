import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Plus, Search, Filter, QrCode, Package, Trash2, Edit3, X,
  Scale, Ruler, Gem, CheckCircle, Pencil, Box, ChevronDown,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { BoxStatus } from '@/types';

const STATUS_INFO: Record<BoxStatus, { label: string; cls: string }> = {
  0: { label: '空箱', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  1: { label: '打包中', cls: 'bg-accent-50 text-accent-700 border-accent-200' },
  2: { label: '已封箱', cls: 'bg-primary-50 text-primary-700 border-primary-200' },
  3: { label: '已装载', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function BoxesPage() {
  const { id = '' } = useParams();
  const boxes = useAppStore(s => s.boxes);
  const rooms = useAppStore(s => s.rooms);
  const items = useAppStore(s => s.items);
  const getItemsByBox = useAppStore(s => s.getItemsByBox);
  const addBox = useAppStore(s => s.addBox);
  const updateBox = useAppStore(s => s.updateBox);
  const deleteBox = useAppStore(s => s.deleteBox);
  const addItem = useAppStore(s => s.addItem);
  const deleteItem = useAppStore(s => s.deleteItem);

  const [search, setSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newBoxRoom, setNewBoxRoom] = useState<string>('');
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [showItemModal, setShowItemModal] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: 'daily', weight_kg: 1, is_fragile: false, is_valuable: false,
  });
  const [qrFor, setQrFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return boxes.filter(b => {
      if (search && !b.box_code.toLowerCase().includes(search.toLowerCase())
        && !b.notes.toLowerCase().includes(search.toLowerCase())) return false;
      if (roomFilter && b.room_id !== roomFilter) return false;
      if (statusFilter && String(b.status) !== statusFilter) return false;
      return true;
    });
  }, [boxes, search, roomFilter, statusFilter]);

  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);

  const createBox = async () => {
    const roomId = newBoxRoom || rooms[0]?.id;
    if (!roomId) return;
    const box = await addBox(id, roomId);
    setNewBoxRoom('');
    setSelectedBox(box.id);
  };

  const handleAddItem = () => {
    if (!showItemModal || !itemForm.name.trim()) return;
    addItem(showItemModal, {
      name: itemForm.name.trim(),
      category: itemForm.category,
      weight_kg: itemForm.weight_kg,
      is_fragile: itemForm.is_fragile,
      is_valuable: itemForm.is_valuable,
      estimated_value: itemForm.is_valuable ? 2000 : 200,
    });
    setShowItemModal(null);
    setItemForm({ name: '', category: 'daily', weight_kg: 1, is_fragile: false, is_valuable: false });
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-primary-600" /> 纸箱管理
            </h2>
            <p className="text-sm text-slate-500">共 {boxes.length} 个纸箱 · {items.length} 件物品</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input !pl-9 !w-48"
                placeholder="搜索箱号..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input !w-32"
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
            >
              <option value="">全部房间</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select
              className="input !w-28"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="0">空箱</option>
              <option value="1">打包中</option>
              <option value="2">已封箱</option>
              <option value="3">已装载</option>
            </select>
            <select
              className="input !w-32"
              value={newBoxRoom}
              onChange={e => setNewBoxRoom(e.target.value)}
            >
              <option value="">选择房间</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={createBox} className="btn-primary">
              <Plus className="w-4 h-4" /> 新建纸箱
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((box, idx) => {
          const room = roomMap.get(box.room_id);
          const status = STATUS_INFO[box.status];
          const boxItems = getItemsByBox(box.id);
          const vol = (box.length_cm * box.width_cm * box.height_cm / 1e6).toFixed(2);

          return (
            <div
              key={box.id}
              className="card-hover overflow-hidden animate-slide-up group"
              style={{ animationDelay: `${idx * 0.02}s` }}
            >
              <div
                className="h-1.5"
                style={{ background: room?.color || '#94a3b8' }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-lg text-slate-900">
                        {box.box_code}
                      </h3>
                      {box.is_overweight && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold animate-pulse">
                          超重
                        </span>
                      )}
                      {box.is_fragile && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-semibold">
                          易碎
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <div className="w-2 h-2 rounded-sm" style={{ background: room?.color }} />
                      {room?.name || '未分配'}
                    </div>
                  </div>
                  <span className={`badge border ${status.cls}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <div className="font-display font-bold text-sm text-slate-800">{box.items_count}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                      <Box className="w-2.5 h-2.5" /> 物品
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <div className="font-display font-bold text-sm text-slate-800">{box.weight_kg}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                      <Scale className="w-2.5 h-2.5" /> kg
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <div className="font-display font-bold text-sm text-slate-800">{vol}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                      <Ruler className="w-2.5 h-2.5" /> m³
                    </div>
                  </div>
                </div>

                {selectedBox === box.id && boxItems.length > 0 && (
                  <div className="mb-3 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                    {boxItems.map(it => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs group/item"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {it.is_fragile && <Gem className="w-3 h-3 text-violet-500 shrink-0" />}
                          {it.is_valuable && <span className="text-amber-500 shrink-0">💎</span>}
                          <span className="truncate text-slate-700">{it.name}</span>
                        </div>
                        <span className="text-slate-400 shrink-0 ml-2">{it.weight_kg}kg</span>
                        <button
                          onClick={() => deleteItem(it.id)}
                          className="w-5 h-5 shrink-0 ml-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedBox(selectedBox === box.id ? null : box.id)}
                    className="flex-1 btn-ghost !text-xs !py-2"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition ${selectedBox === box.id ? 'rotate-180' : ''}`} />
                    物品
                  </button>
                  <button
                    onClick={() => setShowItemModal(box.id)}
                    className="flex-1 btn-secondary !text-xs !py-2"
                    title="添加物品"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加
                  </button>
                  <button
                    onClick={() => setQrFor(box.id)}
                    className="btn-ghost !p-2"
                    title="二维码"
                  >
                    <QrCode className="w-4 h-4 text-primary-600" />
                  </button>
                  <select
                    value={box.status}
                    onChange={e => updateBox(box.id, {
                      status: Number(e.target.value) as BoxStatus,
                      packed_at: Number(e.target.value) >= 2 ? new Date().toISOString() : undefined,
                    })}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 outline-none focus:border-primary-400"
                  >
                    <option value={0}>空箱</option>
                    <option value={1}>打包中</option>
                    <option value={2}>已封箱</option>
                    <option value={3}>已装载</option>
                  </select>
                  <button
                    onClick={() => { if (confirm(`删除纸箱 ${box.box_code}？`)) deleteBox(box.id); }}
                    className="btn-ghost !p-2 hover:!bg-rose-50 hover:!text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary-600" /> 添加物品
                </h3>
                <p className="text-sm text-slate-500">记录物品详情，便于追踪管理</p>
              </div>
              <button onClick={() => setShowItemModal(null)} className="btn-ghost !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">物品名称</label>
                <input
                  className="input"
                  placeholder="例如：冬季羽绒服"
                  value={itemForm.name}
                  onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">物品类别</label>
                  <select
                    className="input"
                    value={itemForm.category}
                    onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="furniture">家具大件</option>
                    <option value="appliance">家电电器</option>
                    <option value="kitchen">厨房用品</option>
                    <option value="clothing">衣物被褥</option>
                    <option value="books">书籍文具</option>
                    <option value="electronics">数码电子</option>
                    <option value="decor">装饰摆件</option>
                    <option value="documents">文件档案</option>
                    <option value="toys">玩具运动</option>
                    <option value="daily">日常杂项</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">预估重量(kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={itemForm.weight_kg}
                    onChange={e => setItemForm(f => ({ ...f, weight_kg: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50/40 transition">
                  <input
                    type="checkbox"
                    checked={itemForm.is_fragile}
                    onChange={e => setItemForm(f => ({ ...f, is_fragile: e.target.checked }))}
                    className="w-4 h-4 text-violet-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1">
                      <Gem className="w-3.5 h-3.5 text-violet-500" /> 易碎品
                    </div>
                    <div className="text-[11px] text-slate-500">需小心轻放</div>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-amber-300 hover:bg-amber-50/40 transition">
                  <input
                    type="checkbox"
                    checked={itemForm.is_valuable}
                    onChange={e => setItemForm(f => ({ ...f, is_valuable: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1">
                      💎 贵重物品
                    </div>
                    <div className="text-[11px] text-slate-500">建议购买保险</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowItemModal(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleAddItem} disabled={!itemForm.name.trim()} className="btn-primary flex-1">
                <CheckCircle className="w-4 h-4" /> 确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {qrFor && (() => {
        const box = boxes.find(b => b.id === qrFor);
        if (!box) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setQrFor(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 mb-5">
                <QRCodeSVG value={box.qr_data} size={180} level="H" includeMargin={false} />
              </div>
              <h3 className="font-display font-bold text-2xl text-slate-900 mb-1">{box.box_code}</h3>
              <p className="text-sm text-slate-500 mb-2">扫码快速访问此纸箱</p>
              <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-50 rounded-lg p-2 break-all">
                {box.qr_data}
              </p>
              <button onClick={() => setQrFor(null)} className="btn-primary w-full">
                <Edit3 className="w-4 h-4" /> 关闭
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

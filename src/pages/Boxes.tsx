import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Plus, Search, QrCode, Package, Trash2, Edit3, X,
  Scale, Ruler, Gem, CheckCircle, Pencil, Box, ChevronDown,
  ListPlus, Clock, User, FileText, History,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { BoxStatus, Item } from '@/types';
import { ITEM_CATEGORIES } from '@/types';

const STATUS_INFO: Record<BoxStatus, { label: string; cls: string }> = {
  0: { label: '空箱', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  1: { label: '打包中', cls: 'bg-accent-50 text-accent-700 border-accent-200' },
  2: { label: '已封箱', cls: 'bg-primary-50 text-primary-700 border-primary-200' },
  3: { label: '已装载', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  4: { label: '运输中', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  5: { label: '已签收', cls: 'bg-green-50 text-green-700 border-green-200' },
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
  const addItemsBatch = useAppStore(s => s.addItemsBatch);
  const updateItem = useAppStore(s => s.updateItem);
  const deleteItem = useAppStore(s => s.deleteItem);
  const searchItems = useAppStore(s => s.searchItems);
  const updateBoxStatus = useAppStore(s => s.updateBoxStatus);

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
  const [detailBox, setDetailBox] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    name: '', category: 'daily', weight_kg: 1, is_fragile: false, is_valuable: false, estimated_value: 200,
  });
  const [showBatchModal, setShowBatchModal] = useState<string | null>(null);
  const [batchText, setBatchText] = useState('');

  const searchResult = useMemo(() => {
    if (!search.trim()) return null;
    return searchItems(search.trim());
  }, [search, searchItems]);

  const filtered = useMemo(() => {
    return boxes.filter(b => {
      if (search.trim()) {
        const sr = searchResult;
        if (sr && sr.boxes.some(bx => bx.id === b.id)) return true;
        if (sr && sr.items.some(it => it.box_id === b.id)) return true;
        return false;
      }
      if (roomFilter && b.room_id !== roomFilter) return false;
      if (statusFilter && String(b.status) !== statusFilter) return false;
      return true;
    });
  }, [boxes, search, searchResult, roomFilter, statusFilter]);

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

  const handleEditItem = () => {
    if (!editItem || !editItemForm.name.trim()) return;
    updateItem(editItem.id, editItemForm);
    setEditItem(null);
  };

  const openEditItem = (it: Item) => {
    setEditItem(it);
    setEditItemForm({
      name: it.name,
      category: it.category,
      weight_kg: it.weight_kg,
      is_fragile: it.is_fragile,
      is_valuable: it.is_valuable,
      estimated_value: it.estimated_value,
    });
  };

  const handleBatchAdd = () => {
    if (!showBatchModal || !batchText.trim()) return;
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const itemsData: Partial<Item>[] = lines.map(line => {
      const parts = line.split(/[,，、\t]/).map(p => p.trim());
      const name = parts[0] || '未命名物品';
      const category = (parts[1] && ITEM_CATEGORIES.find(c => c.name === parts[1] || c.id === parts[1])?.id) || 'daily';
      const weight_kg = Number(parts[2]) || 1;
      const is_fragile = parts.includes('易碎') || parts.includes('fragile');
      const is_valuable = parts.includes('贵重') || parts.includes('valuable');
      return {
        name,
        category,
        weight_kg,
        is_fragile,
        is_valuable,
        estimated_value: is_valuable ? 2000 : 200,
      };
    });
    if (itemsData.length > 0) {
      addItemsBatch(showBatchModal, itemsData);
    }
    setShowBatchModal(null);
    setBatchText('');
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
                className="input !pl-9 !w-64"
                placeholder="搜索箱号/物品名/类别/房间..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search.trim() && searchResult && (
                <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500 text-white font-bold">
                  {searchResult.items.length + searchResult.boxes.length}
                </span>
              )}
            </div>
            {search.trim() && searchResult && (
              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1"><Package className="w-3 h-3 text-primary-600" /> {searchResult.boxes.length} 纸箱</span>
                <span className="flex items-center gap-1"><Box className="w-3 h-3 text-accent-600" /> {searchResult.items.length} 物品</span>
              </div>
            )}
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
              <option value="4">运输中</option>
              <option value="5">已签收</option>
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
                          onClick={() => openEditItem(it)}
                          className="w-5 h-5 shrink-0 ml-1 rounded hover:bg-primary-100 text-slate-400 hover:text-primary-600 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition"
                          title="编辑"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteItem(it.id)}
                          className="w-5 h-5 shrink-0 ml-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition"
                          title="删除"
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
                    onClick={() => setShowBatchModal(box.id)}
                    className="btn-ghost !p-2"
                    title="批量录入"
                  >
                    <ListPlus className="w-4 h-4 text-accent-600" />
                  </button>
                  <button
                    onClick={() => setDetailBox(box.id)}
                    className="btn-ghost !p-2"
                    title="详情"
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
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
                    onChange={e => updateBoxStatus(box.id, Number(e.target.value) as BoxStatus)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 outline-none focus:border-primary-400"
                  >
                    <option value={0}>空箱</option>
                    <option value={1}>打包中</option>
                    <option value={2}>已封箱</option>
                    <option value={3}>已装载</option>
                    <option value={4}>运输中</option>
                    <option value={5}>已签收</option>
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

      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary-600" /> 编辑物品
                </h3>
                <p className="text-sm text-slate-500">修改物品详细信息</p>
              </div>
              <button onClick={() => setEditItem(null)} className="btn-ghost !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">物品名称</label>
                <input
                  className="input"
                  value={editItemForm.name}
                  onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">物品类别</label>
                  <select
                    className="input"
                    value={editItemForm.category}
                    onChange={e => setEditItemForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {ITEM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">预估重量(kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={editItemForm.weight_kg}
                    onChange={e => setEditItemForm(f => ({ ...f, weight_kg: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">预估价值(元)</label>
                <input
                  type="number"
                  className="input"
                  value={editItemForm.estimated_value}
                  onChange={e => setEditItemForm(f => ({ ...f, estimated_value: Number(e.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50/40 transition">
                  <input
                    type="checkbox"
                    checked={editItemForm.is_fragile}
                    onChange={e => setEditItemForm(f => ({ ...f, is_fragile: e.target.checked }))}
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
                    checked={editItemForm.is_valuable}
                    onChange={e => setEditItemForm(f => ({ ...f, is_valuable: e.target.checked }))}
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
              <button onClick={() => setEditItem(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleEditItem} disabled={!editItemForm.name.trim()} className="btn-primary flex-1">
                <CheckCircle className="w-4 h-4" /> 保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowBatchModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-accent-600" /> 批量录入物品
                </h3>
                <p className="text-sm text-slate-500">每行一个物品，格式：名称,类别,重量,易碎,贵重</p>
              </div>
              <button onClick={() => setShowBatchModal(null)} className="btn-ghost !p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-3 p-3 rounded-xl bg-slate-50 text-xs text-slate-500 leading-relaxed">
              <div className="font-semibold text-slate-700 mb-1">支持的格式示例：</div>
              <div>冬季羽绒服,衣物被褥,3</div>
              <div>陶瓷花瓶,装饰摆件,2,易碎,贵重</div>
              <div>笔记本电脑,数码电子,2,贵重</div>
              <div className="mt-1 text-slate-400">分隔符支持：逗号、顿号、制表符</div>
            </div>
            <textarea
              className="input !h-48 font-mono text-xs"
              placeholder="冬季羽绒服,衣物被褥,3&#10;陶瓷花瓶,装饰摆件,2,易碎,贵重&#10;笔记本电脑,数码电子,2,贵重"
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBatchModal(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={handleBatchAdd} disabled={!batchText.trim()} className="btn-primary flex-1">
                <CheckCircle className="w-4 h-4" /> 批量导入
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBox && (() => {
        const box = boxes.find(b => b.id === detailBox);
        if (!box) return null;
        const room = roomMap.get(box.room_id);
        const boxItems = getItemsByBox(box.id);
        const status = STATUS_INFO[box.status];
        const vol = (box.length_cm * box.width_cm * box.height_cm / 1e6).toFixed(3);
        const totalValue = boxItems.reduce((s, it) => s + it.estimated_value, 0);
        const history = box.status_history || [];
        const statusSteps: { status: BoxStatus; label: string }[] = [
          { status: 0, label: '创建空箱' },
          { status: 1, label: '开始打包' },
          { status: 2, label: '封箱完成' },
          { status: 3, label: '已装载上车' },
          { status: 4, label: '运输途中' },
          { status: 5, label: '已签收确认' },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setDetailBox(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-7 py-5 flex items-center justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-2xl font-bold text-slate-900">{box.box_code}</h3>
                    <span className={`badge border ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: room?.color }} />
                      {room?.name || '未分配'}
                    </span>
                    <span>📐 {box.length_cm}×{box.width_cm}×{box.height_cm} cm</span>
                    <span>⚖️ {box.weight_kg} kg</span>
                    <span>📦 {vol} m³</span>
                    <span>💰 ¥{totalValue.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => setDetailBox(null)} className="btn-ghost !p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-7 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-primary-50/50 border border-primary-100 text-center">
                    <div className="font-display font-bold text-3xl text-primary-700">{boxItems.length}</div>
                    <div className="text-xs text-primary-600 mt-1">件物品</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-accent-50/50 border border-accent-100 text-center">
                    <div className="font-display font-bold text-3xl text-accent-700">{box.weight_kg}</div>
                    <div className="text-xs text-accent-600 mt-1">总重量 kg</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
                    <div className="font-display font-bold text-2xl text-emerald-700">¥{totalValue.toLocaleString()}</div>
                    <div className="text-xs text-emerald-600 mt-1">预估价值</div>
                  </div>
                </div>

                {box.notes && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 mb-2">📝 备注</div>
                    <div className="text-sm text-slate-700">{box.notes}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
                    <QRCodeSVG value={box.qr_data} size={100} level="M" includeMargin={false} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 mb-1">纸箱二维码</div>
                    <div className="text-xs text-slate-500 mb-2">使用扫码功能快速定位此纸箱</div>
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-50 rounded-lg px-2 py-1 inline-block break-all">
                      {box.qr_data}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary-600" /> 物品清单
                    </h4>
                    <span className="text-xs text-slate-500">{boxItems.length} 件</span>
                  </div>
                  {boxItems.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 border-dashed">
                      <div className="text-sm text-slate-500">此纸箱暂无物品</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                      {boxItems.map(it => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {it.is_fragile && <Gem className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
                            {it.is_valuable && <span className="shrink-0">💎</span>}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate">{it.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {ITEM_CATEGORIES.find(c => c.id === it.category)?.name || it.category}
                                {it.photo_url && ' · 📷已拍照'}
                                {it.ai_confidence && ` · AI置信${Math.round(it.ai_confidence * 100)}%`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-semibold text-slate-700">{it.weight_kg} kg</div>
                            <div className="text-[11px] text-slate-400">¥{it.estimated_value}</div>
                          </div>
                          <button
                            onClick={() => { setDetailBox(null); openEditItem(it); }}
                            className="ml-2 w-8 h-8 rounded-lg hover:bg-primary-100 text-slate-400 hover:text-primary-600 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-violet-600" /> 状态流转时间线
                  </h4>
                  <div className="relative pl-6">
                    <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
                    {statusSteps.map((step, idx) => {
                      const reached = box.status >= step.status;
                      const evt = history.find(h => h.status === step.status);
                      const active = box.status === step.status;
                      return (
                        <div key={step.status} className="relative pb-5 last:pb-0">
                          <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            reached
                              ? active
                                ? 'bg-primary-500 border-primary-500 animate-pulse'
                                : 'bg-emerald-500 border-emerald-500'
                              : 'bg-white border-slate-300'
                          }`}>
                            {reached && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className={`${reached ? '' : 'opacity-50'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${active ? 'text-primary-700' : reached ? 'text-slate-800' : 'text-slate-500'}`}>
                                {step.label}
                              </span>
                              {active && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 font-medium">当前</span>}
                            </div>
                            {evt && (
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(evt.at).toLocaleString('zh-CN')}
                                </span>
                                {evt.by && (
                                  <span className="flex items-center gap-0.5">
                                    <User className="w-2.5 h-2.5" />
                                    {evt.by}
                                  </span>
                                )}
                                {evt.note && <span>· {evt.note}</span>}
                              </div>
                            )}
                            {!evt && reached && (
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  自动记录
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

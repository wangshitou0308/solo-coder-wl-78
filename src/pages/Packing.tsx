import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { compute3DPacking } from '@/utils/packing';
import type { PackedBox } from '@/types';
import { TRUCK_SPECS, ROOM_COLORS } from '@/types';
import {
  Boxes, AlertTriangle, Package, Layers, RefreshCw,
  ArrowUpDown, Box as BoxIcon, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Info, TrendingUp, Weight, Ruler,
} from 'lucide-react';

export default function PackingPage() {
  const project = useAppStore(s => s.projects.find(p => p.id === s.currentProjectId));
  const boxes = useAppStore(s => s.boxes);
  const rooms = useAppStore(s => s.rooms);
  const updateBox = useAppStore(s => s.updateBox);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [expandedWarnings, setExpandedWarnings] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewAngle, setViewAngle] = useState({ x: -20, y: -30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const packingResult = useMemo(() => {
    if (!project) return null;
    return compute3DPacking(project, boxes, rooms);
  }, [project, boxes, rooms]);

  const truck = project ? TRUCK_SPECS[project.truck_spec] : null;
  const roomColorMap = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r, i) => { m.set(r.id, ROOM_COLORS[i % ROOM_COLORS.length]); });
    return m;
  }, [rooms]);

  useEffect(() => {
    if (!packingResult || !project || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const TL = project.truck_length;
    const TW = project.truck_width;
    const TH = project.truck_height;

    const scaleBase = Math.min(W / (TL + TW), H / (TH + TW)) * 0.7 * zoom;
    const cx = W / 2;
    const cy = H / 2 + 40;

    const rotX = (viewAngle.x * Math.PI) / 180;
    const rotY = (viewAngle.y * Math.PI) / 180;

    const project3D = (x: number, y: number, z: number) => {
      const x1 = x - TL / 2;
      const y1 = y - TW / 2;
      const z1 = z - TH / 2;

      const rx = x1 * Math.cos(rotY) - z1 * Math.sin(rotY);
      const rz = x1 * Math.sin(rotY) + z1 * Math.cos(rotY);
      const ry = y1 * Math.cos(rotX) - rz * Math.sin(rotX);
      const rz2 = y1 * Math.sin(rotX) + rz * Math.cos(rotX);

      return {
        x: cx + rx * scaleBase,
        y: cy - ry * scaleBase + TH * scaleBase * 0.3,
        z: rz2,
      };
    };

    const drawTruckOutline = () => {
      const corners = [
        [0, 0, 0], [TL, 0, 0], [TL, TW, 0], [0, TW, 0],
        [0, 0, TH], [TL, 0, TH], [TL, TW, TH], [0, TW, TH],
      ].map(([x, y, z]) => project3D(x, y, z));

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      ctx.strokeStyle = 'rgba(15, 118, 110, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(corners[a].x, corners[a].y);
        ctx.lineTo(corners[b].x, corners[b].y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      const floor = [corners[0], corners[1], corners[2], corners[3]];
      ctx.fillStyle = 'rgba(15, 118, 110, 0.04)';
      ctx.beginPath();
      ctx.moveTo(floor[0].x, floor[0].y);
      floor.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
    };

    const drawBox = (box: PackedBox, isSelected: boolean) => {
      const color = roomColorMap.get(box.room_id) || '#64748b';
      const [l, w, h] = (() => {
        const d = [box.length_cm, box.width_cm, box.height_cm];
        if (box.rotation === 0) return [d[0], d[1], d[2]];
        if (box.rotation === 1) return [d[1], d[0], d[2]];
        return [d[0], d[2], d[1]];
      })();

      const v = [
        project3D(box.pos_x, box.pos_y, box.pos_z),
        project3D(box.pos_x + l, box.pos_y, box.pos_z),
        project3D(box.pos_x + l, box.pos_y + w, box.pos_z),
        project3D(box.pos_x, box.pos_y + w, box.pos_z),
        project3D(box.pos_x, box.pos_y, box.pos_z + h),
        project3D(box.pos_x + l, box.pos_y, box.pos_z + h),
        project3D(box.pos_x + l, box.pos_y + w, box.pos_z + h),
        project3D(box.pos_x, box.pos_y + w, box.pos_z + h),
      ];

      const faces = [
        { pts: [0, 1, 5, 4], shade: 0.70, norm: [0, -1, 0] },
        { pts: [3, 2, 6, 7], shade: 0.75, norm: [0, 1, 0] },
        { pts: [1, 2, 6, 5], shade: 0.85, norm: [1, 0, 0] },
        { pts: [0, 3, 7, 4], shade: 0.80, norm: [-1, 0, 0] },
        { pts: [4, 5, 6, 7], shade: 1.00, norm: [0, 0, 1] },
        { pts: [0, 1, 2, 3], shade: 0.60, norm: [0, 0, -1] },
      ];

      const sortedFaces = [...faces].sort((a, b) => {
        const avgZA = a.pts.reduce((s, i) => s + v[i].z, 0);
        const avgZB = b.pts.reduce((s, i) => s + v[i].z, 0);
        return avgZA - avgZB;
      });

      sortedFaces.forEach(face => {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const alpha = isSelected ? 0.92 : 0.78;

        ctx.fillStyle = `rgba(${Math.round(r * face.shade)}, ${Math.round(g * face.shade)}, ${Math.round(b * face.shade)}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(v[face.pts[0]].x, v[face.pts[0]].y);
        face.pts.forEach(i => ctx.lineTo(v[face.pts[i]].x, v[face.pts[i]].y));
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#0F766E' : `rgba(255,255,255,0.5)`;
        ctx.lineWidth = isSelected ? 2.5 : 0.8;
        ctx.stroke();
      });

      if (box.is_fragile) {
        const center = project3D(box.pos_x + l / 2, box.pos_y + w / 2, box.pos_z + h);
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#DC2626';
        ctx.fillText('⚠️', center.x, center.y + 4);
      }
    };

    drawTruckOutline();

    const sortedForDraw = [...packingResult.packedBoxes].sort((a, b) => {
      const ca = project3D(a.pos_x + a.length_cm / 2, a.pos_y + a.width_cm / 2, a.pos_z + a.height_cm / 2);
      const cb = project3D(b.pos_x + b.length_cm / 2, b.pos_y + b.width_cm / 2, b.pos_z + b.height_cm / 2);
      return ca.z - cb.z;
    });

    sortedForDraw.forEach(box => drawBox(box, box.id === selectedBox));

    const originLabel = project3D(0, 0, 0);
    ctx.font = '11px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(`${TL}cm`, originLabel.x - 5, originLabel.y + 18);
    ctx.fillText(`${TW}cm`, originLabel.x + 20, originLabel.y - 5);
  }, [packingResult, project, selectedBox, viewAngle, zoom, roomColorMap]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setViewAngle(prev => ({
      x: Math.max(-60, Math.min(10, prev.x + dy * 0.3)),
      y: prev.y + dx * 0.3,
    }));
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleApplyPlan = async () => {
    if (!packingResult) return;
    for (const box of packingResult.packedBoxes) {
      await updateBox(box.id, {
        pos_x: box.pos_x,
        pos_y: box.pos_y,
        pos_z: box.pos_z,
        load_order: box.load_order,
        status: 3,
      });
    }
  };

  if (!project || !packingResult || !truck) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">加载装箱数据...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Boxes className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-display font-bold text-slate-900">3D智能装箱规划</h2>
          </div>
          <p className="text-sm text-slate-500">基于HPBL算法的三维最优装箱 · 自动考虑承重平衡与易碎品保护</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost !py-2"
            onClick={() => setViewAngle({ x: -20, y: -30 })}
          >
            <RefreshCw className="w-4 h-4" />
            重置视角
          </button>
          <button
            className="btn-primary"
            onClick={handleApplyPlan}
          >
            <CheckCircle2 className="w-4 h-4" />
            应用装载方案
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Ruler className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <span className={`text-xs font-bold ${packingResult.spaceUtilization >= 70 ? 'text-success' : packingResult.spaceUtilization >= 50 ? 'text-warning' : 'text-danger'}`}>
              {packingResult.spaceUtilization}%
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900">空间利用</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                packingResult.spaceUtilization >= 70 ? 'bg-success' : packingResult.spaceUtilization >= 50 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${packingResult.spaceUtilization}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
              <Weight className="w-4.5 h-4.5 text-accent-600" />
            </div>
            <span className={`text-xs font-bold ${packingResult.weightUtilization >= 70 ? 'text-success' : packingResult.weightUtilization >= 50 ? 'text-warning' : 'text-danger'}`}>
              {packingResult.weightUtilization}%
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900">载重利用</div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                packingResult.weightUtilization >= 70 ? 'bg-success' : packingResult.weightUtilization >= 50 ? 'bg-warning' : 'bg-danger'
              }`}
              style={{ width: `${packingResult.weightUtilization}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{packingResult.packedBoxes.length}</div>
          <div className="text-sm text-slate-500">成功装载纸箱</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <XCircle className="w-4.5 h-4.5 text-rose-600" />
            </div>
            {packingResult.unpackedBoxes.length > 0 && (
              <span className="badge bg-rose-100 text-rose-700 border-rose-200 text-[10px]">异常</span>
            )}
          </div>
          <div className={`text-2xl font-bold ${packingResult.unpackedBoxes.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {packingResult.unpackedBoxes.length}
          </div>
          <div className="text-sm text-slate-500">未装入纸箱</div>
        </div>
      </div>

      {packingResult.warnings.length > 0 && (
        <div className={`card !p-0 !bg-amber-50 border-amber-200 overflow-hidden ${
          expandedWarnings ? '' : ''
        }`}>
          <button
            className="w-full flex items-center gap-3 p-4 text-left"
            onClick={() => setExpandedWarnings(!expandedWarnings)}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-amber-900">
                装载提醒 ({packingResult.warnings.length})
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                {expandedWarnings ? '点击收起' : '点击展开查看详情'}
              </div>
            </div>
            {expandedWarnings ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
          </button>
          {expandedWarnings && (
            <div className="border-t border-amber-200/60 px-4 pb-4">
              <ul className="space-y-2 mt-3">
                {packingResult.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card !p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-primary-600" />
              <span className="font-semibold text-slate-800">3D装载可视化</span>
              <span className="text-xs text-slate-400">（拖拽旋转 · 滚轮缩放）</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>缩放</span>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="w-24 accent-primary-600"
                />
                <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>
          <div
            className="relative cursor-grab active:cursor-grabbing select-none bg-gradient-to-br from-slate-50 to-primary-50/30"
            style={{ height: 480 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.5, Math.min(2, z - e.deltaY * 0.001))); }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ touchAction: 'none' }}
            />
            <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/60">
              <div className="text-[11px] font-semibold text-slate-700 mb-2">{truck.image} {truck.name}</div>
              <div className="space-y-1 text-[10px] text-slate-500">
                <div>📐 {truck.length}×{truck.width}×{truck.height} cm</div>
                <div>📦 {truck.volume} m³ · ⚖️ {truck.maxWeight} kg</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <ArrowUpDown className="w-4.5 h-4.5 text-primary-600" />
              <span className="font-semibold text-slate-800">装载顺序（按优先级）</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto divide-y divide-slate-50">
              {packingResult.loadSequence.map((boxId, idx) => {
                const box = packingResult.packedBoxes.find(b => b.id === boxId);
                if (!box) return null;
                const room = rooms.find(r => r.id === box.room_id);
                const color = roomColorMap.get(box.room_id) || '#64748b';
                return (
                  <button
                    key={boxId}
                    className={`w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors ${
                      selectedBox === boxId ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => setSelectedBox(boxId === selectedBox ? null : boxId)}
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <BoxIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-sm text-slate-800 truncate">{box.box_code}</span>
                        {box.is_fragile && <span className="text-xs">💎</span>}
                        {box.is_overweight && <span className="text-xs">⚖️</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {room?.name} · {box.items_count}件 · {box.weight_kg}kg
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">位置</div>
                      <div className="text-xs font-mono text-slate-600">
                        {Math.round(box.pos_x)},{Math.round(box.pos_y)},{Math.round(box.pos_z)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-rose-600" />
              <span className="font-semibold text-slate-800">未装载清单</span>
            </div>
            {packingResult.unpackedBoxes.length === 0 ? (
              <div className="p-8 text-center">
                <TrendingUp className="w-10 h-10 text-success mx-auto mb-2" />
                <div className="text-sm text-slate-600 font-medium">全部纸箱已成功装载！</div>
                <div className="text-xs text-slate-400 mt-1">空间与载重利用率良好</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {packingResult.unpackedBoxes.map(box => {
                  const room = rooms.find(r => r.id === box.room_id);
                  return (
                    <div key={box.id} className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-slate-800 truncate">{box.box_code}</div>
                        <div className="text-xs text-slate-500">
                          {room?.name} · {box.weight_kg}kg · {((box.length_cm * box.width_cm * box.height_cm) / 1e6).toFixed(2)}m³
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

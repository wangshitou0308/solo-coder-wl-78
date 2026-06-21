import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  ScanLine, Camera, Upload, Sparkles, Check, Wand2,
  Package, ChevronRight, AlertCircle, RefreshCw, Search,
  FileText, ExternalLink,
} from 'lucide-react';
import { runAIDetection } from '@/utils/ai';
import { Html5Qrcode } from 'html5-qrcode';
import type { AIPrediction } from '@/types';
import { ITEM_CATEGORIES } from '@/types';

export default function ScanPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const boxes = useAppStore(s => s.boxes);
  const rooms = useAppStore(s => s.rooms);
  const findBoxByCode = useAppStore(s => s.findBoxByCode);
  const addItem = useAppStore(s => s.addItem);
  const addBox = useAppStore(s => s.addBox);

  const [tab, setTab] = useState<'scan' | 'photo'>('photo');
  const [manualCode, setManualCode] = useState('');
  const [currentBox, setCurrentBox] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [selectedPred, setSelectedPred] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [itemWeight, setItemWeight] = useState(1);
  const [isFragile, setIsFragile] = useState(false);
  const [itemName, setItemName] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [qrScannerActive, setQrScannerActive] = useState(false);
  const [scannedBoxId, setScannedBoxId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const QR_SCANNER_ID = 'html5qr-scanner';

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (html5QrRef.current) {
        try {
          if (html5QrRef.current.isScanning) {
            html5QrRef.current.stop().catch(() => {});
          }
        } catch (e) {
          console.warn('清理扫码器失败', e);
        }
      }
    };
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const searchBox = (code: string) => {
    const box = findBoxByCode(code);
    if (box) {
      setCurrentBox(box.id);
      setSelectedRoom(box.room_id);
      setScannedBoxId(box.id);
      showToast(`已找到纸箱 ${box.box_code}`, true);
    } else {
      showToast('未找到该纸箱，请先创建', false);
    }
  };

  const parseQrData = (data: string): string | null => {
    try {
      if (data.startsWith('movplan://box/')) {
        return data.replace('movplan://box/', '').toUpperCase();
      }
      if (data.startsWith('http') && data.includes('/box/')) {
        const parts = data.split('/box/');
        return parts[parts.length - 1].split('?')[0].toUpperCase();
      }
      return data.trim().toUpperCase();
    } catch {
      return data.trim().toUpperCase();
    }
  };

  const startQrScanner = async () => {
    try {
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode(QR_SCANNER_ID);
      }
      setQrScannerActive(true);
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const code = parseQrData(decodedText);
          if (code) {
            stopQrScanner();
            searchBox(code);
          }
        },
        () => {},
      );
    } catch (e) {
      console.warn('HTML5 QR 扫描启动失败，回退到手动输入', e);
      setQrScannerActive(false);
      showToast('摄像头扫码不可用，请手动输入箱号', false);
    }
  };

  const stopQrScanner = async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) {
          await html5QrRef.current.stop();
        }
      } catch (e) {
        console.warn('停止扫码失败', e);
      }
    }
    setQrScannerActive(false);
  };

  const openScannedBoxDetail = () => {
    if (!scannedBoxId) return;
    navigate(`/project/${id}/boxes`);
  };

  const startCamera = async () => {
    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.warn('摄像头启动失败', e);
      showToast('无法访问摄像头，请使用拍照上传', false);
      setScannerActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const url = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setPreviewUrl(url);
    stopCamera();
    runAI(url);
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPreviewUrl(url);
      runAI(url);
    };
    reader.readAsDataURL(file);
  };

  const runAI = async (imgUrl: string) => {
    setAiLoading(true);
    setPredictions([]);
    setSelectedPred(0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const preds = await runAIDetection(img);
        setPredictions(preds);
        if (preds.length > 0) {
          setItemName(preds[0].chineseName);
          setItemWeight(Math.round(preds[0].avgWeight * 10) / 10);
          const catMeta = ITEM_CATEGORIES.find(c => c.id === preds[0].suggestedCategory);
          setIsFragile(catMeta?.fragile || preds[0].suggestedCategory === 'kitchen');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAiLoading(false);
      }
    };
    img.src = imgUrl;
  };

  const confirmAdd = async () => {
    let boxId = currentBox;
    if (!boxId) {
      if (!selectedRoom && rooms[0]) {
        setSelectedRoom(rooms[0].id);
      }
      const roomId = selectedRoom || rooms[0]?.id;
      if (!roomId) {
        showToast('请先选择房间或扫码识别纸箱', false);
        return;
      }
      const newBox = await addBox(id, roomId, {
        is_fragile: isFragile,
        weight_kg: itemWeight,
      });
      boxId = newBox.id;
      setCurrentBox(boxId);
    }

    const pred = predictions[selectedPred];
    await addItem(boxId, {
      name: itemName || pred?.chineseName || '新物品',
      category: pred?.suggestedCategory || 'daily',
      weight_kg: itemWeight,
      is_fragile: isFragile,
      is_valuable: pred?.suggestedCategory === 'electronics',
      estimated_value: pred?.suggestedCategory === 'electronics' ? 3000 : 200,
      ai_confidence: pred?.probability,
      ai_category: pred?.className,
      photo_url: previewUrl || undefined,
    });

    showToast('物品已添加到纸箱', true);
    setPredictions([]);
    setPreviewUrl('');
    setItemName('');
    setItemWeight(1);
    setIsFragile(false);
  };

  const currentBoxData = boxes.find(b => b.id === currentBox);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-600" />
              拍照识别物品
            </h2>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              {[
                { k: 'photo', l: '拍照/上传', i: Camera },
                { k: 'scan', l: '扫码纸箱', i: ScanLine },
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => {
                    setTab(t.k as 'photo' | 'scan');
                    if (t.k !== 'scan') {
                      stopCamera();
                      stopQrScanner();
                    }
                  }}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                    tab === t.k
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <t.i className="w-4 h-4" /> {t.l}
                </button>
              ))}
            </div>
          </div>

          {tab === 'scan' ? (
            <div className="space-y-5">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900">
                {qrScannerActive ? (
                  <div
                    id={QR_SCANNER_ID}
                    className="absolute inset-0 w-full h-full [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mb-5 animate-float">
                      <ScanLine className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-2">对准纸箱二维码</h3>
                    <p className="text-slate-400 text-sm mb-6">保持光线充足，二维码清晰可见</p>
                    <button onClick={startQrScanner} className="btn-primary">
                      <Camera className="w-4 h-4" /> 启动扫码摄像头
                    </button>
                  </div>
                )}
                {qrScannerActive && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <button onClick={stopQrScanner} className="btn-secondary">
                      停止扫码
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {scannedBoxId && (() => {
                const box = boxes.find(b => b.id === scannedBoxId);
                const room = rooms.find(r => r.id === box?.room_id);
                if (!box) return null;
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-primary-50 border-2 border-emerald-200 animate-slide-up">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Check className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-emerald-700 mb-0.5">✓ 扫码成功</div>
                          <div className="font-display font-bold text-xl text-slate-900">{box.box_code}</div>
                          <div className="text-sm text-slate-600">
                            {room?.name || '未分配'} · {box.items_count} 件物品 · {box.weight_kg} kg
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={openScannedBoxDetail}
                          className="btn-primary !py-2 !text-xs flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> 查看详情
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { setCurrentBox(box.id); setSelectedRoom(box.room_id); setTab('photo'); }}
                          className="btn-secondary !py-2 !text-xs flex items-center gap-1"
                        >
                          <Wand2 className="w-3.5 h-3.5" /> 添加物品到此箱
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1">
                  <Search className="w-4 h-4" /> 或手动输入箱号
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="例如：ABCD-001"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && manualCode && searchBox(manualCode)}
                  />
                  <button
                    onClick={() => manualCode && searchBox(manualCode)}
                    disabled={!manualCode}
                    className="btn-primary"
                  >
                    查找
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {!previewUrl ? (
                <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-primary-50/30 to-violet-50/30 flex flex-col items-center justify-center text-center p-8 overflow-hidden group">
                  <div className="absolute inset-0 bg-grid opacity-40" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center mb-5 animate-float shadow-xl shadow-primary-200/50">
                      <Wand2 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-500" />
                      AI 物品智能识别
                    </h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                      上传或拍摄物品照片，TensorFlow.js 将自动识别类别并预填信息
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={startCamera} className="btn-primary">
                        <Camera className="w-4 h-4" /> 拍摄照片
                      </button>
                      <button onClick={() => fileRef.current?.click()} className="btn-secondary">
                        <Upload className="w-4 h-4" /> 上传图片
                      </button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileUpload}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100">
                    <img src={previewUrl} className="w-full h-full object-contain bg-slate-900" alt="preview" />
                    {aiLoading && (
                      <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="w-12 h-12 rounded-full border-3 border-primary-400 border-t-transparent animate-spin mb-4" />
                        <p className="text-white font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                          AI 识别中...
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPreviewUrl(''); setPredictions([]); }}
                      className="btn-ghost flex-1"
                    >
                      <RefreshCw className="w-4 h-4" /> 重新拍摄
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="btn-secondary flex-1">
                      <Upload className="w-4 h-4" /> 更换图片
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onFileUpload}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-600" /> 物品信息
            </h3>

            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-primary-50 to-emerald-50 border border-primary-100">
              <div className="text-xs font-semibold text-primary-800 mb-1.5">所属纸箱</div>
              {currentBoxData ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display font-bold text-xl text-primary-900">{currentBoxData.box_code}</div>
                    <div className="text-xs text-primary-600">
                      {rooms.find(r => r.id === currentBoxData.room_id)?.name || '未分配'}
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentBox(null)}
                    className="text-xs text-rose-500 hover:text-rose-600"
                  >
                    更换
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-slate-500 mb-2">
                    未指定纸箱，添加时将根据房间自动创建
                  </div>
                  <select
                    className="input !py-2 !text-sm"
                    value={selectedRoom}
                    onChange={e => setSelectedRoom(e.target.value)}
                  >
                    <option value="">选择房间...</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">物品名称</label>
                <input
                  className="input !py-2 !text-sm"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="输入物品名"
                />
              </div>

              {predictions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-ai" /> AI 识别结果（点击选择）
                  </div>
                  <div className="space-y-1.5">
                    {predictions.map((p, i) => {
                      const selected = selectedPred === i;
                      const confidence = Math.round(p.probability * 100);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedPred(i);
                            setItemName(p.chineseName);
                            setItemWeight(Math.round(p.avgWeight * 10) / 10);
                            const meta = ITEM_CATEGORIES.find(c => c.id === p.suggestedCategory);
                            setIsFragile(meta?.fragile || false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left transition-all border-2 ${
                            selected
                              ? 'border-violet-400 bg-violet-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-semibold ${selected ? 'text-violet-800' : 'text-slate-700'}`}>
                              {selected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                              {p.chineseName}
                            </span>
                            <span className={`text-xs font-bold ${
                              confidence > 80 ? 'text-success' : confidence > 50 ? 'text-accent-600' : 'text-rose-500'
                            }`}>
                              {confidence}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary-500 transition-all"
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">重量(kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input !py-2 !text-sm"
                    value={itemWeight}
                    onChange={e => setItemWeight(Number(e.target.value))}
                  />
                </div>
                <label className="flex items-center gap-2 p-2 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50/50 transition mt-5">
                  <input
                    type="checkbox"
                    checked={isFragile}
                    onChange={e => setIsFragile(e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded"
                  />
                  <span className="text-xs font-medium text-slate-700">易碎品</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={confirmAdd}
            disabled={aiLoading || (!itemName.trim() && predictions.length === 0)}
            className="btn-ai w-full !py-3"
          >
            <Sparkles className="w-4 h-4" />
            AI 预填并添加到纸箱 <ChevronRight className="w-4 h-4" />
          </button>

          {toast && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm animate-slide-up ${
                toast.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {toast.ok
                ? <Check className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />
              }
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-ai" /> 支持识别的物品种类
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {ITEM_CATEGORIES.map(c => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-slate-50 hover:bg-primary-50 transition text-center"
            >
              <div className="text-xs font-medium text-slate-700">{c.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

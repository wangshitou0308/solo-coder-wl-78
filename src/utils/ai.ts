import type { AIPrediction } from '@/types';
import { ITEM_CATEGORIES } from '@/types';

const MOBILENET_TO_CATEGORY: Record<string, { cn: string; cat: string; w: number }> = {
  'coffee mug': { cn: '咖啡杯', cat: 'kitchen', w: 0.5 },
  cup: { cn: '杯子', cat: 'kitchen', w: 0.4 },
  'water bottle': { cn: '水壶', cat: 'kitchen', w: 0.6 },
  'wine glass': { cn: '酒杯', cat: 'kitchen', w: 0.3 },
  'vase': { cn: '花瓶', cat: 'decor', w: 1.5 },
  'potted plant': { cn: '盆栽', cat: 'decor', w: 2 },
  'book': { cn: '书籍', cat: 'books', w: 0.8 },
  'library': { cn: '书架书籍', cat: 'books', w: 5 },
  'laptop': { cn: '笔记本电脑', cat: 'electronics', w: 2 },
  'notebook': { cn: '笔记本', cat: 'documents', w: 0.5 },
  'computer keyboard': { cn: '键盘', cat: 'electronics', w: 0.8 },
  mouse: { cn: '鼠标', cat: 'electronics', w: 0.2 },
  monitor: { cn: '显示器', cat: 'electronics', w: 5 },
  'desktop computer': { cn: '台式电脑', cat: 'electronics', w: 12 },
  television: { cn: '电视机', cat: 'appliance', w: 15 },
  'mobile phone': { cn: '手机', cat: 'electronics', w: 0.3 },
  smartphone: { cn: '智能手机', cat: 'electronics', w: 0.3 },
  cellular_telephone: { cn: '手机', cat: 'electronics', w: 0.3 },
  iPod: { cn: '播放器', cat: 'electronics', w: 0.2 },
  sofa: { cn: '沙发', cat: 'furniture', w: 60 },
  couch: { cn: '沙发', cat: 'furniture', w: 60 },
  bed: { cn: '床架床垫', cat: 'furniture', w: 80 },
  chair: { cn: '椅子', cat: 'furniture', w: 8 },
  table: { cn: '桌子', cat: 'furniture', w: 25 },
  desk: { cn: '书桌', cat: 'furniture', w: 30 },
  dresser: { cn: '梳妆台', cat: 'furniture', w: 35 },
  wardrobe: { cn: '衣柜', cat: 'furniture', w: 50 },
  closet: { cn: '衣橱', cat: 'furniture', w: 40 },
  'dining table': { cn: '餐桌', cat: 'furniture', w: 40 },
  bookshelf: { cn: '书架', cat: 'furniture', w: 25 },
  chest: { cn: '储物柜', cat: 'furniture', w: 20 },
  refrigerator: { cn: '冰箱', cat: 'appliance', w: 60 },
  'washing machine': { cn: '洗衣机', cat: 'appliance', w: 50 },
  microwave: { cn: '微波炉', cat: 'appliance', w: 15 },
  oven: { cn: '烤箱', cat: 'appliance', w: 30 },
  toaster: { cn: '烤面包机', cat: 'appliance', w: 3 },
  'hair dryer': { cn: '吹风机', cat: 'daily', w: 0.5 },
  clock: { cn: '时钟', cat: 'decor', w: 1 },
  'wall clock': { cn: '挂钟', cat: 'decor', w: 1 },
  pillow: { cn: '枕头', cat: 'clothing', w: 0.8 },
  quilt: { cn: '被子', cat: 'clothing', w: 3 },
  blanket: { cn: '毛毯', cat: 'clothing', w: 2 },
  'sleeping bag': { cn: '睡袋', cat: 'clothing', w: 2 },
  jersey: { cn: '运动衫', cat: 'clothing', w: 0.4 },
  'cardigan': { cn: '羊毛衫', cat: 'clothing', w: 0.5 },
  'fur coat': { cn: '皮衣', cat: 'clothing', w: 2 },
  labcoat: { cn: '外套', cat: 'clothing', w: 1 },
  suitcase: { cn: '行李箱', cat: 'daily', w: 4 },
  backpack: { cn: '背包', cat: 'daily', w: 1 },
  purse: { cn: '手提包', cat: 'daily', w: 0.8 },
  bucket: { cn: '水桶', cat: 'daily', w: 1 },
  pitcher: { cn: '水壶', cat: 'kitchen', w: 1 },
  plate: { cn: '盘子', cat: 'kitchen', w: 0.8 },
  tray: { cn: '托盘', cat: 'kitchen', w: 0.5 },
  'mixing bowl': { cn: '搅拌碗', cat: 'kitchen', w: 1.5 },
  'frying pan': { cn: '煎锅', cat: 'kitchen', w: 2 },
  wok: { cn: '炒锅', cat: 'kitchen', w: 2.5 },
  'Crock Pot': { cn: '慢炖锅', cat: 'kitchen', w: 5 },
  teapot: { cn: '茶壶', cat: 'kitchen', w: 0.8 },
  'toy': { cn: '玩具', cat: 'toys', w: 1 },
  'stuffed animal': { cn: '毛绒玩具', cat: 'toys', w: 0.5 },
  'ball': { cn: '球类', cat: 'toys', w: 0.6 },
  'soccer ball': { cn: '足球', cat: 'toys', w: 0.5 },
  'basketball': { cn: '篮球', cat: 'toys', w: 0.7 },
  'tennis ball': { cn: '网球', cat: 'toys', w: 0.1 },
  'bicycle': { cn: '自行车', cat: 'toys', w: 15 },
  'joystick': { cn: '游戏手柄', cat: 'toys', w: 0.3 },
  'paper towel': { cn: '纸巾', cat: 'daily', w: 0.5 },
  toilet: { cn: '马桶', cat: 'daily', w: 0.2 },
  soap: { cn: '肥皂', cat: 'daily', w: 0.1 },
  sunscreen: { cn: '防晒霜', cat: 'daily', w: 0.2 },
  lotion: { cn: '乳液', cat: 'daily', w: 0.3 },
  perfume: { cn: '香水', cat: 'daily', w: 0.2 },
  hairbrush: { cn: '梳子', cat: 'daily', w: 0.1 },
  toothbrush: { cn: '牙刷', cat: 'daily', w: 0.05 },
  candle: { cn: '蜡烛', cat: 'decor', w: 0.3 },
  envelope: { cn: '信封', cat: 'documents', w: 0.05 },
  file: { cn: '文件夹', cat: 'documents', w: 0.5 },
  binder: { cn: '活页夹', cat: 'documents', w: 0.6 },
  'rubber eraser': { cn: '橡皮', cat: 'documents', w: 0.05 },
  pencil: { cn: '铅笔', cat: 'documents', w: 0.02 },
  ballpoint: { cn: '圆珠笔', cat: 'documents', w: 0.02 },
  paintbrush: { cn: '画笔', cat: 'decor', w: 0.05 },
  screwdriver: { cn: '螺丝刀', cat: 'daily', w: 0.3 },
  hammer: { cn: '锤子', cat: 'daily', w: 0.8 },
  flashlight: { cn: '手电筒', cat: 'daily', w: 0.4 },
  candle_holder: { cn: '烛台', cat: 'decor', w: 0.6 },
  drum: { cn: '鼓', cat: 'toys', w: 4 },
  guitar: { cn: '吉他', cat: 'toys', w: 3 },
  violin: { cn: '小提琴', cat: 'toys', w: 1 },
  piano: { cn: '钢琴', cat: 'furniture', w: 200 },
  projector: { cn: '投影仪', cat: 'electronics', w: 4 },
  speaker: { cn: '音箱', cat: 'electronics', w: 3 },
  radio: { cn: '收音机', cat: 'electronics', w: 2 },
  camera: { cn: '相机', cat: 'electronics', w: 1.5 },
  binoculars: { cn: '望远镜', cat: 'electronics', w: 1 },
  printer: { cn: '打印机', cat: 'electronics', w: 8 },
  modem: { cn: '路由器', cat: 'electronics', w: 0.5 },
  switch: { cn: '交换机', cat: 'electronics', w: 1 },
};

export function mapPredictionToChinese(className: string): AIPrediction {
  const lower = className.toLowerCase().trim();
  const mapping = MOBILENET_TO_CATEGORY[lower];
  if (mapping) {
    return {
      className,
      probability: 0,
      chineseName: mapping.cn,
      suggestedCategory: mapping.cat,
      avgWeight: mapping.w,
    };
  }
  const category = ITEM_CATEGORIES[Math.floor(Math.random() * ITEM_CATEGORIES.length)];
  return {
    className,
    probability: 0,
    chineseName: className.replace(/_/g, ' '),
    suggestedCategory: category.id,
    avgWeight: category.avgWeight,
  };
}

export async function runAIDetection(
  imageElement: HTMLImageElement | HTMLCanvasElement,
): Promise<AIPrediction[]> {
  try {
    const tf = await import('@tensorflow/tfjs');
    const mobilenet = await import('@tensorflow-models/mobilenet');

    await tf.ready();
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    const predictions = await model.classify(imageElement, 5);

    return predictions.map(p => {
      const mapped = mapPredictionToChinese(p.className);
      return { ...mapped, probability: p.probability };
    });
  } catch (e) {
    console.warn('AI识别加载失败，使用模拟数据:', e);
    const categories = ITEM_CATEGORIES;
    const count = 3 + Math.floor(Math.random() * 3);
    const result: AIPrediction[] = [];
    let remaining = 1;
    for (let i = 0; i < count; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const prob = i === count - 1 ? remaining : remaining * (0.3 + Math.random() * 0.4);
      remaining -= prob;
      result.push({
        className: cat.id,
        probability: prob,
        chineseName: cat.name,
        suggestedCategory: cat.id,
        avgWeight: cat.avgWeight * (0.6 + Math.random() * 0.8),
      });
    }
    return result.sort((a, b) => b.probability - a.probability);
  }
}

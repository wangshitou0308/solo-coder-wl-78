import type { Box, CostEstimate, CostItem, InsurancePlan, Item, Project } from '@/types';
import { TRUCK_SPECS } from '@/types';
import { generateId } from '@/db';

export function computeCostEstimate(
  project: Project,
  boxes: Box[],
  items: Item[],
  routeTimeMin: number,
  workersRecommended: number,
): CostEstimate {
  const items_cost: CostItem[] = [];
  const truck = TRUCK_SPECS[project.truck_spec];
  const distance = project.distance_km ?? 10;

  const kmRate = truck.volume < 6 ? 3 : truck.volume < 15 ? 5 : truck.volume < 25 ? 7 : 10;
  const distanceCost = Math.max(0, distance - 10) * kmRate;
  const truckTotal = truck.basePrice + distanceCost;

  items_cost.push({
    id: generateId('ci_'),
    name: `${truck.name}运输费`,
    amount: truckTotal,
    unit: '次',
    quantity: 1,
    description: `含基础里程10km，超出${Math.max(0, distance - 10).toFixed(1)}km按¥${kmRate}/km计费`,
  });

  const hours = Math.max(2, Math.ceil(routeTimeMin / 60));
  const workerRate = truck.volume < 6 ? 80 : truck.volume < 15 ? 120 : truck.volume < 25 ? 150 : 180;
  const laborTotal = workersRecommended * workerRate * hours;

  items_cost.push({
    id: generateId('ci_'),
    name: '人工搬运费',
    amount: laborTotal,
    unit: '人×小时',
    quantity: workersRecommended * hours,
    description: `${workersRecommended}名搬运工 × ${workerRate}元/小时 × 约${hours}小时（含装卸）`,
  });

  const floorDiff = Math.max(0, (project.from_has_elevator ? 0 : project.from_floor - 1) +
    (project.to_has_elevator ? 0 : project.to_floor - 1));
  const floorCost = floorDiff * workersRecommended * 30;
  if (floorCost > 0) {
    items_cost.push({
      id: generateId('ci_'),
      name: '楼层爬楼费',
      amount: floorCost,
      unit: '层',
      quantity: floorDiff,
      description: `无电梯楼层${floorDiff}层，每人每层¥30`,
    });
  }

  const largeAppliances = items.filter(i => i.category === 'appliance' || i.category === 'furniture').length;
  const specialCost = largeAppliances * 50;
  if (specialCost > 0) {
    items_cost.push({
      id: generateId('ci_'),
      name: '大件拆装/搬运费',
      amount: specialCost,
      unit: '件',
      quantity: largeAppliances,
      description: `家具家电等大件${largeAppliances}件，含基础拆装搬运`,
    });
  }

  const materialBoxes = Math.ceil(boxes.length * 0.6);
  const bubbleMeters = Math.ceil(boxes.filter(b => b.is_fragile).length * 3);
  const tapeRolls = Math.ceil(boxes.length / 15);
  const materialCost = materialBoxes * 8 + bubbleMeters * 2 + tapeRolls * 10;
  if (materialCost > 0) {
    items_cost.push({
      id: generateId('ci_'),
      name: '包装材料费',
      amount: materialCost,
      description: `纸箱×${materialBoxes}、气泡膜×${bubbleMeters}m、胶带×${tapeRolls}卷等耗材`,
    });
  }

  const subtotal = items_cost.reduce((s, i) => s + i.amount, 0);
  const totalValue = items.reduce((s, i) => s + i.estimated_value, 0);

  const insurancePlans: InsurancePlan[] = [
    {
      id: generateId('ins_'),
      name: '基础保障',
      coverage: Math.max(5000, Math.round(totalValue * 0.3)),
      premium: 0,
      rate: 0,
      features: ['基础损坏赔付', '丢失最高¥5000', '标准流程理赔'],
      recommended: totalValue < 10000,
    },
    {
      id: generateId('ins_'),
      name: '安心保障',
      coverage: Math.round(totalValue * 0.8),
      premium: Math.max(80, Math.round(totalValue * 0.005)),
      rate: 0.005,
      features: ['含易碎品理赔', '赔付上限80%物品价值', '48小时快速理赔', '专人对接'],
      recommended: totalValue >= 10000 && totalValue < 100000,
    },
    {
      id: generateId('ins_'),
      name: '尊享全保',
      coverage: Math.round(totalValue * 1.2),
      premium: Math.max(280, Math.round(totalValue * 0.01)),
      rate: 0.01,
      features: ['全额覆盖含贵重品', '损坏修复或换新', '24小时极速理赔', '全程保价运输', 'VIP专属客服'],
      recommended: totalValue >= 100000,
    },
  ];

  const savingsTips: string[] = [];
  if (boxes.length < 20 && truck.volume >= 20) {
    savingsTips.push('当前货物量较少，可考虑降低车型节省运费约¥' + (truck.basePrice - TRUCK_SPECS.medium.basePrice));
  }
  if (distance < 5) {
    savingsTips.push('同城短距离搬运，建议选择按时计费更划算');
  }
  if (!project.from_has_elevator || !project.to_has_elevator) {
    savingsTips.push('可预约电梯使用时段，避免高峰期爬楼费增加');
  }
  if (items.some(i => i.category === 'clothing') && boxes.filter(b => b.status < 2).length > 5) {
    savingsTips.push('衣物被褥可使用旧床单包裹，减少纸箱采购费用');
  }
  if (savingsTips.length === 0) {
    savingsTips.push('提前3天预约可享早鸟优惠，推荐好友可享双方返利');
  }

  return {
    subtotal,
    items: items_cost,
    insurancePlans,
    totalValue: Math.round(totalValue),
    grandTotal: subtotal,
    savingsTips,
  };
}

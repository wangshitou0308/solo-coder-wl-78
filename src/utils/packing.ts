import type { Box, PackedBox, PackingResult, Project, Room } from '@/types';

interface ExtentPoint {
  x: number;
  y: number;
  z: number;
}

function getBoxDimensions(box: Box, rotation: 0 | 1 | 2): [number, number, number] {
  const d = [box.length_cm, box.width_cm, box.height_cm];
  if (rotation === 0) return [d[0], d[1], d[2]];
  if (rotation === 1) return [d[1], d[0], d[2]];
  return [d[0], d[2], d[1]];
}

function boxVolume(box: Box): number {
  return (box.length_cm * box.width_cm * box.height_cm) / 1e6;
}

function canPlace(
  px: number, py: number, pz: number,
  l: number, w: number, h: number,
  TL: number, TW: number, TH: number,
  placed: PackedBox[],
): boolean {
  if (px + l > TL || py + w > TW || pz + h > TH) return false;

  for (const b of placed) {
    const [bl, bw, bh] = getBoxDimensions(b, b.rotation);
    if (!(px + l <= b.pos_x || b.pos_x + bl <= px ||
          py + w <= b.pos_y || b.pos_y + bw <= py ||
          pz + h <= b.pos_z || b.pos_z + bh <= pz)) {
      return false;
    }
  }
  return true;
}

function hasSupport(
  px: number, py: number, pz: number,
  l: number, w: number,
  placed: PackedBox[],
): boolean {
  if (pz === 0) return true;
  let supportArea = 0;
  const targetArea = l * w;

  for (const b of placed) {
    const [bl, bw, bh] = getBoxDimensions(b, b.rotation);
    if (Math.abs(b.pos_z + bh - pz) > 0.5) continue;
    const overlapX = Math.max(0, Math.min(px + l, b.pos_x + bl) - Math.max(px, b.pos_x));
    const overlapY = Math.max(0, Math.min(py + w, b.pos_y + bw) - Math.max(py, b.pos_y));
    supportArea += overlapX * overlapY;
  }
  return supportArea >= targetArea * 0.7;
}

export function compute3DPacking(
  project: Project,
  boxes: Box[],
  rooms: Room[],
): PackingResult {
  const TL = project.truck_length;
  const TW = project.truck_width;
  const TH = project.truck_height;
  const maxWeight = project.max_weight;

  const roomMap = new Map(rooms.map(r => [r.id, r]));

  const sortPriority = (b: Box) => {
    const room = roomMap.get(b.room_id);
    const vol = boxVolume(b);
    const weightScore = b.weight_kg * 2;
    const fragilePenalty = b.is_fragile ? 1000 : 0;
    const distanceBonus = (room?.distance_weight ?? 1) * 50;
    return -(vol * 100 + weightScore + distanceBonus) + fragilePenalty;
  };

  const sortedBoxes = [...boxes].sort((a, b) => sortPriority(a) - sortPriority(b));

  const placed: PackedBox[] = [];
  const unpacked: Box[] = [];
  let currentWeight = 0;
  const warnings: string[] = [];

  const extents: ExtentPoint[] = [{ x: 0, y: 0, z: 0 }];

  for (const box of sortedBoxes) {
    if (currentWeight + box.weight_kg > maxWeight) {
      unpacked.push(box);
      if (unpacked.length === 1) {
        warnings.push(`货车载重已达上限 ${maxWeight}kg，部分箱子无法装载`);
      }
      continue;
    }

    let placedFlag = false;
    for (let rot = 0; rot < 3 && !placedFlag; rot++) {
      const [l, w, h] = getBoxDimensions(box, rot as 0 | 1 | 2);

      for (let i = extents.length - 1; i >= 0 && !placedFlag; i--) {
        const ext = extents[i];
        if (!canPlace(ext.x, ext.y, ext.z, l, w, h, TL, TW, TH, placed)) continue;
        if (box.is_fragile && ext.z > TH * 0.6) continue;
        if (!hasSupport(ext.x, ext.y, ext.z, l, w, placed)) continue;

        const packed: PackedBox = {
          ...box,
          pos_x: ext.x,
          pos_y: ext.y,
          pos_z: ext.z,
          rotation: rot as 0 | 1 | 2,
        };
        placed.push(packed);
        currentWeight += box.weight_kg;

        extents.splice(i, 1);
        extents.push(
          { x: ext.x + l, y: ext.y, z: ext.z },
          { x: ext.x, y: ext.y + w, z: ext.z },
          { x: ext.x, y: ext.y, z: ext.z + h },
        );
        extents.sort((a, b) =>
          a.z !== b.z ? a.z - b.z : a.y !== b.y ? a.y - b.y : a.x - b.x,
        );
        placedFlag = true;
      }
    }

    if (!placedFlag) {
      unpacked.push(box);
    }
  }

  if (unpacked.length > 0 && warnings.length === 0) {
    warnings.push(`有 ${unpacked.length} 个纸箱无法装入当前货车，建议升级车型或分两次搬运`);
  }

  const totalVolumeUsed = placed.reduce((s, b) => s + boxVolume(b), 0);
  const truckVolume = (TL * TW * TH) / 1e6;
  const spaceUtil = truckVolume > 0 ? Math.min(100, Math.round((totalVolumeUsed / truckVolume) * 100)) : 0;
  const weightUtil = maxWeight > 0 ? Math.min(100, Math.round((currentWeight / maxWeight) * 100)) : 0;

  if (spaceUtil < 50 && placed.length > 3) {
    warnings.push('空间利用率较低，建议优化装箱顺序或调整纸箱堆叠方式');
  }

  const loadSequence = [...placed]
    .sort((a, b) =>
      b.pos_z !== a.pos_z ? b.pos_z - a.pos_z :
      (roomMap.get(b.room_id)?.distance_weight ?? 0) - (roomMap.get(a.room_id)?.distance_weight ?? 0),
    )
    .map(b => b.id);

  placed.forEach((b, idx) => {
    b.load_order = loadSequence.indexOf(b.id) + 1;
  });

  return {
    packedBoxes: placed,
    unpackedBoxes: unpacked,
    spaceUtilization: spaceUtil,
    weightUtilization: weightUtil,
    loadSequence,
    warnings,
  };
}

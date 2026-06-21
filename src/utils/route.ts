import type { Box, Project, Room, RoutePlan, RouteStop } from '@/types';
import { generateId } from '@/db';

export function computeRoutePlan(
  project: Project,
  boxes: Box[],
  rooms: Room[],
): RoutePlan {
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  const boxesByRoom = new Map<string, Box[]>();
  for (const box of boxes) {
    const list = boxesByRoom.get(box.room_id) || [];
    list.push(box);
    boxesByRoom.set(box.room_id, list);
  }

  const loadStops: RouteStop[] = [];
  let totalLoadTime = 0;

  for (const room of rooms) {
    const roomBoxes = boxesByRoom.get(room.id) || [];
    if (roomBoxes.length === 0) continue;

    const heavyCount = roomBoxes.filter(b => b.weight_kg > 20).length;
    const fragileCount = roomBoxes.filter(b => b.is_fragile).length;

    let baseTime = roomBoxes.length * 3;
    baseTime += heavyCount * 4;
    baseTime += fragileCount * 3;

    const floorFactor = project.from_has_elevator ? 1 : 1 + project.from_floor * 0.3;
    const estimatedMin = Math.round(baseTime * floorFactor);
    totalLoadTime += estimatedMin;

    loadStops.push({
      id: generateId('stop_'),
      room_id: room.id,
      room_name: room.name,
      boxes: roomBoxes,
      floor: project.from_floor,
      has_elevator: project.from_has_elevator,
      order: 0,
      estimated_time_min: estimatedMin,
    });
  }

  loadStops.sort((a, b) => {
    const roomA = roomMap.get(a.room_id)!;
    const roomB = roomMap.get(b.room_id)!;
    return roomB.distance_weight - roomA.distance_weight;
  });
  loadStops.forEach((s, idx) => { s.order = idx + 1; });

  const unloadStops: RouteStop[] = loadStops
    .slice()
    .reverse()
    .map((s, idx) => ({
      ...s,
      id: generateId('stop_'),
      floor: project.to_floor,
      has_elevator: project.to_has_elevator,
      order: idx + 1,
    }));

  const totalUnloadTime = unloadStops.reduce((s, st) => s + st.estimated_time_min, 0);
  const distance = (project.distance_km ?? 10);
  const transitTime = Math.round(distance / 30 * 60);
  const totalTimeMin = totalLoadTime + transitTime + totalUnloadTime + 60;

  const totalWeight = boxes.reduce((s, b) => s + b.weight_kg, 0);
  let workers = 2;
  if (boxes.length > 15 || totalWeight > 800) workers = 3;
  if (boxes.length > 30 || totalWeight > 1500) workers = 4;
  if (boxes.length > 50 || totalWeight > 2500) workers = 5;

  return {
    loadStops,
    unloadStops,
    totalTimeMin,
    totalDistanceM: Math.round(distance * 1000),
    workersRecommended: workers,
  };
}

export type UserRole = 'owner' | 'member' | 'viewer';

export type ProjectStatus = 'planning' | 'packing' | 'moving' | 'completed';

export type BoxStatus = 0 | 1 | 2 | 3; // 0:空箱 1:打包中 2:已封箱 3:已装载

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export type TaskType = 'packing' | 'cleaning' | 'disassembly' | 'loading' | 'unloading';

export type TruckSpec = 'small' | 'medium' | 'large' | 'extra_large';

export interface Project {
  id: string;
  name: string;
  from_address: string;
  from_floor: number;
  from_has_elevator: boolean;
  to_address: string;
  to_floor: number;
  to_has_elevator: boolean;
  move_date: string;
  truck_spec: TruckSpec;
  max_weight: number;
  truck_volume: number;
  truck_length: number;
  truck_width: number;
  truck_height: number;
  status: ProjectStatus;
  project_code: string;
  created_at: string;
  distance_km?: number;
}

export interface Member {
  id: string;
  project_id: string;
  name: string;
  avatar: string;
  role: UserRole;
  is_online: boolean;
  tasks_count: number;
  joined_at: string;
}

export interface Room {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  progress: number;
  distance_weight: number;
}

export interface Box {
  id: string;
  project_id: string;
  room_id: string;
  box_code: string;
  qr_data: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  status: BoxStatus;
  is_fragile: boolean;
  is_overweight: boolean;
  notes: string;
  items_count: number;
  packed_at?: string;
  packed_by?: string;
  load_order?: number;
  pos_x?: number;
  pos_y?: number;
  pos_z?: number;
}

export interface Item {
  id: string;
  box_id: string;
  name: string;
  category: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  is_fragile: boolean;
  is_valuable: boolean;
  estimated_value: number;
  photo_url?: string;
  ai_confidence?: number;
  ai_category?: string;
}

export interface Task {
  id: string;
  project_id: string;
  room_id?: string;
  assignee_id?: string;
  title: string;
  type: TaskType;
  progress: number;
  start_time: string;
  end_time: string;
  priority: 1 | 2 | 3;
  status: TaskStatus;
}

export interface MoveRecord {
  id: string;
  project_id: string;
  action_type: string;
  target_id?: string;
  operator_id?: string;
  created_at: string;
  details: string;
}

export interface AIPrediction {
  className: string;
  probability: number;
  chineseName: string;
  suggestedCategory: string;
  avgWeight: number;
}

export interface PackedBox extends Box {
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rotation: 0 | 1 | 2;
}

export interface PackingResult {
  packedBoxes: PackedBox[];
  unpackedBoxes: Box[];
  spaceUtilization: number;
  weightUtilization: number;
  loadSequence: string[];
  warnings: string[];
}

export interface RouteStop {
  id: string;
  room_id: string;
  room_name: string;
  boxes: Box[];
  floor: number;
  has_elevator: boolean;
  order: number;
  estimated_time_min: number;
}

export interface RoutePlan {
  loadStops: RouteStop[];
  unloadStops: RouteStop[];
  totalTimeMin: number;
  totalDistanceM: number;
  workersRecommended: number;
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  unit?: string;
  quantity?: number;
  description: string;
}

export interface InsurancePlan {
  id: string;
  name: string;
  coverage: number;
  premium: number;
  rate: number;
  features: string[];
  recommended: boolean;
}

export interface CostEstimate {
  subtotal: number;
  items: CostItem[];
  insurancePlans: InsurancePlan[];
  selectedInsurance?: string;
  totalValue: number;
  grandTotal: number;
  savingsTips: string[];
}

export interface AnomalyAlert {
  id: string;
  type: 'overweight' | 'fragile_unsecured' | 'missing_items' | 'delayed' | 'space_waste';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  target_id?: string;
  resolved: boolean;
  created_at: string;
}

export const TRUCK_SPECS: Record<TruckSpec, {
  name: string;
  volume: number;
  maxWeight: number;
  length: number;
  width: number;
  height: number;
  basePrice: number;
  image: string;
}> = {
  small: { name: '小面/金杯', volume: 4.5, maxWeight: 500, length: 220, width: 140, height: 130, basePrice: 280, image: '🚐' },
  medium: { name: '中型货车', volume: 10, maxWeight: 1200, length: 350, width: 180, height: 160, basePrice: 480, image: '🚚' },
  large: { name: '大型厢货', volume: 20, maxWeight: 2500, length: 420, width: 200, height: 220, basePrice: 780, image: '🚛' },
  extra_large: { name: '特大平板', volume: 35, maxWeight: 5000, length: 680, width: 230, height: 240, basePrice: 1280, image: '🚒' },
};

export const ROOM_COLORS = [
  '#0F766E', '#0D9488', '#0891B2', '#0284C7', '#2563EB',
  '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#E11D48',
  '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
];

export const ITEM_CATEGORIES = [
  { id: 'furniture', name: '家具大件', icon: 'sofa', avgWeight: 35, fragile: false },
  { id: 'appliance', name: '家电电器', icon: 'tv', avgWeight: 20, fragile: true },
  { id: 'kitchen', name: '厨房用品', icon: 'cooking-pot', avgWeight: 5, fragile: true },
  { id: 'clothing', name: '衣物被褥', icon: 'shirt', avgWeight: 3, fragile: false },
  { id: 'books', name: '书籍文具', icon: 'book-open', avgWeight: 8, fragile: false },
  { id: 'electronics', name: '数码电子', icon: 'smartphone', avgWeight: 2, fragile: true },
  { id: 'decor', name: '装饰摆件', icon: 'lamp', avgWeight: 3, fragile: true },
  { id: 'documents', name: '文件档案', icon: 'folder', avgWeight: 5, fragile: false },
  { id: 'toys', name: '玩具运动', icon: 'gamepad-2', avgWeight: 4, fragile: false },
  { id: 'daily', name: '日常杂项', icon: 'package', avgWeight: 3, fragile: false },
];

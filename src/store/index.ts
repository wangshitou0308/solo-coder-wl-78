import { create } from 'zustand';
import { db, generateId, generateProjectCode, generateBoxCode } from '@/db';
import type {
  Project, Member, Room, Box, Item, Task, AnomalyAlert,
  TruckSpec, BoxStatus, MoveRecord, ActionType, UserRole,
} from '@/types';
import { TRUCK_SPECS, ROOM_COLORS } from '@/types';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  members: Member[];
  rooms: Room[];
  boxes: Box[];
  items: Item[];
  tasks: Task[];
  moveRecords: MoveRecord[];
  currentUserId: string;
  currentUserName: string;
  alerts: AnomalyAlert[];
  isLoading: boolean;

  initApp: () => Promise<void>;
  loadProjects: () => Promise<void>;
  setCurrentProject: (id: string | null) => Promise<void>;
  loadProjectData: (projectId: string) => Promise<void>;
  loadMoveRecords: (projectId: string) => Promise<void>;

  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  findProjectByCode: (code: string) => Project | undefined;
  joinProjectByCode: (code: string, memberName: string) => Promise<Project | null>;

  addMember: (projectId: string, name: string, role: UserRole) => Promise<void>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  addRoom: (projectId: string, name: string) => Promise<void>;
  updateRoom: (id: string, data: Partial<Room>) => Promise<void>;
  removeRoom: (id: string) => Promise<void>;

  addBox: (projectId: string, roomId: string, data?: Partial<Box>) => Promise<Box>;
  updateBox: (id: string, data: Partial<Box>) => Promise<void>;
  deleteBox: (id: string) => Promise<void>;
  findBoxByCode: (code: string) => Box | undefined;
  updateBoxStatus: (id: string, status: BoxStatus, note?: string) => Promise<void>;
  confirmBoxLoaded: (id: string) => Promise<void>;
  confirmBoxUnloaded: (id: string) => Promise<void>;
  confirmBoxSigned: (id: string) => Promise<void>;

  addItem: (boxId: string, data: Partial<Item>) => Promise<void>;
  addItemsBatch: (boxId: string, itemsData: Partial<Item>[]) => Promise<void>;
  updateItem: (id: string, data: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemsByBox: (boxId: string) => Item[];
  searchItems: (query: string) => { items: Item[]; boxes: Box[] };

  addTask: (projectId: string, data: Partial<Task>) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  assignTask: (taskId: string, assigneeId: string) => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  unassignTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  addMoveRecord: (projectId: string, action: ActionType, details: string, targetId?: string, metadata?: Record<string, unknown>) => Promise<void>;

  addAlert: (alert: Omit<AnomalyAlert, 'id' | 'created_at' | 'resolved'>) => void;
  resolveAlert: (id: string) => void;
  checkAnomalies: () => void;

  getProjectStats: () => {
    totalBoxes: number;
    packedBoxes: number;
    totalItems: number;
    totalWeight: number;
    totalVolume: number;
    fragileCount: number;
    totalValue: number;
    progress: number;
  };

  getExecutionStats: () => {
    totalBoxes: number;
    loadedBoxes: number;
    unloadedBoxes: number;
    signedBoxes: number;
  };
}

const DEFAULT_USER_ID = 'current-user-local';
const DEFAULT_USER_NAME = '我';

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  members: [],
  rooms: [],
  boxes: [],
  items: [],
  tasks: [],
  moveRecords: [],
  currentUserId: DEFAULT_USER_ID,
  currentUserName: DEFAULT_USER_NAME,
  alerts: [],
  isLoading: false,

  initApp: async () => {
    set({ isLoading: true });
    await get().loadProjects();
    const projects = get().projects;
    if (projects.length === 0) {
      await get().createProject({
        name: '示例：温馨家庭搬家',
        from_address: '朝阳区望京SOHO T1 1502室',
        from_floor: 15,
        from_has_elevator: true,
        to_address: '海淀区万柳书院8号楼3单元1101',
        to_floor: 11,
        to_has_elevator: true,
        move_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        truck_spec: 'large',
        distance_km: 18.5,
      });
    }
    set({ isLoading: false });
  },

  loadProjects: async () => {
    const projects = await db.projects.orderBy('created_at').reverse().toArray();
    set({ projects });
  },

  setCurrentProject: async (id) => {
    set({ currentProjectId: id });
    if (id) {
      await Promise.all([
        get().loadProjectData(id),
        get().loadMoveRecords(id),
      ]);
    } else {
      set({ members: [], rooms: [], boxes: [], items: [], tasks: [], moveRecords: [], alerts: [] });
    }
  },

  loadProjectData: async (projectId) => {
    const [members, rooms, boxes, tasks] = await Promise.all([
      db.members.where('project_id').equals(projectId).toArray(),
      db.rooms.where('project_id').equals(projectId).sortBy('sort_order'),
      db.boxes.where('project_id').equals(projectId).toArray(),
      db.tasks.where('project_id').equals(projectId).toArray(),
    ]);
    const boxIds = boxes.map(b => b.id);
    const items = boxIds.length > 0
      ? await db.items.where('box_id').anyOf(boxIds).toArray()
      : [];
    set({ members, rooms, boxes, items, tasks });
    get().checkAnomalies();
  },

  loadMoveRecords: async (projectId) => {
    const records = await db.move_records
      .where('project_id')
      .equals(projectId)
      .reverse()
      .sortBy('created_at');
    set({ moveRecords: records });
  },

  createProject: async (data) => {
    const truckSpec: TruckSpec = (data.truck_spec as TruckSpec) || 'large';
    const truck = TRUCK_SPECS[truckSpec];
    const project: Project = {
      id: generateId('proj_'),
      name: data.name || '新家搬家计划',
      from_address: data.from_address || '',
      from_floor: data.from_floor ?? 1,
      from_has_elevator: data.from_has_elevator ?? true,
      to_address: data.to_address || '',
      to_floor: data.to_floor ?? 1,
      to_has_elevator: data.to_has_elevator ?? true,
      move_date: data.move_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      truck_spec: truckSpec,
      max_weight: truck.maxWeight,
      truck_volume: truck.volume,
      truck_length: truck.length,
      truck_width: truck.width,
      truck_height: truck.height,
      status: 'planning',
      project_code: generateProjectCode(),
      created_at: new Date().toISOString(),
      distance_km: data.distance_km ?? 10,
    };
    await db.projects.add(project);

    const owner: Member = {
      id: generateId('mem_'),
      project_id: project.id,
      name: DEFAULT_USER_NAME,
      avatar: '👤',
      role: 'owner',
      is_online: true,
      tasks_count: 0,
      joined_at: new Date().toISOString(),
    };
    await db.members.add(owner);

    const defaultRooms = ['主卧', '次卧', '客厅', '厨房', '卫生间', '书房', '阳台'];
    for (let i = 0; i < defaultRooms.length; i++) {
      const room: Room = {
        id: generateId('room_'),
        project_id: project.id,
        name: defaultRooms[i],
        color: ROOM_COLORS[i % ROOM_COLORS.length],
        sort_order: i,
        progress: 0,
        distance_weight: Math.floor(Math.random() * 5) + 1,
      };
      await db.rooms.add(room);
    }

    const demoMembers = [
      { name: '张小明', avatar: '👨', role: 'member' as UserRole },
      { name: '李小红', avatar: '👩', role: 'member' as UserRole },
      { name: '王爸爸', avatar: '👴', role: 'viewer' as UserRole },
    ];
    for (const m of demoMembers) {
      const member: Member = {
        id: generateId('mem_'),
        project_id: project.id,
        name: m.name,
        avatar: m.avatar,
        role: m.role,
        is_online: Math.random() > 0.4,
        tasks_count: Math.floor(Math.random() * 6),
        joined_at: new Date().toISOString(),
      };
      await db.members.add(member);
    }

    const allRooms = await db.rooms.where('project_id').equals(project.id).sortBy('sort_order');
    for (let i = 0; i < 12; i++) {
      const room = allRooms[i % allRooms.length];
      const boxStatus = (i < 3 ? 2 : i < 7 ? 1 : 0) as BoxStatus;
      const weight = 8 + Math.random() * 17;
      const box: Box = {
        id: generateId('box_'),
        project_id: project.id,
        room_id: room.id,
        box_code: generateBoxCode(project.id, i),
        qr_data: `movplan://box/${project.id}/${generateBoxCode(project.id, i)}`,
        length_cm: [40, 50, 60][Math.floor(Math.random() * 3)],
        width_cm: [30, 40, 50][Math.floor(Math.random() * 3)],
        height_cm: [30, 35, 40][Math.floor(Math.random() * 3)],
        weight_kg: Math.round(weight * 10) / 10,
        status: boxStatus,
        is_fragile: i % 4 === 1,
        is_overweight: weight > 22,
        notes: '',
        items_count: Math.floor(Math.random() * 10) + 2,
        packed_at: boxStatus >= 2 ? new Date().toISOString() : undefined,
        status_history: boxStatus >= 2 ? [{ status: 2 as BoxStatus, at: new Date().toISOString(), by: DEFAULT_USER_NAME }] : [],
      };
      await db.boxes.add(box);
    }

    const allBoxes = await db.boxes.where('project_id').equals(project.id).toArray();
    const demoItems = [
      { name: '冬季羽绒服', cat: 'clothing', fragile: false },
      { name: '陶瓷碗盘套装', cat: 'kitchen', fragile: true },
      { name: '《三体》全集', cat: 'books', fragile: false },
      { name: 'iPad Pro 12.9', cat: 'electronics', fragile: true },
      { name: '纯棉四件套', cat: 'clothing', fragile: false },
      { name: '飞利浦台灯', cat: 'decor', fragile: true },
      { name: '乐高积木箱', cat: 'toys', fragile: false },
      { name: '购房合同原件', cat: 'documents', fragile: false },
    ];
    for (let i = 0; i < 25; i++) {
      const box = allBoxes[i % allBoxes.length];
      const template = demoItems[i % demoItems.length];
      const item: Item = {
        id: generateId('item_'),
        box_id: box.id,
        name: template.name,
        category: template.cat,
        length_cm: 20 + Math.random() * 30,
        width_cm: 15 + Math.random() * 25,
        height_cm: 10 + Math.random() * 20,
        weight_kg: 0.5 + Math.random() * 4,
        is_fragile: template.fragile,
        is_valuable: i % 5 === 0,
        estimated_value: template.cat === 'electronics' ? 5000 + Math.random() * 10000 : 100 + Math.random() * 800,
        ai_confidence: 0.7 + Math.random() * 0.28,
        ai_category: template.cat,
      };
      await db.items.add(item);
    }

    const now = Date.now();
    const demoTasks = [
      { title: '主卧衣物打包', type: 'packing' as const, offset: 0, duration: 2, priority: 2 as const, progress: 100, status: 'completed' as const },
      { title: '客厅家具拆卸', type: 'disassembly' as const, offset: 1, duration: 3, priority: 1 as const, progress: 65, status: 'in_progress' as const },
      { title: '厨房易碎品分类', type: 'packing' as const, offset: 2, duration: 2, priority: 3 as const, progress: 40, status: 'in_progress' as const },
      { title: '书房书籍整理', type: 'packing' as const, offset: 1, duration: 4, priority: 2 as const, progress: 80, status: 'in_progress' as const },
      { title: '家电拍照记录', type: 'packing' as const, offset: 3, duration: 1, priority: 2 as const, progress: 0, status: 'pool' as const },
      { title: '装车现场调度', type: 'loading' as const, offset: 4, duration: 3, priority: 1 as const, progress: 0, status: 'pool' as const },
    ];
    const allMembers = await db.members.where('project_id').equals(project.id).toArray();
    for (let i = 0; i < demoTasks.length; i++) {
      const t = demoTasks[i];
      const room = allRooms[i % allRooms.length];
      const member = allMembers[i % allMembers.length];
      const task: Task = {
        id: generateId('task_'),
        project_id: project.id,
        room_id: room.id,
        assignee_id: t.status === 'pool' ? undefined : member.id,
        title: t.title,
        type: t.type,
        progress: t.progress,
        start_time: new Date(now + t.offset * 86400000).toISOString(),
        end_time: new Date(now + (t.offset + t.duration) * 86400000).toISOString(),
        priority: t.priority,
        status: t.status,
      };
      await db.tasks.add(task);
    }

    const initialRecords: MoveRecord[] = [
      { id: generateId('rec_'), project_id: project.id, action_type: 'create_project', operator_id: DEFAULT_USER_ID, operator_name: DEFAULT_USER_NAME, created_at: project.created_at, details: '创建项目' },
    ];
    for (let i = 0; i < Math.min(initialRecords.length, 5); i++) {
      await db.move_records.add(initialRecords[i]);
    }

    await get().loadProjects();
    return project;
  },

  updateProject: async (id, data) => {
    await db.projects.update(id, data);
    const project = get().projects.find(p => p.id === id);
    if (project) {
      await get().addMoveRecord(id, 'update_project', '更新项目信息');
    }
    await get().loadProjects();
  },

  deleteProject: async (id) => {
    await db.transaction('rw', [db.projects, db.members, db.rooms, db.boxes, db.items, db.tasks, db.move_records], async () => {
      await db.members.where('project_id').equals(id).delete();
      await db.rooms.where('project_id').equals(id).delete();
      const boxes = await db.boxes.where('project_id').equals(id).toArray();
      if (boxes.length > 0) {
        await db.items.where('box_id').anyOf(boxes.map(b => b.id)).delete();
      }
      await db.boxes.where('project_id').equals(id).delete();
      await db.tasks.where('project_id').equals(id).delete();
      await db.move_records.where('project_id').equals(id).delete();
      await db.projects.delete(id);
    });
    await get().loadProjects();
    if (get().currentProjectId === id) {
      set({ currentProjectId: null });
    }
  },

  findProjectByCode: (code) => {
    return get().projects.find(p => p.project_code.toUpperCase() === code.toUpperCase());
  },

  joinProjectByCode: async (code, memberName) => {
    const project = get().findProjectByCode(code);
    if (!project) return null;
    await get().addMember(project.id, memberName, 'member');
    await get().addMoveRecord(project.id, 'add_member', `${memberName} 加入项目`);
    return project;
  },

  addMember: async (projectId, name, role) => {
    const member: Member = {
      id: generateId('mem_'),
      project_id: projectId,
      name,
      avatar: ['👤', '👨', '👩', '🧑', '👴', '👵'][Math.floor(Math.random() * 6)],
      role,
      is_online: true,
      tasks_count: 0,
      joined_at: new Date().toISOString(),
    };
    await db.members.add(member);
    await get().loadProjectData(projectId);
  },

  updateMemberRole: async (memberId, role) => {
    await db.members.update(memberId, { role });
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  removeMember: async (memberId) => {
    await db.members.delete(memberId);
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  addRoom: async (projectId, name) => {
    const rooms = await db.rooms.where('project_id').equals(projectId).sortBy('sort_order');
    const room: Room = {
      id: generateId('room_'),
      project_id: projectId,
      name,
      color: ROOM_COLORS[rooms.length % ROOM_COLORS.length],
      sort_order: rooms.length,
      progress: 0,
      distance_weight: 1,
    };
    await db.rooms.add(room);
    await get().loadProjectData(projectId);
  },

  updateRoom: async (id, data) => {
    await db.rooms.update(id, data);
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  removeRoom: async (id) => {
    await db.rooms.delete(id);
    const pid = get().currentProjectId;
    if (pid) await get().loadProjectData(pid);
  },

  addBox: async (projectId, roomId, data = {}) => {
    const project = get().projects.find(p => p.id === projectId);
    const boxes = await db.boxes.where('project_id').equals(projectId).toArray();
    const box: Box = {
      id: generateId('box_'),
      project_id: projectId,
      room_id: roomId || (get().rooms[0]?.id ?? ''),
      box_code: generateBoxCode(projectId, boxes.length),
      qr_data: `movplan://box/${projectId}/${generateBoxCode(projectId, boxes.length)}`,
      length_cm: data.length_cm ?? 50,
      width_cm: data.width_cm ?? 40,
      height_cm: data.height_cm ?? 35,
      weight_kg: data.weight_kg ?? 0,
      status: 0,
      is_fragile: data.is_fragile ?? false,
      is_overweight: false,
      notes: data.notes ?? '',
      items_count: 0,
      status_history: [{ status: 0 as BoxStatus, at: new Date().toISOString(), by: DEFAULT_USER_NAME }],
    };
    await db.boxes.add(box);
    if (project) {
      await get().addMoveRecord(projectId, 'create_box', `创建纸箱 ${box.box_code}`, box.id);
    }
    await get().loadProjectData(projectId);
    return box;
  },

  updateBox: async (id, data) => {
    const box = get().boxes.find(b => b.id === id);
    if (!box) return;
    const updates: Partial<Box> = { ...data };
    if (data.weight_kg !== undefined) {
      const project = get().projects.find(p => p.id === box.project_id);
      updates.is_overweight = data.weight_kg > (project?.max_weight ? project.max_weight / 40 : 25);
    }
    await db.boxes.update(id, updates);
    await get().loadProjectData(box.project_id);
  },

  deleteBox: async (id) => {
    const box = get().boxes.find(b => b.id === id);
    if (!box) return;
    await db.items.where('box_id').equals(id).delete();
    await db.boxes.delete(id);
    await get().loadProjectData(box.project_id);
  },

  findBoxByCode: (code) => {
    return get().boxes.find(b => b.box_code.toLowerCase() === code.toLowerCase());
  },

  updateBoxStatus: async (id, status, note) => {
    const box = get().boxes.find(b => b.id === id);
    if (!box) return;
    let history = box.status_history || [];
    history = [...history, { status, at: new Date().toISOString(), by: DEFAULT_USER_NAME, note }];
    const updates: Partial<Box> = { status, status_history: history };
    if (status >= 2 && !box.packed_at) {
      updates.packed_at = new Date().toISOString();
      updates.packed_by = DEFAULT_USER_NAME;
    }
    if (status >= 3) {
      updates.loaded_at = new Date().toISOString();
      updates.loaded_by = DEFAULT_USER_NAME;
    }
    if (status >= 4) {
      updates.unloaded_at = new Date().toISOString();
      updates.unloaded_by = DEFAULT_USER_NAME;
    }
    if (status >= 5) {
      updates.signed_at = new Date().toISOString();
      updates.signed_by = DEFAULT_USER_NAME;
    }
    await db.boxes.update(id, updates);
    const statusName: Record<BoxStatus, string> = {
      0: '重置为空箱',
      1: '开始打包',
      2: '封箱',
      3: '已装载',
      4: '运输中',
      5: '已签收',
    };
    await get().addMoveRecord(box.project_id, 'change_status', `${box.box_code} ${statusName[status]}`, box.id);
    await get().loadProjectData(box.project_id);
  },

  confirmBoxLoaded: async (id) => {
    await get().updateBoxStatus(id, 3, '装载确认');
  },

  confirmBoxUnloaded: async (id) => {
    await get().updateBoxStatus(id, 4, '卸货确认');
  },

  confirmBoxSigned: async (id) => {
    await get().updateBoxStatus(id, 5, '签收确认');
  },

  addItem: async (boxId, data) => {
    const box = get().boxes.find(b => b.id === boxId);
    if (!box) return;
    const item: Item = {
      id: generateId('item_'),
      box_id: boxId,
      name: data.name || '新物品',
      category: data.category || 'daily',
      length_cm: data.length_cm ?? 20,
      width_cm: data.width_cm ?? 15,
      height_cm: data.height_cm ?? 10,
      weight_kg: data.weight_kg ?? 0.5,
      is_fragile: data.is_fragile ?? false,
      is_valuable: data.is_valuable ?? false,
      estimated_value: data.estimated_value ?? 100,
      photo_url: data.photo_url,
      ai_confidence: data.ai_confidence,
      ai_category: data.ai_category,
    };
    await db.items.add(item);
    const boxItems = get().items.filter(i => i.box_id === boxId);
    const newTotal = boxItems.reduce((sum, i) => sum + i.weight_kg, 0) + item.weight_kg;
    await db.boxes.update(boxId, {
      items_count: (box.items_count || 0) + 1,
      weight_kg: Math.round(newTotal * 10) / 10,
      status: box.status === 0 ? 1 : box.status,
      is_fragile: box.is_fragile || item.is_fragile,
    });
    await get().addMoveRecord(box.project_id, 'add_item', `${box.box_code} 添加物品 "${item.name}"`, item.id);
    await get().loadProjectData(box.project_id);
  },

  addItemsBatch: async (boxId, itemsData) => {
    const box = get().boxes.find(b => b.id === boxId);
    if (!box) return;
    for (const data of itemsData) {
      const item: Item = {
        id: generateId('item_'),
        box_id: boxId,
        name: data.name || '新物品',
        category: data.category || 'daily',
        length_cm: data.length_cm ?? 20,
        width_cm: data.width_cm ?? 15,
        height_cm: data.height_cm ?? 10,
        weight_kg: data.weight_kg ?? 0.5,
        is_fragile: data.is_fragile ?? false,
        is_valuable: data.is_valuable ?? false,
        estimated_value: data.estimated_value ?? 100,
        photo_url: data.photo_url,
        ai_confidence: data.ai_confidence,
        ai_category: data.ai_category,
      };
      await db.items.add(item);
    }
    const allBoxItems = await db.items.where('box_id').equals(boxId).toArray();
    const newTotal = allBoxItems.reduce((sum, i) => sum + i.weight_kg, 0);
    const hasFragile = allBoxItems.some(i => i.is_fragile);
    await db.boxes.update(boxId, {
      items_count: allBoxItems.length,
      weight_kg: Math.round(newTotal * 10) / 10,
      status: box.status === 0 ? 1 : box.status,
      is_fragile: hasFragile,
    });
    await get().addMoveRecord(box.project_id, 'add_item', `${box.box_code} 批量添加 ${itemsData.length} 件物品`);
    await get().loadProjectData(box.project_id);
  },

  updateItem: async (id, data) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    await db.items.update(id, data);
    const box = get().boxes.find(b => b.id === item.box_id);
    if (box) {
      await get().addMoveRecord(box.project_id, 'update_item', `更新物品 "${item.name}" 信息`, item.id);
      await get().loadProjectData(box.project_id);
    }
  },

  deleteItem: async (id) => {
    const item = get().items.find(i => i.id === id);
    if (!item) return;
    const box = get().boxes.find(b => b.id === item.box_id);
    await db.items.delete(id);
    if (box) {
      const remaining = get().items.filter(i => i.box_id === item.box_id && i.id !== id);
      await db.boxes.update(box.id, {
        items_count: Math.max(0, box.items_count - 1),
        weight_kg: Math.round(remaining.reduce((s, i) => s + i.weight_kg, 0) * 10) / 10,
      });
      await get().addMoveRecord(box.project_id, 'delete_item', `删除物品 "${item.name}"`, item.id);
      await get().loadProjectData(box.project_id);
    }
  },

  getItemsByBox: (boxId) => get().items.filter(i => i.box_id === boxId),

  searchItems: (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return { items: [], boxes: [] };
    const matchedItems = get().items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
    const matchedBoxIds = new Set(matchedItems.map(i => i.box_id));
    const { boxes, rooms } = get();
    const roomNames = new Map(rooms.map(r => [r.id, r.name]));
    const matchedBoxes = boxes.filter(b =>
      b.box_code.toLowerCase().includes(q) ||
      (() => {
        const rn = roomNames.get(b.room_id);
        return rn?.toLowerCase().includes(q);
      })()
    );
    matchedBoxes.forEach(b => matchedBoxIds.add(b.id));
    return {
      items: matchedItems,
      boxes: boxes.filter(b => matchedBoxIds.has(b.id)),
    };
  },

  addTask: async (projectId, data) => {
    const now = Date.now();
    const task: Task = {
      id: generateId('task_'),
      project_id: projectId,
      room_id: data.room_id,
      assignee_id: data.assignee_id,
      title: data.title || '新任务',
      type: data.type || 'packing',
      progress: data.progress ?? 0,
      start_time: data.start_time || new Date(now).toISOString(),
      end_time: data.end_time || new Date(now + 86400000).toISOString(),
      priority: (data.priority as 1 | 2 | 3) ?? 2,
      status: data.status ?? (data.assignee_id ? 'pending' : 'pool'),
    };
    await db.tasks.add(task);
    await get().addMoveRecord(projectId, 'assign_task', `创建任务 "${task.title}"`, task.id);
    await get().loadProjectData(projectId);
  },

  updateTask: async (id, data) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const updates: Partial<Task> = { ...data };
    if (data.progress !== undefined) {
      if (data.progress >= 100) updates.status = 'completed';
      else if (data.progress > 0) updates.status = 'in_progress';
    }
    await db.tasks.update(id, updates);
    await get().loadProjectData(task.project_id);
  },

  assignTask: async (taskId, assigneeId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    const member = get().members.find(m => m.id === assigneeId);
    await db.tasks.update(taskId, { assignee_id: assigneeId, status: 'pending' });
    await get().addMoveRecord(task.project_id, 'assign_task', `分配任务 "${task.title}" 给 ${member?.name || '成员'}`, taskId);
    await get().loadProjectData(task.project_id);
  },

  claimTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    await db.tasks.update(taskId, { assignee_id: get().currentUserId, status: 'in_progress', progress: Math.max(task.progress, 1) });
    await get().addMoveRecord(task.project_id, 'claim_task', `领取任务 "${task.title}"`, taskId);
    await get().loadProjectData(task.project_id);
  },

  unassignTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    await db.tasks.update(taskId, { assignee_id: undefined, status: 'pool' });
    await get().loadProjectData(task.project_id);
  },

  completeTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    await db.tasks.update(taskId, { progress: 100, status: 'completed' });
    await get().addMoveRecord(task.project_id, 'complete_task', `完成任务 "${task.title}"`, taskId);
    await get().loadProjectData(task.project_id);
  },

  deleteTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    await db.tasks.delete(taskId);
    await get().loadProjectData(task.project_id);
  },

  addMoveRecord: async (projectId, action, details, targetId, metadata) => {
    const rec: MoveRecord = {
      id: generateId('rec_'),
      project_id: projectId,
      action_type: action,
      target_id: targetId,
      operator_id: get().currentUserId,
      operator_name: get().currentUserName,
      created_at: new Date().toISOString(),
      details,
      metadata,
    };
    await db.move_records.add(rec);
    const current = get().moveRecords;
    set({ moveRecords: [rec, ...current].slice(0, 100) });
  },

  addAlert: (alert) => {
    const newAlert: AnomalyAlert = {
      ...alert,
      id: generateId('alert_'),
      created_at: new Date().toISOString(),
      resolved: false,
    };
    set(s => ({ alerts: [...s.alerts.filter(a => a.target_id !== alert.target_id || a.type !== alert.type), newAlert] }));
  },

  resolveAlert: (id) => {
    set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, resolved: true } : a) }));
  },

  checkAnomalies: () => {
    const { boxes, items, tasks } = get();
    const newAlerts: Omit<AnomalyAlert, 'id' | 'created_at' | 'resolved'>[] = [];

    for (const box of boxes) {
      if (box.is_overweight) {
        newAlerts.push({
          type: 'overweight', severity: 'high', target_id: box.id,
          title: `纸箱 ${box.box_code} 超重警告`,
          message: `当前重量 ${box.weight_kg}kg，建议单箱不超过25kg以避免搬运风险`,
        });
      }
    }

    const fragileBoxes = boxes.filter(b => b.is_fragile && b.status >= 2);
    for (const box of fragileBoxes) {
      if (!box.notes?.includes('易碎') && !box.notes?.includes('固定') && !box.notes?.includes('朝上')) {
        newAlerts.push({
          type: 'fragile_unsecured', severity: 'medium', target_id: box.id,
          title: `易碎品未标记：${box.box_code}`,
          message: `该箱含易碎物品，请添加包装与放置注意事项并标记朝上标签`,
        });
      }
    }

    const today = Date.now();
    for (const task of tasks) {
      if (task.status !== 'completed' && new Date(task.end_time).getTime() < today) {
        newAlerts.push({
          type: 'delayed', severity: 'medium', target_id: task.id,
          title: `任务已延期：${task.title}`,
          message: `原定完成时间已过，当前进度 ${task.progress}%，请及时处理`,
        });
      }
    }

    const totalItems = items.length;
    if (boxes.length > 0 && totalItems < boxes.length * 2) {
      newAlerts.push({
        type: 'missing_items', severity: 'low',
        title: '物品录入不完整',
        message: `平均每箱物品数偏低，建议补充完善物品清单以便追踪`,
      });
    }

    for (const a of newAlerts) get().addAlert(a);
  },

  getProjectStats: () => {
    const { boxes, items, rooms } = get();
    const totalBoxes = boxes.length;
    const packedBoxes = boxes.filter(b => b.status >= 2).length;
    const totalWeight = boxes.reduce((s, b) => s + b.weight_kg, 0);
    const totalVolume = boxes.reduce((s, b) => s + (b.length_cm * b.width_cm * b.height_cm) / 1e6, 0);
    const fragileCount = boxes.filter(b => b.is_fragile).length;
    const totalValue = items.reduce((s, i) => s + i.estimated_value, 0);
    const totalItems = items.length;
    const progress = totalBoxes > 0
      ? Math.round((boxes.reduce((s, b) => s + b.status / 5, 0) / totalBoxes) * 100)
      : rooms.length > 0 ? Math.round(rooms.reduce((s, r) => s + r.progress, 0) / rooms.length) : 0;

    return {
      totalBoxes, packedBoxes, totalItems,
      totalWeight: Math.round(totalWeight * 10) / 10,
      totalVolume: Math.round(totalVolume * 100) / 100,
      fragileCount, totalValue: Math.round(totalValue),
      progress,
    };
  },

  getExecutionStats: () => {
    const { boxes } = get();
    return {
      totalBoxes: boxes.length,
      loadedBoxes: boxes.filter(b => b.status >= 3).length,
      unloadedBoxes: boxes.filter(b => b.status >= 4).length,
      signedBoxes: boxes.filter(b => b.status >= 5).length,
    };
  },
}));

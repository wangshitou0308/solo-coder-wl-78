import Dexie, { Table } from 'dexie';
import type {
  Project, Member, Room, Box, Item, Task, MoveRecord,
} from '@/types';

export class MovePlanDB extends Dexie {
  projects!: Table<Project, string>;
  members!: Table<Member, string>;
  rooms!: Table<Room, string>;
  boxes!: Table<Box, string>;
  items!: Table<Item, string>;
  tasks!: Table<Task, string>;
  move_records!: Table<MoveRecord, string>;

  constructor() {
    super('MovePlanDB');
    this.version(1).stores({
      projects: 'id, name, status, created_at, project_code',
      members: 'id, project_id, role, name',
      rooms: 'id, project_id, sort_order',
      boxes: 'id, project_id, room_id, box_code, status, packed_at',
      items: 'id, box_id, category, is_fragile',
      tasks: 'id, project_id, room_id, assignee_id, status, priority',
      move_records: 'id, project_id, action_type, created_at',
    });
  }
}

export const db = new MovePlanDB();

export function generateId(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function generateProjectCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateBoxCode(projectId: string, index: number): string {
  const suffix = String(index + 1).padStart(3, '0');
  return `${projectId.slice(0, 4).toUpperCase()}-${suffix}`;
}

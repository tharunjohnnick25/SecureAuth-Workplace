import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee: string; // user email or ID
  assignee_name?: string;
  created_by?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string for the day
  owner: string; // user email or ID
  color?: string;
  created_at: string;
}

interface WorkspaceData {
  tasks: Task[];
  events: CalendarEvent[];
}

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'mock-workspace.json');

const DEFAULT_DATA: WorkspaceData = {
  tasks: [],
  events: [],
};

function loadFromDisk(): WorkspaceData {
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      if (parsed.tasks && parsed.events) {
        return parsed as WorkspaceData;
      }
    }
  } catch {
    // Corrupted or missing
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

let workspaceData: WorkspaceData = loadFromDisk();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(workspaceData, null, 2), 'utf-8');
  } catch {
    // Fail silently
  }
}

export const MockWorkspace = {
  // TASKS
  getTasksByAssignee(assignee: string): Task[] {
    workspaceData = loadFromDisk();
    return workspaceData.tasks.filter((t) => t.assignee === assignee);
  },
  getTasksForUser(userId: string): Task[] {
    workspaceData = loadFromDisk();
    return workspaceData.tasks.filter((t) => t.assignee === userId || t.created_by === userId);
  },
  addTask(task: Omit<Task, 'id' | 'created_at'>): Task {
    workspaceData = loadFromDisk();
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    workspaceData.tasks.push(newTask);
    persist();
    return newTask;
  },
  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    workspaceData = loadFromDisk();
    const idx = workspaceData.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    workspaceData.tasks[idx] = { ...workspaceData.tasks[idx], ...updates };
    persist();
    return workspaceData.tasks[idx];
  },
  deleteTask(id: string): boolean {
    workspaceData = loadFromDisk();
    const before = workspaceData.tasks.length;
    workspaceData.tasks = workspaceData.tasks.filter((t) => t.id !== id);
    if (workspaceData.tasks.length < before) {
      persist();
      return true;
    }
    return false;
  },

  // EVENTS
  getEventsByOwner(owner: string): CalendarEvent[] {
    workspaceData = loadFromDisk();
    return workspaceData.events.filter((e) => e.owner === owner);
  },
  addEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): CalendarEvent {
    workspaceData = loadFromDisk();
    const newEvent: CalendarEvent = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    workspaceData.events.push(newEvent);
    persist();
    return newEvent;
  },
  deleteEvent(id: string): boolean {
    workspaceData = loadFromDisk();
    const before = workspaceData.events.length;
    workspaceData.events = workspaceData.events.filter((e) => e.id !== id);
    if (workspaceData.events.length < before) {
      persist();
      return true;
    }
    return false;
  },
};

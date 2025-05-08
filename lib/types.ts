export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: Date;
  category_ids?: number[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: number;
}

export interface CreateCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: number;
} 
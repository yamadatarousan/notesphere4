export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Task = {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date: Date | null;
  category: number | null;
  created_at: Date;
  updated_at: Date;
};

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export type CreateTaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTaskInput = Partial<CreateTaskInput> & { id: number };

export interface CreateCategoryInput {
  name: string;
  color: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: number;
} 
'use client';

import { useState, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import Button from './components/ui/Button';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  defaultDropAnimationSideEffects,
  closestCenter,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTaskCard } from '@/app/components/SortableTaskCard';
import Link from 'next/link';

const STATUS_COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
] as const;

function DroppableColumn({ id, title, tasks, onEdit, onDelete, onStatusChange }: {
  id: Task['status'];
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onStatusChange: (taskId: number, status: Task['status']) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 rounded-lg p-8 flex flex-col transition-colors duration-200 ${
        isOver ? 'bg-gray-100' : ''
      }`}
      data-status={id}
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {tasks.length}
        </span>
      </div>
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none">
          {isOver && (
            <div className="absolute inset-0 border-4 border-dashed border-indigo-500 rounded-lg bg-indigo-50 bg-opacity-50 z-10" />
          )}
        </div>
        <div className="relative z-0">
          <div className="flex flex-col space-y-4">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                id={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// グローバルスタイルを追加
const globalStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari and Opera */
  }
`;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: null,
    category: null,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 15,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 15,
      },
    })
  );

  // タスク一覧の取得
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // カテゴリー一覧の取得
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, []);

  // タスクの作成
  const handleCreateTask = async (task: CreateTaskInput) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          priority: task.priority || 'MEDIUM', // デフォルトの優先度を設定
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // タスクの更新
  const handleUpdateTask = async (task: UpdateTaskInput) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...task,
          priority: task.priority || 'MEDIUM',
          category: task.category || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // タスクの削除
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // タスクのステータス更新
  const handleStatusChange = async (taskId: number, status: Task['status']) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (editingTask) {
      await handleUpdateTask({
        id: editingTask.id,
        ...formData,
      });
    } else {
      await handleCreateTask(formData);
    }
    
    setIsModalOpen(false);
    setEditingTask(undefined);
    setFormData({
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      due_date: null,
      category: null,
    });
  };

  // モーダルを開く時にフォームデータを初期化
  useEffect(() => {
    if (isModalOpen && editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description || '',
        status: editingTask.status,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        category: editingTask.category,
      });
    } else if (isModalOpen) {
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: null,
        category: null,
      });
    }
  }, [isModalOpen, editingTask]);

  const getTasksByStatus = (status: Task['status']) => {
    return tasks
      .filter(task => task.status === status)
      .sort((a, b) => {
        // 優先度の順序を定義
        const priorityOrder = {
          'HIGH': 0,
          'MEDIUM': 1,
          'LOW': 2,
        };

        // 優先度が異なる場合は優先度でソート
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        // 優先度が同じ場合は期限でソート
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = Number(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = Number(active.id);
    const overId = String(over.id);

    // タスク同士の重なりをチェック
    if (overId === String(taskId)) {
      setActiveTask(null);
      return;
    }

    // ステータスの変更をチェック
    const currentTask = tasks.find(t => t.id === taskId);
    const targetStatus = STATUS_COLUMNS.find(col => col.id === overId)?.id as Task['status'] | undefined;

    if (!currentTask || !targetStatus || currentTask.status === targetStatus) {
      setActiveTask(null);
      return;
    }

    // 元のタスクの状態を保存
    const originalTasks = [...tasks];

    // 即座にUIを更新
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, status: targetStatus }
          : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentTask.title,
          description: currentTask.description,
          status: targetStatus,
          priority: currentTask.priority,
          due_date: currentTask.due_date,
          category: currentTask.category
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // エラー時は元の状態に戻す
      setTasks(originalTasks);
    } finally {
      // ドラッグ終了時に必ずオーバーレイをクリア
      setActiveTask(null);
    }
  };

  return (
    <>
      <style jsx global>{globalStyles}</style>
      <div className="min-h-screen bg-gray-50">
        {/* サイドバー */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-sm">
          <div className="flex flex-col h-full">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900">NoteSphere</h1>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              <Link
                href="/"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md"
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                All Tasks
              </Link>
              <Link
                href="/categories"
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Categories
              </Link>
            </nav>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="pl-64">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your tasks and stay organized
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingTask(undefined);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Task
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
                  <div className="mt-6">
                    <Button
                      onClick={() => {
                        setEditingTask(undefined);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Task
                    </Button>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  collisionDetection={pointerWithin}
                >
                  <div className="grid grid-cols-3 gap-12">
                    {STATUS_COLUMNS.map((column) => (
                      <DroppableColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        tasks={getTasksByStatus(column.id as Task['status'])}
                        onEdit={(task) => {
                          setEditingTask(task);
                          setIsModalOpen(true);
                        }}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                  <DragOverlay dropAnimation={{
                    duration: 150,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                    sideEffects: defaultDropAnimationSideEffects({
                      styles: {
                        active: {
                          opacity: '0.5',
                        },
                      },
                    }),
                  }}>
                    {activeTask ? (
                      <div className="opacity-90 transform scale-105 transition-transform duration-150">
                        <TaskCard
                          task={activeTask}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          onStatusChange={() => {}}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {/* タスク編集モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {editingTask ? 'タスクを編集' : '新しいタスク'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    タイトル
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    説明
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    ステータス
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {STATUS_COLUMNS.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    優先度
                  </label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                    期限
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    value={formData.due_date ? new Date(formData.due_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value ? new Date(e.target.value) : null })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    カテゴリー
                  </label>
                  <select
                    id="category"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value ? Number(e.target.value) : null })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">カテゴリーを選択</option>
                    {categories.map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTask(undefined);
                      setFormData({
                        title: '',
                        description: '',
                        status: 'TODO',
                        priority: 'MEDIUM',
                        due_date: null,
                        category: null,
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingTask ? '更新' : '作成'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

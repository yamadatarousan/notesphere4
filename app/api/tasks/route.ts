import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateTaskInput } from '@/lib/types';

// タスク一覧の取得
export async function GET() {
  try {
    const [tasks] = await pool.query(`
      SELECT t.*, 
        GROUP_CONCAT(c.id) as category_ids,
        GROUP_CONCAT(c.name) as category_names,
        GROUP_CONCAT(c.color) as category_colors
      FROM tasks t
      LEFT JOIN task_categories tc ON t.id = tc.task_id
      LEFT JOIN categories c ON tc.category_id = c.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// タスクの作成
export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskInput = await request.json();
    const { title, description, status, priority, due_date, category_ids } = body;

    // トランザクション開始
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 日時をMySQL形式に変換
      const formattedDueDate = due_date ? new Date(due_date).toISOString().slice(0, 19).replace('T', ' ') : null;

      // タスクの作成
      const [result] = await connection.query(
        'INSERT INTO tasks (title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?)',
        [title, description, status || 'TODO', priority || 'MEDIUM', formattedDueDate]
      );

      const taskId = (result as any).insertId;

      // カテゴリーの関連付け
      if (category_ids && category_ids.length > 0) {
        const values = category_ids.map(categoryId => [taskId, categoryId]);
        await connection.query(
          'INSERT INTO task_categories (task_id, category_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();

      // 作成したタスクを取得
      const [tasks] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
      );

      return NextResponse.json({ success: true, data: (tasks as any[])[0] });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { pool } from '@/lib/db';

// MySQL接続設定
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'notesphere',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 特定のタスクの取得
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM tasks t 
       LEFT JOIN categories c ON t.category = c.id 
       WHERE t.id = ?`,
      [id]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: (rows as any[])[0] });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// タスクの更新
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  try {
    const { title, description, status, priority, due_date, category } = await request.json();

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // 日付をMySQL形式に変換
    const formattedDueDate = due_date ? new Date(due_date).toISOString().slice(0, 19).replace('T', ' ') : null;

    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, category = ? WHERE id = ?',
      [title, description, status, priority, formattedDueDate, category, id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const [updatedTask] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM tasks t 
       LEFT JOIN categories c ON t.category = c.id 
       WHERE t.id = ?`,
      [id]
    );

    return NextResponse.json({ success: true, data: (updatedTask as any[])[0] });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// タスクの削除
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  try {
    // まずタスクの存在確認
    const [existingTask] = await pool.query(
      'SELECT id FROM tasks WHERE id = ?',
      [id]
    );

    if (!(existingTask as any[]).length) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // タスクの削除
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// タスク一覧の取得
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM tasks t 
       LEFT JOIN categories c ON t.category = c.id 
       ORDER BY t.created_at DESC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// タスクの作成
export async function POST(request: Request) {
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
      'INSERT INTO tasks (title, description, status, priority, due_date, category) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, status || 'TODO', priority || 'MEDIUM', formattedDueDate, category]
    );

    const [newTask] = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color 
       FROM tasks t 
       LEFT JOIN categories c ON t.category = c.id 
       WHERE t.id = ?`,
      [(result as any).insertId]
    );

    return NextResponse.json({ success: true, data: (newTask as any[])[0] });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
} 
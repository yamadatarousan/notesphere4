import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UpdateTaskInput } from '@/lib/types';

// 特定のタスクの取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ?',
      [params.id]
    );

    if ((tasks as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: (tasks as any[])[0] });
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateTaskInput = await request.json();
    const { title, description, status, priority, due_date, category_ids } = body;

    // トランザクション開始
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      if (due_date !== undefined) {
        updateFields.push('due_date = ?');
        // 日時をMySQL形式に変換
        const formattedDueDate = due_date ? new Date(due_date).toISOString().slice(0, 19).replace('T', ' ') : null;
        updateValues.push(formattedDueDate);
      }

      if (updateFields.length > 0) {
        updateValues.push(params.id);
        await connection.query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // カテゴリーの更新
      if (category_ids !== undefined) {
        // 既存のカテゴリー関連を削除
        await connection.query(
          'DELETE FROM task_categories WHERE task_id = ?',
          [params.id]
        );

        // 新しいカテゴリー関連を追加
        if (category_ids.length > 0) {
          const values = category_ids.map(categoryId => [params.id, categoryId]);
          await connection.query(
            'INSERT INTO task_categories (task_id, category_id) VALUES ?',
            [values]
          );
        }
      }

      await connection.commit();

      // 更新したタスクを取得
      const [tasks] = await pool.query(
        'SELECT * FROM tasks WHERE id = ?',
        [params.id]
      );

      return NextResponse.json({ success: true, data: (tasks as any[])[0] });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
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
  { params }: { params: { id: string } }
) {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // カテゴリー関連の削除
      await connection.query(
        'DELETE FROM task_categories WHERE task_id = ?',
        [params.id]
      );

      // タスクの削除
      await connection.query(
        'DELETE FROM tasks WHERE id = ?',
        [params.id]
      );

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
} 
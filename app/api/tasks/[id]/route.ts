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
      `SELECT t.*, 
        GROUP_CONCAT(c.id) as category_ids,
        GROUP_CONCAT(c.name) as category_names,
        GROUP_CONCAT(c.color) as category_colors
      FROM tasks t
      LEFT JOIN task_categories tc ON t.id = tc.task_id
      LEFT JOIN categories c ON tc.category_id = c.id
      WHERE t.id = ?
      GROUP BY t.id`,
      [params.id]
    );

    if (!tasks || (tasks as any[]).length === 0) {
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

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // タスクの更新
      const updateFields = [];
      const updateValues = [];

      if (title) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (priority) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      if (due_date !== undefined) {
        updateFields.push('due_date = ?');
        updateValues.push(due_date);
      }

      if (updateFields.length > 0) {
        updateValues.push(params.id);
        await connection.query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // カテゴリーの更新
      if (category_ids) {
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

      // 更新されたタスクを取得
      const [tasks] = await connection.query(
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
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [params.id]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
} 
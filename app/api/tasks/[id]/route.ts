import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UpdateTaskInput, TaskStatus } from '@/lib/types';

// 特定のタスクの取得
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: taskId } = await context.params;
  try {
    const [rows] = await pool.query(
      `SELECT t.*, GROUP_CONCAT(tc.category_id) as category_ids
       FROM tasks t
       LEFT JOIN task_categories tc ON t.id = tc.task_id
       WHERE t.id = ?
       GROUP BY t.id`,
      [taskId]
    );

    const tasks = rows as any[];
    if (!tasks[0]) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tasks[0] });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// タスクの更新
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: taskId } = await context.params;
  try {
    const body: UpdateTaskInput = await request.json();
    const { title, description, status, priority, due_date, category_ids } = body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updateFields = [];
      const updateValues = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (status !== undefined) {
        // ステータスを文字列に変換
        const statusMap: { [key: number]: TaskStatus } = {
          0: 'TODO',
          1: 'IN_PROGRESS',
          2: 'DONE'
        };
        const statusValue = typeof status === 'number' ? statusMap[status] : status;
        updateFields.push('status = ?');
        updateValues.push(statusValue);
      }
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      if (due_date !== undefined) {
        // 日時をMySQL形式に変換
        const formattedDueDate = due_date ? new Date(due_date).toISOString().slice(0, 19).replace('T', ' ') : null;
        updateFields.push('due_date = ?');
        updateValues.push(formattedDueDate);
      }

      if (updateFields.length > 0) {
        updateValues.push(taskId);
        await connection.query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      if (category_ids !== undefined) {
        await connection.query('DELETE FROM task_categories WHERE task_id = ?', [taskId]);
        if (category_ids.length > 0) {
          const categoryValues = category_ids.map((categoryId) => [taskId, categoryId]);
          await connection.query(
            'INSERT INTO task_categories (task_id, category_id) VALUES ?',
            [categoryValues]
          );
        }
      }

      await connection.commit();

      const [updatedTasks] = await connection.query(
        `SELECT t.*, GROUP_CONCAT(tc.category_id) as category_ids
         FROM tasks t
         LEFT JOIN task_categories tc ON t.id = tc.task_id
         WHERE t.id = ?
         GROUP BY t.id`,
        [taskId]
      );

      const tasks = updatedTasks as any[];
      return NextResponse.json({ success: true, data: tasks[0] });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// タスクの削除
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: taskId } = await context.params;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('DELETE FROM task_categories WHERE task_id = ?', [taskId]);
      await connection.query('DELETE FROM tasks WHERE id = ?', [taskId]);

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
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 
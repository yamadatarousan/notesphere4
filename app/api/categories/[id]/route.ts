import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { UpdateCategoryInput } from '@/lib/types';

// 特定のカテゴリーの取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [categories] = await pool.query(
      `SELECT c.*, COUNT(tc.task_id) as task_count
      FROM categories c
      LEFT JOIN task_categories tc ON c.id = tc.category_id
      WHERE c.id = ?
      GROUP BY c.id`,
      [params.id]
    );

    if (!categories || (categories as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: (categories as any[])[0] });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// カテゴリーの更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateCategoryInput = await request.json();
    const { name, color } = body;

    // カテゴリーの存在確認
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ?',
      [params.id]
    );

    if (!existing || (existing as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // 名前の重複チェック（名前が変更される場合）
    if (name) {
      const [duplicate] = await pool.query(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name, params.id]
      );

      if ((duplicate as any[]).length > 0) {
        return NextResponse.json(
          { success: false, error: 'Category name already exists' },
          { status: 400 }
        );
      }
    }

    // カテゴリーの更新
    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (color) {
      updateFields.push('color = ?');
      updateValues.push(color);
    }

    if (updateFields.length > 0) {
      updateValues.push(params.id);
      await pool.query(
        `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // 更新されたカテゴリーを取得
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [params.id]
    );

    return NextResponse.json({ success: true, data: (categories as any[])[0] });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// カテゴリーの削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // カテゴリーの存在確認
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE id = ?',
      [params.id]
    );

    if (!existing || (existing as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // カテゴリーに関連付けられたタスクの数を確認
    const [taskCount] = await pool.query(
      'SELECT COUNT(*) as count FROM task_categories WHERE category_id = ?',
      [params.id]
    );

    if ((taskCount as any[])[0].count > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with associated tasks' },
        { status: 400 }
      );
    }

    // カテゴリーの削除
    await pool.query('DELETE FROM categories WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
} 
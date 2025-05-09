import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { CreateCategoryInput } from '@/lib/types';

// カテゴリー一覧の取得
export async function GET() {
  try {
    const [categories] = await pool.query(`
      SELECT c.*, COUNT(tc.task_id) as task_count
      FROM categories c
      LEFT JOIN task_categories tc ON c.id = tc.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// カテゴリーの作成
export async function POST(request: NextRequest) {
  try {
    const body: CreateCategoryInput = await request.json();
    const { name, color } = body;

    // カテゴリー名の重複チェック
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE name = ?',
      [name]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { success: false, error: 'Category name already exists' },
        { status: 400 }
      );
    }

    // カテゴリーの作成
    const [result] = await pool.query(
      'INSERT INTO categories (name, color) VALUES (?, ?)',
      [name, color]
    );

    const categoryId = (result as any).insertId;

    // 作成したカテゴリーを取得
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );

    return NextResponse.json({ success: true, data: (categories as any[])[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// カテゴリー一覧の取得
export async function GET() {
  try {
    const [categories] = await pool.query('SELECT * FROM categories');
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// カテゴリーの作成
export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, color) VALUES (?, ?)',
      [name, color]
    );

    const [newCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [(result as any).insertId]
    );

    return NextResponse.json((newCategory as any)[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
} 
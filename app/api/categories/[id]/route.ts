import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

// 特定のカテゴリーの取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// カテゴリーの更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      'UPDATE categories SET name = ?, color = ? WHERE id = ?',
      [name, color, id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const [updatedCategory] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );

    return NextResponse.json((updatedCategory as any[])[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// カテゴリーの削除
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    // Check if category has associated tasks
    const [tasksResult] = await pool.query(
      'SELECT COUNT(*) as count FROM tasks WHERE category = ?',
      [id]
    );

    if ((tasksResult as any[])[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated tasks' },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
} 
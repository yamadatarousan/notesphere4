import mysql from 'mysql2/promise';

// データベース接続の設定
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'notesphere', // データベース名は後で作成します
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool; 
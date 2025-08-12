-- テスト用データベース初期化スクリプト

-- データベース作成
CREATE DATABASE IF NOT EXISTS test_db;

-- ユーザー権限設定
GRANT ALL PRIVILEGES ON DATABASE test_db TO testuser;

-- テーブル作成
\c test_db;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff',
    birth_date DATE,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    position VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(staff_id)
);

CREATE TABLE IF NOT EXISTS time_records (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    type VARCHAR(20) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'pending',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(staff_id)
);

-- テストデータ挿入
INSERT INTO users (staff_id, name, email, password_hash, role) VALUES
    ('ADMIN001', 'テスト管理者', 'admin@test.com', '$2b$10$example', 'admin'),
    ('CREATOR001', 'テスト作成者', 'creator@test.com', '$2b$10$example', 'creator'),
    ('STAFF001', 'テストスタッフ1', 'staff1@test.com', '$2b$10$example', 'staff'),
    ('STAFF002', 'テストスタッフ2', 'staff2@test.com', '$2b$10$example', 'staff');

-- テスト用シフトデータ
INSERT INTO shifts (staff_id, date, start_time, end_time, position) VALUES
    ('STAFF001', CURRENT_DATE, '09:00', '17:00', 'フロア'),
    ('STAFF002', CURRENT_DATE, '13:00', '21:00', 'キッチン');

-- テスト用勤怠データ
INSERT INTO time_records (staff_id, date, clock_in, status) VALUES
    ('STAFF001', CURRENT_DATE, '09:00', 'approved'),
    ('STAFF002', CURRENT_DATE, '13:00', 'pending');
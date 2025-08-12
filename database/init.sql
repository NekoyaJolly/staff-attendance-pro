-- 勤怠管理システム データベース初期化スクリプト

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'creator', 'admin')),
    staff_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    birth_date DATE,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 勤怠記録テーブル
CREATE TABLE IF NOT EXISTS time_records (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    type VARCHAR(10) NOT NULL CHECK (type IN ('auto', 'manual')),
    status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    location VARCHAR(100),
    qr_code VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(staff_id)
);

-- シフトテーブル
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    position VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES users(staff_id)
);

-- 場所マスタテーブル
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_time_records_staff_date ON time_records(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_time_records_status ON time_records(status);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_date ON shifts(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 初期データの投入
INSERT INTO users (id, name, email, role, staff_id, password_hash) VALUES
('admin', '管理者', 'admin@company.com', 'admin', 'admin', '$2a$10$example_hash_for_admin123'),
('staff001', 'スタッフ1', 'staff1@company.com', 'staff', 'S001', '$2a$10$example_hash_for_staff123'),
('creator001', '作成者1', 'creator1@company.com', 'creator', 'C001', '$2a$10$example_hash_for_creator123')
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, name, qr_code) VALUES
('main', 'メインエントランス', 'QR_MAIN_ENTRANCE'),
('staff-room', 'スタッフルーム', 'QR_STAFF_ROOM'),
('office', 'オフィス', 'QR_OFFICE')
ON CONFLICT (id) DO NOTHING;

-- トリガー関数（更新日時の自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_records_updated_at ON time_records;
CREATE TRIGGER update_time_records_updated_at
    BEFORE UPDATE ON time_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
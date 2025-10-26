-- Создаём таблицу для редакторов с логинами
CREATE TABLE IF NOT EXISTS editors (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем суперадмина (логин: admin, пароль: admin123)
INSERT INTO editors (username, password_hash, full_name, is_super_admin, is_active) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Главный администратор', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- Создаём индекс для быстрого поиска по логину
CREATE INDEX IF NOT EXISTS idx_editors_username ON editors(username);
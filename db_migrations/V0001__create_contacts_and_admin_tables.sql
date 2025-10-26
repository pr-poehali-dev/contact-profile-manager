-- Создаём таблицу для хранения контактов
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    telegram_username VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    avatar_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаём таблицу для хранения пароля администратора
CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    password_hash VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Добавляем начальный пароль (хеш для "admin123")
INSERT INTO admin_settings (id, password_hash) 
VALUES (1, '$2b$10$rZ8qNqJZxY5KqXzF5xGX7OYJ1qXzF5xGX7OYJ1qXzF5xGX7OYJ1qX')
ON CONFLICT (id) DO NOTHING;

-- Добавляем примеры контактов
INSERT INTO contacts (name, telegram_username, position, display_order) VALUES
('Александр Иванов', 'alex_ivanov', 'Генеральный директор', 1),
('Мария Петрова', 'maria_petrova', 'Менеджер проектов', 2),
('Дмитрий Сидоров', 'dmitry_sidorov', 'Технический директор', 3);

-- Создаём индекс для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_contacts_order ON contacts(display_order);
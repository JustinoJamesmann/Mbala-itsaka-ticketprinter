-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remise DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add receipt_number column if it doesn't exist (for existing tables)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Create a default admin user (password: admin123 - CHANGE THIS IN PRODUCTION)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$rQdKqVqXqVqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Create Michelle user (password: marisa20.)
INSERT INTO users (username, password_hash, role)
VALUES ('Ramanatenasoamariemichelle@gmail.com', '$2b$10$FP1dqWOHrCROosI4saQjrOwFxaOaEbqmyFtnI7VphMEVGG8NgSjXO', 'admin')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;

-- Create a default worker user (password: worker123 - CHANGE THIS IN PRODUCTION)
INSERT INTO users (username, password_hash, role)
VALUES ('worker', '$2a$10$rQdKqVqXqVqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX', 'worker')
ON CONFLICT (username) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
DROP POLICY IF EXISTS "Allow all access to users" ON users;
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);

-- RLS policies for orders table
DROP POLICY IF EXISTS "Allow all access to orders" ON orders;
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true);

-- RLS policies for order_items table
DROP POLICY IF EXISTS "Allow all access to order_items" ON order_items;
CREATE POLICY "Allow all access to order_items" ON order_items FOR ALL USING (true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Providers table (synced from Digiflazz)
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_code VARCHAR(50) UNIQUE NOT NULL,
  provider_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status BOOLEAN DEFAULT true,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vouchers table (synced from Digiflazz)
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_code VARCHAR(100) UNIQUE NOT NULL,
  provider_id UUID REFERENCES providers(id),
  category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nominal VARCHAR(50) NOT NULL,
  price_original DECIMAL(15,2) NOT NULL,
  price_sell DECIMAL(15,2) NOT NULL,
  margin DECIMAL(5,2) DEFAULT 0,
  status BOOLEAN DEFAULT true,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  voucher_id UUID REFERENCES vouchers(id),
  transaction_id VARCHAR(100) UNIQUE,
  digiflazz_ref VARCHAR(100),
  target_number VARCHAR(50) NOT NULL,
  price_original DECIMAL(15,2) NOT NULL,
  price_sell DECIMAL(15,2) NOT NULL,
  admin_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
  message TEXT,
  sn VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id),
  payment_method VARCHAR(50) DEFAULT 'qris',
  pakasir_order_id VARCHAR(100) UNIQUE,
  qr_string TEXT,
  qr_image_url TEXT,
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  paid_at TIMESTAMPTZ,
  webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id),
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  receipt_data JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price margins table (admin configurable)
CREATE TABLE price_margins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  provider_code VARCHAR(50),
  margin_type VARCHAR(20) DEFAULT 'percentage' CHECK (margin_type IN ('percentage', 'fixed')),
  margin_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, provider_code)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_vouchers_category ON vouchers(category);
CREATE INDEX idx_vouchers_provider ON vouchers(provider_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);

-- RLS Policies (Supabase Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users read own data" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin = true);

CREATE POLICY "Users read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users read own payments" ON payments
  FOR SELECT USING (
    transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
  );

-- Public read access for vouchers & providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read providers" ON providers
  FOR SELECT USING (true);

CREATE POLICY "Public read vouchers" ON vouchers
  FOR SELECT USING (status = true);
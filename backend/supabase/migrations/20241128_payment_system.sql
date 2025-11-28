-- ============================================
-- PAYMENT SYSTEM TABLES
-- Migration for Stripe & Razorpay Integration
-- ============================================

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
    provider_transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    credits INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx_id ON payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payment transactions"
    ON payment_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    min_purchase DECIMAL(12, 2) DEFAULT 0,
    max_discount DECIMAL(12, 2),
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index for coupon lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_until);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = TRUE AND valid_until > NOW());

CREATE POLICY "Service role can manage coupons"
    ON coupons FOR ALL
    USING (auth.role() = 'service_role');

-- Coupon Usage Table (track who used which coupon)
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    discount_applied DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, user_id, payment_transaction_id)
);

-- Enable RLS
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_usage
CREATE POLICY "Users can view their own coupon usage"
    ON coupon_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage coupon usage"
    ON coupon_usage FOR ALL
    USING (auth.role() = 'service_role');

-- Add auto reload columns to user_profiles if they don't exist
ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS auto_reload_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auto_reload_amount DECIMAL(12, 2) DEFAULT 500,
    ADD COLUMN IF NOT EXISTS auto_reload_threshold DECIMAL(12, 2) DEFAULT 100,
    ADD COLUMN IF NOT EXISTS default_payment_method VARCHAR(50);

-- Function to update payment transaction timestamp
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment transactions
DROP TRIGGER IF EXISTS trigger_update_payment_transaction_timestamp ON payment_transactions;
CREATE TRIGGER trigger_update_payment_transaction_timestamp
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transaction_timestamp();

-- Insert some sample coupons
INSERT INTO coupons (code, discount_percent, valid_until, is_active) VALUES
    ('WELCOME20', 20, NOW() + INTERVAL '1 year', TRUE),
    ('SAVE10', 10, NOW() + INTERVAL '6 months', TRUE),
    ('FIRST50', 50, NOW() + INTERVAL '3 months', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT ALL ON payment_transactions TO authenticated;
GRANT ALL ON coupons TO authenticated;
GRANT ALL ON coupon_usage TO authenticated;

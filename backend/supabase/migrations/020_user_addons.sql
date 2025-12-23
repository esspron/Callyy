-- ============================================
-- USER ADD-ONS TABLE
-- Tracks add-on subscriptions like Reserved Concurrency and Extended Data Retention
-- Add-ons are billed monthly from prepaid credits
-- ============================================

-- Create add-ons table
CREATE TABLE IF NOT EXISTS public.user_addons (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Add-on type
    addon_type TEXT NOT NULL CHECK (addon_type IN ('reserved_concurrency', 'extended_retention')),
    
    -- Add-on configuration
    quantity INTEGER NOT NULL DEFAULT 1,  -- For concurrency: number of lines. For retention: 1 (enabled) or 0
    price_per_unit DECIMAL(10, 2) NOT NULL,  -- Monthly price per unit in USD
    
    -- Billing info
    is_active BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    next_billing_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::DATE,
    last_billed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can only have one of each addon type
    UNIQUE(user_id, addon_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_addons_user_id ON public.user_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addons_active ON public.user_addons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_addons_billing ON public.user_addons(next_billing_date) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own addons"
    ON public.user_addons FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addons"
    ON public.user_addons FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addons"
    ON public.user_addons FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_addons_updated_at 
    BEFORE UPDATE ON public.user_addons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD-ON BILLING HISTORY TABLE
-- Records each monthly charge for add-ons
-- ============================================

CREATE TABLE IF NOT EXISTS public.addon_billing_history (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addon_id UUID NOT NULL REFERENCES public.user_addons(id) ON DELETE CASCADE,
    addon_type TEXT NOT NULL,
    
    -- Billing details
    quantity INTEGER NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'insufficient_balance')),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Transaction reference
    credit_transaction_id UUID,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_addon_billing_user ON public.addon_billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_addon_billing_addon ON public.addon_billing_history(addon_id);
CREATE INDEX IF NOT EXISTS idx_addon_billing_status ON public.addon_billing_history(status);

-- Enable RLS
ALTER TABLE public.addon_billing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own billing history"
    ON public.addon_billing_history FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTION: Activate Add-on
-- Checks balance, deducts first month payment, creates addon
-- ============================================

CREATE OR REPLACE FUNCTION public.activate_addon(
    p_user_id UUID,
    p_addon_type TEXT,
    p_quantity INTEGER,
    p_price_per_unit DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_cost DECIMAL;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_addon_id UUID;
    v_billing_id UUID;
BEGIN
    -- Calculate total cost
    v_total_cost := p_quantity * p_price_per_unit;
    
    -- Get current balance
    SELECT credits_balance INTO v_current_balance
    FROM public.user_profiles
    WHERE user_id = p_user_id;
    
    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;
    
    -- Check sufficient balance
    IF v_current_balance < v_total_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient balance',
            'required', v_total_cost,
            'available', v_current_balance
        );
    END IF;
    
    -- Deduct credits
    v_new_balance := v_current_balance - v_total_cost;
    
    UPDATE public.user_profiles
    SET credits_balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Insert or update addon (upsert)
    INSERT INTO public.user_addons (
        user_id, addon_type, quantity, price_per_unit, 
        is_active, activated_at, next_billing_date, last_billed_at
    )
    VALUES (
        p_user_id, p_addon_type, p_quantity, p_price_per_unit,
        true, NOW(), (CURRENT_DATE + INTERVAL '1 month')::DATE, NOW()
    )
    ON CONFLICT (user_id, addon_type) DO UPDATE SET
        quantity = p_quantity,
        price_per_unit = p_price_per_unit,
        is_active = true,
        activated_at = NOW(),
        next_billing_date = (CURRENT_DATE + INTERVAL '1 month')::DATE,
        last_billed_at = NOW(),
        deactivated_at = NULL,
        updated_at = NOW()
    RETURNING id INTO v_addon_id;
    
    -- Record billing history
    INSERT INTO public.addon_billing_history (
        user_id, addon_id, addon_type, quantity, price_per_unit,
        total_amount, status, billing_period_start, billing_period_end
    )
    VALUES (
        p_user_id, v_addon_id, p_addon_type, p_quantity, p_price_per_unit,
        v_total_cost, 'completed', CURRENT_DATE, (CURRENT_DATE + INTERVAL '1 month')::DATE
    )
    RETURNING id INTO v_billing_id;
    
    -- Record credit transaction
    INSERT INTO public.credit_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, description
    )
    VALUES (
        p_user_id, 'usage', -v_total_cost, v_current_balance, v_new_balance,
        'addon_billing', 
        CASE p_addon_type
            WHEN 'reserved_concurrency' THEN 'Reserved Concurrency (' || p_quantity || ' lines) - Monthly'
            WHEN 'extended_retention' THEN '60-Day Data Retention - Monthly'
            ELSE p_addon_type || ' Add-on - Monthly'
        END
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'addon_id', v_addon_id,
        'amount_charged', v_total_cost,
        'new_balance', v_new_balance,
        'next_billing_date', (CURRENT_DATE + INTERVAL '1 month')::DATE
    );
END;
$$;

-- ============================================
-- FUNCTION: Deactivate Add-on
-- ============================================

CREATE OR REPLACE FUNCTION public.deactivate_addon(
    p_user_id UUID,
    p_addon_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_addon_id UUID;
BEGIN
    -- Find and deactivate addon
    UPDATE public.user_addons
    SET is_active = false, deactivated_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND addon_type = p_addon_type AND is_active = true
    RETURNING id INTO v_addon_id;
    
    IF v_addon_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Add-on not found or already deactivated');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'addon_id', v_addon_id);
END;
$$;

-- ============================================
-- FUNCTION: Update Add-on Quantity
-- For Reserved Concurrency - can change number of lines
-- ============================================

CREATE OR REPLACE FUNCTION public.update_addon_quantity(
    p_user_id UUID,
    p_addon_type TEXT,
    p_new_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_price_per_unit DECIMAL;
    v_quantity_diff INTEGER;
    v_cost_diff DECIMAL;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_addon_id UUID;
BEGIN
    -- Get current addon info
    SELECT id, quantity, price_per_unit INTO v_addon_id, v_current_quantity, v_price_per_unit
    FROM public.user_addons
    WHERE user_id = p_user_id AND addon_type = p_addon_type AND is_active = true;
    
    IF v_addon_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Add-on not found or not active');
    END IF;
    
    -- Calculate difference
    v_quantity_diff := p_new_quantity - v_current_quantity;
    
    IF v_quantity_diff = 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'No change needed');
    END IF;
    
    -- If increasing, charge prorated amount for remaining days
    IF v_quantity_diff > 0 THEN
        -- For simplicity, charge full month for new lines
        v_cost_diff := v_quantity_diff * v_price_per_unit;
        
        -- Check balance
        SELECT credits_balance INTO v_current_balance
        FROM public.user_profiles
        WHERE user_id = p_user_id;
        
        IF v_current_balance < v_cost_diff THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Insufficient balance',
                'required', v_cost_diff,
                'available', v_current_balance
            );
        END IF;
        
        -- Deduct credits
        v_new_balance := v_current_balance - v_cost_diff;
        
        UPDATE public.user_profiles
        SET credits_balance = v_new_balance, updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Record transaction
        INSERT INTO public.credit_transactions (
            user_id, transaction_type, amount, balance_before, balance_after,
            reference_type, description
        )
        VALUES (
            p_user_id, 'usage', -v_cost_diff, v_current_balance, v_new_balance,
            'addon_upgrade', 
            'Added ' || v_quantity_diff || ' Reserved Concurrency lines'
        );
    END IF;
    
    -- Update addon quantity
    UPDATE public.user_addons
    SET quantity = p_new_quantity, updated_at = NOW()
    WHERE id = v_addon_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'old_quantity', v_current_quantity,
        'new_quantity', p_new_quantity,
        'amount_charged', COALESCE(v_cost_diff, 0),
        'new_balance', COALESCE(v_new_balance, v_current_balance)
    );
END;
$$;

-- ============================================
-- Add data_retention_days to user_profiles
-- ============================================

ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS reserved_concurrency INTEGER DEFAULT 0;

-- Update the data retention based on addon status (trigger)
CREATE OR REPLACE FUNCTION public.sync_user_profile_addons()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.addon_type = 'extended_retention' THEN
        UPDATE public.user_profiles
        SET data_retention_days = CASE WHEN NEW.is_active THEN 60 ELSE 30 END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF NEW.addon_type = 'reserved_concurrency' THEN
        UPDATE public.user_profiles
        SET reserved_concurrency = CASE WHEN NEW.is_active THEN NEW.quantity ELSE 0 END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_addons_to_profile
    AFTER INSERT OR UPDATE ON public.user_addons
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile_addons();

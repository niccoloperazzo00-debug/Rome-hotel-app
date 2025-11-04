-- ============================================
-- Add Status, Phase, and Notes Columns
-- ============================================
-- Run this if your Hotels table doesn't have these columns yet
-- ============================================

-- Add status column (if it doesn't exist)
ALTER TABLE "Hotels" 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'White';

-- Add phase column (if it doesn't exist)
ALTER TABLE "Hotels" 
ADD COLUMN IF NOT EXISTS phase INTEGER;

-- Add notes column (if it doesn't exist)
ALTER TABLE "Hotels" 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at timestamp for tracking changes (optional)
ALTER TABLE "Hotels" 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_updated_at ON "Hotels";
CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON "Hotels"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


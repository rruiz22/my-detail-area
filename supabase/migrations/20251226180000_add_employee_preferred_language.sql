-- =====================================================
-- Add Preferred Language to Employees
-- =====================================================
-- This migration adds a preferred_language column to employees
-- for sending SMS reminders in the employee's language.
--
-- Supported languages:
-- - 'en' (English) - default
-- - 'es' (Spanish)
-- - 'pt-BR' (Portuguese - Brazil)
-- =====================================================

-- Add preferred_language column with default 'en' (English)
ALTER TABLE detail_hub_employees
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Add check constraint for valid language codes
ALTER TABLE detail_hub_employees
ADD CONSTRAINT detail_hub_employees_preferred_language_check
CHECK (preferred_language IN ('en', 'es', 'pt-BR'));

-- Add comment for documentation
COMMENT ON COLUMN detail_hub_employees.preferred_language IS
'Preferred language for SMS reminders (en=English, es=Spanish, pt-BR=Portuguese)';

-- Update existing employees to have default language if null
UPDATE detail_hub_employees
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

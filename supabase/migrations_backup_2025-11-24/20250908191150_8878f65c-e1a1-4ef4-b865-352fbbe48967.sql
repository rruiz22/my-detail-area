-- Initialize default modules for all existing dealerships
DO $$
DECLARE
    dealership_record RECORD;
BEGIN
    -- Loop through all existing dealerships
    FOR dealership_record IN SELECT id FROM public.dealerships WHERE deleted_at IS NULL
    LOOP
        -- Initialize modules for each dealership
        PERFORM initialize_dealership_modules(dealership_record.id);
    END LOOP;
END $$;
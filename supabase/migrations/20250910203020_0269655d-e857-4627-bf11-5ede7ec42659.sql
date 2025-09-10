-- Fase 1: Sincronizar datos inconsistentes
-- Actualizar profiles que tienen membership activo pero dealership_id nulo
UPDATE profiles 
SET dealership_id = 5, updated_at = now()
WHERE id = 'dc8b725a-5a61-44ac-bf59-ba7abb89a830' 
AND dealership_id IS NULL;
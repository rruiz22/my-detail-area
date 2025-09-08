-- Replace the existing trigger with the new validation function
DROP TRIGGER IF EXISTS validate_order_due_date_trigger ON orders;

CREATE TRIGGER validate_order_due_date_trigger_v2
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_due_date_trigger_v2();
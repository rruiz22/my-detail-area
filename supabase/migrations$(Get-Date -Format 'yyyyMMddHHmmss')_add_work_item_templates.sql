-- Create work_item_templates table for Get Ready module

-- Create table for work item templates
CREATE TABLE IF NOT EXISTS work_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  work_type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  estimated_hours DECIMAL(5,2) DEFAULT 0,
  approval_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  auto_assign BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_item_templates_dealer ON work_item_templates(dealer_id);
CREATE INDEX IF NOT EXISTS idx_work_item_templates_active ON work_item_templates(dealer_id, is_active, auto_assign);
CREATE INDEX IF NOT EXISTS idx_work_item_templates_order ON work_item_templates(dealer_id, order_index);

-- Enable RLS
ALTER TABLE work_item_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view templates from their dealership
CREATE POLICY "Users can view work item templates from their dealership"
  ON work_item_templates FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Admins and managers can insert templates
CREATE POLICY "Admins and managers can create work item templates"
  ON work_item_templates FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT dm.dealer_id FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
      AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- RLS Policy: Admins and managers can update templates
CREATE POLICY "Admins and managers can update work item templates"
  ON work_item_templates FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dm.dealer_id FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
      AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- RLS Policy: Admins can delete templates
CREATE POLICY "Admins can delete work item templates"
  ON work_item_templates FOR DELETE
  USING (
    dealer_id IN (
      SELECT dm.dealer_id FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
      AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- Insert default templates for existing dealerships
INSERT INTO work_item_templates (dealer_id, name, description, work_type, priority, estimated_hours, auto_assign, order_index)
SELECT 
  d.id as dealer_id,
  'Safety Inspection',
  'Complete safety inspection including brakes, lights, tires, and fluids',
  'safety_inspection',
  3,
  1.0,
  true,
  1
FROM dealerships d
ON CONFLICT DO NOTHING;

INSERT INTO work_item_templates (dealer_id, name, description, work_type, priority, estimated_hours, auto_assign, order_index)
SELECT 
  d.id as dealer_id,
  'Professional Photos',
  'Take high-quality exterior and interior photos for online listing',
  'detailing',
  2,
  0.5,
  true,
  2
FROM dealerships d
ON CONFLICT DO NOTHING;

INSERT INTO work_item_templates (dealer_id, name, description, work_type, priority, estimated_hours, auto_assign, order_index)
SELECT 
  d.id as dealer_id,
  'Detail & Clean',
  'Full interior and exterior detailing and cleaning',
  'detailing',
  2,
  2.0,
  true,
  3
FROM dealerships d
ON CONFLICT DO NOTHING;

INSERT INTO work_item_templates (dealer_id, name, description, work_type, priority, estimated_hours, auto_assign, order_index)
SELECT 
  d.id as dealer_id,
  'Mechanical Inspection',
  'Complete mechanical inspection and diagnostics',
  'mechanical',
  3,
  1.5,
  true,
  4
FROM dealerships d
ON CONFLICT DO NOTHING;

INSERT INTO work_item_templates (dealer_id, name, description, work_type, priority, estimated_cost, estimated_hours, auto_assign, order_index)
SELECT 
  d.id as dealer_id,
  'Reconditioning Assessment',
  'Assess vehicle condition and create reconditioning work order',
  'reconditioning',
  2,
  0,
  1.0,
  true,
  5
FROM dealerships d
ON CONFLICT DO NOTHING;

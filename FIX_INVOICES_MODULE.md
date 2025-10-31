# 🔧 Solución: Error en Módulo de Invoices

**Fecha:** 31 de Octubre, 2025
**Problema:** Errores 400 (Bad Request) al acceder a la pestaña de Invoices

---

## 🔍 Diagnóstico

### Errores Detectados:
```
GET /rest/v1/invoices?select=*%2Corder...
400 (Bad Request)
```

### Causa Raíz:
Las tablas del sistema de facturación **NO EXISTEN** en la base de datos:
- ❌ `invoices` - No existe
- ❌ `invoice_items` - No existe
- ❌ `payments` - No existe
- ❌ Funciones RPC de generación de números - No existen

La migración existe en el código pero **nunca fue aplicada** a Supabase.

---

## ✅ Solución: Aplicar Migración de Invoices

### Paso 1: Acceder a Supabase Dashboard

1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. En el menú lateral, ir a **SQL Editor**

### Paso 2: Copiar el Script de Migración

El script completo está en: `supabase/migrations/20241016_create_invoices_system.sql`

**O usa este script consolidado:**

```sql
-- =====================================================
-- INVOICES & PAYMENTS SYSTEM MIGRATION
-- =====================================================

-- 1. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled')
  ),
  invoice_notes TEXT,
  terms_and_conditions TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_sent_count INTEGER DEFAULT 0,
  last_email_recipient TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  CONSTRAINT invoice_number_format CHECK (invoice_number ~ '^INV-[0-9]{4}-[0-9]+$')
);

CREATE INDEX idx_invoices_dealer_id ON public.invoices(dealer_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);

-- 2. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'labor', 'other')),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  service_reference TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort_order ON public.invoice_items(sort_order);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('cash', 'credit_card', 'debit_card', 'check', 'wire_transfer', 'other')
  ),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  CONSTRAINT payment_number_format CHECK (payment_number ~ '^PAY-[0-9]{4}-[0-9]+$')
);

CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_dealer_id ON public.payments(dealer_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_payment_number ON public.payments(payment_number);

-- 4. AUTO-UPDATE TRIGGERS
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER trigger_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- 5. AUTO-CALCULATE INVOICE TOTALS TRIGGER
CREATE OR REPLACE FUNCTION update_invoice_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate amount_paid from payments
  SELECT COALESCE(SUM(amount), 0)
  INTO NEW.amount_paid
  FROM public.payments
  WHERE invoice_id = NEW.id
    AND status = 'completed';

  -- Calculate amount_due
  NEW.amount_due = NEW.total_amount - NEW.amount_paid;

  -- Update status based on payment
  IF NEW.amount_paid = 0 THEN
    IF NEW.due_date < NOW() THEN
      NEW.status = 'overdue';
    ELSIF NEW.status != 'draft' AND NEW.status != 'cancelled' THEN
      NEW.status = 'pending';
    END IF;
  ELSIF NEW.amount_paid >= NEW.total_amount THEN
    NEW.status = 'paid';
    NEW.paid_at = NOW();
  ELSE
    NEW.status = 'partially_paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_amounts
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_amounts();

-- 6. UPDATE INVOICE ON PAYMENT TRIGGER
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger invoice update to recalculate amounts
  UPDATE public.invoices
  SET updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_updates_invoice
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- 7. INVOICE NUMBER GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION generate_invoice_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence for this dealer and year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-' || v_year || '-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.invoices
  WHERE dealer_id = p_dealer_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 8. PAYMENT NUMBER GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION generate_payment_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_payment_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(payment_number FROM 'PAY-' || v_year || '-([0-9]+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.payments
  WHERE dealer_id = p_dealer_id
    AND payment_number LIKE 'PAY-' || v_year || '-%';

  v_payment_number := 'PAY-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_payment_number;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS POLICIES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view invoices from their dealership"
  ON public.invoices FOR SELECT
  USING (
    dealer_id IN (
      SELECT unnest(accessible_dealer_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices for their dealership"
  ON public.invoices FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT unnest(accessible_dealer_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices from their dealership"
  ON public.invoices FOR UPDATE
  USING (
    dealer_id IN (
      SELECT unnest(accessible_dealer_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Invoice items policies
CREATE POLICY "Users can view invoice items from their dealership"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE dealer_id IN (
        SELECT unnest(accessible_dealer_ids)
        FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create invoice items for their dealership"
  ON public.invoice_items FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE dealer_id IN (
        SELECT unnest(accessible_dealer_ids)
        FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Payments policies
CREATE POLICY "Users can view payments from their dealership"
  ON public.payments FOR SELECT
  USING (
    dealer_id IN (
      SELECT unnest(accessible_dealer_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments for their dealership"
  ON public.payments FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT unnest(accessible_dealer_ids)
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- 10. GRANTS
GRANT EXECUTE ON FUNCTION generate_invoice_number(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_payment_number(INTEGER) TO authenticated;

-- Migration complete
COMMENT ON TABLE public.invoices IS 'Invoice records with automatic calculations';
COMMENT ON TABLE public.invoice_items IS 'Line items for invoices (snapshot from orders)';
COMMENT ON TABLE public.payments IS 'Payment records for invoices';
```

### Paso 3: Ejecutar el Script

1. Pegar el script completo en el **SQL Editor**
2. Click en **Run** (o presionar Ctrl+Enter)
3. Esperar a que se ejecute (puede tomar 10-15 segundos)
4. Verificar que no haya errores

### Paso 4: Verificar la Instalación

Ejecuta este query para verificar que las tablas existen:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('invoices', 'invoice_items', 'payments');
```

Deberías ver 3 filas con los nombres de las tablas.

---

## 🐛 Errores Adicionales Corregidos

### Error en InvoicesReport.tsx (Línea 241)
**Antes:**
```typescript
<SelectItem value="car_wash">Car Wash</SelectItem>
```

**Después:**
```typescript
<SelectItem value="carwash">Car Wash</SelectItem>
```

**Razón:** Mismo problema que en Reports - debe usar `carwash` sin guion bajo.

---

## ✅ Resultado Esperado

Después de aplicar la migración:

1. ✅ La pestaña de Invoices cargará sin errores 400
2. ✅ Podrás crear facturas desde órdenes completadas
3. ✅ Podrás registrar pagos
4. ✅ Los reportes financieros funcionarán correctamente
5. ✅ Las búsquedas y filtros trabajarán correctamente

---

## 📊 Funcionalidades del Sistema de Invoices

Una vez aplicada la migración, tendrás acceso a:

### Gestión de Facturas:
- ✅ Creación automática de facturas desde órdenes
- ✅ Números de factura auto-generados (INV-2025-0001)
- ✅ Cálculo automático de totales, impuestos y descuentos
- ✅ Estados: Draft, Pending, Paid, Partially Paid, Overdue, Cancelled

### Gestión de Pagos:
- ✅ Registro de pagos múltiples por factura
- ✅ Números de pago auto-generados (PAY-2025-0001)
- ✅ Métodos: Cash, Credit Card, Debit Card, Check, Wire Transfer
- ✅ Actualización automática de estados de factura

### Reportes y Analytics:
- ✅ Total facturado
- ✅ Total cobrado
- ✅ Pendiente de cobro
- ✅ Facturas vencidas
- ✅ Filtros por fecha, estado, tipo de orden

### Seguridad:
- ✅ RLS policies por dealership
- ✅ Control de acceso basado en usuario
- ✅ Auditoría completa (created_by, recorded_by)

---

## 🚨 Importante

**ANTES de crear facturas en producción:**

1. Verifica que los datos de las órdenes sean correctos
2. Configura las tasas de impuestos apropiadas
3. Personaliza los términos y condiciones
4. Prueba con facturas de prueba primero

---

## 💡 Próximos Pasos Opcionales

1. **Configurar envío de emails** (requiere Edge Function)
2. **Generar PDFs de facturas** (requiere librería adicional)
3. **Exportar a Excel** (requiere exceljs)
4. **Reportes programados** (requiere configuración adicional)

---

**Status:** 🔧 Pendiente de aplicar migración
**Archivos modificados:**
- `src/components/reports/sections/InvoicesReport.tsx` ✅ Corregido

**Tiempo estimado:** 5 minutos para aplicar la migración

-- ============================================
-- AutoDealer PWA — Supabase Schema
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: vehiculos
-- ============================================
CREATE TABLE vehiculos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Identificación
  marca text NOT NULL,
  modelo text NOT NULL,
  anio integer NOT NULL,
  vin text UNIQUE,
  color text,
  kilometraje integer DEFAULT 0,

  -- Financiero
  precio_compra numeric(12,2) NOT NULL,
  precio_venta numeric(12,2),         -- NULL = no vendido aún
  gastos_adicionales numeric(12,2) DEFAULT 0,

  -- Fechas
  fecha_compra date NOT NULL,
  fecha_venta date,

  -- Estado
  estado text DEFAULT 'en_stock' CHECK (estado IN ('en_stock', 'vendido', 'en_reparacion', 'reservado')),

  -- Metadata
  notas text,
  imagen_url text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- ============================================
-- TABLA: reparaciones
-- ============================================
CREATE TABLE reparaciones (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE CASCADE NOT NULL,
  descripcion text NOT NULL,
  costo numeric(12,2) NOT NULL,
  fecha date NOT NULL,
  proveedor text,
  categoria text DEFAULT 'mecanica' CHECK (
    categoria IN ('mecanica', 'carroceria', 'electricidad', 'interior', 'neumaticos', 'otro')
  ),
  comprobante_url text,
  notas text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- ============================================
-- TABLA: gastos_generales
-- ============================================
CREATE TABLE gastos_generales (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  descripcion text NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha date NOT NULL,
  categoria text DEFAULT 'otro' CHECK (
    categoria IN ('alquiler', 'servicios', 'marketing', 'personal', 'impuestos', 'seguros', 'otro')
  ),
  recurrente boolean DEFAULT false,
  comprobante_url text,
  notas text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: resumen financiero por vehículo
-- security_invoker: la vista respeta las RLS del usuario que consulta
CREATE OR REPLACE VIEW vista_vehiculos_financiero
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.marca,
  v.modelo,
  v.anio,
  v.vin,
  v.color,
  v.estado,
  v.fecha_compra,
  v.fecha_venta,
  v.precio_compra,
  v.precio_venta,
  v.gastos_adicionales,
  COALESCE(SUM(r.costo), 0) AS total_reparaciones,
  v.precio_compra + v.gastos_adicionales + COALESCE(SUM(r.costo), 0) AS costo_total,
  CASE
    WHEN v.precio_venta IS NOT NULL
    THEN v.precio_venta - (v.precio_compra + v.gastos_adicionales + COALESCE(SUM(r.costo), 0))
    ELSE NULL
  END AS ganancia_bruta,
  CASE
    WHEN v.precio_venta IS NOT NULL AND v.precio_venta > 0
    THEN ROUND(
      ((v.precio_venta - (v.precio_compra + v.gastos_adicionales + COALESCE(SUM(r.costo), 0))) / v.precio_venta) * 100,
      2
    )
    ELSE NULL
  END AS margen_porcentaje,
  v.user_id
FROM vehiculos v
LEFT JOIN reparaciones r ON r.vehiculo_id = v.id
GROUP BY v.id;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_generales ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve sus propios datos
CREATE POLICY "vehiculos_own" ON vehiculos
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "reparaciones_own" ON reparaciones
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "gastos_own" ON gastos_generales
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehiculos_updated_at
  BEFORE UPDATE ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reparaciones_updated_at
  BEFORE UPDATE ON reparaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER gastos_updated_at
  BEFORE UPDATE ON gastos_generales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX idx_vehiculos_user ON vehiculos(user_id);
CREATE INDEX idx_vehiculos_estado ON vehiculos(estado);
CREATE INDEX idx_vehiculos_fecha_compra ON vehiculos(fecha_compra);
CREATE INDEX idx_reparaciones_vehiculo ON reparaciones(vehiculo_id);
CREATE INDEX idx_reparaciones_user ON reparaciones(user_id);
CREATE INDEX idx_gastos_user ON gastos_generales(user_id);
CREATE INDEX idx_gastos_fecha ON gastos_generales(fecha);

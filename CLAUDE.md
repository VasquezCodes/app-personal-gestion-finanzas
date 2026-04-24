# AutoDealer PWA — Claude Code Instructions

## Descripción del Proyecto
PWA para gestión de gastos, inventario y reportes de un dealership de autos.
El cliente es el dueño del negocio, uso personal con pocos usuarios (2-5).
**Idioma de la app: Español**

## Stack Tecnológico
- **Framework**: React 18 + Vite
- **PWA**: vite-plugin-pwa (Workbox)
- **UI / Feel iOS**: Konsta UI + Tailwind CSS + Framer Motion
- **Backend / Auth / DB**: Supabase (free tier)
- **Excel parsing**: SheetJS (xlsx)
- **Routing**: React Router v6
- **Estado global**: Zustand
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Icons**: Lucide React

## Sistema de Diseño — CRÍTICO
> **Referencia completa**: [`DESIGN.md`](./DESIGN.md) — consultar SIEMPRE antes de crear o modificar cualquier componente UI.

El sistema de diseño está inspirado en Mastercard. Los puntos clave:
- **Canvas**: Cream cálido `#F3F0EE` como fondo base (nunca blanco puro)
- **Radios**: Solo 20px (botones), 40px (hero/cards), 999px (pills), 50% (círculos) — nunca 8–16px
- **Color primario CTA**: Ink Black `#141413` con texto Cream
- **Acento**: Signal Orange `#CF4500` solo para acciones de consentimiento/legal
- **Tipografía**: Sofia Sans (sustituto de MarkForMC), weight 450 body / 500 headlines, -2% tracking en títulos
- **Elevación**: Sombras con spread 24–48px y opacidad ≤8% — nunca sombras duras
- **Imágenes**: Cropeadas a círculo perfecto con satellite-CTA blanco docked bottom-right

## Principios de Diseño — CRÍTICO
La app debe sentirse como una app nativa de iOS. Seguir estas reglas siempre:

### Tipografía
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
```

### Navegación
- Tab bar SIEMPRE en la parte inferior (nunca hamburguesa)
- Slide horizontal entre pantallas (nunca fade simple)
- Back button en top-left con chevron, estilo iOS

### Componentes con feel iOS
- Bottom sheets para modales (suben desde abajo, drag para cerrar)
- Action sheets para opciones
- Pull-to-refresh en listas
- Swipe-to-delete en items de lista
- Safe areas respetadas: `env(safe-area-inset-*)`

### Colores del sistema iOS
```css
--ios-blue: #007AFF;
--ios-green: #34C759;
--ios-red: #FF3B30;
--ios-orange: #FF9500;
--ios-yellow: #FFCC00;
--ios-bg: #F2F2F7;
--ios-bg-secondary: #FFFFFF;
--ios-label: #000000;
--ios-label-secondary: #3C3C43;
--ios-separator: #C6C6C8;
```

### Animaciones (Framer Motion)
- Transiciones entre páginas: slide horizontal
- Aparición de listas: stagger de items
- Bottom sheets: spring physics
- Feedback de botones: scale 0.96 on tap

### Scroll
```css
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;
```

## Estructura de Carpetas
```
src/
├── components/
│   ├── ui/           # Componentes base (Button, Card, Input, etc.)
│   ├── ios/          # Componentes específicos iOS (BottomSheet, TabBar, etc.)
│   └── shared/       # Componentes reutilizables del dominio
├── pages/
│   ├── Dashboard/
│   ├── Inventario/
│   ├── Vehiculo/     # Detalle de vehículo
│   ├── Reparaciones/
│   ├── Gastos/
│   ├── Reportes/
│   └── Configuracion/
├── hooks/            # Custom hooks
├── store/            # Zustand stores
├── lib/
│   ├── supabase.ts   # Cliente Supabase
│   ├── excel.ts      # Parsing de Excel con SheetJS
│   └── utils.ts      # Helpers generales
├── types/            # TypeScript types e interfaces
└── styles/           # CSS global y variables
```

## Pantallas de la App
1. **Dashboard** — KPIs principales, actividad reciente, accesos rápidos
2. **Inventario** — Lista de vehículos en stock con filtros
3. **Detalle de Vehículo** — Costos, reparaciones, ganancia neta
4. **Cargar Vehículo** — Formulario manual + carga de Excel
5. **Reparaciones** — Gastos por unidad con historial
6. **Gastos Generales** — Gastos del negocio no ligados a un auto
7. **Reportes** — Gráficos de rentabilidad, exportable
8. **Configuración** — Perfil, sync, preferencias

## Modelo de Datos (Supabase)

### Tabla: `vehiculos`
```sql
id uuid PRIMARY KEY
created_at timestamptz
marca text
modelo text
anio integer
vin text UNIQUE
color text
precio_compra numeric
precio_venta numeric NULLABLE  -- null = no vendido
fecha_compra date
fecha_venta date NULLABLE
estado text  -- 'en_stock' | 'vendido' | 'en_reparacion'
notas text
user_id uuid REFERENCES auth.users
```

### Tabla: `reparaciones`
```sql
id uuid PRIMARY KEY
created_at timestamptz
vehiculo_id uuid REFERENCES vehiculos
descripcion text
costo numeric
fecha date
proveedor text NULLABLE
user_id uuid REFERENCES auth.users
```

### Tabla: `gastos_generales`
```sql
id uuid PRIMARY KEY
created_at timestamptz
descripcion text
monto numeric
categoria text  -- 'alquiler' | 'servicios' | 'marketing' | 'personal' | 'otro'
fecha date
user_id uuid REFERENCES auth.users
```

## Lógica de Negocio — Cálculos Clave

```typescript
// Costo total de un vehículo
costoTotal = precio_compra + sum(reparaciones)

// Ganancia bruta
gananciaBruta = precio_venta - costoTotal

// Margen %
margen = (gananciaBruta / precio_venta) * 100

// ROI
roi = (gananciaBruta / costoTotal) * 100
```

## Variables de Entorno
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Convenciones de Código
- **TypeScript** en todo el proyecto, sin `any`
- Componentes en PascalCase, archivos en kebab-case
- Hooks con prefijo `use`
- Stores con sufijo `Store` (ej: `vehiculosStore`)
- Todas las fechas en ISO 8601
- Moneda: formatear siempre con `Intl.NumberFormat`
- Comentarios en español

## Comandos
```bash
npm run dev        # Desarrollo
npm run build      # Build de producción
npm run preview    # Preview del build con PWA activa
```

## Reglas para Claude Code
1. Consultar `DESIGN.md` antes de crear cualquier componente UI; respetar el feel iOS nativo descrito arriba
2. Nunca usar navegación con hamburguesa/sidebar
3. Todos los modales como bottom sheets
4. Validar formularios con Zod siempre
5. Manejar estados de loading, error y empty en cada lista
6. La app debe funcionar offline (datos en caché via Workbox)
7. Respetar safe areas en todos los componentes full-screen
8. Usar transacciones de Supabase cuando se modifiquen múltiples tablas

// ============================================
// AutoDealer PWA — Excel Parser
// Parsea archivos Excel de vehículos con SheetJS
// ============================================

import * as XLSX from 'xlsx'
import type { ExcelVehiculoRow, VehiculoForm, ImportResult } from '../types'

// Mapeo flexible de nombres de columna (en español e inglés)
const COLUMN_ALIASES: Record<string, keyof ExcelVehiculoRow> = {
  'marca':          'marca',
  'brand':          'marca',
  'modelo':         'modelo',
  'model':          'modelo',
  'año':            'anio',
  'anio':           'anio',
  'year':           'anio',
  'vin':            'vin',
  'chasis':         'vin',
  'color':          'color',
  'precio compra':  'precio_compra',
  'precio_compra':  'precio_compra',
  'costo':          'precio_compra',
  'purchase price': 'precio_compra',
  'fecha compra':   'fecha_compra',
  'fecha_compra':   'fecha_compra',
  'purchase date':  'fecha_compra',
  'notas':          'notas',
  'notes':          'notas',
  'observaciones':  'notas',
}

/**
 * Normaliza el nombre de una columna para matchearla con los aliases
 */
function normalizarColumna(columna: string): keyof ExcelVehiculoRow | null {
  const lower = columna.toLowerCase().trim()
  return COLUMN_ALIASES[lower] ?? null
}

/**
 * Parsea un número desde distintos formatos
 */
function parsearNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return valor
  if (typeof valor === 'string') {
    // Remover símbolos de moneda y espacios
    const limpio = valor.replace(/[$,.\s]/g, '').replace(',', '.')
    const num = parseFloat(limpio)
    return isNaN(num) ? null : num
  }
  return null
}

/**
 * Parsea una fecha desde distintos formatos
 */
function parsearFecha(valor: unknown): string | null {
  if (!valor) return null

  // Número serial de Excel
  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) {
      return `${fecha.y}-${String(fecha.m).padStart(2,'0')}-${String(fecha.d).padStart(2,'0')}`
    }
  }

  if (typeof valor === 'string') {
    // Intentar parsear string de fecha
    const fecha = new Date(valor)
    if (!isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0]
    }
  }

  return null
}

/**
 * Parsea un archivo Excel y retorna un array de VehiculoForm
 */
export async function parsearExcelVehiculos(
  archivo: File
): Promise<{ datos: VehiculoForm[]; resultado: ImportResult }> {
  const resultado: ImportResult = { exitosos: 0, fallidos: 0, errores: [] }
  const datos: VehiculoForm[] = []

  try {
    const buffer = await archivo.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })

    // Usar la primera hoja
    const primerHoja = workbook.SheetNames[0]
    const hoja = workbook.Sheets[primerHoja]

    // Convertir a JSON con headers normalizados
    const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
      header: 1,
      defval: null,
    })

    if (filas.length < 2) {
      resultado.errores.push('El archivo está vacío o no tiene datos')
      return { datos, resultado }
    }

    // Primera fila = headers
    const headers = filas[0].map(h => String(h ?? ''))

    // Mapear headers a campos conocidos
    const mapeoColumnas: Record<number, keyof ExcelVehiculoRow> = {}
    headers.forEach((header, i) => {
      const campo = normalizarColumna(header)
      if (campo) mapeoColumnas[i] = campo
    })

    // Procesar cada fila de datos
    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i]
      if (!fila || fila.every(v => v === null || v === '')) continue

      // Construir objeto de la fila
      const rowObj: ExcelVehiculoRow = {}
      Object.entries(mapeoColumnas).forEach(([idx, campo]) => {
        rowObj[campo] = fila[parseInt(idx)] as string | number
      })

      try {
        // Validar campos requeridos
        if (!rowObj.marca) throw new Error(`Fila ${i + 1}: falta la marca`)
        if (!rowObj.modelo) throw new Error(`Fila ${i + 1}: falta el modelo`)

        const precio = parsearNumero(rowObj.precio_compra)
        if (!precio) throw new Error(`Fila ${i + 1}: precio de compra inválido`)

        const anio = parsearNumero(rowObj.anio) ?? new Date().getFullYear()
        const fechaCompra = parsearFecha(rowObj.fecha_compra) ?? new Date().toISOString().split('T')[0]

        datos.push({
          marca: String(rowObj.marca).trim(),
          modelo: String(rowObj.modelo).trim(),
          anio: Math.round(anio),
          vin: rowObj.vin ? String(rowObj.vin).trim() : undefined,
          color: rowObj.color ? String(rowObj.color).trim() : undefined,
          precio_compra: precio,
          fecha_compra: fechaCompra,
          estado: 'en_stock',
          notas: rowObj.notas ? String(rowObj.notas).trim() : undefined,
        })

        resultado.exitosos++
      } catch (err) {
        resultado.fallidos++
        resultado.errores.push(err instanceof Error ? err.message : `Error en fila ${i + 1}`)
      }
    }
  } catch (err) {
    resultado.errores.push('Error al leer el archivo. Asegurate de que sea un .xlsx o .csv válido')
  }

  return { datos, resultado }
}

/**
 * Genera un Excel de ejemplo para que el cliente use como template
 */
export function generarTemplateExcel(): void {
  const datos = [
    {
      Marca: 'Toyota',
      Modelo: 'Corolla',
      'Año': 2020,
      VIN: '1HGBH41JXMN109186',
      Color: 'Blanco',
      'Precio Compra': 15000,
      'Fecha Compra': '2024-01-15',
      Notas: 'Ejemplo de vehículo',
    },
    {
      Marca: 'Honda',
      Modelo: 'Civic',
      'Año': 2019,
      VIN: '',
      Color: 'Negro',
      'Precio Compra': 12500,
      'Fecha Compra': '2024-02-01',
      Notas: '',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Vehículos')

  // Anchos de columna
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 6 }, { wch: 20 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]

  XLSX.writeFile(wb, 'template_vehiculos.xlsx')
}

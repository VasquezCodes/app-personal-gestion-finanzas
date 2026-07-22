import ExcelJS from 'exceljs'
import type { ReporteData } from './buildReporteData'

const CAT_GASTO_LABEL: Record<string, string> = {
  alquiler: 'Alquiler',
  servicios: 'Servicios',
  marketing: 'Marketing',
  personal: 'Personal',
  impuestos: 'Impuestos',
  seguros: 'Seguros',
  otro: 'Otro',
}

const CAT_REP_LABEL: Record<string, string> = {
  mecanica: 'Mecánica',
  carroceria: 'Carrocería',
  electricidad: 'Electricidad',
  interior: 'Interior',
  neumaticos: 'Neumáticos',
  otro: 'Otro',
}

// Paleta alineada a la app
const INK = '141413'
const CREAM = 'F3F0EE'
const BAND = 'F7F5F2'
const SOFT = 'EAE6E2'
const MUTED = '787673'
const GREEN = '4A7A5A'
const RED = 'A04848'

const FMT_MONEY = '"$"#,##0'
const FMT_MONEY_SIGNED = '"+$"#,##0;"-$"#,##0;"$0"'
const FMT_PCT = '0.0"%"'
const FMT_DATE = 'dd/mm/yyyy'

function isoToDate(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

function applyHeaderRow(ws: ExcelJS.Worksheet, rowIdx: number) {
  const row = ws.getRow(rowIdx)
  row.height = 26
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${CREAM}` } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = {
      top:    { style: 'thin', color: { argb: `FF${INK}` } },
      bottom: { style: 'thin', color: { argb: `FF${INK}` } },
    }
  })
}

function applyDataRow(ws: ExcelJS.Worksheet, rowIdx: number, banded: boolean) {
  const row = ws.getRow(rowIdx)
  row.height = 18
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, color: { argb: `FF${INK}` } }
    cell.alignment = { vertical: 'middle', indent: 1 }
    if (banded) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BAND}` } }
    }
    cell.border = {
      bottom: { style: 'hair', color: { argb: `FF${SOFT}` } },
    }
  })
}

function applyTotalRow(ws: ExcelJS.Worksheet, rowIdx: number) {
  const row = ws.getRow(rowIdx)
  row.height = 22
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${INK}` } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${SOFT}` } }
    cell.alignment = { vertical: 'middle', indent: 1 }
    cell.border = {
      top:    { style: 'thin', color: { argb: `FF${INK}` } },
      bottom: { style: 'thin', color: { argb: `FF${INK}` } },
    }
  })
}

function setColumnFormats(ws: ExcelJS.Worksheet, formats: Record<number, { z?: string; align?: 'left' | 'center' | 'right' }>) {
  Object.entries(formats).forEach(([col, cfg]) => {
    const c = ws.getColumn(Number(col))
    if (cfg.z) c.numFmt = cfg.z
    if (cfg.align) c.alignment = { horizontal: cfg.align, vertical: 'middle', indent: cfg.align === 'left' ? 1 : 0 }
  })
}

function buildResumen(wb: ExcelJS.Workbook, data: ReporteData) {
  const ws = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  ws.columns = [
    { width: 26 },
    { width: 20 },
  ]

  // Title block (filas 1-3)
  ws.mergeCells('A1:B1')
  const title = ws.getCell('A1')
  title.value = 'REPORTE FINANCIERO'
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: `FF${CREAM}` } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 36

  ws.mergeCells('A2:B2')
  const sub = ws.getCell('A2')
  sub.value = `MotorHub · ${data.periodo.label}`
  sub.font = { name: 'Calibri', size: 11, color: { argb: `FF${CREAM}` } }
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 20

  ws.mergeCells('A3:B3')
  const gen = ws.getCell('A3')
  const dt = new Date(data.generadoEn)
  const d = String(dt.getDate()).padStart(2, '0')
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  gen.value = `Generado el ${d}/${m}/${dt.getFullYear()}`
  gen.font = { name: 'Calibri', size: 9, italic: true, color: { argb: `FF${MUTED}` } }
  gen.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 18

  // Espacio
  ws.getRow(4).height = 8

  // Sección INDICADORES
  ws.mergeCells('A5:B5')
  const h = ws.getCell('A5')
  h.value = 'INDICADORES'
  h.font = { name: 'Calibri', size: 10, bold: true, color: { argb: `FF${CREAM}` } }
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
  h.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(5).height = 22

  const indicadores: Array<[string, number, string, string?]> = [
    ['Ganancia neta', data.kpis.gananciaNeta, FMT_MONEY_SIGNED, data.kpis.gananciaNeta >= 0 ? GREEN : RED],
    ['Ventas', data.kpis.ventas, '0'],
    ['Ingresos', data.kpis.ingresos, FMT_MONEY],
    ['Inversión', data.kpis.inversion, FMT_MONEY],
    ['Gastos generales', data.kpis.gastosGenerales, FMT_MONEY],
    ['ROI promedio', data.kpis.roiPromedio, FMT_PCT, data.kpis.roiPromedio >= 0 ? GREEN : RED],
  ]
  indicadores.forEach(([label, value, z, color], i) => {
    const r = 6 + i
    const banded = i % 2 === 1
    const labelCell = ws.getCell(`A${r}`)
    const valueCell = ws.getCell(`B${r}`)
    labelCell.value = label
    valueCell.value = value
    valueCell.numFmt = z

    ws.getRow(r).height = 22
    labelCell.font = { name: 'Calibri', size: 11, color: { argb: `FF${INK}` } }
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    valueCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: `FF${color ?? INK}` } }
    valueCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
    if (banded) {
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BAND}` } }
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BAND}` } }
    }
    labelCell.border = { bottom: { style: 'hair', color: { argb: `FF${SOFT}` } } }
    valueCell.border = { bottom: { style: 'hair', color: { argb: `FF${SOFT}` } } }
  })
}

function buildTableSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  headers: string[],
  rows: (string | number | Date | null)[][],
  colCfg: Record<number, { width: number; z?: string; align?: 'left' | 'center' | 'right' }>,
  total?: { label: string; values: (string | number | null)[] },
  emptyMsg?: string,
) {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] })
  ws.columns = headers.map((_, i) => ({ width: colCfg[i + 1]?.width ?? 14 }))

  // Header
  ws.addRow(headers)
  applyHeaderRow(ws, 1)

  // Data
  if (rows.length === 0 && emptyMsg) {
    ws.mergeCells(2, 1, 2, headers.length)
    const cell = ws.getCell('A2')
    cell.value = emptyMsg
    cell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: `FF${MUTED}` } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(2).height = 32
  } else {
    rows.forEach((row, i) => {
      ws.addRow(row)
      applyDataRow(ws, i + 2, i % 2 === 1)
    })
  }

  // Aplicar formato y alineación por columna
  setColumnFormats(ws, colCfg)

  // Total
  if (total && rows.length > 0) {
    const totalRowIdx = rows.length + 2
    const totalRow = [total.label, ...total.values]
    ws.addRow(totalRow)
    applyTotalRow(ws, totalRowIdx)
    // Re-aplicar formato a la fila de total (porque applyTotalRow lo sobreescribe parcialmente)
    Object.entries(colCfg).forEach(([col, cfg]) => {
      const cell = ws.getRow(totalRowIdx).getCell(Number(col))
      if (cfg.z) cell.numFmt = cfg.z
      if (cfg.align) cell.alignment = { ...cell.alignment, horizontal: cfg.align }
    })
  }
}

function buildPorMarca(wb: ExcelJS.Workbook, data: ReporteData) {
  const rows = data.porMarca.map((m): (string | number)[] => [
    m.marca, m.unidades, m.ingresos, m.costo, m.ganancia, m.roi,
  ])
  let total: { label: string; values: (string | number)[] } | undefined
  if (data.porMarca.length > 0) {
    const t = data.porMarca.reduce(
      (acc, m) => ({
        unidades: acc.unidades + m.unidades,
        ingresos: acc.ingresos + m.ingresos,
        costo: acc.costo + m.costo,
        ganancia: acc.ganancia + m.ganancia,
      }),
      { unidades: 0, ingresos: 0, costo: 0, ganancia: 0 },
    )
    const roiTotal = t.costo > 0 ? (t.ganancia / t.costo) * 100 : 0
    total = { label: 'TOTAL', values: [t.unidades, t.ingresos, t.costo, t.ganancia, roiTotal] }
  }
  buildTableSheet(wb, 'Por marca',
    ['Marca', 'Unidades', 'Ingresos', 'Costo total', 'Ganancia', 'ROI %'],
    rows,
    {
      1: { width: 18, align: 'left' },
      2: { width: 12, align: 'center' },
      3: { width: 16, z: FMT_MONEY, align: 'right' },
      4: { width: 16, z: FMT_MONEY, align: 'right' },
      5: { width: 16, z: FMT_MONEY_SIGNED, align: 'right' },
      6: { width: 12, z: FMT_PCT, align: 'right' },
    },
    total,
    'Sin ventas en el período',
  )
}

function buildVendidos(wb: ExcelJS.Workbook, data: ReporteData) {
  const rows: (string | number | Date | null)[][] = data.vendidos.map((v) => [
    v.marca, v.modelo, v.anio,
    isoToDate(v.fechaVenta),
    v.precioCompra, v.gastosAdic, v.reparaciones, v.precioVenta, v.ganancia, v.roi,
  ])
  buildTableSheet(wb, 'Vehículos vendidos',
    ['Marca', 'Modelo', 'Año', 'Fecha venta', 'Compra', 'Gastos adic.', 'Reparaciones', 'Venta', 'Ganancia', 'ROI %'],
    rows,
    {
      1: { width: 14, align: 'left' },
      2: { width: 18, align: 'left' },
      3: { width: 8, align: 'center' },
      4: { width: 14, z: FMT_DATE, align: 'center' },
      5: { width: 14, z: FMT_MONEY, align: 'right' },
      6: { width: 13, z: FMT_MONEY, align: 'right' },
      7: { width: 14, z: FMT_MONEY, align: 'right' },
      8: { width: 14, z: FMT_MONEY, align: 'right' },
      9: { width: 14, z: FMT_MONEY_SIGNED, align: 'right' },
      10: { width: 11, z: FMT_PCT, align: 'right' },
    },
    undefined,
    'Sin ventas en el período',
  )
}

function buildGastos(wb: ExcelJS.Workbook, data: ReporteData) {
  const rows: (string | number | Date | null)[][] = data.gastos.map((g) => [
    isoToDate(g.fecha),
    CAT_GASTO_LABEL[g.categoria] ?? g.categoria,
    g.descripcion,
    g.monto,
    g.recurrente ? 'Sí' : 'No',
    g.notas ?? '',
  ])
  let total: { label: string; values: (string | number | null)[] } | undefined
  if (data.gastos.length > 0) {
    const t = data.gastos.reduce((s, g) => s + g.monto, 0)
    total = { label: '', values: ['', 'TOTAL', t, '', ''] }
  }
  buildTableSheet(wb, 'Gastos generales',
    ['Fecha', 'Categoría', 'Descripción', 'Monto', 'Recurrente', 'Notas'],
    rows,
    {
      1: { width: 13, z: FMT_DATE, align: 'center' },
      2: { width: 14, align: 'left' },
      3: { width: 36, align: 'left' },
      4: { width: 14, z: FMT_MONEY, align: 'right' },
      5: { width: 12, align: 'center' },
      6: { width: 28, align: 'left' },
    },
    total,
    'Sin gastos generales en el período',
  )
}

function buildReparaciones(wb: ExcelJS.Workbook, data: ReporteData) {
  const rows: (string | number | Date | null)[][] = data.reparaciones.map((r) => [
    isoToDate(r.fecha),
    r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.anio}` : '—',
    CAT_REP_LABEL[r.categoria] ?? r.categoria,
    r.descripcion,
    r.proveedor ?? '',
    r.costo,
  ])
  let total: { label: string; values: (string | number | null)[] } | undefined
  if (data.reparaciones.length > 0) {
    const t = data.reparaciones.reduce((s, r) => s + r.costo, 0)
    total = { label: '', values: ['', '', 'TOTAL', '', t] }
  }
  buildTableSheet(wb, 'Reparaciones',
    ['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Proveedor', 'Costo'],
    rows,
    {
      1: { width: 13, z: FMT_DATE, align: 'center' },
      2: { width: 24, align: 'left' },
      3: { width: 14, align: 'left' },
      4: { width: 32, align: 'left' },
      5: { width: 18, align: 'left' },
      6: { width: 14, z: FMT_MONEY, align: 'right' },
    },
    total,
    'Sin reparaciones registradas en el período',
  )
}

export async function exportExcel(data: ReporteData): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MotorHub'
  wb.created = new Date(data.generadoEn)

  buildResumen(wb, data)
  buildPorMarca(wb, data)
  buildVendidos(wb, data)
  buildGastos(wb, data)
  buildReparaciones(wb, data)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `motorhub-reporte-${data.periodo.filenameSlug}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReporteData } from './buildReporteData'

const INK: [number, number, number] = [20, 20, 19]
const CREAM: [number, number, number] = [243, 240, 238]
const GREEN: [number, number, number] = [74, 122, 90]
const RED: [number, number, number] = [160, 72, 72]
const MUTED: [number, number, number] = [120, 118, 115]
const GHOST: [number, number, number] = [240, 237, 234]

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

const fmtMoney = (n: number) => {
  const abs = Math.abs(Math.round(n))
  const sign = n < 0 ? '-' : ''
  return `${sign}$${abs.toLocaleString('es-AR')}`
}

const fmtMoneySigned = (n: number) => {
  const abs = Math.abs(Math.round(n))
  if (n > 0) return `+$${abs.toLocaleString('es-AR')}`
  if (n < 0) return `-$${abs.toLocaleString('es-AR')}`
  return `$0`
}

const fmtPct = (n: number) => {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

const fmtDate = (iso: string) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const fmtDateGen = (iso: string) => {
  const dt = new Date(iso)
  const d = String(dt.getDate()).padStart(2, '0')
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const y = String(dt.getFullYear()).slice(-2)
  return `${d}/${m}/${y}`
}

export function exportPdf(data: ReporteData): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── HEADER ──
  doc.setFillColor(INK[0], INK[1], INK[2])
  doc.rect(0, 0, pageW, 22, 'F')

  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('MOTORHUB', 14, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(CREAM[0], CREAM[1], CREAM[2])
  doc.text('Reporte financiero', 14, 17)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(data.periodo.label, pageW - 14, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generado ${fmtDateGen(data.generadoEn)}`, pageW - 14, 17, { align: 'right' })

  let y = 32

  // ── HERO KPI: GANANCIA NETA ──
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('GANANCIA NETA', pageW / 2, y, { align: 'center' })
  y += 9
  const isPos = data.kpis.gananciaNeta >= 0
  const heroColor = isPos ? GREEN : RED
  doc.setTextColor(heroColor[0], heroColor[1], heroColor[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text(fmtMoneySigned(data.kpis.gananciaNeta), pageW / 2, y, { align: 'center' })
  y += 10

  // ── 4 KPIs SECUNDARIOS ──
  const kpiTiles = [
    { label: 'VENTAS', value: String(data.kpis.ventas) },
    { label: 'INGRESOS', value: fmtMoney(data.kpis.ingresos) },
    { label: 'INVERSIÓN', value: fmtMoney(data.kpis.inversion) },
    { label: 'GASTOS GRALES.', value: fmtMoney(data.kpis.gastosGenerales) },
  ]
  const tileW = (pageW - 28 - 6) / 4
  const tileH = 16
  kpiTiles.forEach((tile, i) => {
    const x = 14 + i * (tileW + 2)
    doc.setFillColor(GHOST[0], GHOST[1], GHOST[2])
    doc.roundedRect(x, y, tileW, tileH, 2, 2, 'F')
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.text(tile.label, x + tileW / 2, y + 5, { align: 'center' })
    doc.setTextColor(INK[0], INK[1], INK[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(tile.value, x + tileW / 2, y + 12, { align: 'center' })
  })
  y += tileH + 8

  // ── TABLA: GANANCIA POR MARCA ──
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Ganancia por marca', 14, y)
  y += 3

  if (data.porMarca.length === 0) {
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Sin ventas en el período', 14, y + 5)
    y += 12
  } else {
    const totalMarca = data.porMarca.reduce(
      (acc, m) => ({
        unidades: acc.unidades + m.unidades,
        ingresos: acc.ingresos + m.ingresos,
        costo: acc.costo + m.costo,
        ganancia: acc.ganancia + m.ganancia,
      }),
      { unidades: 0, ingresos: 0, costo: 0, ganancia: 0 },
    )
    const roiTotal = totalMarca.costo > 0 ? (totalMarca.ganancia / totalMarca.costo) * 100 : 0

    autoTable(doc, {
      startY: y + 1,
      head: [['Marca', 'Unid.', 'Ingresos', 'Costo total', 'Ganancia', 'ROI %']],
      body: data.porMarca.map((m) => [
        m.marca,
        String(m.unidades),
        fmtMoney(m.ingresos),
        fmtMoney(m.costo),
        { content: fmtMoneySigned(m.ganancia), styles: { textColor: m.ganancia >= 0 ? GREEN : RED, fontStyle: 'bold' } },
        { content: fmtPct(m.roi), styles: { textColor: m.roi >= 0 ? GREEN : RED } },
      ]),
      foot: [[
        { content: 'TOTAL', styles: { fontStyle: 'bold' } },
        { content: String(totalMarca.unidades), styles: { fontStyle: 'bold' } },
        { content: fmtMoney(totalMarca.ingresos), styles: { fontStyle: 'bold' } },
        { content: fmtMoney(totalMarca.costo), styles: { fontStyle: 'bold' } },
        { content: fmtMoneySigned(totalMarca.ganancia), styles: { fontStyle: 'bold', textColor: totalMarca.ganancia >= 0 ? GREEN : RED } },
        { content: fmtPct(roiTotal), styles: { fontStyle: 'bold' } },
      ]],
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: 'bold' },
      footStyles: { fillColor: GHOST, textColor: INK },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── TABLA: VEHÍCULOS VENDIDOS ──
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Vehículos vendidos', 14, y)
  y += 3

  if (data.vendidos.length === 0) {
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Sin ventas en el período', 14, y + 5)
    y += 12
  } else {
    autoTable(doc, {
      startY: y + 1,
      head: [['Vehículo', 'Fecha venta', 'Compra', 'Reparaciones', 'Venta', 'Ganancia', 'ROI %']],
      body: data.vendidos.map((v) => [
        `${v.marca} ${v.modelo} ${v.anio}`,
        fmtDate(v.fechaVenta),
        fmtMoney(v.precioCompra + v.gastosAdic),
        fmtMoney(v.reparaciones),
        fmtMoney(v.precioVenta),
        { content: fmtMoneySigned(v.ganancia), styles: { textColor: v.ganancia >= 0 ? GREEN : RED, fontStyle: 'bold' } },
        { content: fmtPct(v.roi), styles: { textColor: v.roi >= 0 ? GREEN : RED } },
      ]),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── TABLA: GASTOS GENERALES ──
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Gastos generales', 14, y)
  y += 3

  if (data.gastos.length === 0) {
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Sin gastos generales en el período', 14, y + 5)
    y += 12
  } else {
    const totalGastos = data.gastos.reduce((s, g) => s + g.monto, 0)
    autoTable(doc, {
      startY: y + 1,
      head: [['Fecha', 'Categoría', 'Descripción', 'Monto']],
      body: data.gastos.map((g) => [
        fmtDate(g.fecha),
        CAT_GASTO_LABEL[g.categoria] ?? g.categoria,
        g.descripcion,
        fmtMoney(g.monto),
      ]),
      foot: [[
        { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: fmtMoney(totalGastos), styles: { fontStyle: 'bold' } },
      ]],
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: 'bold' },
      footStyles: { fillColor: GHOST, textColor: INK },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { cellWidth: 28 },
        3: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // ── TABLA: REPARACIONES DEL PERÍODO ──
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Reparaciones del período', 14, y)
  y += 3

  if (data.reparaciones.length === 0) {
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Sin reparaciones registradas', 14, y + 5)
  } else {
    const totalRep = data.reparaciones.reduce((s, r) => s + r.costo, 0)
    autoTable(doc, {
      startY: y + 1,
      head: [['Fecha', 'Vehículo', 'Categoría', 'Descripción', 'Proveedor', 'Costo']],
      body: data.reparaciones.map((r) => [
        fmtDate(r.fecha),
        r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.anio}` : '—',
        CAT_REP_LABEL[r.categoria] ?? r.categoria,
        r.descripcion,
        r.proveedor ?? '—',
        fmtMoney(r.costo),
      ]),
      foot: [[
        { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold' } },
        { content: fmtMoney(totalRep), styles: { fontStyle: 'bold' } },
      ]],
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: INK, textColor: CREAM, fontStyle: 'bold' },
      footStyles: { fillColor: GHOST, textColor: INK },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        2: { cellWidth: 24 },
        5: { halign: 'right', cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── FOOTER en cada página ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    doc.setTextColor(180, 178, 175)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(`MotorHub · Pág. ${i}/${pageCount}`, pageW / 2, h - 6, { align: 'center' })
  }

  // doc.save() es flaky en algunos browsers (popup blocker, target=_blank). Pattern blob+anchor es bulletproof.
  const filename = `motorhub-reporte-${data.periodo.filenameSlug}.pdf`
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

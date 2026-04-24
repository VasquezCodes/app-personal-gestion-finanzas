import { PageHeader } from '../../components/ios/PageHeader'

export default function Reparaciones() {
  return (
    <>
      <PageHeader titulo="Reparaciones" />
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <p className="text-(--ios-label-secondary)">
          Historial de reparaciones por unidad.
        </p>
      </main>
    </>
  )
}

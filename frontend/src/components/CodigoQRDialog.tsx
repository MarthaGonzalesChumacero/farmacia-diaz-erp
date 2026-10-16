import { QRCodeSVG } from 'qrcode.react'

interface CodigoQRDialogProps {
  titulo: string
  valor: string
  detalle: string
  onCerrar: () => void
}

function CodigoQRDialog({
  titulo,
  valor,
  detalle,
  onCerrar,
}: CodigoQRDialogProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="codigo-qr-titulo"
        className="w-full max-w-sm rounded-xl bg-app-card p-6 text-center shadow-xl"
      >
        <h2 id="codigo-qr-titulo" className="text-lg font-bold text-app-text">{titulo}</h2>
        <p className="mt-1 text-sm text-app-muted">{detalle}</p>
        <div className="mx-auto my-5 flex w-fit rounded-lg border border-app-border bg-app-card p-3">
          <QRCodeSVG value={valor} size={280} level="M" marginSize={4} title={titulo} />
        </div>
        <code className="block break-all text-xs text-app-muted">{valor}</code>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-lg bg-[#003F63] px-4 py-2.5 font-semibold text-white hover:bg-[#00507d]"
        >
          Cerrar
        </button>
      </section>
    </div>
  )
}

export default CodigoQRDialog
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface BarcodeScannerProps {
  onDetected: (value: string) => void
}

function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const resultadoLeidoRef = useRef(false)
  const emitirResultado = useEffectEvent(onDetected)
  const [error, setError] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let montado = true
    resultadoLeidoRef.current = false
    const lector = new BrowserMultiFormatReader()

    lector.decodeFromVideoDevice(undefined, video, (resultado) => {
      if (resultado && montado && !resultadoLeidoRef.current) {
        resultadoLeidoRef.current = true
        controlsRef.current?.stop()
        emitirResultado(resultado.getText())
      }
    })
      .then((controles) => {
        if (montado && !resultadoLeidoRef.current) {
          controlsRef.current = controles
        }
        else controles.stop()
      })
      .catch(() => {
        if (montado) {
          setError('No se pudo iniciar la cámara. Verifica los permisos del navegador.')
        }
      })

    return () => {
      montado = false
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [])

  return (
    <div>
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-video w-full rounded-lg bg-slate-950 object-cover"
        aria-label="Vista de cámara para lectura de código"
      />
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  )
}

export default BarcodeScanner
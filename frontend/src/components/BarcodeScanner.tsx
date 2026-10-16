import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { decodificarFotograma, rgbaALuminancia } from '../lib/lectorCodigos'

interface BarcodeScannerProps {
  onDetected: (value: string) => void
}

type Estado = 'iniciando' | 'camara' | 'leyendo' | 'detectado' | 'error'

const ANCHO_MAXIMO_ANALISIS = 1280
const INTERVALO_MS = 150

function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const emitirResultado = useEffectEvent(onDetected)
  const [estado, setEstado] = useState<Estado>('iniciando')
  const [detalle, setDetalle] = useState('')
  const [fotogramas, setFotogramas] = useState(0)
  const [valorDetectado, setValorDetectado] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let activo = true
    let flujo: MediaStream | null = null
    let temporizador = 0
    let analizados = 0
    let ultimoReporte = 0
    const lienzo = document.createElement('canvas')
    const contexto = lienzo.getContext('2d', { willReadFrequently: true })

    const detener = () => {
      activo = false
      window.clearTimeout(temporizador)
      flujo?.getTracks().forEach((pista) => pista.stop())
      video.srcObject = null
    }

    const fallar = (mensaje: string) => {
      if (!activo) return
      setEstado('error')
      setDetalle(mensaje)
    }

    const analizar = async () => {
      if (!activo) return

      if (contexto && video.readyState >= 2 && video.videoWidth > 0) {
        const escala = Math.min(1, ANCHO_MAXIMO_ANALISIS / video.videoWidth)
        lienzo.width = Math.round(video.videoWidth * escala)
        lienzo.height = Math.round(video.videoHeight * escala)
        contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height)
        analizados += 1

        let texto: string | null = null
        try {
          const { data } = contexto.getImageData(0, 0, lienzo.width, lienzo.height)
          texto = decodificarFotograma(rgbaALuminancia(data), lienzo.width, lienzo.height)
        } catch (error) {
          fallar(`Error de lectura: ${error instanceof Error ? error.message : String(error)}`)
          return
        }

        if (!activo) return

        if (texto) {
          detener()
          setEstado('detectado')
          setValorDetectado(texto)
          emitirResultado(texto)
          return
        }

        const ahora = Date.now()
        if (ahora - ultimoReporte > 500) {
          ultimoReporte = ahora
          setEstado('leyendo')
          setFotogramas(analizados)
        }
      }

      temporizador = window.setTimeout(() => void analizar(), INTERVALO_MS)
    }

    const iniciar = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        fallar('Este navegador no permite usar la cámara. Usa localhost o HTTPS.')
        return
      }

      try {
        try {
          flujo = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'OverconstrainedError') {
            flujo = await navigator.mediaDevices.getUserMedia({ video: true })
          } else {
            throw error
          }
        }

        if (!activo) {
          flujo.getTracks().forEach((pista) => pista.stop())
          return
        }

        video.srcObject = flujo
        await video.play()
        if (!activo) return

        setEstado('camara')
        setDetalle(`${video.videoWidth}×${video.videoHeight}`)
        void analizar()
      } catch (error) {
        const nombre = error instanceof DOMException ? error.name : ''
        if (nombre === 'NotAllowedError') fallar('Permiso de cámara denegado. Habilítalo en el navegador.')
        else if (nombre === 'NotFoundError') fallar('No se encontró ninguna cámara.')
        else if (nombre === 'NotReadableError') fallar('La cámara está siendo usada por otra aplicación.')
        else fallar(`No se pudo iniciar la cámara${error instanceof Error ? `: ${error.message}` : '.'}`)
      }
    }

    // Se difiere el arranque para que el doble montaje de StrictMode no abra dos flujos sobre el mismo <video>.
    const arranque = window.setTimeout(() => void iniciar(), 0)

    return () => {
      window.clearTimeout(arranque)
      detener()
    }
  }, [])

  const mensaje: Record<Estado, string> = {
    iniciando: 'Iniciando cámara…',
    camara: `Cámara activa (${detalle}). Iniciando lector…`,
    leyendo: `Lector iniciado · cámara ${detalle} · fotogramas analizados: ${fotogramas}`,
    detectado: `Código detectado: ${valorDetectado}`,
    error: detalle,
  }

  return (
    <div>
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-video w-full rounded-lg bg-slate-950 object-cover"
        aria-label="Vista de cámara para lectura de código"
      />
      <p
        role="status"
        className={`mt-2 text-xs ${estado === 'error' ? 'text-red-700 dark:text-red-300' : estado === 'detectado' ? 'font-semibold text-emerald-700 dark:text-[#83C441]' : 'text-app-muted'}`}
      >
        {mensaje[estado]}
      </p>
      {estado !== 'error' && (
        <p className="mt-1 text-xs text-app-muted">
          Centra el código dentro de la imagen, a unos 15–25 cm de la cámara, con buena luz y sin reflejos.
        </p>
      )}
    </div>
  )
}

export default BarcodeScanner

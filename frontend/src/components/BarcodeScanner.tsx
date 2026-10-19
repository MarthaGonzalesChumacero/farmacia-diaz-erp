import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  crearDetectorNativo,
  decodificarFotograma,
  rgbaALuminancia,
  type DetectorNativo,
} from '../lib/lectorCodigos'

interface BarcodeScannerProps {
  onDetected: (value: string) => void
}

type Estado = 'iniciando' | 'camara' | 'leyendo' | 'detectado' | 'error'
type MotorLector = 'nativo' | 'zxing' | 'iniciando'

// Intervalo ágil para alcanzar ~15-20 fotogramas por segundo
const INTERVALO_MS = 60
const TAMANO_ROI = 500

function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const emitirResultado = useEffectEvent(onDetected)
  const [estado, setEstado] = useState<Estado>('iniciando')
  const [motor, setMotor] = useState<MotorLector>('iniciando')
  const [detalle, setDetalle] = useState('')
  const [fotogramas, setFotogramas] = useState(0)
  const [valorDetectado, setValorDetectado] = useState('')
  const [tiempoReconocimiento, setTiempoReconocimiento] = useState<string | null>(null)
  const [segundosTranscurridos, setSegundosTranscurridos] = useState<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let activo = true
    let detectado = false
    let flujo: MediaStream | null = null
    let detectorNativo: DetectorNativo | null = null
    let temporizador = 0
    let analizados = 0
    let ultimoReporte = 0
    let tiempoInicio = 0

    // Lienzo dedicado al área central (Viewfinder / ROI) a 500x500
    const lienzoROI = document.createElement('canvas')
    lienzoROI.width = TAMANO_ROI
    lienzoROI.height = TAMANO_ROI
    const contextoROI = lienzoROI.getContext('2d', { willReadFrequently: true })

    // Lienzo de respaldo para fotograma completo a escala ligera (640x360)
    const lienzoCompleto = document.createElement('canvas')
    lienzoCompleto.width = 640
    lienzoCompleto.height = 360
    const contextoCompleto = lienzoCompleto.getContext('2d', { willReadFrequently: true })

    const detener = () => {
      activo = false
      window.clearTimeout(temporizador)
      flujo?.getTracks().forEach((pista) => pista.stop())
      video.srcObject = null
    }

    const fallar = (mensajeError: string) => {
      if (!activo) return
      setEstado('error')
      setDetalle(mensajeError)
    }

    const analizar = async () => {
      if (!activo || detectado) return

      if (video.readyState >= 2 && video.videoWidth > 0) {
        analizados += 1
        let texto: string | null = null

        // 1. Extraer el área central (donde el usuario coloca el código)
        if (contextoROI) {
          const lado = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.7)
          const sx = Math.round((video.videoWidth - lado) / 2)
          const sy = Math.round((video.videoHeight - lado) / 2)

          contextoROI.drawImage(video, sx, sy, lado, lado, 0, 0, TAMANO_ROI, TAMANO_ROI)

          // Probar detector nativo si está disponible
          if (detectorNativo) {
            try {
              texto = await detectorNativo.detectarEnCanvas(lienzoROI)
            } catch {
              // Silencioso
            }
          }

          // Si no detectó nativo, procesar con ZXing multi-binarizador rápido en 500x500
          if (!texto) {
            try {
              const { data } = contextoROI.getImageData(0, 0, TAMANO_ROI, TAMANO_ROI)
              texto = decodificarFotograma(rgbaALuminancia(data), TAMANO_ROI, TAMANO_ROI)
            } catch (error) {
              fallar(`Error de lectura: ${error instanceof Error ? error.message : String(error)}`)
              return
            }
          }
        }

        // 2. Respaldo: cada 3 fotogramas verificar el fotograma completo (por si está fuera del centro)
        if (!texto && contextoCompleto && analizados % 3 === 0) {
          contextoCompleto.drawImage(video, 0, 0, 640, 360)
          try {
            if (detectorNativo) {
              texto = await detectorNativo.detectarEnCanvas(lienzoCompleto)
            }
            if (!texto) {
              const { data } = contextoCompleto.getImageData(0, 0, 640, 360)
              texto = decodificarFotograma(rgbaALuminancia(data), 640, 360)
            }
          } catch {
            // Continuar
          }
        }

        if (!activo || detectado) return

        // Código reconocido: evitar lecturas duplicadas y calcular tiempo exacto
        if (texto) {
          detectado = true
          detener()
          const duracion = ((performance.now() - tiempoInicio) / 1000).toFixed(2)
          setTiempoReconocimiento(duracion)
          setEstado('detectado')
          setValorDetectado(texto)
          emitirResultado(texto)
          return
        }

        const ahora = performance.now()
        if (ahora - ultimoReporte > 300) {
          ultimoReporte = ahora
          setEstado('leyendo')
          setFotogramas(analizados)
          setSegundosTranscurridos(Number(((ahora - tiempoInicio) / 1000).toFixed(1)))
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
        // Detectar si el navegador cuenta con BarcodeDetector nativo
        detectorNativo = await crearDetectorNativo()
        if (activo) {
          setMotor(detectorNativo ? 'nativo' : 'zxing')
        }

        try {
          flujo = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: 'environment' },
            },
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

        // Solicitar autofoco continuo si el hardware de la cámara lo permite
        const pistaVideo = flujo.getVideoTracks()[0]
        if (pistaVideo) {
          try {
            const capacidades = (pistaVideo.getCapabilities ? pistaVideo.getCapabilities() : {}) as {
              focusMode?: string[]
              exposureMode?: string[]
            }
            const avanzados: Record<string, unknown> = {}
            if (capacidades.focusMode?.includes('continuous')) {
              avanzados.focusMode = 'continuous'
            }
            if (capacidades.exposureMode?.includes('continuous')) {
              avanzados.exposureMode = 'continuous'
            }
            if (Object.keys(avanzados).length > 0) {
              await pistaVideo.applyConstraints({
                advanced: [avanzados as MediaTrackConstraintSet],
              })
            }
          } catch {
            // Continuar normalmente
          }
        }

        video.srcObject = flujo
        await video.play()
        if (!activo) return

        tiempoInicio = performance.now()
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

    const arranque = window.setTimeout(() => void iniciar(), 0)

    return () => {
      window.clearTimeout(arranque)
      detener()
    }
  }, [])

  const nombreMotor =
    motor === 'nativo'
      ? 'BarcodeDetector nativo'
      : motor === 'zxing'
        ? 'ZXing optimizado'
        : 'Detectando motor'

  const mensaje: Record<Estado, string> = {
    iniciando: 'Iniciando cámara…',
    camara: `Cámara activa (${detalle}) · ${nombreMotor}. Iniciando lector…`,
    leyendo: `Lector activo (${nombreMotor}) · cámara ${detalle} · analizando (${segundosTranscurridos.toFixed(1)}s · ${fotogramas} fotogramas)`,
    detectado: `¡Código detectado en ${tiempoReconocimiento ?? '0'}s!: ${valorDetectado}`,
    error: detalle,
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover"
          aria-label="Vista de cámara para lectura de código"
        />

        {/* Guía visual de enfoque / Viewfinder con proporciones del ROI */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <div
            className={`relative aspect-square w-52 max-w-[68%] rounded-xl transition-all duration-200 sm:w-60 ${
              estado === 'detectado'
                ? 'border-2 border-emerald-500 shadow-[0_0_28px_rgba(16,185,129,0.55)]'
                : 'border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]'
            }`}
          >
            {/* Esquinas guía */}
            <span
              className={`absolute -top-1 -left-1 h-6 w-6 rounded-tl border-t-3 border-l-3 ${
                estado === 'detectado' ? 'border-emerald-500' : 'border-[#83c441]'
              }`}
            />
            <span
              className={`absolute -top-1 -right-1 h-6 w-6 rounded-tr border-t-3 border-r-3 ${
                estado === 'detectado' ? 'border-emerald-500' : 'border-[#83c441]'
              }`}
            />
            <span
              className={`absolute -bottom-1 -left-1 h-6 w-6 rounded-bl border-b-3 border-l-3 ${
                estado === 'detectado' ? 'border-emerald-500' : 'border-[#83c441]'
              }`}
            />
            <span
              className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-br border-b-3 border-r-3 ${
                estado === 'detectado' ? 'border-emerald-500' : 'border-[#83c441]'
              }`}
            />

            {/* Haz de escaneo activo */}
            {estado === 'leyendo' && (
              <div className="absolute inset-x-2 top-2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-[#83c441] to-transparent shadow-[0_0_8px_#83c441]" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          className={`text-xs ${
            estado === 'error'
              ? 'text-red-700 dark:text-red-300'
              : estado === 'detectado'
                ? 'font-semibold text-emerald-700 dark:text-[#83c441]'
                : 'text-app-muted'
          }`}
        >
          {mensaje[estado]}
        </p>

        {tiempoReconocimiento && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-[#83c441]">
            ⚡ Reconocido en {tiempoReconocimiento}s ({fotogramas} fotogramas)
          </span>
        )}
      </div>

      {estado !== 'error' && (
        <p className="mt-1 text-xs text-app-muted">
          Centra el código (QR o barras EAN-13) dentro del recuadro a unos <strong>20–35 cm</strong> de la cámara donde se observe enfocado.
        </p>
      )}
    </div>
  )
}

export default BarcodeScanner



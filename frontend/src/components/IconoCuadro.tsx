import type { LucideIcon } from 'lucide-react'

const TAMANOS = {
  sm: { caja: 'h-7 w-7 rounded-md', icono: 15 },
  md: { caja: 'h-11 w-11 rounded-lg', icono: 23 },
  lg: { caja: 'h-12 w-12 rounded-xl', icono: 26 },
}

interface IconoCuadroProps {
  icono: LucideIcon
  color: string
  tamano?: keyof typeof TAMANOS
  className?: string
}

// El amarillo lleva símbolo oscuro para mantener el contraste.
function IconoCuadro({ icono: Icono, color, tamano = 'md', className = '' }: IconoCuadroProps) {
  const t = TAMANOS[tamano]
  const simbolo = color.toUpperCase() === '#E5A000' ? '#3B2A00' : '#FFFFFF'

  return (
    <span
      className={`flex shrink-0 items-center justify-center ring-1 ring-white/20 ${t.caja} ${className}`}
      style={{ backgroundColor: color, color: simbolo }}
    >
      <Icono size={t.icono} />
    </span>
  )
}

export default IconoCuadro

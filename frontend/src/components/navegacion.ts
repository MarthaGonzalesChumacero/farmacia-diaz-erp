import {
  AlertTriangle,
  Boxes,
  FileBarChart2,
  Layers,
  PackageSearch,
  Pill,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface OpcionNavegacion {
  ruta: string
  titulo: string
  descripcion: string
  icono: LucideIcon
  color: string
  soloAdmin?: boolean
}

export const navegacion: OpcionNavegacion[] = [
  {
    ruta: '/inventario',
    titulo: 'Inventario',
    descripcion: 'Medicamentos, lotes, stock y movimientos.',
    icono: Boxes,
    color: '#1680C4',
  },
  {
    ruta: '/inventario/reportes',
    titulo: 'Reportes',
    descripcion: 'Stock, vencimientos, movimientos y auditoría.',
    icono: FileBarChart2,
    color: '#003F63',
    soloAdmin: true,
  },
  {
    ruta: '/alertas',
    titulo: 'Alertas de inventario',
    descripcion: 'Stock crítico y lotes próximos a vencer.',
    icono: AlertTriangle,
    color: '#E5A000',
  },
  {
    ruta: '/usuarios',
    titulo: 'Usuarios',
    descripcion: 'Administración de cuentas y roles.',
    icono: Users,
    color: '#7B68C8',
    soloAdmin: true,
  },
  {
    ruta: '/ventas',
    titulo: 'Ventas',
    descripcion: 'Registro y consulta de ventas realizadas.',
    icono: ShoppingCart,
    color: '#16A36A',
  },
  {
    ruta: '/inventario/stock',
    titulo: 'Control de stock',
    descripcion: 'Stock crítico y medicamentos próximos a vencer.',
    icono: PackageSearch,
    color: '#E58A24',
  },
]

export interface ItemMenu {
  ruta: string
  titulo: string
  icono: LucideIcon
  color: string
  soloAdmin?: boolean
}

export interface SeccionMenu {
  titulo: string
  items: ItemMenu[]
}

const modulo = (ruta: string, titulo?: string, icono?: LucideIcon): ItemMenu => {
  const base = navegacion.find((n) => n.ruta === ruta)!
  return {
    ruta,
    titulo: titulo ?? base.titulo,
    icono: icono ?? base.icono,
    color: base.color,
    soloAdmin: base.soloAdmin,
  }
}

// Agrupación visual del menú lateral; las rutas y permisos salen de `navegacion` o de las rutas existentes.
export const seccionesMenu: SeccionMenu[] = [
  {
    titulo: 'Inventario',
    items: [
      modulo('/inventario', 'Medicamentos', Pill),
      { ruta: '/inventario/lotes', titulo: 'Lotes', icono: Layers, color: '#1680C4' },
      {
        ruta: '/inventario/proveedores',
        titulo: 'Proveedores',
        icono: Truck,
        color: '#1680C4',
        soloAdmin: true,
      },
      modulo('/inventario/stock'),
      modulo('/alertas'),
      modulo('/inventario/reportes'),
    ],
  },
  { titulo: 'Ventas', items: [modulo('/ventas')] },
  { titulo: 'Usuarios', items: [modulo('/usuarios')] },
]

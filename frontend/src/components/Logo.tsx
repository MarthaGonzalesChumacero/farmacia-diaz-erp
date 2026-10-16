import logoClaro from '../assets/logo-farmadiaz.png'
import logoOscuro from '../assets/logo-farmadiaz-oscuro.png'

function Logo({ className = '' }: { className?: string }) {
  return (
    <>
      <img src={logoClaro} alt="Farmacia Díaz" className={`dark:hidden ${className}`} />
      <img src={logoOscuro} alt="Farmacia Díaz" className={`hidden dark:block ${className}`} />
    </>
  )
}

export default Logo

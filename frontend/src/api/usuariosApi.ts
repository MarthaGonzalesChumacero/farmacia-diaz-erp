import axios from 'axios'

const usuariosApi = axios.create({
  baseURL: 'https://farmacia-diaz-usuarios.enzonic.dev',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default usuariosApi
import axios from 'axios'

const usuariosApi = axios.create({
  baseURL: '/api-usuarios',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default usuariosApi
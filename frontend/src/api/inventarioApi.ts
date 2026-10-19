import axios from 'axios'

const inventarioApi = axios.create({
  baseURL: '/api-inventario',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

inventarioApi.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export default inventarioApi
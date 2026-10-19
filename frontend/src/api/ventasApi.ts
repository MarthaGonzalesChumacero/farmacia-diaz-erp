import axios from 'axios'

const ventasApi = axios.create({
  baseURL: '/api-ventas',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

ventasApi.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken')
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export default ventasApi
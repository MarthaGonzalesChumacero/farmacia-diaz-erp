import axios from 'axios'

const ventasApi = axios.create({
  baseURL: 'http://127.0.0.1:8001',
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
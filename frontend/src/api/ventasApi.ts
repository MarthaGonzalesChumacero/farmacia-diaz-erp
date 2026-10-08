import axios from 'axios'

const ventasApi = axios.create({
  baseURL: 'http://127.0.0.1:8001',
  headers: {
    'Content-Type': 'application/json',
  },
})

export default ventasApi
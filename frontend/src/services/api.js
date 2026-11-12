import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message

      if (typeof message === 'string') {
        error.message = message
      }
    }

    return Promise.reject(error)
  },
)

export default api

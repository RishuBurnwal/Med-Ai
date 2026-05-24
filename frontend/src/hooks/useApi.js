import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'

export function getErrorMessage(error) {
  if (error.code === 'ECONNABORTED') return 'Request timed out. The AI may be busy.'
  if (!error.response) return 'Network error. Please check your connection.'
  if (error.response.status === 400) return error.response.data?.detail || 'Invalid request'
  if (error.response.status === 404) return 'Resource not found'
  if (error.response.status >= 500) return 'Server error. Please try again.'
  return error.response.data?.detail || 'Something went wrong.'
}

export default function useApi(requestFn, options = {}) {
  const [data, setData] = useState(options.initialData ?? null)
  const [loading, setLoading] = useState(Boolean(options.immediate))
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const response = await requestFn(...args)
      const payload = response?.data ?? response
      setData(payload)
      return payload
    } catch (err) {
      const message = getErrorMessage(err)
      setError(message)
      if (options.toastErrors !== false) toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [requestFn, options.toastErrors])

  return { data, loading, error, execute }
}

import { useState, useEffect, useCallback } from 'react'

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>
  interval: number
  enabled?: boolean
}

interface UsePollingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function usePolling<T>({ fetcher, interval, enabled = true }: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcher()
      setData(result)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    doFetch()
    const id = setInterval(doFetch, interval)
    return () => clearInterval(id)
  }, [doFetch, interval, enabled])

  return { data, loading, error, refresh: doFetch }
}

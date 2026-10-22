import { useCallback, useEffect, useState } from 'react'
import { getShippingBillOptions, ShippingBillOptions } from '../services/shipping-bill-service'

export type OptionsStatus = 'loading' | 'ready' | 'empty' | 'error'

export interface UseShippingBillOptionsReturn {
  options: ShippingBillOptions | null
  status: OptionsStatus
  error: Error | null
  isLoading: boolean
  isEmpty: boolean
  isError: boolean
  isReady: boolean
  reload: () => void
}

/**
 * Hook to retrieve Shipping Bill dropdown options asynchronously.
 * Manages loading, error, empty, and ready states.
 * Fully safe against unmounted component state updates.
 */
export function useShippingBillOptions(): UseShippingBillOptionsReturn {
  const [options, setOptions] = useState<ShippingBillOptions | null>(null)
  const [status, setStatus] = useState<OptionsStatus>('loading')
  const [error, setError] = useState<Error | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  const reload = useCallback(() => {
    setReloadCounter((prev) => prev + 1)
  }, [])

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError(null)

    getShippingBillOptions()
      .then((data) => {
        if (!active) return

        // Verify if required option sets are empty
        const isDataEmpty =
          !data.currencies.length ||
          !data.contractTypes.length ||
          !data.loadingPorts.length ||
          !data.destinationPorts.length

        if (isDataEmpty) {
          setStatus('empty')
          setOptions(data)
        } else {
          setOptions(data)
          setStatus('ready')
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        const resolvedError = err instanceof Error ? err : new Error(String(err))
        setError(resolvedError)
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [reloadCounter])

  return {
    options,
    status,
    error,
    isLoading: status === 'loading',
    isEmpty: status === 'empty',
    isError: status === 'error',
    isReady: status === 'ready',
    reload
  }
}

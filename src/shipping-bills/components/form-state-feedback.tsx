import { routes } from '@/shared/route-paths'
import { navigate } from 'core/routing'
import { Button } from 'ui/basic/button'
import { Card, CardContent } from 'ui/basic/card'
import { Dialog, DialogContent } from 'ui/interactive/dialog'
import { AlertDanger } from 'ui/notify/alert'
import { SubmissionResult } from '../services/shipping-bill-service'

/**
 * Loading state indicator for asynchronous option loading.
 */
export function FormLoadingState() {
  return (
    <Card className="animate-pulse">
      <CardContent className="space-y-6 py-12 text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900">Loading form configurations...</h3>
          <p className="text-sm text-gray-500">
            Retrieving ports, currency exchange data, scheme codes, and regulatory options from mock services.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state view when form options service returns empty dataset.
 */
export function FormEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="space-y-4 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          ⚠️
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Form options currently unavailable</h3>
          <p className="mt-1 text-sm text-gray-600">
            The service returned no available currency, port, or trade agreement options for this session.
          </p>
        </div>
        <div>
          <Button variant="outline" onClick={onRetry}>
            ↻ Retry loading options
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Error state view when option fetching fails.
 */
export function FormErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardContent className="space-y-4 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700">
          ✕
        </div>
        <div>
          <h3 className="text-base font-semibold text-red-950">Failed to load form options</h3>
          <p className="mt-1 text-sm text-red-700">
            {error?.message ?? 'An error occurred while connecting to the mock options service.'}
          </p>
        </div>
        <div>
          <Button variant="outline" onClick={onRetry}>
            ↻ Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Submission error alert displayed inline without resetting form fields.
 */
export function SubmissionErrorBanner({ error }: { error: string }) {
  return (
    <AlertDanger
      title="Submission Failed"
      description={`${error} All entered values have been preserved.`}
      className="mb-4"
    />
  )
}

/**
 * Modal dialog confirming successful submission with reference identifier.
 */
export function SubmissionSuccessModal({
  result,
  onClose
}: {
  result: SubmissionResult
  onClose: () => void
}) {
  const bill = result.bill

  return (
    <Dialog open={true} setOpen={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
            ✓
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Shipping Bill Submitted</h3>
          <p className="mt-1 text-sm text-gray-500">{result.message}</p>
        </div>

        <div className="my-5 rounded-lg border border-gray-100 bg-gray-50 p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Reference Number:</span>
            <span className="font-mono font-semibold text-primary-700">{result.referenceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Job Date:</span>
            <span className="font-medium text-gray-900">{bill.values.jobDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Invoices:</span>
            <span className="font-medium text-gray-900">{bill.values.invoices.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Submitted at:</span>
            <span className="font-medium text-gray-900">
              {new Date(result.submittedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-5">
          Note: This is a simulated mock reference identifier for demonstration and not an official customs-issued Shipping Bill number.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Continue Editing
          </Button>
          <Button onClick={() => navigate(routes.dashboard)}>
            View Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

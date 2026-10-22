import { Button } from 'ui/basic/button'
import { TabKey } from '../hooks/use-shipping-bill-form'

export interface FormActionsProps {
  activeTab: TabKey
  isSubmitting: boolean
  isSubmitted: boolean
  onCancel: () => void
  onPrevious: () => void
  onSaveAndNext: () => void
}

/**
 * Action controls for navigating between tabs and submitting the shipping bill.
 * Automatically guards against duplicate submissions and provides loading indicators.
 */
export function FormActions({
  activeTab,
  isSubmitting,
  isSubmitted,
  onCancel,
  onPrevious,
  onSaveAndNext
}: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5">
      <Button
        variant="outline"
        type="button"
        disabled={isSubmitting}
        onClick={onCancel}>
        Cancel
      </Button>

      <div className="flex items-center gap-3">
        {activeTab !== 'details' && (
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={onPrevious}>
            ← Previous
          </Button>
        )}

        {activeTab !== 'documents' ? (
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault()
              onSaveAndNext()
            }}>
            Save & Next →
          </Button>
        ) : (
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || isSubmitted}>
            {isSubmitting ? 'Submitting to Customs...' : 'Submit Shipping Bill'}
          </Button>
        )}
      </div>
    </div>
  )
}

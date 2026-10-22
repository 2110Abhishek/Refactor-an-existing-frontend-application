import { routes } from '@/shared/route-paths'
import { Form } from 'core/form/components'
import { navigate, useParams } from 'core/routing'
import { Button } from 'ui/basic/button'
import { Tabs, TabsList, TabsTrigger } from 'ui/interactive/tabs'
import { CargoDocumentsSection } from './components/cargo-documents-section'
import { ExporterSection } from './components/exporter-section'
import { FormActions } from './components/form-actions'
import {
  FormEmptyState,
  FormErrorState,
  FormLoadingState,
  SubmissionErrorBanner,
  SubmissionSuccessModal
} from './components/form-state-feedback'
import { InvoicesSection } from './components/invoices-section'
import { ShipmentSection } from './components/shipment-section'
import { WorkflowStepsHeader } from './components/workflow-steps-header'
import { useDemoData } from './demo-store'
import { useShippingBillForm } from './hooks/use-shipping-bill-form'
import { useShippingBillOptions } from './hooks/use-shipping-bill-options'
import { Branch, SavedBill } from './model'
import { BranchDialog, PartyDialog } from './party-dialogs'
import { shippingBillService } from './services/shipping-bill-service'

interface PersistentTabProps {
  value: string
  activeTab: string
  children: React.ReactNode
  className?: string
}

/**
 * Keeps inactive tab DOM nodes mounted and registered so React Hook Form
 * can validate the entire document across all sections on submit.
 */
function PersistentTab({ value, activeTab, children, className = '' }: PersistentTabProps) {
  return (
    <div role="tabpanel" hidden={activeTab !== value} className={`mt-3 ${className}`}>
      {children}
    </div>
  )
}

function ShippingBillEditor({ bill }: { bill?: SavedBill }) {
  const { exporters, businesses } = useDemoData()

  // 1. Asynchronously retrieve form options from mock service
  const {
    options,
    isLoading: optionsLoading,
    isError: optionsError,
    isEmpty: optionsEmpty,
    error: loadError,
    reload: reloadOptions
  } = useShippingBillOptions()

  // 2. Form state orchestrator
  const {
    formCtx,
    activeTab,
    setActiveTab,
    marksAndNumbersOptions,
    marksAndNumbersLoading,
    quickAdd,
    setQuickAdd,
    quickBranch,
    setQuickBranch,
    handleQuickSaved,
    isSubmitting,
    isSubmitted,
    submissionResult,
    submissionError,
    clearSubmissionResult,
    handleSaveAndNext,
    handlePrevious,
    handleFormSubmit
  } = useShippingBillForm(bill)

  const { setValue, watch } = formCtx.hooks
  const formValues = watch()
  const hasContainers = formValues.containers.length > 0

  // Asynchronous Loading State
  if (optionsLoading) {
    return (
      <div className="space-y-5">
        <WorkflowStepsHeader />
        <FormLoadingState />
      </div>
    )
  }

  // Service Error State with Retry
  if (optionsError) {
    return (
      <div className="space-y-5">
        <WorkflowStepsHeader />
        <FormErrorState error={loadError} onRetry={reloadOptions} />
      </div>
    )
  }

  // Empty State with Retry
  if (optionsEmpty || !options) {
    return (
      <div className="space-y-5">
        <WorkflowStepsHeader />
        <FormEmptyState onRetry={reloadOptions} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="mb-2 text-sm text-gray-500 hover:underline"
            onClick={() => navigate(routes.dashboard)}>
            ← Shipping bills
          </button>
          <h1 className="text-2xl font-semibold text-gray-950">
            {bill ? `Edit shipping bill #${bill.id}` : 'New shipping bill'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the shipment basics first. Open advanced sections only when applicable.
          </p>
        </div>
      </div>

      {/* Visual Workflow Steps Banner */}
      <WorkflowStepsHeader />

      {/* Main Form */}
      <Form ctx={formCtx} handleSubmit={handleFormSubmit} className="space-y-5">
        {submissionError && <SubmissionErrorBanner error={submissionError} />}

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">1. Details</TabsTrigger>
            <TabsTrigger value="invoices">2. Invoices & goods</TabsTrigger>
            <TabsTrigger value="documents">3. Others</TabsTrigger>
          </TabsList>

          {/* Section 1: Details */}
          <PersistentTab value="details" activeTab={activeTab} className="space-y-4">
            <ExporterSection
              formCtx={formCtx}
              exporters={exporters}
              businesses={businesses}
              onQuickAdd={setQuickAdd}
              onAddBranch={setQuickBranch}
            />

            <ShipmentSection
              formCtx={formCtx}
              options={options}
              marksAndNumbersOptions={marksAndNumbersOptions}
              marksAndNumbersLoading={marksAndNumbersLoading}
              hasContainers={hasContainers}
            />
          </PersistentTab>

          {/* Section 2: Invoices & Goods */}
          <PersistentTab value="invoices" activeTab={activeTab} className="space-y-4">
            <InvoicesSection
              formCtx={formCtx}
              options={options}
              businesses={businesses}
              onQuickAdd={setQuickAdd}
              onAddBranch={setQuickBranch}
            />
          </PersistentTab>

          {/* Section 3: Others (Cargo, Documents, Licences) */}
          <PersistentTab value="documents" activeTab={activeTab} className="space-y-4">
            <CargoDocumentsSection formCtx={formCtx} options={options} />
          </PersistentTab>
        </Tabs>

        {/* Navigation & Submission Action Bar */}
        <FormActions
          activeTab={activeTab}
          isSubmitting={isSubmitting}
          isSubmitted={isSubmitted}
          onCancel={() => navigate(routes.dashboard)}
          onPrevious={handlePrevious}
          onSaveAndNext={handleSaveAndNext}
        />
      </Form>

      {/* Quick Add Party Modal Dialog */}
      {quickAdd && (
        <PartyDialog
          key={`${quickAdd.kind}-${quickAdd.role ?? 'exporter'}-${quickAdd.invoiceIndex ?? 0}`}
          kind={quickAdd.kind}
          initialRole={quickAdd.role === 'itemThirdParty' ? 'thirdParty' : quickAdd.role}
          onClose={() => setQuickAdd(null)}
          onSaved={handleQuickSaved}
        />
      )}

      {/* Quick Add Branch Modal Dialog */}
      {quickBranch && (
        <BranchDialog
          key={`${quickBranch.kind}-${quickBranch.ownerId}`}
          kind={quickBranch.kind}
          ownerId={quickBranch.ownerId}
          onClose={() => setQuickBranch(null)}
          onSaved={(branch: Branch) =>
            setValue(quickBranch.branchName, String(branch.id), { shouldValidate: true })
          }
        />
      )}

      {/* Submission Success Confirmation Modal */}
      {submissionResult && (
        <SubmissionSuccessModal
          result={submissionResult}
          onClose={clearSubmissionResult}
        />
      )}
    </div>
  )
}

export default function ShippingBillPage() {
  const { id } = useParams<{ id?: string }>()
  const { bills } = useDemoData()
  const bill = id ? (bills.find((item) => item.id === Number(id)) ?? shippingBillService.getById(id)) : undefined

  if (id && !bill) {
    return (
      <div className="space-y-3 py-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Shipping bill not found</h1>
        <p className="text-sm text-gray-500">The requested shipping bill could not be located.</p>
        <Button onClick={() => navigate(routes.dashboard)}>Back to list</Button>
      </div>
    )
  }

  return <ShippingBillEditor key={id ?? 'new'} bill={bill} />
}

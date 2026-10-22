import { routes } from '@/shared/route-paths'
import { useForm } from 'core/form'
import { navigate } from 'core/routing'
import { toast } from 'core/toast-manager'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FormContextData } from 'ui/form'
import { saveBill } from '../demo-store'
import { Business, emptyBill, Exporter, SavedBill, ShippingBillFormValues } from '../model'
import { getMarksAndNumbersOptions, MarksAndNumbersOption } from '../services/marks-and-numbers-service'
import { submitShippingBill, SubmissionResult } from '../services/shipping-bill-service'
import { shippingBillSchema } from '../validation/shipping-bill-validation'

export type TabKey = 'details' | 'invoices' | 'documents'

export interface QuickAddState {
  kind: 'exporter' | 'business'
  role?: 'consignee' | 'buyer' | 'thirdParty' | 'itemThirdParty'
  invoiceIndex?: number
  itemIndex?: number
}

export type BranchPath =
  | 'exporterBranchId'
  | 'consigneeBranchId'
  | `invoices.${number}.buyerBranchId`
  | `invoices.${number}.thirdPartyBranchId`
  | `invoices.${number}.items.${number}.itemThirdPartyBranchId`

export interface QuickBranchState {
  kind: 'exporter' | 'business'
  ownerId: number
  branchName: BranchPath
}

export interface UseShippingBillFormReturn {
  formCtx: FormContextData<ShippingBillFormValues>
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  draftId: number | undefined
  marksAndNumbersOptions: MarksAndNumbersOption[]
  marksAndNumbersLoading: boolean
  quickAdd: QuickAddState | null
  setQuickAdd: (qa: QuickAddState | null) => void
  quickBranch: QuickBranchState | null
  setQuickBranch: (qb: QuickBranchState | null) => void
  handleQuickSaved: (party: Exporter | Business) => void
  isSubmitting: boolean
  isSubmitted: boolean
  submissionResult: SubmissionResult | null
  submissionError: string | null
  clearSubmissionResult: () => void
  handleSaveAndNext: () => void
  handlePrevious: () => void
  handleFormSubmit: (data: ShippingBillFormValues) => Promise<void>
}

/**
 * Custom orchestrator hook for Shipping Bill form.
 * Encapsulates form state, validation tab transitions, asynchronous submission,
 * duplicate submission guards, and error resilience.
 */
export function useShippingBillForm(bill?: SavedBill): UseShippingBillFormReturn {
  const formCtx = useForm<ShippingBillFormValues>(shippingBillSchema, {
    defaultValues: bill?.values ?? emptyBill()
  })

  const { setValue, watch, formState, getValues } = formCtx.hooks

  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [draftId, setDraftId] = useState<number | undefined>(bill?.id)
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null)
  const [quickBranch, setQuickBranch] = useState<QuickBranchState | null>(null)

  const [marksAndNumbersOptions, setMarksAndNumbersOptions] = useState<MarksAndNumbersOption[]>([])
  const [marksAndNumbersLoading, setMarksAndNumbersLoading] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  // Guard against concurrent duplicate submissions
  const isSubmittingRef = useRef(false)
  const previousExporterId = useRef(watch('exporterId'))

  // Dynamically load Marks & Numbers when Exporter changes
  const exporterId = watch('exporterId')
  useEffect(() => {
    if (previousExporterId.current !== exporterId) {
      previousExporterId.current = exporterId
      setValue('marksAndNumbers', '', { shouldValidate: true })
    }

    let active = true
    setMarksAndNumbersOptions([])
    setMarksAndNumbersLoading(Boolean(exporterId))

    if (exporterId) {
      void getMarksAndNumbersOptions(exporterId)
        .then((options) => {
          if (!active) return
          setMarksAndNumbersOptions(options)
          setMarksAndNumbersLoading(false)
        })
        .catch(() => {
          if (!active) return
          setMarksAndNumbersOptions([])
          setMarksAndNumbersLoading(false)
        })
    }

    return () => {
      active = false
    }
  }, [exporterId, setValue])

  // Automatically switch tab to where validation error occurred upon form submission attempt
  useEffect(() => {
    if (!formState.submitCount || !Object.keys(formState.errors).length) return

    toast.error('Please check the required fields')

    const detailsFields = [
      'jobDate',
      'exporterId',
      'exporterBranchId',
      'consigneeId',
      'consigneeBranchId',
      'loadingPort',
      'finalDestinationPort'
    ]

    const hasDetailsError = detailsFields.some((field) => field in formState.errors)

    if (hasDetailsError) {
      setActiveTab('details')
    } else if (formState.errors.invoices) {
      setActiveTab('invoices')
    } else if (
      formState.errors.containers ||
      formState.errors.packingRanges ||
      formState.errors.documents ||
      formState.errors.licenses
    ) {
      setActiveTab('documents')
    }
  }, [formState.submitCount, formState.errors])

  // Save current progress as a draft and move to the next tab
  const handleSaveAndNext = useCallback(() => {
    const currentValues = getValues()
    const saved = saveBill(currentValues, draftId)
    setDraftId(saved.id)
    toast.success('Section progress saved')
    setActiveTab((prev) => (prev === 'details' ? 'invoices' : 'documents'))
  }, [draftId, getValues])

  // Save draft and move to the previous tab
  const handlePrevious = useCallback(() => {
    const currentValues = getValues()
    const saved = saveBill(currentValues, draftId)
    setDraftId(saved.id)
    setActiveTab((prev) => (prev === 'documents' ? 'invoices' : 'details'))
  }, [draftId, getValues])

  // Main asynchronous submission handler with duplicate protection
  const handleFormSubmit = useCallback(
    async (data: ShippingBillFormValues) => {
      if (isSubmittingRef.current) return
      isSubmittingRef.current = true
      setIsSubmitting(true)
      setSubmissionError(null)

      try {
        const result = await submitShippingBill(data, draftId)
        setDraftId(result.bill.id)
        setSubmissionResult(result)
        toast.success(bill ? 'Shipping bill updated successfully' : 'Shipping bill created successfully')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save shipping bill. Please try again.'
        setSubmissionError(msg)
        toast.error(msg)
      } finally {
        isSubmittingRef.current = false
        setIsSubmitting(false)
      }
    },
    [bill, draftId]
  )

  const clearSubmissionResult = useCallback(() => {
    setSubmissionResult(null)
    if (draftId) {
      navigate(routes.toShippingBillEdit(draftId))
    }
  }, [draftId])

  // Handles adding newly created party/branch from dialogs
  const handleQuickSaved = useCallback(
    (party: Exporter | Business) => {
      const branchId = party.branches[0]?.id
      if (!quickAdd || !branchId) return

      if (quickAdd.kind === 'exporter') {
        setValue('exporterId', String(party.id), { shouldValidate: true })
        setValue('exporterBranchId', String(branchId), { shouldValidate: true })
      } else if (quickAdd.role === 'consignee') {
        setValue('consigneeId', String(party.id), { shouldValidate: true })
        setValue('consigneeBranchId', String(branchId), { shouldValidate: true })
      } else if (quickAdd.role === 'itemThirdParty' && quickAdd.invoiceIndex != null && quickAdd.itemIndex != null) {
        setValue(
          `invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyId`,
          String(party.id),
          { shouldValidate: true }
        )
        setValue(
          `invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyBranchId`,
          String(branchId),
          { shouldValidate: true }
        )
      } else if (quickAdd.invoiceIndex != null) {
        const field = quickAdd.role === 'buyer' ? 'buyer' : 'thirdParty'
        setValue(`invoices.${quickAdd.invoiceIndex}.${field}Id`, String(party.id), { shouldValidate: true })
        setValue(`invoices.${quickAdd.invoiceIndex}.${field}BranchId`, String(branchId), { shouldValidate: true })
      }
    },
    [quickAdd, setValue]
  )

  return {
    formCtx,
    activeTab,
    setActiveTab,
    draftId,
    marksAndNumbersOptions,
    marksAndNumbersLoading,
    quickAdd,
    setQuickAdd,
    quickBranch,
    setQuickBranch,
    handleQuickSaved,
    isSubmitting,
    isSubmitted: Boolean(submissionResult),
    submissionResult,
    submissionError,
    clearSubmissionResult,
    handleSaveAndNext,
    handlePrevious,
    handleFormSubmit
  }
}

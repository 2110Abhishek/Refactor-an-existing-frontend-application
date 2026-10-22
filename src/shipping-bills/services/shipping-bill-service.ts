import { documentCodes as rawDocumentCodes } from '@/data/e-sanchit-codes'
import { quantityCodes as rawQuantityCodes } from '@/data/quantity-code'
import rawSchemeCodes from '@/data/scheme-codes'
import { stateOptions as rawStateOptions } from '@/data/states'
import { Trades as rawTrades } from '@/data/trade-agrements'
import {
  cargoOptions as rawCargoOptions,
  contractTypes as rawContractTypes,
  paymentTypes as rawPaymentTypes,
  priceInclusionTypes as rawPriceInclusionTypes,
  sealTypes as rawSealTypes,
  weightUnits as rawWeightUnits
} from '@/data/types'
import { getDemoData, saveBill } from '../demo-store'
import {
  loadingPorts as rawLoadingPorts,
  PortOption,
  ports as rawDestinationPorts,
  SavedBill,
  ShippingBillFormValues
} from '../model'
import {
  downloadBlob,
  generateFlatFile
} from '../utils/shipping-bill-helpers'
import { validateShippingBill } from '../validation/shipping-bill-validation'

export interface SelectOption<T = string> {
  value: T
  label: string
  sublabel?: string
}

export interface SchemeCodeOption extends SelectOption {
  drawback?: boolean
  RODTEP?: boolean
  ROSCTL?: boolean
}

export interface ShippingBillOptions {
  currencies: SelectOption[]
  contractTypes: SelectOption[]
  cargoOptions: SelectOption[]
  weightUnits: SelectOption[]
  sealTypes: SelectOption[]
  priceInclusionTypes: SelectOption[]
  paymentTypes: SelectOption[]
  schemeCodes: SchemeCodeOption[]
  quantityCodes: SelectOption[]
  stateOptions: SelectOption<number>[]
  tradeAgreements: SelectOption[]
  documentCodes: SelectOption[]
  loadingPorts: PortOption[]
  destinationPorts: PortOption[]
  portOptions: SelectOption[]
  containerSizes: SelectOption[]
  containerSealTypes: SelectOption<number>[]
  goodsSources: SelectOption[]
  nfeiCategories: SelectOption[]
  accessoryStatuses: SelectOption[]
  igstPaymentStatuses: SelectOption[]
}

export interface SubmissionResult {
  success: boolean
  referenceNumber: string
  bill: SavedBill
  message: string
  submittedAt: string
}

const DEFAULT_NETWORK_DELAY_MS = 250

let simulateOptionError = false
let simulateEmptyOptions = false
let simulateSubmissionError = false
let configuredDelayMs = DEFAULT_NETWORK_DELAY_MS

/**
 * Service debugging / testing toggles for validating loading, error & empty states
 */
export const serviceTestingControls = {
  setSimulateOptionError(val: boolean) {
    simulateOptionError = val
  },
  setSimulateEmptyOptions(val: boolean) {
    simulateEmptyOptions = val
  },
  setSimulateSubmissionError(val: boolean) {
    simulateSubmissionError = val
  },
  setNetworkDelay(ms: number) {
    configuredDelayMs = ms
  },
  resetDefaults() {
    simulateOptionError = false
    simulateEmptyOptions = false
    simulateSubmissionError = false
    configuredDelayMs = DEFAULT_NETWORK_DELAY_MS
  }
}

/**
 * Asynchronously loads all form configuration options.
 * Fully decoupled from UI components: real REST/GraphQL APIs can replace this
 * without changing any component logic.
 */
export async function getShippingBillOptions(): Promise<ShippingBillOptions> {
  await new Promise((resolve) => setTimeout(resolve, configuredDelayMs))

  if (simulateOptionError) {
    throw new Error('Failed to load shipping bill options from server. Please retry.')
  }

  if (simulateEmptyOptions) {
    return {
      currencies: [],
      contractTypes: [],
      cargoOptions: [],
      weightUnits: [],
      sealTypes: [],
      priceInclusionTypes: [],
      paymentTypes: [],
      schemeCodes: [],
      quantityCodes: [],
      stateOptions: [],
      tradeAgreements: [],
      documentCodes: [],
      loadingPorts: [],
      destinationPorts: [],
      portOptions: [],
      containerSizes: [],
      containerSealTypes: [],
      goodsSources: [],
      nfeiCategories: [],
      accessoryStatuses: [],
      igstPaymentStatuses: []
    }
  }

  const currencies: SelectOption[] = ['USD', 'EUR', 'INR', 'AED', 'GBP', 'SGD'].map((value) => ({
    value,
    label: value
  }))

  const portOptions: SelectOption[] = rawDestinationPorts.map((port) => ({
    value: port.code,
    label: `${port.name} · ${port.code}`
  }))

  const containerSizes: SelectOption[] = [
    { value: '20', label: '20 ft Standard' },
    { value: '40', label: '40 ft High Cube' },
    { value: '45', label: '45 ft High Cube' }
  ]

  const containerSealTypes: SelectOption<number>[] = [
    { value: 1, label: 'BTSL - Bottle Seal' },
    { value: 2, label: 'ESEAL - Electronic Seal' },
    { value: 3, label: 'RFID - Radio Frequency Identifier' }
  ]

  const goodsSources: SelectOption[] = [
    { value: 'I', label: 'Imported' },
    { value: 'D', label: 'Indigenous' }
  ]

  const nfeiCategories: SelectOption[] = [
    { value: '01', label: '01 - Free trade sample' },
    { value: '02', label: '02 - Diplomatic goods' },
    { value: '03', label: '03 - Warranty replacement' },
    { value: '07', label: '07 - Gift parcel' },
    { value: '08', label: '08 - Other' }
  ]

  const accessoryStatuses: SelectOption[] = [
    { value: '0', label: 'No accessory' },
    { value: '1', label: 'Included free of cost' },
    { value: '2', label: 'Entered separately' }
  ]

  const igstPaymentStatuses: SelectOption[] = [
    { value: 'NA', label: 'Not applicable' },
    { value: 'LUT', label: 'Under LUT / bond' },
    { value: 'P', label: 'Against payment of IGST' }
  ]

  return {
    currencies,
    contractTypes: rawContractTypes,
    cargoOptions: rawCargoOptions,
    weightUnits: rawWeightUnits,
    sealTypes: rawSealTypes,
    priceInclusionTypes: rawPriceInclusionTypes,
    paymentTypes: rawPaymentTypes,
    schemeCodes: rawSchemeCodes,
    quantityCodes: rawQuantityCodes,
    stateOptions: rawStateOptions,
    tradeAgreements: rawTrades,
    documentCodes: rawDocumentCodes,
    loadingPorts: rawLoadingPorts,
    destinationPorts: rawDestinationPorts,
    portOptions,
    containerSizes,
    containerSealTypes,
    goodsSources,
    nfeiCategories,
    accessoryStatuses,
    igstPaymentStatuses
  }
}

/**
 * Asynchronously submits and persists a validated Shipping Bill.
 * Returns structured confirmation details including a mock reference number.
 */
export async function submitShippingBill(
  values: ShippingBillFormValues,
  draftId?: number
): Promise<SubmissionResult> {
  // Simulate network latency for realistic submission feedback
  await new Promise((resolve) => setTimeout(resolve, Math.max(configuredDelayMs, 500)))

  if (simulateSubmissionError) {
    throw new Error('Remote server rejected submission (simulated 500 internal server error). Your entered data is preserved.')
  }

  // Pre-submission validation guard
  const validation = validateShippingBill(values)
  if (!validation.isValid) {
    const firstKey = Object.keys(validation.errors)[0]
    throw new Error(`Validation failed: ${validation.errors[firstKey]}`)
  }

  // Persist locally
  const saved = saveBill(values, draftId)

  // Generate standardized mock customs reference identifier (e.g. SB-2026-10492)
  const randomSuffix = Math.floor(10000 + Math.random() * 90000)
  const mockReferenceNumber = `SB-MOCK-${saved.id || randomSuffix}`

  return {
    success: true,
    referenceNumber: mockReferenceNumber,
    bill: saved,
    message: draftId ? 'Shipping bill updated successfully' : 'Shipping bill created successfully',
    submittedAt: new Date().toISOString()
  }
}

/**
 * Service singleton providing legacy and modern methods
 */
export const shippingBillService = {
  getOptions: getShippingBillOptions,
  submit: submitShippingBill,

  /**
   * Return initial in-memory bills
   */
  getInitialBills(): SavedBill[] {
    const { bills } = getDemoData()
    return bills
  },

  /**
   * Find bill by id
   */
  getById(id: string | number): SavedBill | undefined {
    const { bills } = getDemoData()
    return bills.find((b) => String(b.id) === String(id))
  },

  /**
   * Asynchronously retrieves single bill by ID
   */
  async getBillAsync(id: string | number): Promise<SavedBill | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return this.getById(id)
  },

  /**
   * List all shipping bills asynchronously
   */
  async list(): Promise<SavedBill[]> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const { bills } = getDemoData()
    return bills
  },

  /**
   * Download shipping bill flat file (.sb) in the browser
   */
  async downloadFlatFile(
    id: string | number,
    billData?: SavedBill,
    fallbackFilename?: string
  ): Promise<{ source: 'api' | 'local' }> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const bill = billData ?? this.getById(id)
    if (!bill) {
      throw new Error(`Shipping bill #${id} not found`)
    }
    const jobNo = bill.values.jobNumber ?? bill.id
    const filename = fallbackFilename ?? `shipping_bill_${jobNo}.sb`
    const flatFileContent = generateFlatFile(bill)
    const blob = new Blob([flatFileContent], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, filename)
    return { source: 'local' }
  },

  /**
   * Legacy upsert compatibility for existing call sites
   */
  async upsert(values: ShippingBillFormValues): Promise<{ success: boolean; id: number }> {
    const res = await submitShippingBill(values)
    return { success: true, id: res.bill.id }
  }
}

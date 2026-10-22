import { s } from 'core/form'
import { ShippingBillFormValues } from '../model'

const positiveNumber = s.string().refine((value) => {
  if (!value.trim()) return 'Required'
  const num = Number(value)
  return !isNaN(num) && num > 0 ? undefined : 'Enter a number greater than 0'
})

const nonNegativeNumber = s.string()
  .refine((value) => {
    if (!value.trim()) return undefined
    const num = Number(value)
    return !isNaN(num) && num >= 0 ? undefined : 'Cannot be negative'
  })
  .optional()

/**
 * React Hook Form Schema for Shipping Bill
 * Leaf names are deliberate: fe-zen-arch resolves nested RHF field rules by their final path segment.
 */
export const shippingBillSchema = s.object({
  jobNumber: s.string().optional(),
  jobDate: s.string().refine((val) => (val.trim() ? undefined : 'Job date is required')),
  exporterId: s.string().refine((val) => (val.trim() ? undefined : 'Exporter is required')),
  exporterBranchId: s.string().refine((val) => (val.trim() ? undefined : 'Exporter branch is required')),
  consigneeId: s.string().refine((val) => (val.trim() ? undefined : 'Consignee is required')),
  consigneeBranchId: s.string().refine((val) => (val.trim() ? undefined : 'Consignee branch is required')),
  loadingPort: s.string().refine((val) => (val.trim() ? undefined : 'Port of loading is required')),
  finalDestinationPort: s.string().refine((val) => (val.trim() ? undefined : 'Destination port is required')),
  dischargePort: s.string().optional(),
  originStateCode: s.string().optional(),
  nfeiCategory: s.string().optional(),
  rbiWaiverNumber: s.string().optional(),
  rbiWaiverDate: s.string().optional(),
  sealType: s.string().optional(),
  numberOfContainers: s.string().optional(),
  natureOfCargo: s.string().optional(),
  grossWeight: nonNegativeNumber,
  netWeight: nonNegativeNumber,
  measurementUnit: s.string().optional(),
  totalPackages: nonNegativeNumber,
  marksAndNumbers: s.string().optional(),
  loosePackets: nonNegativeNumber,
  mawbNumber: s.string().optional(),
  hawbNumber: s.string().optional(),
  invoiceNumber: s.string().refine((val) => (val.trim() ? undefined : 'Invoice number is required')),
  invoiceDate: s.string().refine((val) => (val.trim() ? undefined : 'Invoice date is required')),
  currency: s.string().refine((val) => (val.trim() ? undefined : 'Currency is required')),
  invoiceTotal: nonNegativeNumber,
  contractType: s.string().refine((val) => (val.trim() ? undefined : 'Contract type is required')),
  buyerId: s.string().optional(),
  buyerBranchId: s.string().optional(),
  thirdPartyId: s.string().optional(),
  thirdPartyBranchId: s.string().optional(),
  ritcCode: s.string().refine((val) => (val.trim() ? undefined : 'RITC code is required')),
  goodsDescription1: s.string().refine((val) => (val.trim() ? undefined : 'Goods description is required')),
  quantity: positiveNumber,
  unitOfMeasurement: s.string().refine((val) => (val.trim() ? undefined : 'Unit of measurement is required')),
  unitPrice: positiveNumber,
  containerNumber: s.string().optional(),
  packingNumberFrom: s.string().optional(),
  packingNumberTo: s.string().optional(),
  documentTypeCode: s.string().optional(),
  documentReferenceNumber: s.string().optional(),
  registrationNumber: s.string().optional()
})

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Domain-level validation rule engine
 * Validates cross-field integrity and structural completeness before submission
 */
export function validateShippingBill(values: ShippingBillFormValues): ValidationResult {
  const errors: Record<string, string> = {}

  // 1. Shipment Basics
  if (!values.jobDate.trim()) {
    errors.jobDate = 'Job date is required'
  }
  if (!values.exporterId.trim()) {
    errors.exporterId = 'Please select an exporter'
  }
  if (!values.exporterBranchId.trim()) {
    errors.exporterBranchId = 'Please select an exporter branch'
  }
  if (!values.consigneeId.trim()) {
    errors.consigneeId = 'Please select a consignee'
  }
  if (!values.consigneeBranchId.trim()) {
    errors.consigneeBranchId = 'Please select a consignee branch'
  }
  if (!values.loadingPort.trim()) {
    errors.loadingPort = 'Port of loading is required'
  }
  if (!values.finalDestinationPort.trim()) {
    errors.finalDestinationPort = 'Final destination port is required'
  }

  // Weight cross-validation (if both provided)
  if (values.grossWeight && values.netWeight) {
    const gross = Number(values.grossWeight)
    const net = Number(values.netWeight)
    if (!isNaN(gross) && !isNaN(net) && gross < net) {
      errors.grossWeight = 'Gross weight cannot be less than net weight'
    }
  }

  // 2. Invoices & Goods Validation
  if (values.invoices.length === 0) {
    errors.invoices = 'At least one invoice is required'
  } else {
    values.invoices.forEach((inv, invIdx) => {
      const invPrefix = `invoices.${invIdx}`
      if (!inv.invoiceNumber.trim()) {
        errors[`${invPrefix}.invoiceNumber`] = `Invoice #${invIdx + 1} requires an invoice number`
      }
      if (!inv.invoiceDate.trim()) {
        errors[`${invPrefix}.invoiceDate`] = `Invoice #${invIdx + 1} requires an invoice date`
      }
      if (!inv.currency.trim()) {
        errors[`${invPrefix}.currency`] = `Invoice #${invIdx + 1} requires a currency`
      }
      if (!inv.contractType.trim()) {
        errors[`${invPrefix}.contractType`] = `Invoice #${invIdx + 1} requires a contract type`
      }

      // Buyer validation if not same as consignee
      if (!inv.buyerSameAsConsignee) {
        if (!inv.buyerId.trim()) {
          errors[`${invPrefix}.buyerId`] = `Buyer is required when different from consignee`
        }
        if (!inv.buyerBranchId.trim()) {
          errors[`${invPrefix}.buyerBranchId`] = `Buyer branch is required`
        }
      }

      // Items validation
      if (inv.items.length === 0) {
        errors[`${invPrefix}.items`] = `Invoice #${invIdx + 1} must have at least one item`
      } else {
        inv.items.forEach((item, itemIdx) => {
          const itemPrefix = `${invPrefix}.items.${itemIdx}`
          if (!item.goodsDescription1.trim()) {
            errors[`${itemPrefix}.goodsDescription1`] = 'Description is required'
          }
          if (!item.ritcCode.trim()) {
            errors[`${itemPrefix}.ritcCode`] = 'RITC / HS code is required'
          }
          const qty = Number(item.quantity)
          if (!item.quantity || isNaN(qty) || qty <= 0) {
            errors[`${itemPrefix}.quantity`] = 'Quantity must be greater than 0'
          }
          const price = Number(item.unitPrice)
          if (!item.unitPrice || isNaN(price) || price <= 0) {
            errors[`${itemPrefix}.unitPrice`] = 'Unit price must be greater than 0'
          }
          if (!item.unitOfMeasurement.trim()) {
            errors[`${itemPrefix}.unitOfMeasurement`] = 'Unit is required'
          }
        })
      }
    })
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

import { BillInvoiceForm, BillItemForm, PortOption, SavedBill, ShippingBillFormValues } from '../model'

/**
 * Type-safe HTML5 date input type constant for fe-zen-arch Input component
 */
export const dateType = 'date' as 'text'

/**
 * Calculates the line total for a single goods item: quantity * unitPrice
 * Falls back to manual lineTotal if provided and non-empty.
 */
export function calculateLineTotal(item: BillItemForm): number {
  if (item.lineTotal != null && item.lineTotal.trim() !== '') {
    const parsed = Number(item.lineTotal)
    if (!isNaN(parsed)) return parsed
  }
  const qty = Number(item.quantity) || 0
  const price = Number(item.unitPrice) || 0
  return Number((qty * price).toFixed(2))
}

/**
 * Calculates total monetary sum of all items in an invoice.
 */
export function calculateInvoiceTotal(invoice: BillInvoiceForm): number {
  const sum = invoice.items.reduce((acc, item) => acc + calculateLineTotal(item), 0)
  return Number(sum.toFixed(2))
}

/**
 * Calculates grand monetary total across all invoices.
 */
export function calculateGrandTotal(invoices: BillInvoiceForm[]): number {
  const sum = invoices.reduce((acc, inv) => acc + calculateInvoiceTotal(inv), 0)
  return Number(sum.toFixed(2))
}

/**
 * Formats a monetary amount with 2 decimal places and optional currency symbol.
 */
export function formatMoney(amount: number, currency?: string): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return currency ? `${currency} ${formatted}` : formatted
}

/**
 * Resolves 2-letter country code from a port code (e.g. INMUN1 -> IN, USMSY -> US)
 */
export function resolvePortCountry(portCode?: string, portList?: PortOption[]): string {
  if (!portCode) return ''
  if (portList && portList.length > 0) {
    const found = portList.find((p) => p.code === portCode)
    if (found?.countryCode) return found.countryCode
  }
  const match = /^[A-Z]{2}/.exec(portCode)
  return match ? match[0] : ''
}

function optionalNumber(value?: string | number | null): number | undefined {
  if (typeof value === 'number') return value
  if (value != null && typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return isNaN(n) ? undefined : n
  }
  return undefined
}

/**
 * Transforms form values into structured Shipping Bill payload
 */
export function createShippingBillPayload(values: ShippingBillFormValues) {
  const dischargePort =
    typeof values.dischargePort === 'string' && values.dischargePort.trim()
      ? values.dischargePort
      : values.finalDestinationPort

  return {
    shipping_bill: {
      job_number: optionalNumber(values.jobNumber),
      job_date: values.jobDate,
      exporter_id: optionalNumber(values.exporterId),
      exporter_branch_id: optionalNumber(values.exporterBranchId),
      consignee_id: optionalNumber(values.consigneeId),
      consignee_branch_id: optionalNumber(values.consigneeBranchId),
      loading_port: values.loadingPort,
      final_destination_port: values.finalDestinationPort,
      discharge_port: dischargePort,
      nature_of_cargo: values.natureOfCargo,
      gross_weight: optionalNumber(values.grossWeight),
      net_weight: optionalNumber(values.netWeight),
      measurement_unit: values.measurementUnit,
      total_packages: optionalNumber(values.totalPackages),
      marks_and_numbers: values.marksAndNumbers,
      loose_packets: optionalNumber(values.loosePackets)
    },
    invoices: values.invoices.map((inv) => ({
      invoice_number: inv.invoiceNumber,
      invoice_date: inv.invoiceDate,
      currency: inv.currency,
      contract_type: inv.contractType,
      buyer_same_as_consignee: inv.buyerSameAsConsignee,
      buyer_id: inv.buyerSameAsConsignee ? values.consigneeId : inv.buyerId,
      buyer_branch_id: inv.buyerSameAsConsignee ? values.consigneeBranchId : inv.buyerBranchId,
      freight_amount: optionalNumber(inv.freightAmount),
      insurance_amount: optionalNumber(inv.insuranceAmount),
      items: inv.items.map((item, itemIdx) => ({
        item_serial_number: itemIdx + 1,
        ritc_code: item.ritcCode,
        goods_description: item.goodsDescription1,
        quantity: optionalNumber(item.quantity),
        unit_of_measurement: item.unitOfMeasurement,
        unit_price: optionalNumber(item.unitPrice),
        line_total: calculateLineTotal(item),
        scheme_code: item.schemeCode
      }))
    })),
    containers: values.containers.map((c) => ({
      container_number: c.containerNumber,
      container_size: c.containerSize,
      seal_number: c.exciseSealNumber
    })),
    packing_ranges: values.packingRanges.map((p) => ({
      from: optionalNumber(p.packingNumberFrom),
      to: optionalNumber(p.packingNumberTo),
      code: p.packingCode
    })),
    documents: values.documents.map((d) => ({
      document_type_code: d.documentTypeCode,
      reference_number: d.documentReferenceNumber,
      image_reference_number: d.imageReferenceNumber,
      issue_date: d.documentIssueDate
    })),
    licenses: values.licenses.map((l) => ({
      registration_number: l.registrationNumber,
      registration_date: l.registrationDate
    }))
  }
}

/**
 * Generates ICEGATE standard flat file format (.sb)
 */
export function generateFlatFile(bill: SavedBill): string {
  const v = bill.values
  const lines: string[] = []
  const loadingPort = v.loadingPort !== '' ? v.loadingPort : 'INMUN1'
  const jobNo = v.jobNumber != null && v.jobNumber !== '' ? v.jobNumber : String(bill.id)
  const dischargePort = v.dischargePort != null && v.dischargePort !== '' ? v.dischargePort : v.finalDestinationPort
  const measurementUnit = v.measurementUnit !== '' ? v.measurementUnit : 'KGS'
  const marks = (v.marksAndNumbers ?? '').replace(/[\^\r\n]+/g, ' ')

  lines.push(`HREC**ZZ*${loadingPort}*ZZ*ICEGATE*01*SB*1.0*`)
  lines.push(`<TABLE>SHIPPING_BILL`)
  lines.push(
    `<F>MESSAGE_TYPE^CHA_ID^JOB_NO^JOB_DATE^EXPORTER_ID^EXPORTER_BRANCH^CONSIGNEE_ID^LOADING_PORT^DEST_PORT^DISCHARGE_PORT^SEAL_TYPE^NATURE_OF_CARGO^GROSS_WEIGHT^NET_WEIGHT^UOM^PACKAGES^MARKS`
  )
  lines.push(
    `<R>F^1000^${jobNo}^${v.jobDate}^${v.exporterId}^${v.exporterBranchId}^${v.consigneeId}^${v.loadingPort}^${v.finalDestinationPort}^${dischargePort}^${v.sealType ?? ''}^${v.natureOfCargo}^${v.grossWeight ?? ''}^${v.netWeight ?? ''}^${measurementUnit}^${v.totalPackages ?? ''}^${marks}`
  )

  if (v.invoices.length > 0) {
    lines.push(`<TABLE>INVOICE`)
    lines.push(
      `<F>INVOICE_SN^INVOICE_NO^INVOICE_DATE^CURRENCY^CONTRACT_TYPE^BUYER_ID^FREIGHT_AMOUNT^INSURANCE_AMOUNT`
    )
    v.invoices.forEach((inv, idx) => {
      const currency = inv.currency !== '' ? inv.currency : 'USD'
      const contractType = inv.contractType !== '' ? inv.contractType : '1'
      const buyerId = inv.buyerId !== '' ? inv.buyerId : (v.consigneeId !== '' ? v.consigneeId : '')
      const freight = inv.freightAmount != null && inv.freightAmount !== '' ? inv.freightAmount : 0
      const insurance = inv.insuranceAmount != null && inv.insuranceAmount !== '' ? inv.insuranceAmount : 0

      lines.push(
        `<R>${idx + 1}^${inv.invoiceNumber}^${inv.invoiceDate}^${currency}^${contractType}^${buyerId}^${freight}^${insurance}`
      )
    })

    lines.push(`<TABLE>ITEM`)
    lines.push(
      `<F>INVOICE_SN^ITEM_SN^RITC_CODE^DESCRIPTION^QUANTITY^UOM^UNIT_PRICE^LINE_TOTAL^SCHEME_CODE`
    )
    v.invoices.forEach((inv, invIdx) => {
      inv.items.forEach((item, itemIdx) => {
        const total = calculateLineTotal(item)
        const desc = item.goodsDescription1.replace(/[\^\r\n]+/g, ' ')
        const uom = item.unitOfMeasurement !== '' ? item.unitOfMeasurement : 'PCS'
        lines.push(
          `<R>${invIdx + 1}^${itemIdx + 1}^${item.ritcCode}^${desc}^${item.quantity}^${uom}^${item.unitPrice}^${total.toFixed(2)}^${item.schemeCode ?? ''}`
        )
      })
    })
  }

  if (v.packingRanges.length > 0) {
    lines.push(`<TABLE>PACKING`)
    lines.push(`<F>FROM_PKG^TO_PKG^PKG_CODE`)
    v.packingRanges.forEach((pkg) => {
      const code = pkg.packingCode != null && pkg.packingCode !== '' ? pkg.packingCode : 'CTN'
      lines.push(`<R>${pkg.packingNumberFrom}^${pkg.packingNumberTo}^${code}`)
    })
  }

  lines.push(`TREC**ZZ*${loadingPort}*ZZ*ICEGATE*01*SB*1.0*`)

  return lines.join('\r\n')
}

/**
 * Triggers a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

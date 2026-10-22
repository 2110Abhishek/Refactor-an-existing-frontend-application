import { useFieldArray } from 'core/form'
import { Button } from 'ui/basic/button'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { FormContextData } from 'ui/form'
import { Checkbox } from 'ui/inputs/checkbox'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { QuickAddState, QuickBranchState } from '../hooks/use-shipping-bill-form'
import { BillInvoiceForm, Business, emptyInvoice, emptyItem, ShippingBillFormValues } from '../model'
import { ShippingBillOptions } from '../services/shipping-bill-service'
import { calculateInvoiceTotal, dateType, formatMoney } from '../utils/shipping-bill-helpers'
import { GoodsItemEditor } from './goods-item-editor'
import { PartyFields } from './party-fields'

export interface InvoicesSectionProps {
  formCtx: FormContextData<ShippingBillFormValues>
  options: ShippingBillOptions
  businesses: Business[]
  onQuickAdd: (qa: QuickAddState) => void
  onAddBranch: (qb: QuickBranchState) => void
}

/**
 * Section managing commercial invoices and itemized goods.
 */
export function InvoicesSection({
  formCtx,
  options,
  businesses,
  onQuickAdd,
  onAddBranch
}: InvoicesSectionProps) {
  const { control, watch } = formCtx.hooks
  const {
    fields: invoices,
    append: addInvoice,
    remove: removeInvoice
  } = useFieldArray({ control, name: 'invoices' })

  const formValues = watch()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Invoices & Goods</h2>
          <p className="text-sm text-gray-500">
            Enter commercial invoices and add the export goods line items for each.
          </p>
        </div>
        <Button variant="outline" onClick={() => addInvoice(emptyInvoice())}>
          + Add invoice
        </Button>
      </div>

      {invoices.map((invoiceField, index) => {
        const invoice = formValues.invoices[index]
        return (
          <SingleInvoiceCard
            key={invoiceField.id}
            formCtx={formCtx}
            index={index}
            invoice={invoice}
            options={options}
            businesses={businesses}
            canRemove={invoices.length > 1}
            onRemove={() => removeInvoice(index)}
            onQuickAdd={onQuickAdd}
            onAddBranch={onAddBranch}
          />
        )
      })}
    </div>
  )
}

interface SingleInvoiceCardProps {
  formCtx: FormContextData<ShippingBillFormValues>
  index: number
  invoice: BillInvoiceForm
  options: ShippingBillOptions
  businesses: Business[]
  canRemove: boolean
  onRemove: () => void
  onQuickAdd: (qa: QuickAddState) => void
  onAddBranch: (qb: QuickBranchState) => void
}

function SingleInvoiceCard({
  formCtx,
  index,
  invoice,
  options,
  businesses,
  canRemove,
  onRemove,
  onQuickAdd,
  onAddBranch
}: SingleInvoiceCardProps) {
  const { control, register } = formCtx.hooks
  const {
    fields: items,
    append: addItem,
    remove: removeItem
  } = useFieldArray({ control, name: `invoices.${index}.items` })

  const buyerSame = invoice.buyerSameAsConsignee
  const buyerOptions = businesses.filter(
    (b) => b.isBuyer || b.id === Number(invoice.buyerId)
  )
  const thirdPartyOptions = businesses.filter(
    (b) => b.isThirdParty || b.id === Number(invoice.thirdPartyId)
  )

  const computedTotal = calculateInvoiceTotal(invoice)

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-950">Invoice {index + 1}</h3>
        </div>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove invoice
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Header fields */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Invoice number"
            {...register(`invoices.${index}.invoiceNumber`)}
            placeholder="e.g. INV-2026-001"
          />

          <Input
            label="Invoice date"
            type={dateType}
            {...register(`invoices.${index}.invoiceDate`)}
          />

          <div className="flex gap-2">
            <div className="w-[100px] shrink-0">
              <Select<ShippingBillFormValues>
                label="Currency"
                name={`invoices.${index}.currency`}
                options={options.currencies}
                rules={{ required: true }}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Total"
                type="number"
                min={0}
                {...register(`invoices.${index}.invoiceTotal`)}
                placeholder={formatMoney(computedTotal)}
              />
            </div>
          </div>

          <Select<ShippingBillFormValues>
            label="Contract type"
            name={`invoices.${index}.contractType`}
            options={options.contractTypes}
            rules={{ required: true }}
          />
        </div>

        {/* Buyer Section */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <Checkbox {...register(`invoices.${index}.buyerSameAsConsignee`)} />
          Buyer and consignee are the same entity
        </label>

        {!buyerSame && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <PartyFields
              formCtx={formCtx}
              ownerName={`invoices.${index}.buyerId`}
              branchName={`invoices.${index}.buyerBranchId`}
              label="Buyer"
              kind="business"
              parties={buyerOptions}
              onQuickAdd={() => onQuickAdd({ kind: 'business', role: 'buyer', invoiceIndex: index })}
              onAddBranch={(ownerId) =>
                onAddBranch({
                  kind: 'business',
                  ownerId,
                  branchName: `invoices.${index}.buyerBranchId`
                })
              }
            />
          </div>
        )}

        {/* Financial Adjustments Table */}
        <div className="space-y-4">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Freight */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Freight</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.freightRate`)}
                      className="text-right"
                      disabled={Boolean(invoice.freightAmount)}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.freightAmount`)}
                    className="py-1 text-right"
                    disabled={Boolean(invoice.freightRate)}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.freightCurrency`}
                    options={options.currencies}
                    placeholder={invoice.currency}
                  />
                </div>
              </div>

              {/* Insurance */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Insurance</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.insuranceRate`)}
                      className="text-right"
                      disabled={Boolean(invoice.insuranceAmount)}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.insuranceAmount`)}
                    className="py-1 text-right"
                    disabled={Boolean(invoice.insuranceRate)}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.insuranceCurrency`}
                    options={options.currencies}
                    placeholder={invoice.currency}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Commission */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Commission</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.commissionRate`)}
                      className="text-right"
                      disabled={Boolean(invoice.commissionAmount)}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.commissionAmount`)}
                    className="py-1 text-right"
                    disabled={Boolean(invoice.commissionRate)}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.commissionCurrency`}
                    options={options.currencies}
                    placeholder={invoice.currency}
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Discount</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.discountRate`)}
                      className="text-right"
                      disabled={Boolean(invoice.discountAmount)}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.discountAmount`)}
                    className="py-1 text-right"
                    disabled={Boolean(invoice.discountRate)}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.discountCurrency`}
                    options={options.currencies}
                    placeholder={invoice.currency}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              {/* Other Deductions */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Other Deductions</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.otherDeductionsRate`)}
                      className="text-right"
                      disabled={Boolean(invoice.otherDeductionsAmount)}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.otherDeductionsAmount`)}
                    className="py-1 text-right"
                    disabled={Boolean(invoice.otherDeductionsRate)}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.otherDeductionsCurrency`}
                    options={options.currencies}
                    placeholder={invoice.currency}
                  />
                </div>
              </div>

              {/* Packing Charges */}
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Packing Charges</span>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.packingCharges`)}
                    className="py-1 text-right"
                    placeholder="Amount"
                  />
                  <span className="w-14 text-sm text-gray-500">—</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select<ShippingBillFormValues>
              label="Price includes"
              name={`invoices.${index}.freightInsuranceIncluded`}
              options={options.priceInclusionTypes}
              placeholder="Select if applicable"
            />
            <Input label="Contract / order number" {...register(`invoices.${index}.contractNumber`)} />
            <Select<ShippingBillFormValues>
              label="Payment type"
              name={`invoices.${index}.natureOfPayment`}
              options={options.paymentTypes}
              placeholder="Select if applicable"
            />
            <Input label="Payment period (days)" type="number" {...register(`invoices.${index}.periodOfPayment`)} />
          </div>

          {/* Third Party */}
          <PartyFields
            formCtx={formCtx}
            ownerName={`invoices.${index}.thirdPartyId`}
            branchName={`invoices.${index}.thirdPartyBranchId`}
            label="Third party (optional)"
            kind="business"
            parties={thirdPartyOptions}
            required={false}
            onQuickAdd={() =>
              onQuickAdd({ kind: 'business', role: 'thirdParty', invoiceIndex: index })
            }
            onAddBranch={(ownerId) =>
              onAddBranch({
                kind: 'business',
                ownerId,
                branchName: `invoices.${index}.thirdPartyBranchId`
              })
            }
          />
        </div>

        {/* Goods Line Items Section */}
        <div className="border-t border-gray-200 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-gray-950">Export Goods ({items.length})</h4>
            <Button size="sm" variant="outline" onClick={() => addItem(emptyItem())}>
              + Add item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((itemField, itemIndex) => {
              const item = invoice.items[itemIndex]
              return (
                <GoodsItemEditor
                  key={itemField.id}
                  formCtx={formCtx}
                  invoiceIndex={index}
                  itemIndex={itemIndex}
                  item={item}
                  currency={invoice.currency || 'USD'}
                  options={options}
                  businesses={businesses}
                  canRemove={items.length > 1}
                  onRemove={() => removeItem(itemIndex)}
                  onQuickAddThirdParty={() =>
                    onQuickAdd({
                      kind: 'business',
                      role: 'itemThirdParty',
                      invoiceIndex: index,
                      itemIndex
                    })
                  }
                  onAddBranch={(ownerId, branchPath) =>
                    onAddBranch({ kind: 'business', ownerId, branchName: branchPath })
                  }
                />
              )
            })}
          </div>
        </div>

        {/* Invoice Total Summary */}
        <div className="rounded-lg bg-gray-50 p-3 text-right text-sm font-semibold text-gray-950">
          Invoice total: {formatMoney(computedTotal, invoice.currency || 'USD')}
        </div>
      </CardContent>
    </Card>
  )
}

import { Button } from 'ui/basic/button'
import { FormContextData } from 'ui/form'
import { Checkbox } from 'ui/inputs/checkbox'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { BranchPath } from '../hooks/use-shipping-bill-form'
import { BillItemForm, Business, ShippingBillFormValues } from '../model'
import { ShippingBillOptions } from '../services/shipping-bill-service'
import { calculateLineTotal, dateType, formatMoney } from '../utils/shipping-bill-helpers'
import { PartyFields } from './party-fields'

export interface GoodsItemEditorProps {
  formCtx: FormContextData<ShippingBillFormValues>
  invoiceIndex: number
  itemIndex: number
  item: BillItemForm
  currency: string
  options: ShippingBillOptions
  businesses: Business[]
  canRemove: boolean
  onRemove: () => void
  onQuickAddThirdParty: () => void
  onAddBranch: (ownerId: number, branchPath: BranchPath) => void
}

function AdvancedSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-700">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

/**
 * Editor component for a single exported goods line item.
 */
export function GoodsItemEditor({
  formCtx,
  invoiceIndex,
  itemIndex,
  item,
  currency,
  options,
  businesses,
  canRemove,
  onRemove,
  onQuickAddThirdParty,
  onAddBranch
}: GoodsItemEditorProps) {
  const { register } = formCtx.hooks
  const itemPath = `invoices.${invoiceIndex}.items.${itemIndex}` as const

  const lineAmount = calculateLineTotal(item)

  // Determine if Drawback / RODTEP / ROSCTL inputs are applicable for the chosen scheme
  const selectedScheme = options.schemeCodes.find((s) => s.value === item.schemeCode)
  const showDrawback = Boolean(
    selectedScheme &&
      (selectedScheme.drawback === true ||
        selectedScheme.RODTEP === true ||
        selectedScheme.ROSCTL === true)
  )

  const thirdPartyOptions = businesses.filter(
    (b) => b.isThirdParty || b.id === Number(item.itemThirdPartyId)
  )

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-950">Item {itemIndex + 1}</h4>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove item
          </Button>
        )}
      </div>

      {/* Main item details */}
      <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          label="RITC / HS code"
          {...register(`${itemPath}.ritcCode`)}
          placeholder="e.g. 61091000"
        />

        <Select<ShippingBillFormValues>
          label="Scheme code"
          name={`${itemPath}.schemeCode`}
          options={options.schemeCodes}
          placeholder="Select scheme"
        />

        <Input
          label="Goods description"
          {...register(`${itemPath}.goodsDescription1`)}
          wrapClass="lg:col-span-4"
          placeholder="e.g. 100% Cotton Knitted T-Shirts"
        />

        <Input
          label="Quantity"
          type="number"
          {...register(`${itemPath}.quantity`)}
        />

        <Select<ShippingBillFormValues>
          label="Unit"
          name={`${itemPath}.unitOfMeasurement`}
          options={options.quantityCodes}
          rules={{ required: true }}
        />

        <Input
          label={`Unit price (${currency || 'currency'})`}
          type="number"
          {...register(`${itemPath}.unitPrice`)}
        />

        <Input
          label="Item Total"
          type="number"
          placeholder={formatMoney(lineAmount, currency)}
          {...register(`${itemPath}.lineTotal`)}
        />

        <Select<ShippingBillFormValues>
          label="IGST payment"
          name={`${itemPath}.igstPaymentStatus`}
          options={options.igstPaymentStatuses}
          placeholder="Select status"
        />
      </div>

      {/* Drawback & Special Scheme Checkboxes */}
      <div className="mb-3 flex flex-wrap items-end gap-4">
        {showDrawback && (
          <>
            <div className="w-36">
              <Input
                label="Drawback Serial no."
                {...register(`${itemPath}.drawbackSerialNumber`)}
              />
            </div>
            <div className="w-32">
              <Input
                label="Drawback Unit"
                {...register(`${itemPath}.drawbackUnit`)}
              />
            </div>
            <div className="w-36">
              <Input
                label="Drawback Quantity"
                type="number"
                {...register(`${itemPath}.drawbackQuantity`)}
              />
            </div>
          </>
        )}

        <label className="flex items-center gap-2 pb-1 text-sm text-gray-700">
          <Checkbox {...register(`${itemPath}.rewardItem`)} />
          Claim reward
        </label>

        <label className="flex items-center gap-2 pb-1 text-sm text-gray-700">
          <Checkbox {...register(`${itemPath}.thirdPartyItem`)} />
          Third-party item
        </label>
      </div>

      {/* Item Third Party */}
      {item.thirdPartyItem && (
        <div className="my-4 rounded-md border border-gray-100 bg-gray-50/60 p-3">
          <PartyFields
            formCtx={formCtx}
            ownerName={`${itemPath}.itemThirdPartyId`}
            branchName={`${itemPath}.itemThirdPartyBranchId`}
            label="Item third party manufacturer / supplier"
            kind="business"
            parties={thirdPartyOptions}
            onQuickAdd={onQuickAddThirdParty}
            onAddBranch={(ownerId) =>
              onAddBranch(ownerId, `${itemPath}.itemThirdPartyBranchId`)
            }
          />
        </div>
      )}

      {/* Advanced customs, taxes & incentives */}
      <AdvancedSection title="Item customs, taxes and incentives">
        <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select<ShippingBillFormValues>
            label="Unit of rate"
            {...register(`${itemPath}.unitOfRate`)}
            options={options.quantityCodes}
            placeholder={item.unitOfMeasurement || 'UOM'}
          />
          <Input
            label="Per Unit (Rate)"
            type="number"
            placeholder="1"
            {...register(`${itemPath}.numberOfUnits`)}
          />
          <Input
            label="Present market value"
            type="number"
            {...register(`${itemPath}.presentMarketValue`)}
          />
          <Input label="GCess" type="number" {...register(`${itemPath}.cess`)} />
          <Input
            label="Accessories description"
            wrapClass="lg:col-span-3"
            {...register(`${itemPath}.accessoriesDescription`)}
          />
          <Select<ShippingBillFormValues>
            label="Accessory status"
            name={`${itemPath}.accessoryStatus`}
            options={options.accessoryStatuses}
            placeholder="Select if relevant"
          />

          {item.igstPaymentStatus === 'P' && (
            <>
              <Input
                label="Taxable value"
                type="number"
                {...register(`${itemPath}.taxableValue`)}
              />
              <Input
                label="IGST amount"
                type="number"
                {...register(`${itemPath}.igstAmount`)}
              />
            </>
          )}

          <Input
            label="Origin district code"
            {...register(`${itemPath}.originDistrictCode`)}
          />
          <Select<ShippingBillFormValues>
            label="Trade agreement code"
            name={`${itemPath}.tradeAgreementsCode`}
            options={options.tradeAgreements}
            placeholder="NCPTI"
          />
          <Input label="End use code" {...register(`${itemPath}.endUseOfItem`)} />
          <Input
            label="Packages for item"
            type="number"
            {...register(`${itemPath}.totalPackage`)}
          />
        </div>

        <AdvancedSection title="AR4 / Central Excise Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="AR4 number" {...register(`${itemPath}.ar4Number`)} />
            <Input label="AR4 date" type={dateType} {...register(`${itemPath}.ar4Date`)} />
            <Input label="Commissionerate" {...register(`${itemPath}.ar4Commissionerate`)} />
            <Input label="Division" {...register(`${itemPath}.ar4Division`)} />
            <Input label="Range" {...register(`${itemPath}.ar4Range`)} />
          </div>
        </AdvancedSection>
      </AdvancedSection>
    </div>
  )
}

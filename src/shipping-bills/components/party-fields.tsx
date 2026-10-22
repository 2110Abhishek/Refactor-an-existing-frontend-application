import { useEffect } from 'react'
import { FormContextData } from 'ui/form'
import { getDemoData } from '../demo-store'
import { BranchPath } from '../hooks/use-shipping-bill-form'
import { Business, Exporter, ShippingBillFormValues } from '../model'
import { partyMockService } from '../services/party-mock-service'
import { AsyncPartySelect } from './async-party-select'

export interface PartyFieldsProps {
  formCtx: FormContextData<ShippingBillFormValues>
  ownerName:
    | 'exporterId'
    | 'consigneeId'
    | `invoices.${number}.buyerId`
    | `invoices.${number}.thirdPartyId`
    | `invoices.${number}.items.${number}.itemThirdPartyId`
  branchName: BranchPath
  label: string
  kind: 'exporter' | 'business'
  parties: (Exporter | Business)[]
  required?: boolean
  onAddBranch: (ownerId: number) => void
  onQuickAdd: () => void
}

/**
 * Reusable component for choosing an entity (Exporter or Business) and its associated branch/address.
 * Automatically synchronizes and resets dependent branch selections when the owner changes.
 */
export function PartyFields({
  formCtx,
  ownerName,
  branchName,
  label,
  kind,
  parties,
  required = true,
  onAddBranch,
  onQuickAdd
}: PartyFieldsProps) {
  const ownerId = formCtx.hooks.watch(ownerName)
  const { exporters, businesses } = getDemoData()

  const owner =
    kind === 'exporter'
      ? (exporters.find((party) => String(party.id) === ownerId) ??
        parties.find((party) => String(party.id) === ownerId))
      : (businesses.find((party) => String(party.id) === ownerId) ??
        parties.find((party) => String(party.id) === ownerId))

  // Invalidate and reset branch if it doesn't belong to the newly selected owner
  useEffect(() => {
    const selectedBranch = formCtx.hooks.getValues(branchName)
    if (
      selectedBranch &&
      owner &&
      owner.branches.length > 0 &&
      !owner.branches.some((branch) => String(branch.id) === selectedBranch)
    ) {
      formCtx.hooks.setValue(branchName, '', { shouldValidate: true })
    }
  }, [branchName, formCtx.hooks, owner])

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <button
            type="button"
            className="text-primary-700 text-xs font-medium hover:underline"
            onClick={onQuickAdd}>
            + Add new
          </button>
        </div>
        <AsyncPartySelect
          name={ownerName}
          placeholder={`Search & select ${kind}...`}
          rules={{ required }}
          fetchOptions={async (query) => {
            if (kind === 'exporter') {
              const res = await partyMockService.searchExporters(query)
              return res.map((item) => ({
                value: String(item.id),
                label: item.name,
                sublabel: item.iec ? `IEC: ${item.iec}` : undefined
              }))
            } else {
              const res = await partyMockService.searchConsignees(query)
              return res.map((item) => ({
                value: String(item.id),
                label: item.name
              }))
            }
          }}
          getInitialLabel={async (id) => {
            if (kind === 'exporter') {
              const item = await partyMockService.getExporterById(id)
              return item ? item.name : ''
            } else {
              const item = await partyMockService.getConsigneeById(id)
              return item ? item.name : ''
            }
          }}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">Branch / address</span>
          {owner && (
            <button
              type="button"
              className="text-primary-700 text-xs font-medium hover:underline"
              onClick={() => onAddBranch(owner.id)}>
              + Add branch
            </button>
          )}
        </div>
        <AsyncPartySelect
          name={branchName}
          placeholder={owner ? 'Search & select branch...' : `Choose ${kind} first`}
          disabled={!owner}
          rules={{ required: required || Boolean(ownerId) }}
          deps={[ownerId]}
          fetchOptions={async (query) => {
            if (!ownerId) return []
            if (kind === 'exporter') {
              const res = await partyMockService.searchExporterBranches(ownerId, query)
              return res.map((branch) => ({
                value: String(branch.id),
                label: `${branch.branchName} · ${branch.city}`,
                sublabel: branch.address1
              }))
            } else {
              const res = await partyMockService.searchConsigneeBranches(ownerId, query)
              return res.map((branch) => ({
                value: String(branch.id),
                label: `${branch.branchName} · ${branch.city}`,
                sublabel: branch.address1
              }))
            }
          }}
          getInitialLabel={(id) => {
            const branch = owner?.branches.find((b) => String(b.id) === id)
            return Promise.resolve(branch ? `${branch.branchName} · ${branch.city}` : '')
          }}
        />
      </div>
    </div>
  )
}

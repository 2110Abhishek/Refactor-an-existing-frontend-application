import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { FormContextData } from 'ui/form'
import { QuickAddState, QuickBranchState } from '../hooks/use-shipping-bill-form'
import { Business, Exporter, ShippingBillFormValues } from '../model'
import { PartyFields } from './party-fields'

export interface ExporterSectionProps {
  formCtx: FormContextData<ShippingBillFormValues>
  exporters: Exporter[]
  businesses: Business[]
  onQuickAdd: (qa: QuickAddState) => void
  onAddBranch: (qb: QuickBranchState) => void
}

/**
 * Section component for selecting the primary parties: Exporter and Consignee.
 */
export function ExporterSection({
  formCtx,
  exporters,
  businesses,
  onQuickAdd,
  onAddBranch
}: ExporterSectionProps) {
  const currentExporterId = formCtx.hooks.watch('exporterId')
  const currentConsigneeId = formCtx.hooks.watch('consigneeId')

  const availableExporters = exporters.filter(
    (item) => !item.disabled || String(item.id) === currentExporterId
  )

  const availableConsignees = businesses.filter(
    (item) => item.isConsignee || String(item.id) === currentConsigneeId
  )

  return (
    <Card>
      <CardHeader
        title="Shipment basics"
        description="Parties and route are the core details for this bill."
      />
      <CardContent className="space-y-5">
        <PartyFields
          formCtx={formCtx}
          ownerName="exporterId"
          branchName="exporterBranchId"
          label="Exporter"
          kind="exporter"
          parties={availableExporters}
          onQuickAdd={() => onQuickAdd({ kind: 'exporter' })}
          onAddBranch={(ownerId) =>
            onAddBranch({ kind: 'exporter', ownerId, branchName: 'exporterBranchId' })
          }
        />

        <PartyFields
          formCtx={formCtx}
          ownerName="consigneeId"
          branchName="consigneeBranchId"
          label="Consignee"
          kind="business"
          parties={availableConsignees}
          onQuickAdd={() => onQuickAdd({ kind: 'business', role: 'consignee' })}
          onAddBranch={(ownerId) =>
            onAddBranch({ kind: 'business', ownerId, branchName: 'consigneeBranchId' })
          }
        />
      </CardContent>
    </Card>
  )
}

import { Card, CardContent } from 'ui/basic/card'
import { FormContextData } from 'ui/form'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { ShippingBillFormValues } from '../model'
import { MarksAndNumbersOption } from '../services/marks-and-numbers-service'
import { partyMockService } from '../services/party-mock-service'
import { ShippingBillOptions } from '../services/shipping-bill-service'
import { dateType, resolvePortCountry } from '../utils/shipping-bill-helpers'
import { AsyncPartySelect } from './async-party-select'

export interface ShipmentSectionProps {
  formCtx: FormContextData<ShippingBillFormValues>
  options: ShippingBillOptions
  marksAndNumbersOptions: MarksAndNumbersOption[]
  marksAndNumbersLoading: boolean
  hasContainers: boolean
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-950">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  )
}

function AdvancedSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-700">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

/**
 * Section for route, port selections, regulatory waivers, and package weights/marks.
 * Consumes options loaded asynchronously from the service layer.
 */
export function ShipmentSection({
  formCtx,
  options,
  marksAndNumbersOptions,
  marksAndNumbersLoading,
  hasContainers
}: ShipmentSectionProps) {
  const { register, watch } = formCtx.hooks
  const values = watch()

  const originCountry = resolvePortCountry(values.loadingPort, options.loadingPorts)
  const destinationCountry = resolvePortCountry(values.finalDestinationPort, options.destinationPorts)

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {/* Route Details */}
        <div>
          <SectionHeading title="Route" description="Specify loading and destination customs locations." />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-900">Port of loading</span>
              <AsyncPartySelect
                name="loadingPort"
                placeholder="Select Indian port..."
                rules={{ required: true }}
                fetchOptions={async (query) => {
                  const res = await partyMockService.searchLoadingPorts(query)
                  return res.map((port) => ({
                    value: port.code,
                    label: `${port.name} · ${port.code}`,
                    sublabel: `Country: ${port.countryCode}`
                  }))
                }}
                getInitialLabel={async (code) => {
                  const port = await partyMockService.getPortByCode(code)
                  return port ? `${port.name} · ${port.code}` : code
                }}
              />
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-900">Final destination port</span>
              <AsyncPartySelect
                name="finalDestinationPort"
                placeholder="Select destination port..."
                rules={{ required: true }}
                fetchOptions={async (query) => {
                  const res = await partyMockService.searchDestinationPorts(query)
                  return res.map((port) => ({
                    value: port.code,
                    label: `${port.name} · ${port.code}`,
                    sublabel: `Country: ${port.countryCode}`
                  }))
                }}
                getInitialLabel={async (code) => {
                  const port = await partyMockService.getPortByCode(code)
                  return port ? `${port.name} · ${port.code}` : code
                }}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Countries are derived from port codes when saved: {originCountry || '—'} → {destinationCountry || '—'}.
          </p>
        </div>

        {/* Regulatory & Route Exceptions */}
        <AdvancedSection title="Regulatory and route exceptions">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select<ShippingBillFormValues>
              label="Discharge port"
              name="dischargePort"
              options={options.portOptions}
              placeholder="Defaults to destination"
            />
            <Select<ShippingBillFormValues>
              label="Origin state"
              name="originStateCode"
              options={options.stateOptions}
              placeholder="Defaults to Branch State"
            />
            <Select<ShippingBillFormValues>
              label="NFEI category"
              name="nfeiCategory"
              options={options.nfeiCategories}
              placeholder="Not applicable"
            />
            <Input label="RBI waiver number" {...register('rbiWaiverNumber')} />
            <Input label="RBI waiver date" type={dateType} {...register('rbiWaiverDate')} />
          </div>
        </AdvancedSection>

        {/* Package & Weight Detail */}
        <div className="border-t border-gray-200 pt-5">
          <SectionHeading title="Package Detail" description="Gross/net weights and export markings." />
          <div className="grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select<ShippingBillFormValues>
              label="Nature of cargo"
              name="natureOfCargo"
              options={options.cargoOptions}
            />
            <Input label="Gross weight" type="number" {...register('grossWeight')} />
            <Input label="Net weight" type="number" {...register('netWeight')} />
            <Select<ShippingBillFormValues>
              label="Weight unit"
              name="measurementUnit"
              options={options.weightUnits}
            />
            <Input label="Total packages" type="number" {...register('totalPackages')} />
            <Select<ShippingBillFormValues>
              label="Marks and numbers"
              name="marksAndNumbers"
              options={marksAndNumbersOptions}
              placeholder={
                !values.exporterId
                  ? 'Select exporter first'
                  : marksAndNumbersLoading
                    ? 'Loading marks and numbers...'
                    : 'Select marks and numbers'
              }
              disabled={!values.exporterId || marksAndNumbersLoading || !marksAndNumbersOptions.length}
              wrapClass="sm:col-span-3"
            />
          </div>

          <AdvancedSection title="Additional Transport Details">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select<ShippingBillFormValues>
                label="Seal type"
                name="sealType"
                options={options.sealTypes}
                placeholder="Select if relevant"
              />
              {!hasContainers && (
                <Input label="Number of containers" type="number" {...register('numberOfContainers')} />
              )}
              <Input label="Loose packets" type="number" {...register('loosePackets')} />
              <Input label="MAWB number" {...register('mawbNumber')} />
              <Input label="HAWB number" {...register('hawbNumber')} />
            </div>
          </AdvancedSection>
        </div>
      </CardContent>
    </Card>
  )
}

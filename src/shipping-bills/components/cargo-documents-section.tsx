import { useFieldArray } from 'core/form'
import { useState } from 'react'
import { Button } from 'ui/basic/button'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { FormContextData } from 'ui/form'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { emptyDocument, ShippingBillFormValues } from '../model'
import { ShippingBillOptions } from '../services/shipping-bill-service'
import { dateType } from '../utils/shipping-bill-helpers'
import { AsyncPartySelect } from './async-party-select'

export interface CargoDocumentsSectionProps {
  formCtx: FormContextData<ShippingBillFormValues>
  options: ShippingBillOptions
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-gray-950">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  )
}

function AdvancedSection({
  title,
  children,
  open,
  onToggle
}: {
  title: string
  children: React.ReactNode
  open?: boolean
  onToggle?: (isOpen: boolean) => void
}) {
  return (
    <details
      className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
      open={open}
      onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-medium text-gray-700">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

/**
 * Section for Containers, Packing Ranges, Supporting Documents (e-SANCHIT), and Licences.
 */
export function CargoDocumentsSection({ formCtx, options }: CargoDocumentsSectionProps) {
  const { control, register } = formCtx.hooks

  const {
    fields: containers,
    append: addContainer,
    remove: removeContainer
  } = useFieldArray({ control, name: 'containers' })

  const {
    fields: packingRanges,
    append: addPackingRange,
    remove: removePackingRange
  } = useFieldArray({ control, name: 'packingRanges' })

  const {
    fields: documents,
    append: addDocument,
    remove: removeDocument
  } = useFieldArray({ control, name: 'documents' })

  const {
    fields: licenses,
    append: addLicense,
    remove: removeLicense
  } = useFieldArray({ control, name: 'licenses' })

  return (
    <div className="space-y-5">
      {/* 1. Containers & Packing Ranges */}
      <Card>
        <CardHeader title="Cargo & Package Detail" />
        <CardContent className="space-y-6">
          {/* Containers */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <SectionHeading
                title={`Containers (${containers.length})`}
                description="Add only when shipment cargo is containerized."
              />
              <Button size="sm" variant="outline" onClick={() => addContainer({ containerNumber: '' })}>
                + Add container
              </Button>
            </div>

            <div className="space-y-3">
              {containers.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Container {index + 1}</h4>
                    <Button size="sm" variant="ghost" onClick={() => removeContainer(index)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Container number"
                      {...register(`containers.${index}.containerNumber`)}
                      placeholder="e.g. MSKU1234567"
                    />
                    <Select<ShippingBillFormValues>
                      label="Size"
                      name={`containers.${index}.containerSize`}
                      options={options.containerSizes}
                      placeholder="Select size"
                    />
                    <Input label="Seal number" {...register(`containers.${index}.exciseSealNumber`)} />
                    <Input label="Seal date" type={dateType} {...register(`containers.${index}.sealDate`)} />
                    <Select<ShippingBillFormValues>
                      label="Seal type"
                      name={`containers.${index}.sealType`}
                      options={options.containerSealTypes}
                      placeholder="Select seal type"
                    />
                    <Input label="Seal device ID" {...register(`containers.${index}.sealDeviceId`)} />
                    <Input
                      label="Movement document type"
                      {...register(`containers.${index}.movementDocumentType`)}
                    />
                    <Input
                      label="Movement document number"
                      {...register(`containers.${index}.movementDocumentNumber`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Packing Ranges */}
          <AdvancedSection title={`Packing list ranges (${packingRanges.length})`}>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPackingRange({ packingNumberFrom: '', packingNumberTo: '', packingCode: 'CTN' })}>
                + Add packing range
              </Button>
              {packingRanges.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Range {index + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => removePackingRange(index)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Package from"
                      type="number"
                      {...register(`packingRanges.${index}.packingNumberFrom`)}
                    />
                    <Input
                      label="Package to"
                      type="number"
                      {...register(`packingRanges.${index}.packingNumberTo`)}
                    />
                    <Input
                      label="Packing code"
                      placeholder="e.g. CTN"
                      {...register(`packingRanges.${index}.packingCode`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdvancedSection>
        </CardContent>
      </Card>

      {/* 2. Supporting Documents (e-SANCHIT) */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-950">Supporting Documents (e-SANCHIT)</h3>
            <p className="mt-1 text-sm text-gray-500">
              Attach uploaded invoice, packing list, or certificate image reference numbers (IRN).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => addDocument(emptyDocument())}>
            + Add document
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No supporting documents attached.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => addDocument(emptyDocument())}>
                + Add first document
              </Button>
            </div>
          ) : (
            documents.map((field, index) => (
              <SingleDocumentCard
                key={field.id}
                formCtx={formCtx}
                index={index}
                options={options}
                onRemove={() => removeDocument(index)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* 3. Export Licences */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-950">Licences</h3>
            <p className="mt-1 text-sm text-gray-500">
              Only required for export promotion schemes that mandate a licence (e.g. Advance Authorisation).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => addLicense({ registrationNumber: '' })}>
            + Add licence
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {licenses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500">No licences entered for this shipment.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => addLicense({ registrationNumber: '' })}>
                + Add licence
              </Button>
            </div>
          ) : (
            licenses.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Licence {index + 1}</h4>
                  <Button size="sm" variant="ghost" onClick={() => removeLicense(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Registration number"
                    {...register(`licenses.${index}.registrationNumber`)}
                  />
                  <Input
                    label="Registration date"
                    type={dateType}
                    {...register(`licenses.${index}.registrationDate`)}
                  />
                  <Input
                    label="Invoice serial number"
                    type="number"
                    {...register(`licenses.${index}.invoiceSerialNumber`)}
                  />
                  <Input
                    label="Item serial number"
                    type="number"
                    {...register(`licenses.${index}.itemSerialNumber`)}
                  />
                  <Input
                    label="Licence serial number"
                    type="number"
                    {...register(`licenses.${index}.licenseSerialNumber`)}
                  />
                  <Input
                    label="Item serial, Part E"
                    {...register(`licenses.${index}.itemSerialNumberPartE`)}
                  />
                  <Input
                    label="Item serial, Part C"
                    {...register(`licenses.${index}.itemSerialNumberPartC`)}
                  />
                  <Input
                    label="Licence quantity"
                    type="number"
                    {...register(`licenses.${index}.licenseQuantity`)}
                  />
                  <Input
                    label="Export quantity"
                    type="number"
                    {...register(`licenses.${index}.licenseExportQuantity`)}
                  />
                  <Select<ShippingBillFormValues>
                    label="Goods source"
                    name={`licenses.${index}.indigenousOrImported`}
                    options={options.goodsSources}
                    placeholder="Select if needed"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SingleDocumentCard({
  formCtx,
  index,
  options,
  onRemove
}: {
  formCtx: FormContextData<ShippingBillFormValues>
  index: number
  options: ShippingBillOptions
  onRemove: () => void
}) {
  const { register, watch } = formCtx.hooks
  const documentValues = watch(`documents.${index}`)

  const hasCustomValues = Boolean(
    documentValues.placeOfIssue ??
      documentValues.invoiceSerialNumber ??
      documentValues.itemSerialNumber ??
      documentValues.issuingPartyCode ??
      documentValues.issuingPartyName ??
      documentValues.issuingPartyAddress1 ??
      documentValues.issuingPartyCity ??
      documentValues.beneficiaryPartyName ??
      documentValues.fileType
  )

  const [showCustomDetails, setShowCustomDetails] = useState(hasCustomValues)

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Document {index + 1}</h4>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <AsyncPartySelect
            label="Document type code"
            name={`documents.${index}.documentTypeCode`}
            placeholder="Search document type..."
            fetchOptions={(query) => {
              const q = query.toLowerCase().trim()
              const filtered = options.documentCodes.filter(
                (doc) => doc.label.toLowerCase().includes(q) || doc.value.toLowerCase().includes(q)
              )
              return Promise.resolve(
                filtered.map((doc) => ({
                  value: doc.value,
                  label: doc.label
                }))
              )
            }}
            getInitialLabel={(val) => {
              const found = options.documentCodes.find((doc) => doc.value === val || doc.label === val)
              return Promise.resolve(found ? found.label : val)
            }}
          />
        </div>

        <Input
          label="Image reference number (IRN)"
          {...register(`documents.${index}.imageReferenceNumber`)}
          placeholder="e.g. IRN12345678"
        />

        <Input label="Issue date" type={dateType} {...register(`documents.${index}.documentIssueDate`)} />
      </div>

      <AdvancedSection
        title="Issuing party and ICEGATE details"
        open={showCustomDetails}
        onToggle={(isOpen) => setShowCustomDetails(isOpen)}>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Reference number" {...register(`documents.${index}.documentReferenceNumber`)} />
          <Input label="Expiry date" type={dateType} {...register(`documents.${index}.documentExpiryDate`)} />
          <Input label="Invoice serial number" type="number" {...register(`documents.${index}.invoiceSerialNumber`)} />
          <Input label="Item serial number" type="number" {...register(`documents.${index}.itemSerialNumber`)} />
          <Input label="File type" placeholder="PDF" {...register(`documents.${index}.fileType`)} />
          <Input label="Place of issue" {...register(`documents.${index}.placeOfIssue`)} />
        </div>

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="rounded-md border border-gray-200 p-3">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Issuing Details</h5>
            <div className="grid gap-2">
              <Input label="Issuing party name" {...register(`documents.${index}.issuingPartyName`)} />
              <Input label="Issuing address" {...register(`documents.${index}.issuingPartyAddress1`)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="City" {...register(`documents.${index}.issuingPartyCity`)} />
                <Input label="Postal code" {...register(`documents.${index}.issuingPartyPin`)} />
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 p-3">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Beneficiary Details</h5>
            <div className="grid gap-2">
              <Input label="Beneficiary name" {...register(`documents.${index}.beneficiaryPartyName`)} />
              <Input label="Beneficiary address" {...register(`documents.${index}.beneficiaryPartyAddress1`)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="City" {...register(`documents.${index}.beneficiaryPartyCity`)} />
                <Input label="Postal code" {...register(`documents.${index}.beneficiaryPartyPin`)} />
              </div>
            </div>
          </div>
        </div>
      </AdvancedSection>
    </div>
  )
}

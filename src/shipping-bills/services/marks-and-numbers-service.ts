export interface MarksAndNumbersOption {
  value: string
  label: string
}

const marksByExporter: Record<string, MarksAndNumbersOption[]> = {
  '1000': [
    { value: 'AARAV TEXTILES / MADE IN INDIA', label: 'AARAV TEXTILES / MADE IN INDIA' },
    { value: 'ATPL / LOT NO. ______', label: 'ATPL / LOT NO. ______' }
  ],
  '1002': [
    { value: 'BLUE HARBOR EXPORTS / INDIA', label: 'BLUE HARBOR EXPORTS / INDIA' },
    { value: 'BHE / SHIPPING MARKS AS PER INVOICE', label: 'BHE / SHIPPING MARKS AS PER INVOICE' }
  ],
  '1010': [
    { value: 'APEX GARMENTS / EXPORT GRADE', label: 'APEX GARMENTS / EXPORT GRADE' },
    { value: 'AGFPL / CONTAINER SEALED', label: 'AGFPL / CONTAINER SEALED' }
  ],
  '1020': [
    { value: 'ZENITH SPICES / QUALITY CERTIFIED', label: 'ZENITH SPICES / QUALITY CERTIFIED' },
    { value: 'ZSAC / AGRI EXPORT INDIA', label: 'ZSAC / AGRI EXPORT INDIA' }
  ]
}

/**
 * Asynchronously retrieves marks and numbers associated with an exporter.
 * Simulates a realistic backend API query with Promise delay.
 */
export async function getMarksAndNumbersOptions(exporterId: string): Promise<MarksAndNumbersOption[]> {
  // Simulate 150ms network latency
  await new Promise((resolve) => setTimeout(resolve, 150))
  if (!exporterId) return []
  return marksByExporter[exporterId] ?? [
    { value: `EXP-${exporterId} / STANDARD EXPORT MARKS`, label: `EXP-${exporterId} / STANDARD EXPORT MARKS` }
  ]
}

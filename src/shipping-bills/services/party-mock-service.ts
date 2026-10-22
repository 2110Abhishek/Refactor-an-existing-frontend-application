import { getDemoData } from '../demo-store'
import { Branch, Business, Exporter, loadingPorts, PortOption, ports } from '../model'

const MOCK_DELAY_MS = 200

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * Asynchronous party and port service providing debounced lookups and queries.
 */
export const partyMockService = {
  /**
   * Search Exporters by name or IEC
   */
  searchExporters(query: string): Promise<Exporter[]> {
    const { exporters } = getDemoData()
    const q = query.trim().toLowerCase()
    const filtered = exporters.filter(
      (item) => !item.disabled && (item.name.toLowerCase().includes(q) || item.iec.toLowerCase().includes(q))
    )
    return delay(filtered)
  },

  /**
   * Search Branches belonging to a specific Exporter ID
   */
  searchExporterBranches(exporterId: string, query: string): Promise<Branch[]> {
    if (!exporterId) return delay([])
    const { exporters } = getDemoData()
    const exporter = exporters.find((item) => String(item.id) === exporterId)
    if (!exporter) return delay([])

    const q = query.trim().toLowerCase()
    const filtered = exporter.branches.filter(
      (branch) => branch.branchName.toLowerCase().includes(q) || branch.city.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Search Consignees by name
   */
  searchConsignees(query: string): Promise<Business[]> {
    const { businesses } = getDemoData()
    const q = query.trim().toLowerCase()
    const filtered = businesses.filter(
      (item) => item.isConsignee && item.name.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Search Branches belonging to a specific Consignee ID
   */
  searchConsigneeBranches(consigneeId: string, query: string): Promise<Branch[]> {
    if (!consigneeId) return delay([])
    const { businesses } = getDemoData()
    const consignee = businesses.find((item) => String(item.id) === consigneeId)
    if (!consignee) return delay([])

    const q = query.trim().toLowerCase()
    const filtered = consignee.branches.filter(
      (branch) => branch.branchName.toLowerCase().includes(q) || branch.city.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Fetch a single Exporter by ID (used for label resolution)
   */
  getExporterById(exporterId: string): Promise<Exporter | undefined> {
    const { exporters } = getDemoData()
    return delay(exporters.find((item) => String(item.id) === exporterId), 50)
  },

  /**
   * Fetch a single Consignee by ID (used for label resolution)
   */
  getConsigneeById(consigneeId: string): Promise<Business | undefined> {
    const { businesses } = getDemoData()
    return delay(businesses.find((item) => String(item.id) === consigneeId), 50)
  },

  /**
   * Search Port of Loading (Indian ports: code starts with 'IN')
   */
  searchLoadingPorts(query: string): Promise<PortOption[]> {
    const q = query.trim().toLowerCase()
    const portsList = loadingPorts.filter((port) => port.code.startsWith('IN'))
    const filtered = portsList.filter(
      (port) => port.name.toLowerCase().includes(q) || port.code.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Search Final Destination Ports (all ports)
   */
  searchDestinationPorts(query: string): Promise<PortOption[]> {
    const q = query.trim().toLowerCase()
    const filtered = ports.filter(
      (port) => port.name.toLowerCase().includes(q) || port.code.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Fetch Port by Code (used for label resolution)
   */
  getPortByCode(code: string): Promise<PortOption | undefined> {
    return delay(ports.find((port) => port.code === code), 50)
  }
}

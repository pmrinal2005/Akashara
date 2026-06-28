import type { RpaRow, SortableField } from '../../core/types'
import {
  formatCompactCurrency,
  formatCurrency,
  formatInt,
  formatPercent,
} from '../../core/Sanitizer'

export interface ColumnDef {
  field: SortableField
  label: string
  width: string // CSS grid track size
  numeric: boolean
  /** render value as display string */
  render: (row: RpaRow) => string
  /** whether to flag this cell as "live" when row updates (number cols) */
  live?: boolean
}

export const COLUMNS: ColumnDef[] = [
  {
    field: 'project_id',
    label: 'Project ID',
    width: '110px',
    numeric: false,
    render: (r) => r.project_id,
  },
  {
    field: 'project_name',
    label: 'Project Name',
    width: 'minmax(180px, 1.6fr)',
    numeric: false,
    render: (r) => r.project_name,
  },
  {
    field: 'project_status',
    label: 'Status',
    width: '120px',
    numeric: false,
    render: (r) => r.project_status,
  },
  {
    field: 'automation_type',
    label: 'Automation Type',
    width: 'minmax(150px, 1.1fr)',
    numeric: false,
    render: (r) => r.automation_type,
  },
  {
    field: 'department',
    label: 'Department',
    width: 'minmax(140px, 1fr)',
    numeric: false,
    render: (r) => r.department,
  },
  {
    field: 'industry',
    label: 'Industry',
    width: 'minmax(150px, 1fr)',
    numeric: false,
    render: (r) => r.industry,
  },
  {
    field: 'country',
    label: 'Country',
    width: '120px',
    numeric: false,
    render: (r) => r.country,
  },
  {
    field: 'robots_deployed',
    label: 'Robots',
    width: '90px',
    numeric: true,
    live: true,
    render: (r) => formatInt(r.robots_deployed),
  },
  {
    field: 'budget_usd',
    label: 'Budget',
    width: '120px',
    numeric: true,
    live: true,
    render: (r) => formatCompactCurrency(r.budget_usd),
  },
  {
    field: 'annual_savings_usd',
    label: 'Annual Savings',
    width: '140px',
    numeric: true,
    live: true,
    render: (r) => formatCurrency(r.annual_savings_usd),
  },
  {
    field: 'roi_percent',
    label: 'ROI',
    width: '100px',
    numeric: true,
    live: true,
    render: (r) => formatPercent(r.roi_percent),
  },
  {
    field: 'employee_hours_saved',
    label: 'Hours Saved',
    width: '120px',
    numeric: true,
    live: true,
    render: (r) => formatInt(r.employee_hours_saved),
  },
]

export const GRID_TEMPLATE = COLUMNS.map((c) => c.width).join(' ')
export const ROW_HEIGHT = 34

import { requestClient } from '#/api/request';

export interface OpsDashboardKPIs {
  exhibition_today: number;
  exhibition_week: number;
  visit_pending: number;
  visit_due_soon: number;
  visit_overdue: number;
  customer_intent: number;
  customer_trial: number;
  customer_formal: number;
  customer_closed_month: number;
}

export interface OpsDashboardFunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;
}

export interface OpsDashboardTrendPoint {
  date: string;
  count: number;
}

export interface OpsDashboardIntentItem {
  intent: string;
  label: string;
  count: number;
}

export interface OpsDashboardVisitAlert {
  id: number;
  title: string;
  target_org?: string;
  follow_owner_name?: string;
  due_at?: string;
  intent?: string;
  status?: string;
  alert_type: 'overdue' | 'due_soon' | 'high_intent' | string;
}

export interface OpsDashboardEvent {
  id: number;
  type: string;
  title: string;
  time: string;
  ref_id: number;
  ref_path: string;
}

export interface OpsDashboardOverview {
  kpis: OpsDashboardKPIs;
  funnel: OpsDashboardFunnelStage[];
  exhibition_trend: OpsDashboardTrendPoint[];
  intent_dist: OpsDashboardIntentItem[];
  visit_alerts: OpsDashboardVisitAlert[];
  recent_events: OpsDashboardEvent[];
}

export async function getOpsDashboardOverview(params?: { days?: number }) {
  return requestClient.get('/ops/dashboard/overview', { params }) as Promise<OpsDashboardOverview>;
}

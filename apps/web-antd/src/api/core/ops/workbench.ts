import { requestClient } from '#/api/request';

export interface OpsRiskSummary {
  total: number;
  trial_expiring: number;
  contract_expiring: number;
  settlement_due_soon: number;
  settlement_overdue: number;
  survey_low_score: number;
  non_renewal_pending: number;
}

export interface OpsRiskItem {
  type: string;
  severity: string;
  title: string;
  summary: string;
  suggestion: string;
  customer_id: number;
  customer_name: string;
  owner_id?: number;
  owner_name?: string;
  biz_type?: string;
  biz_id?: number;
  due_at?: string | null;
  ref_path?: string;
  draft_hint?: string;
}

export interface OpsWorkbenchBriefing {
  generated_at: string;
  within_days: number;
  summary: OpsRiskSummary;
  items: OpsRiskItem[];
}

export async function getOpsWorkbenchBriefing(params?: {
  within_days?: number;
  mine_only?: boolean;
}) {
  return requestClient.get('/ops/workbench/briefing', {
    params,
  }) as Promise<OpsWorkbenchBriefing>;
}

export interface OpsReminderDraftReq {
  type: string;
  channel?: string;
  customer_id?: number;
  customer_name?: string;
  title?: string;
  summary?: string;
  suggestion?: string;
  biz_type?: string;
  biz_id?: number;
  due_at?: string;
}

export interface OpsReminderDraftResp {
  channel: string;
  subject: string;
  body: string;
  source: string;
  editable: boolean;
  hint?: string;
}

export async function createOpsReminderDraft(data: OpsReminderDraftReq) {
  return requestClient.post(
    '/ops/workbench/reminder-draft',
    data,
  ) as Promise<OpsReminderDraftResp>;
}

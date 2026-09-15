import { requestClient } from '#/api/request';

export interface OpsManagerWeeklyReport {
  generated_at: string;
  period_start: string;
  period_end: string;
  days: number;
  executive_summary?: string;
  markdown: string;
  html?: string;
  source: string;
  llm_enabled?: boolean;
  cached?: boolean;
  hint?: string;
  snapshot?: Record<string, unknown>;
}

export async function getOpsManagerWeeklyReport(params?: {
  days?: number;
  refresh?: boolean;
}) {
  return requestClient.get('/ops/manager/weekly-report', {
    params: {
      days: params?.days,
      refresh: params?.refresh ? true : undefined,
    },
  }) as Promise<OpsManagerWeeklyReport>;
}

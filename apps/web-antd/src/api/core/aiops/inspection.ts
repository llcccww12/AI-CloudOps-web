import { requestClientAIOps } from '#/api/request';

export interface InspectionRunRequest {
  async?: boolean;
  cluster_id?: number;
  include_events?: boolean;
  include_logs?: boolean;
  kube_config?: string;
  namespace?: string;
  profiles?: string[];
  scope?: string;
  severity_threshold?: number;
  time_window_minutes?: number;
}

export interface InspectionNextAction {
  label: string;
  query?: Record<string, string>;
  type: 'autofix' | 'rca' | string;
}

export interface InspectionFinding {
  description: string;
  evidence?: Array<Record<string, any>>;
  finding_id?: string;
  next_actions?: InspectionNextAction[];
  recommendations?: string[];
  resource?: Record<string, any>;
  rule_id: string;
  severity: string;
  title: string;
}

export interface InspectionSummary {
  high: number;
  issues_found: number;
  low: number;
  medium: number;
  namespace?: string;
  report_id?: string;
  scope: string;
  time_window_minutes: number;
  total_checks: number;
}

export interface InspectionReport {
  findings: InspectionFinding[];
  recommendations?: string[];
  report_id: string;
  stats?: Record<string, any>;
  summary: InspectionSummary;
  timestamp: string;
}

export interface InspectionHistoryItem extends InspectionSummary {
  cluster_id?: number;
  report_id: string;
  timestamp?: string;
}

export interface InspectionTaskStatus {
  error?: string;
  progress?: number;
  report_id?: string;
  status: string;
  task_id: string;
}

export function listInspectionRules() {
  return requestClientAIOps.get<{ items: Array<{ category: string; id: string; profile: string }> }>(
    '/inspection/rules',
  );
}

export function listInspectionProfiles() {
  return requestClientAIOps.get<{
    items: Array<{ description: string; name: string; rules: string[] }>;
  }>('/inspection/profiles');
}

export function runInspection(data: InspectionRunRequest) {
  return requestClientAIOps.post<InspectionReport | InspectionTaskStatus>('/inspection/run', data, {
    timeout: 180_000,
  });
}

export function getInspectionTask(taskId: string) {
  return requestClientAIOps.get<InspectionTaskStatus>(`/inspection/tasks/${taskId}`);
}

export function listInspectionHistory(limit = 50) {
  return requestClientAIOps.get<{ items: InspectionHistoryItem[]; total: number }>(
    '/inspection/history',
    { params: { limit } },
  );
}

export function getInspectionReport(reportId: string) {
  return requestClientAIOps.get<InspectionReport>(`/inspection/report/${reportId}`);
}

export function getInspectionReportMarkdown(reportId: string) {
  return requestClientAIOps.get<{ markdown: string; report_id: string }>(
    `/inspection/report/${reportId}/markdown`,
  );
}

export function getInspectionConfig() {
  return requestClientAIOps.get<Record<string, any>>('/inspection/config');
}

export function getInspectionSchedulerStatus() {
  return requestClientAIOps.get<{ interval_minutes?: number; running: boolean }>(
    '/inspection/scheduler/status',
  );
}

export function startInspectionScheduler() {
  return requestClientAIOps.post('/inspection/scheduler/start');
}

export function stopInspectionScheduler() {
  return requestClientAIOps.post('/inspection/scheduler/stop');
}

import { requestClient } from '#/api/request';

export const OpsCustomerStage = {
  Intent: 'intent',
  Trial: 'trial',
  Formal: 'formal',
  Closed: 'closed',
} as const;

export const OpsCustomerStageLabel: Record<string, string> = {
  lead: '意向', // 兼容历史线索数据，展示为意向
  intent: '意向',
  trial: '试用',
  formal: '正式',
  closed: '闭环',
};

export interface OpsCustomerItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  name: string;
  stage: string;
  demand_types?: string[];
  industry?: string;
  contact_name?: string;
  contact_title?: string;
  contact_phone?: string;
  contact_email?: string;
  source?: string;
  source_ref_type?: string;
  source_ref_id?: number | null;
  owner_id?: number;
  owner_name?: string;
  budget_range?: string;
  next_follow_at?: string | null;
  closed_reason?: string;
  vendor_profile_done?: number;
  remark?: string;
  operator_id?: number;
  operator_name?: string;
  report_code?: string;
  report_enabled?: number;
  report_secret_configured?: boolean;
  report_secret_updated_at?: string | null;
}

export interface CreateOpsCustomerReq {
  name: string;
  stage?: string;
  demand_types?: string[];
  industry?: string;
  contact_name?: string;
  contact_title?: string;
  contact_phone?: string;
  contact_email?: string;
  source?: string;
  owner_id?: number;
  owner_name?: string;
  budget_range?: string;
  next_follow_at?: string | null;
  remark?: string;
}

export interface UpdateOpsCustomerReq extends CreateOpsCustomerReq {
  id: number;
}

export interface ChangeOpsCustomerStageReq {
  id: number;
  stage: string;
  closed_reason?: string;
}

export interface ListOpsCustomerReq {
  page: number;
  size: number;
  search?: string;
  stage?: string;
  owner_id?: number;
  source?: string;
}

export interface OpsFollowupItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  type: string;
  content: string;
  next_plan?: string;
  operator_id?: number;
  operator_name?: string;
}

export interface CreateOpsFollowupReq {
  customer_id: number;
  type: string;
  content: string;
  next_plan?: string;
}

export interface ListOpsFollowupReq {
  page: number;
  size: number;
  customer_id: number;
}

export async function createOpsCustomer(data: CreateOpsCustomerReq) {
  return requestClient.post('/ops/customer/create', data);
}

export async function updateOpsCustomer(data: UpdateOpsCustomerReq) {
  return requestClient.put(`/ops/customer/update/${data.id}`, data);
}

export async function deleteOpsCustomer(id: number) {
  return requestClient.delete(`/ops/customer/delete/${id}`);
}

export async function listOpsCustomer(params: ListOpsCustomerReq) {
  return requestClient.get('/ops/customer/list', { params });
}

export async function detailOpsCustomer(id: number, silent = false) {
  return requestClient.get(`/ops/customer/detail/${id}`, {
    headers: silent ? { 'X-Suppress-Error': '1' } : undefined,
  });
}

export async function changeOpsCustomerStage(data: ChangeOpsCustomerStageReq) {
  return requestClient.post('/ops/customer/change-stage', data);
}

export async function createOpsFollowup(data: CreateOpsFollowupReq) {
  return requestClient.post('/ops/followup/create', data);
}

export async function listOpsFollowup(params: ListOpsFollowupReq) {
  return requestClient.get('/ops/followup/list', { params });
}

export interface OpsCustomerLifecycleWorkorder {
  customer_id: number;
  customer_name?: string;
  process_type?: 'lifecycle' | 'trial' | 'activation' | string;
  process_type_label?: string;
  biz_id?: number;
  workorder_instance_id: number;
  title: string;
  serial_number?: string;
  status?: string;
  instance_status?: number;
  current_step_id?: string;
  link_status: string;
  created_at?: string;
}

export type OpsCustomerProcessType = 'lifecycle' | 'trial' | 'activation';

export interface StartOpsCustomerProcessReq {
  process_type: OpsCustomerProcessType;
  title?: string;
  resource_scale?: string;
  purpose?: string;
  remark?: string;
}

export async function startOpsCustomerLifecycle(customerId: number) {
  return requestClient.post(`/ops/customer/lifecycle/start/${customerId}`);
}

export async function startOpsCustomerProcess(
  customerId: number,
  data: StartOpsCustomerProcessReq,
) {
  return requestClient.post(`/ops/customer/process/start/${customerId}`, data);
}

export async function listOpsCustomerLifecycle(customerId: number) {
  return requestClient.get(`/ops/customer/lifecycle/list/${customerId}`);
}

export interface OpsLifecycleApproveContext {
  instance_id: number;
  customer_id: number;
  customer_name: string;
  current_step_id: string;
  current_step_name: string;
  node_key: string;
  needs_next_assignee: boolean;
  next_step_name?: string;
  latest_trial?: Record<string, any>;
  latest_contract?: Record<string, any>;
  latest_activation?: Record<string, any>;
  latest_settlement?: Record<string, any>;
  form_data?: Record<string, any>;
}

export interface OpsLifecycleApproveReq {
  instance_id: number;
  comment?: string;
  assignee_id?: number;
  attachment_ids?: number[];
  payload?: Record<string, any>;
}

export async function getOpsLifecycleApproveContext(instanceId: number) {
  return requestClient.get<OpsLifecycleApproveContext>(
    `/ops/customer/lifecycle/approve-context/${instanceId}`,
  );
}

export async function approveOpsLifecycleNode(data: OpsLifecycleApproveReq) {
  return requestClient.post('/ops/customer/lifecycle/approve', data);
}

export interface OpsVendorProfile {
  id?: number;
  customer_id: number;
  unit_name: string;
  credit_code?: string;
  principal?: string;
  contact_address_phone?: string;
  cnaps_code?: string;
  account_name?: string;
  bank_name?: string;
  bank_account?: string;
  bank_province?: string;
  bank_city?: string;
  phone?: string;
  account_type?: string;
}

export type UpsertOpsVendorProfileReq = Omit<OpsVendorProfile, 'id'>;

export async function getOpsVendorProfile(customerId: number) {
  return requestClient.get<OpsVendorProfile | null>(
    `/ops/customer/vendor-profile/${customerId}`,
  );
}

export async function upsertOpsVendorProfile(data: UpsertOpsVendorProfileReq) {
  return requestClient.post('/ops/customer/vendor-profile', data);
}

export interface UpdateOpsCustomerReportReq {
  report_code: string;
  report_enabled: number;
}

export interface RotateOpsCustomerReportSecretResp {
  report_code: string;
  report_secret: string;
  message: string;
}

export async function updateOpsCustomerReport(
  id: number,
  data: UpdateOpsCustomerReportReq,
) {
  return requestClient.put(`/ops/customer/report/${id}`, data);
}

export async function rotateOpsCustomerReportSecret(id: number) {
  return requestClient.post<RotateOpsCustomerReportSecretResp>(
    `/ops/customer/report/${id}/rotate-secret`,
  );
}

export function opsPublicFaultUrl(code?: string) {
  const base = `${window.location.origin}/public/fault`;
  if (code) return `${base}?code=${encodeURIComponent(code)}`;
  return base;
}

import { requestClient } from '#/api/request';

export interface OpsActivationItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  contract_id: number;
  title: string;
  resource_summary?: string;
  purpose?: string;
  feedback_account?: string;
  feedback_tenant?: string;
  feedback_endpoint?: string;
  feedback_remark?: string;
  status?: string;
  activated_at?: string | null;
  operator_id?: number;
  operator_name?: string;
  workorder_instance_id?: number;
}

export interface CreateOpsActivationReq {
  customer_id: number;
  contract_id: number;
  title: string;
  resource_summary?: string;
  purpose?: string;
}

export interface UpdateOpsActivationReq {
  id: number;
  title: string;
  resource_summary?: string;
  purpose?: string;
  feedback_account?: string;
  feedback_tenant?: string;
  feedback_endpoint?: string;
  feedback_remark?: string;
}

export interface FeedbackOpsActivationReq {
  id: number;
  feedback_account: string;
  feedback_tenant?: string;
  feedback_endpoint?: string;
  feedback_remark?: string;
}

export interface ListOpsActivationReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  status?: string;
}

export async function createOpsActivation(data: CreateOpsActivationReq) {
  return requestClient.post('/ops/activation/create', data);
}

export async function updateOpsActivation(data: UpdateOpsActivationReq) {
  return requestClient.put(`/ops/activation/update/${data.id}`, data);
}

export async function feedbackOpsActivation(data: FeedbackOpsActivationReq) {
  return requestClient.post(`/ops/activation/feedback/${data.id}`, data);
}

export async function deleteOpsActivation(id: number) {
  return requestClient.delete(`/ops/activation/delete/${id}`);
}

export async function listOpsActivation(params: ListOpsActivationReq) {
  return requestClient.get('/ops/activation/list', { params });
}

export async function detailOpsActivation(id: number) {
  return requestClient.get(`/ops/activation/detail/${id}`);
}

export async function submitOpsActivation(id: number) {
  return requestClient.post('/ops/activation/submit', { id });
}

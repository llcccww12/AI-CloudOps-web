import { requestClient } from '#/api/request';

export interface OpsTrialItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  title: string;
  demand_type?: string;
  resource_scale?: string;
  purpose?: string;
  status?: string;
  plan_start_at?: string | null;
  plan_end_at?: string | null;
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  evaluation?: string;
  convert_intent?: string;
  operator_id?: number;
  operator_name?: string;
  workorder_instance_id?: number;
}

export interface CreateOpsTrialReq {
  customer_id: number;
  title: string;
  demand_type?: string;
  resource_scale?: string;
  purpose?: string;
  plan_start_at?: string | null;
  plan_end_at?: string | null;
}

export interface UpdateOpsTrialReq {
  id: number;
  title: string;
  demand_type?: string;
  resource_scale?: string;
  purpose?: string;
  plan_start_at?: string | null;
  plan_end_at?: string | null;
  evaluation?: string;
  convert_intent?: string;
}

export interface ListOpsTrialReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  status?: string;
}

export async function createOpsTrial(data: CreateOpsTrialReq) {
  return requestClient.post('/ops/trial/create', data);
}

export async function updateOpsTrial(data: UpdateOpsTrialReq) {
  return requestClient.put(`/ops/trial/update/${data.id}`, data);
}

export async function deleteOpsTrial(id: number) {
  return requestClient.delete(`/ops/trial/delete/${id}`);
}

export async function listOpsTrial(params: ListOpsTrialReq) {
  return requestClient.get('/ops/trial/list', { params });
}

export async function detailOpsTrial(id: number) {
  return requestClient.get(`/ops/trial/detail/${id}`);
}

export async function submitOpsTrial(id: number) {
  return requestClient.post('/ops/trial/submit', { id });
}

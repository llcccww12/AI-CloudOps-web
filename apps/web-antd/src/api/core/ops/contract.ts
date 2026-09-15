import { requestClient } from '#/api/request';

export interface OpsContractItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  trial_id?: number | null;
  type: string;
  title: string;
  product_type?: string;
  billing_mode?: string;
  unit_price?: number;
  billing_cycle?: string;
  payment_method?: string;
  payment_term_days?: number;
  start_at?: string | null;
  end_at?: string | null;
  auto_renew?: number;
  status?: string;
  remark?: string;
  operator_id?: number;
  operator_name?: string;
}

export interface CreateOpsContractReq {
  customer_id: number;
  trial_id?: number | null;
  type: string;
  title: string;
  product_type?: string;
  billing_mode?: string;
  unit_price?: number;
  billing_cycle?: string;
  payment_method?: string;
  payment_term_days?: number;
  start_at?: string | null;
  end_at?: string | null;
  auto_renew?: number;
  remark?: string;
}

export interface UpdateOpsContractReq {
  id: number;
  title: string;
  product_type?: string;
  billing_mode?: string;
  unit_price?: number;
  billing_cycle?: string;
  payment_method?: string;
  payment_term_days?: number;
  start_at?: string | null;
  end_at?: string | null;
  auto_renew?: number;
  status?: string;
  remark?: string;
}

export interface ListOpsContractReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  type?: string;
  status?: string;
}

export async function createOpsContract(data: CreateOpsContractReq) {
  return requestClient.post('/ops/contract/create', data);
}

export async function updateOpsContract(data: UpdateOpsContractReq) {
  return requestClient.put(`/ops/contract/update/${data.id}`, data);
}

export async function deleteOpsContract(id: number) {
  return requestClient.delete(`/ops/contract/delete/${id}`);
}

export async function listOpsContract(params: ListOpsContractReq) {
  return requestClient.get('/ops/contract/list', { params });
}

export async function detailOpsContract(id: number) {
  return requestClient.get(`/ops/contract/detail/${id}`);
}

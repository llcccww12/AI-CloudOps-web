import { requestClient } from '#/api/request';

export interface OpsSettlementItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  contract_id: number;
  title: string;
  period_start?: string | null;
  period_end?: string | null;
  amount?: number;
  due_at?: string | null;
  status?: string;
  remark?: string;
  operator_id?: number;
  operator_name?: string;
}

export interface CreateOpsSettlementReq {
  customer_id: number;
  contract_id: number;
  title: string;
  period_start?: string | null;
  period_end?: string | null;
  amount?: number;
  due_at?: string | null;
  remark?: string;
}

export interface UpdateOpsSettlementReq {
  id: number;
  title: string;
  period_start?: string | null;
  period_end?: string | null;
  amount?: number;
  due_at?: string | null;
  status?: string;
  remark?: string;
}

export interface ListOpsSettlementReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  status?: string;
}

export async function createOpsSettlement(data: CreateOpsSettlementReq) {
  return requestClient.post('/ops/settlement/create', data);
}

export async function updateOpsSettlement(data: UpdateOpsSettlementReq) {
  return requestClient.put(`/ops/settlement/update/${data.id}`, data);
}

export async function deleteOpsSettlement(id: number) {
  return requestClient.delete(`/ops/settlement/delete/${id}`);
}

export async function listOpsSettlement(params: ListOpsSettlementReq) {
  return requestClient.get('/ops/settlement/list', { params });
}

export async function detailOpsSettlement(id: number) {
  return requestClient.get(`/ops/settlement/detail/${id}`);
}

export async function confirmOpsSettlement(id: number) {
  return requestClient.post(`/ops/settlement/confirm/${id}`);
}

import { requestClient } from '#/api/request';

export interface OpsPaymentItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  settlement_id: number;
  amount: number;
  paid_at?: string | null;
  bank_ref?: string;
  status?: string;
  operator_id?: number;
  operator_name?: string;
  remark?: string;
}

export interface CreateOpsPaymentReq {
  customer_id: number;
  settlement_id: number;
  amount: number;
  paid_at?: string | null;
  bank_ref?: string;
  remark?: string;
}

export interface UpdateOpsPaymentReq {
  id: number;
  amount?: number;
  paid_at?: string | null;
  bank_ref?: string;
  status?: string;
  remark?: string;
}

export interface ListOpsPaymentReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  settlement_id?: number;
}

export async function createOpsPayment(data: CreateOpsPaymentReq) {
  return requestClient.post('/ops/payment/create', data);
}

export async function updateOpsPayment(data: UpdateOpsPaymentReq) {
  return requestClient.put(`/ops/payment/update/${data.id}`, data);
}

export async function deleteOpsPayment(id: number) {
  return requestClient.delete(`/ops/payment/delete/${id}`);
}

export async function listOpsPayment(params: ListOpsPaymentReq) {
  return requestClient.get('/ops/payment/list', { params });
}

export async function detailOpsPayment(id: number) {
  return requestClient.get(`/ops/payment/detail/${id}`);
}

export async function matchOpsPayment(id: number) {
  return requestClient.post(`/ops/payment/match/${id}`);
}

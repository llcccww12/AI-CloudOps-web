import { requestClient } from '#/api/request';

export interface OpsInvoiceItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  customer_id: number;
  settlement_id: number;
  invoice_no?: string;
  invoice_type?: string;
  amount?: number;
  issued_at?: string | null;
  status?: string;
  operator_id?: number;
  operator_name?: string;
}

export interface CreateOpsInvoiceReq {
  customer_id: number;
  settlement_id: number;
  invoice_no?: string;
  invoice_type?: string;
  amount?: number;
  issued_at?: string | null;
}

export interface UpdateOpsInvoiceReq {
  id: number;
  invoice_no?: string;
  invoice_type?: string;
  amount?: number;
  issued_at?: string | null;
  status?: string;
}

export interface ListOpsInvoiceReq {
  page: number;
  size: number;
  search?: string;
  customer_id?: number;
  settlement_id?: number;
}

export async function createOpsInvoice(data: CreateOpsInvoiceReq) {
  return requestClient.post('/ops/invoice/create', data);
}

export async function updateOpsInvoice(data: UpdateOpsInvoiceReq) {
  return requestClient.put(`/ops/invoice/update/${data.id}`, data);
}

export async function deleteOpsInvoice(id: number) {
  return requestClient.delete(`/ops/invoice/delete/${id}`);
}

export async function listOpsInvoice(params: ListOpsInvoiceReq) {
  return requestClient.get('/ops/invoice/list', { params });
}

export async function detailOpsInvoice(id: number) {
  return requestClient.get(`/ops/invoice/detail/${id}`);
}

import { requestClient } from '#/api/request';

export interface OpsVisitItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  title: string;
  target_org?: string;
  start_at?: string | null;
  end_at?: string | null;
  location?: string;
  participants?: string;
  summary?: string;
  outcome?: string;
  status?: string;
  source?: string;
  lead_source?: string;
  exhibition_id?: number | null;
  customer_id?: number | null;
  credit_code?: string;
  industry?: string;
  company_scale?: string;
  qualifications?: string;
  finance_status?: string;
  address?: string;
  product_line?: string;
  has_cooperation?: number;
  contact_name?: string;
  contact_title?: string;
  decision_role?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_wechat?: string;
  referrer_name?: string;
  host_name?: string;
  d0_at?: string | null;
  planned_at?: string | null;
  visit_goal?: string;
  prep_materials?: string;
  duration_min?: number;
  location_type?: string;
  pain_points?: string;
  objections?: string;
  competitor_info?: string;
  site_feedback?: string;
  intent?: string;
  match_score?: number;
  opportunity_amount?: number;
  next_action?: string;
  follow_owner_id?: number;
  follow_owner_name?: string;
  next_follow_at?: string | null;
  assigned_at?: string | null;
  due_at?: string | null;
  pre_due_reminded?: number;
  crm_transferred?: number;
  operator_id?: number;
  operator_name?: string;
  updater_id?: number;
  updater_name?: string;
  remark?: string;
}

export type CreateOpsVisitReq = Omit<
  OpsVisitItem,
  'id' | 'created_at' | 'updated_at' | 'exhibition_id' | 'source' | 'crm_transferred' | 'operator_id' | 'operator_name'
> & {
  title: string;
};

export interface UpdateOpsVisitReq extends CreateOpsVisitReq {
  id: number;
  status?: string;
}

export interface ListOpsVisitReq {
  page: number;
  size: number;
  search?: string;
  status?: string;
  source?: string;
  intent?: string;
}

export interface ConvertVisitLeadReq {
  id: number;
  demand_types?: string[];
  contact_name?: string;
  contact_phone?: string;
  owner_id?: number;
  owner_name?: string;
}

export async function createOpsVisit(data: CreateOpsVisitReq) {
  return requestClient.post('/ops/visit/create', data);
}

export async function updateOpsVisit(data: UpdateOpsVisitReq) {
  return requestClient.put(`/ops/visit/update/${data.id}`, data);
}

export async function deleteOpsVisit(id: number) {
  return requestClient.delete(`/ops/visit/delete/${id}`);
}

export async function listOpsVisit(params: ListOpsVisitReq) {
  return requestClient.get('/ops/visit/list', { params });
}

export async function detailOpsVisit(id: number) {
  return requestClient.get(`/ops/visit/detail/${id}`);
}

export async function convertOpsVisit(data: ConvertVisitLeadReq) {
  return requestClient.post('/ops/visit/convert', data);
}

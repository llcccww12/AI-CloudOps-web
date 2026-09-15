import { requestClient } from '#/api/request';

export interface OpsExhibitionItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  company_name: string;
  company_level?: string;
  visitor_name?: string;
  visitor_title?: string;
  visitor_count?: number;
  visit_at?: string | null;
  docking_unit?: string;
  host_name?: string;
  purpose?: string;
  need_meeting?: number;
  focus_tags?: string[];
  content?: string;
  meeting_minutes?: string;
  contact_phone?: string;
  companions?: string;
  intent?: string;
  source?: string;
  status?: string;
  visit_id?: number | null;
  customer_id?: number | null;
  operator_id?: number;
  operator_name?: string;
  updater_id?: number;
  updater_name?: string;
  remark?: string;
}

export interface CreateOpsExhibitionReq {
  company_name: string;
  company_level?: string;
  visitor_name?: string;
  visitor_title?: string;
  visitor_count?: number;
  visit_at?: string | null;
  docking_unit?: string;
  host_name?: string;
  purpose?: string;
  need_meeting?: number;
  focus_tags?: string[];
  content?: string;
  meeting_minutes?: string;
  contact_phone?: string;
  companions?: string;
  intent?: string;
  remark?: string;
  customer_id?: number | null;
}

export interface UpdateOpsExhibitionReq extends CreateOpsExhibitionReq {
  id: number;
}

export interface ListOpsExhibitionReq {
  page: number;
  size: number;
  search?: string;
  status?: string;
  source?: string;
}

export interface ConvertExhibitionLeadReq {
  id: number;
  demand_types?: string[];
  contact_name?: string;
  contact_phone?: string;
  owner_id: number;
  owner_name: string;
}

export async function createOpsExhibition(data: CreateOpsExhibitionReq) {
  return requestClient.post('/ops/exhibition/create', data);
}

export async function updateOpsExhibition(data: UpdateOpsExhibitionReq) {
  return requestClient.put(`/ops/exhibition/update/${data.id}`, data);
}

export async function deleteOpsExhibition(id: number) {
  return requestClient.delete(`/ops/exhibition/delete/${id}`);
}

export async function listOpsExhibition(params: ListOpsExhibitionReq) {
  return requestClient.get('/ops/exhibition/list', { params });
}

export async function detailOpsExhibition(id: number) {
  return requestClient.get(`/ops/exhibition/detail/${id}`);
}

export async function convertOpsExhibition(data: ConvertExhibitionLeadReq) {
  return requestClient.post('/ops/exhibition/convert', data);
}

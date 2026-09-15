import { requestClient } from '#/api/request';

export interface OpsReminderRuleItem {
  id?: number;
  created_at?: string;
  updated_at?: string;
  scene: string;
  name: string;
  advance_days: number;
  enabled: number;
  channels?: string[];
  extra_user_ids?: number[];
  remark?: string;
}

export interface CreateOpsReminderRuleReq {
  scene: string;
  name: string;
  advance_days?: number;
  enabled?: number;
  channels?: string[];
  extra_user_ids?: number[];
  remark?: string;
}

export interface UpdateOpsReminderRuleReq {
  id: number;
  name?: string;
  advance_days?: number;
  enabled?: number;
  channels?: string[];
  extra_user_ids?: number[];
  remark?: string;
}

export interface ListOpsReminderRuleReq {
  page: number;
  size: number;
  search?: string;
}

export interface OpsReminderHit {
  rule_id?: number;
  task_id?: number;
  scene: string;
  rule_name?: string;
  advance_days?: number;
  target_user_id?: number;
  target_user_hint?: string;
  extra_user_ids?: number[];
  channels?: string[];
  biz_type?: string;
  biz_id?: number;
  biz_title?: string;
  customer_id?: number;
  customer_name?: string;
  link?: string;
  reason?: string;
  source_type?: string;
}

export interface OpsReminderScanResult {
  hit_count: number;
  notify_count: number;
  skipped_no_owner: number;
  delivery_count?: number;
}

export interface OpsReminderTaskItem {
  id?: number;
  title: string;
  customer_id?: number;
  biz_type?: string;
  biz_id?: number;
  due_at: string;
  advance_days: number;
  channels?: string[];
  target_user_id: number;
  extra_user_ids?: number[];
  content?: string;
  status?: string;
  sent_at?: string;
  creator_id?: number;
  creator_name?: string;
  created_at?: string;
}

export interface CreateOpsReminderTaskReq {
  title: string;
  customer_id?: number;
  biz_type?: string;
  biz_id?: number;
  due_at: string;
  advance_days?: number;
  channels?: string[];
  target_user_id: number;
  extra_user_ids?: number[];
  content?: string;
}

export interface UpdateOpsReminderTaskReq {
  id: number;
  title?: string;
  due_at?: string;
  advance_days?: number;
  channels?: string[];
  target_user_id?: number;
  extra_user_ids?: number[];
  content?: string;
  status?: string;
}

export interface OpsReminderDeliveryItem {
  id?: number;
  source_type: string;
  source_id: number;
  scene?: string;
  biz_type?: string;
  biz_id?: number;
  customer_id?: number;
  target_user_id: number;
  channel: string;
  status: string;
  title?: string;
  content?: string;
  error_msg?: string;
  created_at?: string;
}

export async function listOpsReminderRule(params?: ListOpsReminderRuleReq) {
  return requestClient.get('/ops/reminder/list', { params });
}

export async function createOpsReminderRule(data: CreateOpsReminderRuleReq) {
  return requestClient.post('/ops/reminder/create', data);
}

export async function updateOpsReminderRule(data: UpdateOpsReminderRuleReq) {
  return requestClient.put(`/ops/reminder/update/${data.id}`, data);
}

export async function previewOpsReminderHits() {
  return requestClient.get<OpsReminderHit[]>('/ops/reminder/preview');
}

export async function scanOpsReminder() {
  return requestClient.post<OpsReminderScanResult>('/ops/reminder/scan');
}

export async function listOpsReminderTask(params: {
  page: number;
  size: number;
  customer_id?: number;
  status?: string;
  search?: string;
}) {
  return requestClient.get('/ops/reminder/task/list', { params });
}

export async function createOpsReminderTask(data: CreateOpsReminderTaskReq) {
  return requestClient.post('/ops/reminder/task/create', data);
}

export async function updateOpsReminderTask(data: UpdateOpsReminderTaskReq) {
  return requestClient.put(`/ops/reminder/task/update/${data.id}`, data);
}

export async function deleteOpsReminderTask(id: number) {
  return requestClient.delete(`/ops/reminder/task/delete/${id}`);
}

export async function listOpsReminderDelivery(params: {
  page: number;
  size: number;
  channel?: string;
  status?: string;
  scene?: string;
  search?: string;
}) {
  return requestClient.get('/ops/reminder/delivery/list', { params });
}

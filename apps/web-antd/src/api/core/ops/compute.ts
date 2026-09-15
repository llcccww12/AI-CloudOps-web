import { requestClient } from '#/api/request';

export interface OpsComputeAsset {
  id: number;
  server_code: string;
  name: string;
  gpu_model: string;
  serial_no?: string;
  rack_location?: string;
  mgmt_ip?: string;
  commissioned_at?: string;
  gpu_count?: number | null;
  default_lease_mode?: string;
  status: string;
  tech_owner?: string;
  next_inspect_at?: string;
  remark?: string;
  created_at?: string;
}

export interface OpsComputePhaseSegment {
  phase: string;
  start_at?: string;
  end_at?: string;
  contract_id?: number;
  contract_no?: string;
  lease_mode?: string;
  allocated_gpus?: number;
  note?: string;
  changed_at?: string;
}

export interface OpsComputeAllocation {
  id: number;
  record_no: string;
  source?: string;
  server_code: string;
  partition_id?: string;
  lease_mode: string;
  allocated_gpus: number;
  planned_gpus?: number;
  customer_id: number;
  customer_name?: string;
  contract_id?: number;
  contract_no?: string;
  contract_start_at?: string;
  contract_end_at?: string;
  activation_id?: number;
  trial_id?: number;
  apply_no?: string;
  audit_instance_id?: number;
  applied_at?: string;
  approved_at?: string;
  opened_at?: string;
  current_period_start_at?: string;
  plan_release_at?: string;
  actual_release_at?: string;
  biz_phase?: string;
  biz_phase_label?: string;
  phase_note?: string;
  phase_history?: OpsComputePhaseSegment[];
  phase_history_summary?: string;
  contract_trail_summary?: string;
  executor_name?: string;
  change_ticket_no?: string;
  remark?: string;
  gpu_model?: string;
  life_status?: string;
  life_status_label?: string;
  occupying_gpus?: number;
  server_gpu_count?: number | null;
  server_occupied?: number;
  capacity_check?: string;
  capacity_check_label?: string;
  evidence_ok?: boolean;
  sheet_count?: number;
  email_count?: number;
  created_at?: string;
}

export interface OpsComputeDashboard {
  by_model: Array<{
    gpu_model: string;
    server_count: number;
    total_gpus: number;
    used_gpus: number;
    available_gpus: number;
    available_servers: number;
    overbook_count: number;
  }>;
  asset_total: number;
  in_use_records: number;
  pending_open?: number;
  pending_release: number;
  overbook_count: number;
  missing_evidence: number;
  total_gpus?: number;
  used_gpus?: number;
  available_gpus?: number;
}

export async function listOpsComputeAsset(params: Record<string, any>) {
  return requestClient.get<{ items: OpsComputeAsset[]; total: number }>(
    '/ops/compute/asset/list',
    { params },
  );
}

export async function createOpsComputeAsset(data: Record<string, any>) {
  return requestClient.post('/ops/compute/asset/create', data);
}

export async function updateOpsComputeAsset(id: number, data: Record<string, any>) {
  return requestClient.put(`/ops/compute/asset/update/${id}`, data);
}

export async function deleteOpsComputeAsset(id: number) {
  return requestClient.delete(`/ops/compute/asset/delete/${id}`);
}

export async function seedOpsComputeAssets() {
  return requestClient.post<{ seeded: number }>('/ops/compute/asset/seed');
}

export async function listOpsComputeAllocation(params: Record<string, any>) {
  return requestClient.get<{ items: OpsComputeAllocation[]; total: number }>(
    '/ops/compute/allocation/list',
    { params },
  );
}

export async function createOpsComputeAllocation(data: Record<string, any>) {
  return requestClient.post('/ops/compute/allocation/create', data);
}

export async function updateOpsComputeAllocation(id: number, data: Record<string, any>) {
  return requestClient.put(`/ops/compute/allocation/update/${id}`, data);
}

export async function releaseOpsComputeAllocation(id: number, data?: Record<string, any>) {
  return requestClient.post(`/ops/compute/allocation/release/${id}`, data || {});
}

export async function extendOpsComputeAllocation(id: number, data?: Record<string, any>) {
  return requestClient.post(`/ops/compute/allocation/extend/${id}`, data || {});
}

export async function deleteOpsComputeAllocation(id: number) {
  return requestClient.delete(`/ops/compute/allocation/delete/${id}`);
}

export async function getOpsComputeDashboard() {
  return requestClient.get<OpsComputeDashboard>('/ops/compute/dashboard');
}

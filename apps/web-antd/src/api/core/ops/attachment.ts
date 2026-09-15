import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export interface OpsAttachmentItem {
  id: number;
  created_at?: string;
  updated_at?: string;
  biz_type: string;
  biz_id: number;
  operator_id: number;
  file_name: string;
  stored_name: string;
  content_type: string;
  size: number;
}

export type OpsAttachmentBizType =
  | 'contract'
  | 'settlement'
  | 'exhibition'
  | 'trial_sheet'
  | 'trial_email'
  | 'activation_sheet'
  | 'activation_email';

export interface OpsCustomerEvidencePack {
  scene: 'trial' | 'formal' | 'contract' | string;
  scene_label: string;
  biz_type: 'trial' | 'activation' | 'contract' | string;
  biz_id: number;
  customer_id?: number;
  customer_name?: string;
  customer_short_name?: string;
  product_type?: string;
  region?: string;
  owner_name?: string;
  main_account?: string;
  project_name?: string;
  open_method?: string;
  open_method_label?: string;
  contract_no?: string;
  order_no?: string;
  open_period?: string;
  contract_start_at?: string;
  contract_end_at?: string;
  title: string;
  status?: string;
  operator_name?: string;
  updater_name?: string;
  created_at?: string;
  updated_at?: string;
  workorder_instance_id?: number;
  contract_id?: number;
  sheet_count?: number;
  email_count?: number;
  contract_file_count?: number;
  ledger_incomplete?: boolean;
  sheets?: OpsAttachmentItem[];
  emails?: OpsAttachmentItem[];
  contracts?: OpsAttachmentItem[];
}

export interface ListOpsDeliveryPackReq {
  page: number;
  size: number;
  search?: string;
  scene?: 'trial' | 'formal' | '';
  customer_id?: number;
}

export async function listOpsAttachment(bizType: string, bizId: number) {
  return requestClient.get<OpsAttachmentItem[]>('/ops/attachment/list', {
    params: { biz_type: bizType, biz_id: bizId },
  });
}

export async function uploadOpsAttachment(
  bizType: string,
  bizId: number,
  file: File | Blob | { originFileObj?: File | Blob; name?: string },
) {
  const id = Number(bizId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('业务单据尚未创建，无法上传（biz_id 无效）');
  }

  const raw =
    file && typeof file === 'object' && 'originFileObj' in file && file.originFileObj
      ? file.originFileObj
      : (file as File | Blob);
  if (!(raw instanceof Blob) || raw.size <= 0) {
    throw new Error('请选择有效文件后再上传');
  }
  const filename =
    (raw as File).name ||
    (file as { name?: string })?.name ||
    'upload.bin';

  const formData = new FormData();
  formData.append('file', raw, filename);
  formData.append('biz_type', bizType);
  formData.append('biz_id', String(id));

  // 用原生 fetch，避免 axios 默认 application/json 导致 Gin FormFile 读不到文件
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;
  const url = `${apiURL}/ops/attachment/upload?biz_type=${encodeURIComponent(bizType)}&biz_id=${id}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept-Language': preferences.app.locale,
    },
    body: formData,
  });
  let payload: { code?: number; data?: OpsAttachmentItem; message?: string } = {};
  try {
    payload = await res.json();
  } catch {
    throw new Error(`上传失败: HTTP ${res.status}`);
  }
  if (!res.ok || payload.code !== 0) {
    throw new Error(payload.message || `上传失败: HTTP ${res.status}`);
  }
  return payload.data as OpsAttachmentItem;
}

export async function downloadOpsAttachment(id: number) {
  return requestClient.get<Blob>(`/ops/attachment/${id}/download`, {
    responseType: 'blob',
  });
}

export async function deleteOpsAttachment(id: number) {
  return requestClient.delete(`/ops/attachment/delete/${id}`);
}

export async function downloadOpsActivationTemplate(
  scene: 'trial' | 'formal' = 'trial',
) {
  return requestClient.get<Blob>('/ops/activation/template', {
    params: { scene },
    responseType: 'blob',
  });
}

export async function listOpsCustomerEvidence(customerId: number) {
  return requestClient.get<OpsCustomerEvidencePack[]>(
    `/ops/customer/evidence/${customerId}`,
  );
}

export async function listOpsDeliveryPacks(params: ListOpsDeliveryPackReq) {
  return requestClient.get<{ items: OpsCustomerEvidencePack[]; total: number }>(
    '/ops/delivery/list',
    { params },
  );
}

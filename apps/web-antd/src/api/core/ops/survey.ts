import { requestClient } from '#/api/request';

export interface OpsSurveyItem {
  id?: number;
  code: string;
  title: string;
  survey_type: string;
  questions?: Record<string, any>;
  status?: string;
}

export interface SubmitOpsSurveyReq {
  survey_code: string;
  customer_id: number;
  answers: Record<string, any>;
  score?: number;
}

export async function listOpsSurvey() {
  return requestClient.get('/ops/survey/list');
}

export async function submitOpsSurvey(data: SubmitOpsSurveyReq) {
  return requestClient.post('/ops/survey/submit', data);
}

export async function listOpsSurveyResponse(params: {
  page: number;
  size: number;
  customer_id?: number;
  survey_type?: string;
}) {
  return requestClient.get('/ops/survey/response/list', { params });
}

export interface CreateOpsSurveyInviteReq {
  survey_code: string;
  customer_id: number;
  expire_days?: number;
}

export interface CreateOpsSurveyInviteResp {
  token: string;
  path: string;
  url: string;
  survey_code: string;
  survey_title: string;
  customer_id: number;
  customer_name: string;
  expire_at?: string;
}

export async function createOpsSurveyInvite(data: CreateOpsSurveyInviteReq) {
  return requestClient.post<CreateOpsSurveyInviteResp>(
    '/ops/survey/invite/create',
    data,
  );
}

export async function listOpsSurveyInvite(params: {
  page: number;
  size: number;
  customer_id?: number;
  survey_code?: string;
}) {
  return requestClient.get('/ops/survey/invite/list', { params });
}

export async function generateOpsMonthlyBilling() {
  return requestClient.post('/ops/billing/generate-monthly');
}

export async function listOpsContractItem(contractId: number) {
  return requestClient.get('/ops/contract/item/list', {
    params: { contract_id: contractId, page: 1, size: 100 },
  });
}

export async function createOpsContractItem(data: {
  contract_id: number;
  item_type?: string;
  name: string;
  product_type?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  remark?: string;
}) {
  return requestClient.post('/ops/contract/item/create', data);
}

export async function deleteOpsContractItem(id: number) {
  return requestClient.delete(`/ops/contract/item/delete/${id}`);
}

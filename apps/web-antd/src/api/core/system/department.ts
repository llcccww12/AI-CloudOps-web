import { requestClient } from '#/api/request';

export interface Department {
  id: number;
  name: string;
  code: string;
  parent_id: number;
  sort: number;
  status: 1 | 2;
  leader?: string;
  phone?: string;
  email?: string;
  description?: string;
  children?: Department[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  parent_id?: number;
  sort?: number;
  status?: 1 | 2;
  leader?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export type UpdateDepartmentRequest = CreateDepartmentRequest & { id: number };

export interface ListDepartmentsRequest {
  page: number;
  size: number;
  search?: string;
  status?: 1 | 2;
}

export async function listDepartmentsApi(params: ListDepartmentsRequest) {
  return requestClient.get('/department/list', { params });
}

export async function getDepartmentTreeApi() {
  return requestClient.get('/department/tree');
}

export async function getDepartmentDetailApi(id: number) {
  return requestClient.get(`/department/detail/${id}`);
}

export async function createDepartmentApi(data: CreateDepartmentRequest) {
  return requestClient.post('/department/create', data);
}

export async function updateDepartmentApi(
  id: number,
  data: UpdateDepartmentRequest,
) {
  return requestClient.put(`/department/update/${id}`, data);
}

export async function deleteDepartmentApi(id: number) {
  return requestClient.delete(`/department/delete/${id}`);
}

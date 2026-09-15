<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate">新建资产</a-button>
        <a-button @click="handleSeed">预置 24 台服务器</a-button>
        <a-select
          v-model:value="gpuFilter"
          allow-clear
          placeholder="GPU型号"
          style="width: 140px"
          :options="OpsComputeGPUModelOptions"
          @change="loadList"
        />
        <a-select
          v-model:value="statusFilter"
          allow-clear
          placeholder="资产状态"
          style="width: 120px"
          :options="OpsComputeAssetStatusOptions"
          @change="loadList"
        />
        <a-input-search
          v-model:value="search"
          placeholder="搜索标识/序列号/IP"
          style="width: 240px"
          allow-clear
          @search="loadList"
        />
      </div>
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="黄色提示：单机 GPU 卡数未核验时无法登记分配，也影响看板容量。"
      />
      <a-table
        :data-source="list"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        bordered
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'gpu_count'">
            <span :style="{ color: record.gpu_count == null ? '#d48806' : undefined }">
              {{ record.gpu_count == null ? '待核验' : record.gpu_count }}
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            {{ statusLabel(record.status) }}
          </template>
          <template v-else-if="column.key === 'lease'">
            {{ leaseLabel(record.default_lease_mode) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="visible"
      :title="editingId ? '编辑资产' : '新建资产'"
      :confirm-loading="submitting"
      destroy-on-close
      width="640px"
      @ok="submit"
      @cancel="visible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="服务器唯一标识" name="server_code">
          <a-input v-model:value="form.server_code" :disabled="!!editingId" placeholder="如 H100-SRV-01" />
        </a-form-item>
        <a-form-item label="设备名称" name="name">
          <a-input v-model:value="form.name" />
        </a-form-item>
        <a-form-item label="GPU型号" name="gpu_model">
          <a-select v-model:value="form.gpu_model" :options="OpsComputeGPUModelOptions" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="单机GPU卡数" name="gpu_count">
              <a-input-number v-model:value="form.gpu_count" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="资产状态" name="status">
              <a-select v-model:value="form.status" :options="OpsComputeAssetStatusOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="默认出租方式" name="default_lease_mode">
          <a-select v-model:value="form.default_lease_mode" :options="OpsComputeLeaseModeOptions" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="序列号"><a-input v-model:value="form.serial_no" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="管理IP"><a-input v-model:value="form.mgmt_ip" /></a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="机架/位置"><a-input v-model:value="form.rack_location" /></a-form-item>
        <a-form-item label="技术负责人"><a-input v-model:value="form.tech_owner" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="form.remark" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { message, Modal, type FormInstance } from 'ant-design-vue';

import {
  createOpsComputeAsset,
  deleteOpsComputeAsset,
  listOpsComputeAsset,
  seedOpsComputeAssets,
  updateOpsComputeAsset,
  type OpsComputeAsset,
} from '#/api/core/ops/compute';
import {
  OpsComputeAssetStatusOptions,
  OpsComputeGPUModelOptions,
  OpsComputeLeaseModeOptions,
} from '#/views/ops/constants/options';

const loading = ref(false);
const submitting = ref(false);
const list = ref<OpsComputeAsset[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(20);
const search = ref('');
const gpuFilter = ref<string>();
const statusFilter = ref<string>();
const visible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const form = reactive<Record<string, any>>({
  server_code: '',
  name: '',
  gpu_model: 'H100',
  gpu_count: undefined,
  status: 'available',
  default_lease_mode: 'full',
  serial_no: '',
  mgmt_ip: '',
  rack_location: '',
  tech_owner: '',
  remark: '',
});
const rules = {
  server_code: [{ required: true, message: '请填写标识' }],
  name: [{ required: true, message: '请填写名称' }],
  gpu_model: [{ required: true, message: '请选择型号' }],
};

const columns = [
  { title: '服务器标识', dataIndex: 'server_code', key: 'server_code', width: 140 },
  { title: '设备名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'GPU型号', dataIndex: 'gpu_model', key: 'gpu_model', width: 110 },
  { title: '单机卡数', key: 'gpu_count', width: 100 },
  { title: '出租方式', key: 'lease', width: 120 },
  { title: '状态', key: 'status', width: 90 },
  { title: '管理IP', dataIndex: 'mgmt_ip', key: 'mgmt_ip', width: 130 },
  { title: '技术负责人', dataIndex: 'tech_owner', key: 'tech_owner', width: 110 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];

const pagination = computed(() => ({
  current: page.value,
  pageSize: size.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function statusLabel(v?: string) {
  return OpsComputeAssetStatusOptions.find((i) => i.value === v)?.label || v || '-';
}
function leaseLabel(v?: string) {
  return OpsComputeLeaseModeOptions.find((i) => i.value === v)?.label || v || '-';
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsComputeAsset({
      page: page.value,
      size: size.value,
      search: search.value || undefined,
      gpu_model: gpuFilter.value || undefined,
      status: statusFilter.value || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function onTableChange(pag: any) {
  page.value = pag.current;
  size.value = pag.pageSize;
  loadList();
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    server_code: '',
    name: 'H100算力服务器',
    gpu_model: 'H100',
    gpu_count: undefined,
    status: 'available',
    default_lease_mode: 'full',
    serial_no: '',
    mgmt_ip: '',
    rack_location: '',
    tech_owner: '',
    remark: '',
  });
  visible.value = true;
}

function openEdit(record: OpsComputeAsset) {
  editingId.value = record.id;
  Object.assign(form, {
    server_code: record.server_code,
    name: record.name,
    gpu_model: record.gpu_model,
    gpu_count: record.gpu_count ?? undefined,
    status: record.status,
    default_lease_mode: record.default_lease_mode || 'full',
    serial_no: record.serial_no || '',
    mgmt_ip: record.mgmt_ip || '',
    rack_location: record.rack_location || '',
    tech_owner: record.tech_owner || '',
    remark: record.remark || '',
  });
  visible.value = true;
}

async function submit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    if (editingId.value) {
      await updateOpsComputeAsset(editingId.value, { ...form });
      message.success('已更新');
    } else {
      await createOpsComputeAsset({ ...form });
      message.success('已创建');
    }
    visible.value = false;
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleDelete(record: OpsComputeAsset) {
  Modal.confirm({
    title: `删除资产 ${record.server_code}？`,
    onOk: async () => {
      try {
        await deleteOpsComputeAsset(record.id);
        message.success('已删除');
        await loadList();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

async function handleSeed() {
  try {
    const res: any = await seedOpsComputeAssets();
    const n = res?.seeded ?? 0;
    message.success(n > 0 ? `已预置 ${n} 台` : '资产已存在，未重复预置');
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '预置失败');
  }
}

onMounted(loadList);
</script>

<style scoped>
.ops-page { padding: 12px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
</style>

<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新建试用
        </a-button>
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索试用标题..."
          style="width: 240px"
          allow-clear
          @search="handleSearch"
        />
        <a-input-number
          v-model:value="customerFilter"
          placeholder="客户ID"
          style="width: 140px"
          :min="1"
          @change="handleSearch"
        />
      </div>

      <a-table
        :data-source="list"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        bordered
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag>{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'plan_end_at'">
            {{ formatTime(record.plan_end_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button
                type="link"
                size="small"
                :disabled="record.status !== 'draft'"
                @click="handleSubmitApproval(record)"
              >
                提交审批
              </a-button>
              <a-button
                v-if="record.workorder_instance_id"
                type="link"
                size="small"
                @click="openWorkorder(record.workorder_instance_id)"
              >
                审批工单
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="formVisible"
      :title="editingId ? '编辑试用' : '新建试用'"
      :confirm-loading="submitLoading"
      destroy-on-close
      width="640px"
      @ok="handleSubmit"
      @cancel="formVisible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="客户" name="customer_id">
          <OpsCustomerSelect
            v-model="form.customer_id"
            :disabled="!!editingId"
            placeholder="选择客户"
          />
        </a-form-item>
        <a-form-item label="标题" name="title">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-form-item label="需求类别" name="demand_type">
          <a-select
            v-model:value="form.demand_type"
            allow-clear
            placeholder="选择需求类别"
            :options="OpsDemandTypeOptions"
          />
        </a-form-item>
        <a-form-item label="申请算力规模" name="resource_scale">
          <a-select
            v-model:value="form.resource_scale"
            allow-clear
            placeholder="选择算力规模"
            :options="OpsResourceScaleOptions"
          />
        </a-form-item>
        <a-form-item label="用途说明" name="purpose">
          <a-textarea v-model:value="form.purpose" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="计划开始" name="plan_start_at">
              <a-date-picker
                v-model:value="form.plan_start_at"
                show-time
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="计划结束" name="plan_end_at">
              <a-date-picker
                v-model:value="form.plan_end_at"
                show-time
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <template v-if="editingId">
          <a-form-item label="试用评价" name="evaluation">
            <a-textarea v-model:value="form.evaluation" :rows="2" />
          </a-form-item>
          <a-form-item label="转化意向" name="convert_intent">
            <a-select
              v-model:value="form.convert_intent"
              allow-clear
              placeholder="选择转化意向"
              :options="OpsConvertIntentOptions"
            />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal, type FormInstance } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import {
  type CreateOpsTrialReq,
  type OpsTrialItem,
  createOpsTrial,
  deleteOpsTrial,
  listOpsTrial,
  submitOpsTrial,
  updateOpsTrial,
} from '#/api/core/ops/trial';
import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import {
  OpsConvertIntentOptions,
  OpsDemandTypeOptions,
  OpsResourceScaleOptions,
} from '#/views/ops/constants/options';

const router = useRouter();
const route = useRoute();

function openWorkorder(instanceId: number) {
  router.push({ path: '/workorder/center', query: { id: String(instanceId) } });
}

function parseQueryCustomerId(): number | null {
  const raw = route.query.customer_id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return id > 0 ? id : null;
}

const loading = ref(false);
const submitLoading = ref(false);
const list = ref<OpsTrialItem[]>([]);
const searchQuery = ref('');
const customerFilter = ref<number | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const formVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<
  Omit<CreateOpsTrialReq, 'customer_id'> & {
    customer_id: number | null;
    evaluation?: string;
    convert_intent?: string;
  }
>({
  customer_id: null,
  title: '',
  demand_type: '',
  resource_scale: '',
  purpose: '',
  plan_start_at: null,
  plan_end_at: null,
  evaluation: '',
  convert_intent: '',
});

const rules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '需求类别', dataIndex: 'demand_type', key: 'demand_type', width: 120 },
  { title: '计划结束', dataIndex: 'plan_end_at', key: 'plan_end_at', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' as const },
];

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    active: '试用中',
    ended: '已结束',
  };
  return map[s || ''] || s || '-';
}

function formatTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN');
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsTrial({
      page: currentPage.value,
      size: pageSize.value,
      search: searchQuery.value.trim() || undefined,
      customer_id: customerFilter.value || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch {
    message.error('加载试用列表失败');
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadList();
}

function handleTableChange(pag: any) {
  currentPage.value = pag.current;
  pageSize.value = pag.pageSize;
  loadList();
}

function openCreate(prefillCustomerId?: number | null) {
  editingId.value = null;
  const customerId = prefillCustomerId ?? parseQueryCustomerId() ?? customerFilter.value;
  Object.assign(form, {
    customer_id: customerId,
    title: '',
    demand_type: '',
    resource_scale: '',
    purpose: '',
    plan_start_at: null,
    plan_end_at: null,
    evaluation: '',
    convert_intent: '',
  });
  formVisible.value = true;
}

function openEdit(record: OpsTrialItem) {
  editingId.value = record.id!;
  Object.assign(form, {
    customer_id: record.customer_id,
    title: record.title,
    demand_type: record.demand_type || '',
    resource_scale: record.resource_scale || '',
    purpose: record.purpose || '',
    plan_start_at: record.plan_start_at || null,
    plan_end_at: record.plan_end_at || null,
    evaluation: record.evaluation || '',
    convert_intent: record.convert_intent || '',
  });
  formVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!form.customer_id) {
    message.warning('请选择客户');
    return;
  }
  submitLoading.value = true;
  try {
    if (editingId.value) {
      await updateOpsTrial({
        id: editingId.value,
        title: form.title,
        demand_type: form.demand_type,
        resource_scale: form.resource_scale,
        purpose: form.purpose,
        plan_start_at: form.plan_start_at,
        plan_end_at: form.plan_end_at,
        evaluation: form.evaluation,
        convert_intent: form.convert_intent,
      });
      message.success('已更新');
    } else {
      await createOpsTrial({
        customer_id: form.customer_id,
        title: form.title,
        demand_type: form.demand_type,
        resource_scale: form.resource_scale,
        purpose: form.purpose,
        plan_start_at: form.plan_start_at,
        plan_end_at: form.plan_end_at,
      });
      message.success('已创建');
      currentPage.value = 1;
    }
    formVisible.value = false;
    await loadList();
  } catch {
    message.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
}

function handleSubmitApproval(record: OpsTrialItem) {
  Modal.confirm({
    title: '提交审批',
    content: `确定提交试用「${record.title}」审批？将创建关联工单。`,
    async onOk() {
      try {
        await submitOpsTrial(record.id!);
        message.success('已提交审批');
        await loadList();
      } catch {
        message.error('提交审批失败');
      }
    },
  });
}

function handleDelete(record: OpsTrialItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除试用「${record.title}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsTrial(record.id!);
        message.success('已删除');
        await loadList();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

onMounted(async () => {
  const qid = parseQueryCustomerId();
  if (qid) {
    customerFilter.value = qid;
  }
  await loadList();
  const createFlag = route.query.create;
  if (qid && (createFlag === '1' || createFlag === 'true')) {
    openCreate(qid);
  }
});
</script>

<style scoped>
.ops-page {
  padding: 12px;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}
</style>

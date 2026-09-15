<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新建客户
        </a-button>
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索客户名称/联系人..."
          style="width: 280px"
          allow-clear
          @search="handleSearch"
        />
      </div>

      <a-tabs v-model:activeKey="stageTab" @change="handleStageChange">
        <a-tab-pane key="" tab="全部" />
        <a-tab-pane key="intent" tab="意向" />
        <a-tab-pane key="trial" tab="试用" />
        <a-tab-pane key="formal" tab="正式" />
        <a-tab-pane key="closed" tab="闭环" />
      </a-tabs>

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
          <template v-if="column.key === 'name'">
            <a @click="goDetail(record.id)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'stage'">
            <a-tag :color="stageColor(record.stage)">
              {{ OpsCustomerStageLabel[record.stage] || record.stage }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="goDetail(record.id)">详情</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="formVisible"
      :title="editingId ? '编辑客户' : '新建客户'"
      :confirm-loading="submitLoading"
      destroy-on-close
      @ok="handleSubmit"
      @cancel="formVisible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="客户名称" name="name">
          <a-input v-model:value="form.name" placeholder="请输入客户名称" />
        </a-form-item>
        <a-form-item v-if="!editingId" label="初始阶段" name="stage">
          <a-select v-model:value="form.stage">
            <a-select-option value="intent">意向</a-select-option>
            <a-select-option value="trial">试用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="行业" name="industry">
          <a-select
            v-model:value="form.industry"
            allow-clear
            show-search
            placeholder="选择行业"
            :options="OpsIndustryOptions"
          />
        </a-form-item>
        <a-form-item label="需求类别" name="demand_types">
          <a-select
            v-model:value="form.demand_types"
            mode="multiple"
            allow-clear
            placeholder="可多选"
            :options="OpsDemandTypeOptions"
          />
        </a-form-item>
        <a-form-item label="来源" name="source">
          <a-select
            v-model:value="form.source"
            placeholder="选择来源"
            :options="OpsCustomerSourceOptions"
          />
        </a-form-item>
        <a-form-item label="联系人" name="contact_name">
          <a-input v-model:value="form.contact_name" placeholder="联系人姓名" />
        </a-form-item>
        <a-form-item label="职务" name="contact_title">
          <a-select
            v-model:value="form.contact_title"
            allow-clear
            placeholder="选择职务"
            :options="OpsContactTitleOptions"
          />
        </a-form-item>
        <a-form-item label="电话" name="contact_phone">
          <a-input v-model:value="form.contact_phone" placeholder="联系电话" />
        </a-form-item>
        <a-form-item label="邮箱" name="contact_email">
          <a-input v-model:value="form.contact_email" placeholder="邮箱" />
        </a-form-item>
        <a-form-item label="负责人" name="owner_name">
          <a-input v-model:value="form.owner_name" placeholder="负责人姓名" />
        </a-form-item>
        <a-form-item label="预算区间" name="budget_range">
          <a-select
            v-model:value="form.budget_range"
            allow-clear
            placeholder="选择预算区间"
            :options="OpsBudgetRangeOptions"
          />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="form.remark" :rows="3" placeholder="备注" />
        </a-form-item>
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
  OpsCustomerStageLabel,
  type CreateOpsCustomerReq,
  type OpsCustomerItem,
  createOpsCustomer,
  deleteOpsCustomer,
  listOpsCustomer,
  updateOpsCustomer,
} from '#/api/core/ops/customer';
import {
  OpsBudgetRangeOptions,
  OpsContactTitleOptions,
  OpsCustomerSourceOptions,
  OpsDemandTypeOptions,
  OpsIndustryOptions,
} from '#/views/ops/constants/options';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const submitLoading = ref(false);
const list = ref<OpsCustomerItem[]>([]);
const searchQuery = ref('');
const stageTab = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const formVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<CreateOpsCustomerReq & { contact_title?: string }>({
  name: '',
  stage: 'intent',
  industry: '',
  demand_types: [],
  contact_name: '',
  contact_title: '',
  contact_phone: '',
  contact_email: '',
  owner_name: '',
  budget_range: '',
  remark: '',
  source: 'manual',
});

const rules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
};

const columns = [
  { title: '客户名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '阶段', dataIndex: 'stage', key: 'stage', width: 100 },
  { title: '行业', dataIndex: 'industry', key: 'industry', width: 120, ellipsis: true },
  { title: '联系人', dataIndex: 'contact_name', key: 'contact_name', width: 120 },
  { title: '电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 140 },
  { title: '负责人', dataIndex: 'owner_name', key: 'owner_name', width: 120 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const },
];

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function stageColor(stage: string) {
  const map: Record<string, string> = {
    lead: 'default',
    intent: 'blue',
    trial: 'cyan',
    formal: 'green',
    closed: 'orange',
  };
  return map[stage] || 'default';
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsCustomer({
      page: currentPage.value,
      size: pageSize.value,
      search: searchQuery.value.trim() || undefined,
      stage: stageTab.value || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch {
    message.error('加载客户列表失败');
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

function handleStageChange() {
  currentPage.value = 1;
  loadList();
}

function handleTableChange(pag: any) {
  currentPage.value = pag.current;
  pageSize.value = pag.pageSize;
  loadList();
}

function resetForm() {
  form.name = '';
  form.stage = 'intent';
  form.industry = '';
  form.demand_types = [];
  form.contact_name = '';
  form.contact_title = '';
  form.contact_phone = '';
  form.contact_email = '';
  form.owner_name = '';
  form.budget_range = '';
  form.remark = '';
  form.source = 'manual';
}

function openCreate() {
  editingId.value = null;
  resetForm();
  formVisible.value = true;
}

function openEdit(record: OpsCustomerItem) {
  editingId.value = record.id!;
  Object.assign(form, {
    name: record.name,
    stage: record.stage,
    industry: record.industry || '',
    demand_types: record.demand_types || [],
    contact_name: record.contact_name || '',
    contact_title: record.contact_title || '',
    contact_phone: record.contact_phone || '',
    contact_email: record.contact_email || '',
    owner_name: record.owner_name || '',
    budget_range: record.budget_range || '',
    remark: record.remark || '',
    source: record.source || 'manual',
  });
  formVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitLoading.value = true;
  try {
    if (editingId.value) {
      await updateOpsCustomer({ id: editingId.value, ...form });
      message.success('客户已更新');
    } else {
      await createOpsCustomer(form);
      message.success('客户已创建');
      currentPage.value = 1;
    }
    formVisible.value = false;
    await loadList();
  } catch {
    message.error('保存客户失败');
  } finally {
    submitLoading.value = false;
  }
}

function handleDelete(record: OpsCustomerItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除客户「${record.name}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsCustomer(record.id!);
        message.success('已删除');
        await loadList();
        // 若当前正打开该客户详情（多标签/回退），离开详情页，避免继续查询
        const detailId = Number(route.params.id);
        if (
          route.path.includes('/ops/customers/detail') &&
          detailId === record.id
        ) {
          router.replace('/ops/customers');
        }
      } catch {
        message.error('删除失败');
      }
    },
  });
}

function goDetail(id: number) {
  router.push(`/ops/customers/detail/${id}`);
}

onMounted(loadList);
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

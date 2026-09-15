<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新建接待
        </a-button>
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索来访单位/来访人/电话..."
          style="width: 280px"
          allow-clear
          @search="handleSearch"
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
          <template v-else-if="column.key === 'source'">
            <a-tag :color="record.source === 'public' ? 'blue' : 'default'">
              {{ sourceLabel(record.source) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'intent'">
            {{ intentLabel(record.intent) }}
          </template>
          <template v-else-if="column.key === 'visit_at'">
            {{ formatTime(record.visit_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openView(record)">查看</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" @click="openAttachments(record)">附件</a-button>
              <a-button
                type="link"
                size="small"
                :disabled="
                  record.status === 'transferred' ||
                  record.status === 'converted' ||
                  !(record.intent === 'medium' || record.intent === 'high')
                "
                @click="handleConvert(record)"
              >
                转入外访
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="formVisible"
      :title="formTitle"
      :confirm-loading="submitLoading"
      destroy-on-close
      width="760px"
      :ok-button-props="{ style: formMode === 'view' ? { display: 'none' } : undefined }"
      :ok-text="formMode === 'view' ? undefined : '确定'"
      :cancel-text="formMode === 'view' ? '关闭' : '取消'"
      @ok="handleSubmit"
      @cancel="formVisible = false"
    >
      <div v-if="formMode !== 'create' && metaText" class="meta-bar">
        {{ metaText }}
      </div>
      <a-form
        ref="formRef"
        :model="form"
        :rules="formMode === 'view' ? {} : rules"
        layout="vertical"
        :disabled="formMode === 'view'"
      >
        <a-row :gutter="12">
          <a-col :span="16">
            <a-form-item label="来访单位" name="company_name">
              <a-input v-model:value="form.company_name" placeholder="请输入来访单位名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="单位层级" name="company_level">
              <a-select
                v-model:value="form.company_level"
                allow-clear
                placeholder="选择层级"
                :options="OpsCompanyLevelOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="主要领导" name="visitor_name">
              <a-input v-model:value="form.visitor_name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="职务" name="visitor_title">
              <a-auto-complete
                v-model:value="form.visitor_title"
                :options="OpsContactTitleOptions"
                placeholder="选择或输入职务"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="来访人数" name="visitor_count">
              <a-input-number v-model:value="form.visitor_count" :min="1" :max="999" style="width: 100%" placeholder="必填" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="来访时间" name="visit_at">
              <a-date-picker
                v-model:value="form.visit_at"
                show-time
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="带队人电话" name="contact_phone">
              <a-input v-model:value="form.contact_phone" placeholder="联系电话" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="对接单位" name="docking_unit">
              <a-input v-model:value="form.docking_unit" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="接待人员" name="host_name">
              <a-input v-model:value="form.host_name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="来访目的" name="purpose">
              <a-select
                v-model:value="form.purpose"
                allow-clear
                placeholder="选择来访目的"
                :options="OpsExhibitionPurposeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否会谈" name="need_meeting">
              <a-radio-group v-model:value="form.need_meeting">
                <a-radio :value="1">是</a-radio>
                <a-radio :value="0">否</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="意向（内部）" name="intent">
          <a-select
            v-model:value="form.intent"
            allow-clear
            placeholder="低 / 中 / 高（中/高后可手动转入外访）"
            :options="OpsExhibitionIntentOptions"
          />
        </a-form-item>
        <a-form-item label="展厅讲解" name="content">
          <a-textarea v-model:value="form.content" :rows="3" />
        </a-form-item>
        <a-form-item label="会议纪要" name="meeting_minutes">
          <a-textarea v-model:value="form.meeting_minutes" :rows="3" />
        </a-form-item>
        <a-form-item label="陪同人员" name="companions">
          <a-input v-model:value="form.companions" />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="form.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="attachmentVisible"
      title="接待附件"
      :footer="null"
      width="640px"
      destroy-on-close
      @cancel="attachmentVisible = false"
    >
      <OpsAttachments
        v-if="attachmentBizId"
        biz-type="exhibition"
        :biz-id="attachmentBizId"
      />
    </a-modal>
    <a-modal
      :open="transferVisible"
      title="转入外访交流"
      :confirm-loading="transferLoading"
      destroy-on-close
      @ok="confirmTransfer"
      @cancel="transferVisible = false"
    >
      <p style="margin-bottom: 12px">
        将「{{ transferRecord?.company_name }}」转入外访。对接人将收到站内信，并需在
        <strong>15 天内</strong>完成走访（到期前 3 天会再次提醒）。
      </p>
      <a-form layout="vertical">
        <a-form-item label="外访对接人" required>
          <a-select
            v-model:value="transferOwnerId"
            show-search
            allow-clear
            placeholder="请选择对接人"
            :options="userOptions"
            :filter-option="filterUserOption"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { message, Modal, type FormInstance } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import {
  type CreateOpsExhibitionReq,
  type OpsExhibitionItem,
  convertOpsExhibition,
  createOpsExhibition,
  deleteOpsExhibition,
  listOpsExhibition,
  updateOpsExhibition,
} from '#/api/core/ops/exhibition';
import { getUserList, type User } from '#/api/core/system/user';
import OpsAttachments from '#/views/ops/components/OpsAttachments.vue';
import {
  OpsCompanyLevelOptions,
  OpsContactTitleOptions,
  OpsExhibitionIntentOptions,
  OpsExhibitionPurposeOptions,
} from '#/views/ops/constants/options';

const loading = ref(false);
const submitLoading = ref(false);
const list = ref<OpsExhibitionItem[]>([]);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const formVisible = ref(false);
const editingId = ref<number | null>(null);
const formMode = ref<'create' | 'edit' | 'view'>('create');
const formMeta = ref<{
  created_at?: string;
  updated_at?: string;
  operator_name?: string;
  updater_name?: string;
}>({});
const formRef = ref<FormInstance>();
const attachmentVisible = ref(false);
const attachmentBizId = ref(0);
const transferVisible = ref(false);
const transferLoading = ref(false);
const transferRecord = ref<OpsExhibitionItem | null>(null);
const transferOwnerId = ref<number | undefined>(undefined);
const userOptions = ref<{ label: string; value: number }[]>([]);
const userMap = ref<Record<number, User>>({});

async function loadUsers() {
  try {
    const res: any = await getUserList({ page: 1, size: 100, search: '' });
    const items: User[] = res?.items || res?.list || res?.data?.items || [];
    userMap.value = {};
    userOptions.value = items.map((u) => {
      userMap.value[u.id] = u;
      const name = u.real_name || u.username;
      return { label: u.real_name ? `${u.real_name}（${u.username}）` : u.username, value: u.id };
    });
  } catch {
    userOptions.value = [];
  }
}

function filterUserOption(input: string, option: any) {
  return String(option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase());
}

const form = reactive<CreateOpsExhibitionReq>({
  company_name: '',
  company_level: undefined,
  visitor_name: '',
  visitor_title: '',
  visitor_count: undefined as unknown as number,
  visit_at: null,
  docking_unit: '',
  host_name: '',
  purpose: '',
  need_meeting: 0,
  content: '',
  meeting_minutes: '',
  contact_phone: '',
  companions: '',
  intent: undefined,
  remark: '',
});

const rules = {
  company_name: [{ required: true, message: '请输入来访单位', trigger: 'blur' }],
  company_level: [{ required: true, message: '请选择单位层级', trigger: 'change' }],
  visitor_name: [{ required: true, message: '请输入主要领导', trigger: 'blur' }],
  visitor_count: [{ required: true, type: 'number', min: 1, message: '来访人数至少为 1', trigger: 'change' }],
  visit_at: [{ required: true, message: '请选择来访时间', trigger: 'change' }],
  purpose: [{ required: true, message: '请选择来访目的', trigger: 'change' }],
  contact_phone: [
    { required: true, message: '请输入带队人电话', trigger: 'blur' },
    { min: 5, message: '电话格式不正确', trigger: 'blur' },
  ],
};

const columns = [
  { title: '来访单位', dataIndex: 'company_name', key: 'company_name', ellipsis: true },
  { title: '来访人', dataIndex: 'visitor_name', key: 'visitor_name', width: 100 },
  { title: '人数', dataIndex: 'visitor_count', key: 'visitor_count', width: 70 },
  { title: '电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 120 },
  { title: '接待人', dataIndex: 'host_name', key: 'host_name', width: 100 },
  { title: '来访时间', dataIndex: 'visit_at', key: 'visit_at', width: 170 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 100 },
  { title: '意向', dataIndex: 'intent', key: 'intent', width: 70 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 300, fixed: 'right' as const },
];

const formTitle = computed(() => {
  if (formMode.value === 'view') return '查看接待';
  if (formMode.value === 'edit') return '编辑接待';
  return '新建接待';
});

const metaText = computed(() => {
  const parts: string[] = [];
  if (formMeta.value.operator_name) {
    parts.push(`创建人：${formMeta.value.operator_name}`);
  }
  if (formMeta.value.created_at) {
    parts.push(`创建时间：${formatTime(formMeta.value.created_at)}`);
  }
  const editor = formMeta.value.updater_name || formMeta.value.operator_name;
  if (editor) {
    parts.push(`最后编辑：${editor}`);
  }
  if (formMeta.value.updated_at) {
    parts.push(`编辑时间：${formatTime(formMeta.value.updated_at)}`);
  }
  return parts.join('　');
});

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
    reviewed: '已复核',
    transferred: '已转外访',
    converted: '已转客户',
  };
  return map[s || ''] || s || '-';
}

function sourceLabel(s?: string) {
  if (s === 'public') return '公开登记';
  return '内部录入';
}

function intentLabel(s?: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' };
  return map[s || ''] || '-';
}

function formatTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN');
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsExhibition({
      page: currentPage.value,
      size: pageSize.value,
      search: searchQuery.value.trim() || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch {
    message.error('加载展厅接待列表失败');
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

function resetForm() {
  Object.assign(form, {
    company_name: '',
    company_level: undefined,
    visitor_name: '',
    visitor_title: '',
    visitor_count: undefined as unknown as number,
    visit_at: null,
    docking_unit: '',
    host_name: '',
    purpose: '',
    need_meeting: 0,
    content: '',
    meeting_minutes: '',
    contact_phone: '',
    companions: '',
    intent: undefined,
    remark: '',
  });
}

function openCreate() {
  editingId.value = null;
  formMode.value = 'create';
  formMeta.value = {};
  resetForm();
  formVisible.value = true;
}

function fillFormFromRecord(record: OpsExhibitionItem) {
  Object.assign(form, {
    company_name: record.company_name,
    company_level: record.company_level || undefined,
    visitor_name: record.visitor_name || '',
    visitor_title: record.visitor_title || '',
    visitor_count: record.visitor_count && record.visitor_count > 0 ? record.visitor_count : (undefined as unknown as number),
    visit_at: record.visit_at || null,
    docking_unit: record.docking_unit || '',
    host_name: record.host_name || '',
    purpose: record.purpose || '',
    need_meeting: record.need_meeting ?? 0,
    content: record.content || '',
    meeting_minutes: record.meeting_minutes || '',
    contact_phone: record.contact_phone || '',
    companions: record.companions || '',
    intent: record.intent || undefined,
    remark: record.remark || '',
  });
  formMeta.value = {
    created_at: record.created_at,
    updated_at: record.updated_at,
    operator_name: record.operator_name,
    updater_name: record.updater_name,
  };
}

function openView(record: OpsExhibitionItem) {
  editingId.value = record.id!;
  formMode.value = 'view';
  fillFormFromRecord(record);
  formVisible.value = true;
}

function openEdit(record: OpsExhibitionItem) {
  editingId.value = record.id!;
  formMode.value = 'edit';
  fillFormFromRecord(record);
  formVisible.value = true;
}

function openAttachments(record: OpsExhibitionItem) {
  attachmentBizId.value = record.id!;
  attachmentVisible.value = true;
}

async function handleSubmit() {
  if (formMode.value === 'view') {
    formVisible.value = false;
    return;
  }
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitLoading.value = true;
  try {
    const payload = {
      ...form,
      intent: form.intent || '',
    };
    if (editingId.value) {
      await updateOpsExhibition({ id: editingId.value, ...payload });
      message.success('已更新');
    } else {
      await createOpsExhibition(payload);
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

function handleConvert(record: OpsExhibitionItem) {
  if (!(record.intent === 'medium' || record.intent === 'high')) {
    message.warning('请先将意向设为中或高');
    return;
  }
  transferRecord.value = record;
  transferOwnerId.value = undefined;
  transferVisible.value = true;
  if (!userOptions.value.length) {
    loadUsers();
  }
}

async function confirmTransfer() {
  if (!transferRecord.value) return;
  if (!transferOwnerId.value) {
    message.warning('请选择外访对接人');
    return;
  }
  const user = userMap.value[transferOwnerId.value];
  const ownerName = user?.real_name || user?.username || '';
  if (!ownerName) {
    message.warning('对接人信息无效');
    return;
  }
  transferLoading.value = true;
  try {
    const visit: any = await convertOpsExhibition({
      id: transferRecord.value.id!,
      contact_name: transferRecord.value.visitor_name,
      contact_phone: transferRecord.value.contact_phone,
      owner_id: transferOwnerId.value,
      owner_name: ownerName,
    });
    message.success(`已转入外访 #${visit?.id || ''}，已通知对接人`);
    transferVisible.value = false;
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '转入外访失败');
  } finally {
    transferLoading.value = false;
  }
}

function handleDelete(record: OpsExhibitionItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除接待记录「${record.company_name}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsExhibition(record.id!);
        message.success('已删除');
        await loadList();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

onMounted(() => {
  loadList();
  loadUsers();
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
.meta-bar {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #595959;
  font-size: 13px;
  line-height: 1.6;
}
</style>

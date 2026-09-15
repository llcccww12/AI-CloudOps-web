<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新建外访
        </a-button>
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索主题/单位/联系人..."
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
            <a-tag :color="record.source === 'exhibition' ? 'blue' : 'default'">
              {{ sourceLabel(record.source) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'intent'">
            {{ intentLabel(record.intent) }}
          </template>
          <template v-else-if="column.key === 'd0_at'">
            {{ formatTime(record.d0_at) }}
          </template>
          <template v-else-if="column.key === 'due_at'">
            {{ formatTime(record.due_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openView(record)">查看</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button
                type="link"
                size="small"
                :disabled="record.status === 'converted' || !isMidHigh(record.intent)"
                @click="handleConvert(record)"
              >
                转客户
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
      width="880px"
      :ok-button-props="{ style: formMode === 'view' ? { display: 'none' } : undefined }"
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
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="plan" tab="计划">
            <a-form-item label="关联客户">
              <OpsCustomerSelect
                v-model="form.customer_id"
                placeholder="可选：选择已有客户"
                @change="onCustomerChange"
              />
            </a-form-item>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="外访主题" name="title">
                  <a-input v-model:value="form.title" placeholder="必填" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="状态" name="status">
                  <a-select v-model:value="form.status" :options="OpsVisitStatusOptions.filter((o) => o.value !== 'converted')" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="对象单位" name="target_org">
                  <a-input v-model:value="form.target_org" placeholder="必填" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="线索来源" name="lead_source">
                  <a-input v-model:value="form.lead_source" placeholder="展厅接待/手工等" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="来访登记日 D0" name="d0_at">
                  <a-date-picker
                    v-model:value="form.d0_at"
                    show-time
                    style="width: 100%"
                    value-format="YYYY-MM-DDTHH:mm:ssZ"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="计划走访日" name="planned_at">
                  <a-date-picker
                    v-model:value="form.planned_at"
                    show-time
                    style="width: 100%"
                    value-format="YYYY-MM-DDTHH:mm:ssZ"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="走访目标" name="visit_goal">
              <a-textarea v-model:value="form.visit_goal" :rows="2" />
            </a-form-item>
            <a-form-item label="准备材料" name="prep_materials">
              <a-textarea v-model:value="form.prep_materials" :rows="2" />
            </a-form-item>
          </a-tab-pane>

          <a-tab-pane key="company" tab="企业档案">
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="信用代码"><a-input v-model:value="form.credit_code" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="行业细分">
                  <a-select v-model:value="form.industry" allow-clear :options="OpsIndustryOptions" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="规模"><a-input v-model:value="form.company_scale" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="融资/上市"><a-input v-model:value="form.finance_status" /></a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="资质"><a-input v-model:value="form.qualifications" /></a-form-item>
            <a-form-item label="地址"><a-input v-model:value="form.address" /></a-form-item>
            <a-form-item label="产品线"><a-input v-model:value="form.product_line" /></a-form-item>
            <a-form-item label="是否已有合作">
              <a-radio-group v-model:value="form.has_cooperation">
                <a-radio :value="1">是</a-radio>
                <a-radio :value="0">否</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-tab-pane>

          <a-tab-pane key="contact" tab="联系人">
            <a-row :gutter="12">
              <a-col :span="8">
                <a-form-item label="姓名" name="contact_name"><a-input v-model:value="form.contact_name" placeholder="必填" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="职务">
                  <a-auto-complete v-model:value="form.contact_title" :options="OpsContactTitleOptions" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="决策角色">
                  <a-select v-model:value="form.decision_role" allow-clear :options="OpsVisitDecisionRoleOptions" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="8">
                <a-form-item label="电话" name="contact_phone"><a-input v-model:value="form.contact_phone" placeholder="必填" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="邮箱"><a-input v-model:value="form.contact_email" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="微信"><a-input v-model:value="form.contact_wechat" /></a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="引荐人"><a-input v-model:value="form.referrer_name" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="接待人"><a-input v-model:value="form.host_name" /></a-form-item>
              </a-col>
            </a-row>
          </a-tab-pane>

          <a-tab-pane key="record" tab="走访记录">
            <a-row :gutter="12">
              <a-col :span="8">
                <a-form-item label="开始时间">
                  <a-date-picker v-model:value="form.start_at" show-time style="width: 100%" value-format="YYYY-MM-DDTHH:mm:ssZ" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="结束时间">
                  <a-date-picker v-model:value="form.end_at" show-time style="width: 100%" value-format="YYYY-MM-DDTHH:mm:ssZ" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="时长(分钟)">
                  <a-input-number v-model:value="form.duration_min" :min="0" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="地点类型">
                  <a-select v-model:value="form.location_type" allow-clear :options="OpsVisitLocationTypeOptions" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="地点"><a-input v-model:value="form.location" /></a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="参与人"><a-input v-model:value="form.participants" /></a-form-item>
            <a-form-item label="交流摘要"><a-textarea v-model:value="form.summary" :rows="2" /></a-form-item>
            <a-form-item label="需求痛点"><a-textarea v-model:value="form.pain_points" :rows="2" /></a-form-item>
            <a-form-item label="异议"><a-textarea v-model:value="form.objections" :rows="2" /></a-form-item>
            <a-form-item label="竞品信息"><a-textarea v-model:value="form.competitor_info" :rows="2" /></a-form-item>
            <a-form-item label="现场反馈"><a-textarea v-model:value="form.site_feedback" :rows="2" /></a-form-item>
            <a-form-item label="成果与线索"><a-textarea v-model:value="form.outcome" :rows="2" /></a-form-item>
          </a-tab-pane>

          <a-tab-pane key="convert" tab="跟进转化">
            <a-row :gutter="12">
              <a-col :span="8">
                <a-form-item label="客户意向" name="intent">
                  <a-select
                    v-model:value="form.intent"
                    allow-clear
                    placeholder="低/中/高"
                    :options="OpsExhibitionIntentOptions"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="需求匹配分">
                  <a-input-number v-model:value="form.match_score" :min="0" :max="100" style="width: 100%" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="预估商机金额">
                  <a-input-number v-model:value="form.opportunity_amount" :min="0" style="width: 100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="下一步行动"><a-input v-model:value="form.next_action" /></a-form-item>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="外访对接人"><a-input v-model:value="form.follow_owner_name" disabled placeholder="转外访时指定" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="走访截止日">
                  <a-date-picker
                    v-model:value="form.due_at"
                    show-time
                    disabled
                    style="width: 100%"
                    value-format="YYYY-MM-DDTHH:mm:ssZ"
                    placeholder="转外访时自动设为下发后15天"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="下次跟进日">
              <a-date-picker
                v-model:value="form.next_follow_at"
                show-time
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
            <a-form-item label="备注"><a-textarea v-model:value="form.remark" :rows="2" /></a-form-item>
            <a-alert
              type="info"
              show-icon
              message="仅当客户意向为「中」或「高」时，才可转入客户中心。"
            />
          </a-tab-pane>
        </a-tabs>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { message, Modal, type FormInstance } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import {
  type CreateOpsVisitReq,
  type OpsVisitItem,
  convertOpsVisit,
  createOpsVisit,
  deleteOpsVisit,
  detailOpsVisit,
  listOpsVisit,
  updateOpsVisit,
} from '#/api/core/ops/visit';
import type { OpsCustomerItem } from '#/api/core/ops/customer';
import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import {
  OpsContactTitleOptions,
  OpsExhibitionIntentOptions,
  OpsIndustryOptions,
  OpsVisitDecisionRoleOptions,
  OpsVisitLocationTypeOptions,
  OpsVisitStatusOptions,
} from '#/views/ops/constants/options';

const loading = ref(false);
const submitLoading = ref(false);
const list = ref<OpsVisitItem[]>([]);
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
const activeTab = ref('plan');

function emptyForm(): CreateOpsVisitReq {
  return {
    title: '',
    target_org: '',
    start_at: null,
    end_at: null,
    location: '',
    participants: '',
    summary: '',
    outcome: '',
    status: 'pending',
    lead_source: '',
    credit_code: '',
    industry: undefined,
    company_scale: '',
    qualifications: '',
    finance_status: '',
    address: '',
    product_line: '',
    has_cooperation: 0,
    contact_name: '',
    contact_title: '',
    decision_role: undefined,
    contact_phone: '',
    contact_email: '',
    contact_wechat: '',
    referrer_name: '',
    host_name: '',
    d0_at: null,
    planned_at: null,
    visit_goal: '',
    prep_materials: '',
    duration_min: 0,
    location_type: undefined,
    pain_points: '',
    objections: '',
    competitor_info: '',
    site_feedback: '',
    intent: undefined,
    match_score: 0,
    opportunity_amount: 0,
    next_action: '',
    follow_owner_name: '',
    next_follow_at: null,
    due_at: null,
    remark: '',
    customer_id: null,
  };
}

const form = reactive<CreateOpsVisitReq>(emptyForm());

const rules = {
  title: [{ required: true, message: '请输入外访主题', trigger: 'blur' }],
  target_org: [{ required: true, message: '请输入对象单位', trigger: 'blur' }],
  contact_name: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  contact_phone: [
    { required: true, message: '请输入联系人电话', trigger: 'blur' },
    { min: 5, message: '电话格式不正确', trigger: 'blur' },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

const columns = [
  { title: '主题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '对象单位', dataIndex: 'target_org', key: 'target_org', width: 140, ellipsis: true },
  { title: '对接人', dataIndex: 'follow_owner_name', key: 'follow_owner_name', width: 100 },
  { title: '截止日期', dataIndex: 'due_at', key: 'due_at', width: 160 },
  { title: '来源', dataIndex: 'source', key: 'source', width: 100 },
  { title: '意向', dataIndex: 'intent', key: 'intent', width: 70 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 260, fixed: 'right' as const },
];

const formTitle = computed(() => {
  if (formMode.value === 'view') return '查看外访';
  if (formMode.value === 'edit') return '编辑外访';
  return '新建外访';
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
    pending: '待约',
    booked: '已约',
    visited: '已访',
    converted: '已转客户',
    planned: '计划中',
    done: '已完成',
  };
  return map[s || ''] || s || '-';
}

function sourceLabel(s?: string) {
  if (s === 'exhibition') return '展厅转入';
  return '内部录入';
}

function intentLabel(s?: string) {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高' };
  return map[s || ''] || '-';
}

function isMidHigh(s?: string) {
  return s === 'medium' || s === 'high';
}

function formatTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN');
}

function onCustomerChange(customer: OpsCustomerItem | null) {
  form.customer_id = customer?.id ?? null;
  if (customer?.name) form.target_org = customer.name;
  if (customer?.contact_name) form.contact_name = customer.contact_name;
  if (customer?.contact_phone) form.contact_phone = customer.contact_phone;
  if (customer?.industry) form.industry = customer.industry;
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsVisit({
      page: currentPage.value,
      size: pageSize.value,
      search: searchQuery.value.trim() || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch {
    message.error('加载外访列表失败');
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

function openCreate() {
  editingId.value = null;
  formMode.value = 'create';
  formMeta.value = {};
  Object.assign(form, emptyForm());
  activeTab.value = 'plan';
  formVisible.value = true;
}

function fillFormFromRecord(record: OpsVisitItem) {
  Object.assign(form, emptyForm(), {
    ...record,
    status: record.status === 'planned' ? 'pending' : record.status === 'done' ? 'visited' : record.status || 'pending',
    intent: record.intent || undefined,
    industry: record.industry || undefined,
    decision_role: record.decision_role || undefined,
    location_type: record.location_type || undefined,
  });
  formMeta.value = {
    created_at: record.created_at,
    updated_at: record.updated_at,
    operator_name: record.operator_name,
    updater_name: record.updater_name,
  };
}

async function openView(record: OpsVisitItem) {
  editingId.value = record.id!;
  formMode.value = 'view';
  await loadAndFill(record.id!, record);
  activeTab.value = 'plan';
  formVisible.value = true;
}

async function openEdit(record: OpsVisitItem) {
  editingId.value = record.id!;
  formMode.value = 'edit';
  await loadAndFill(record.id!, record);
  activeTab.value = 'plan';
  formVisible.value = true;
}

async function loadAndFill(id: number, fallback: OpsVisitItem) {
  try {
    const detail: any = await detailOpsVisit(id);
    fillFormFromRecord((detail || fallback) as OpsVisitItem);
  } catch {
    fillFormFromRecord(fallback);
  }
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
    const payload = { ...form, intent: form.intent || '' };
    if (editingId.value) {
      await updateOpsVisit({ id: editingId.value, ...payload });
      message.success('已更新');
    } else {
      await createOpsVisit(payload);
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

function handleConvert(record: OpsVisitItem) {
  if (!isMidHigh(record.intent)) {
    message.warning('请先将客户意向设为中或高');
    return;
  }
  Modal.confirm({
    title: '转入客户中心',
    content: `将「${record.target_org || record.title}」转入客户中心？`,
    async onOk() {
      try {
        await convertOpsVisit({
          id: record.id!,
          contact_name: record.contact_name,
          contact_phone: record.contact_phone,
        });
        message.success('已转入客户中心');
        await loadList();
      } catch (e: any) {
        message.error(e?.message || '转入失败');
      }
    },
  });
}

function handleDelete(record: OpsVisitItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除外访「${record.title}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsVisit(record.id!);
        message.success('已删除');
        await loadList();
      } catch {
        message.error('删除失败');
      }
    },
  });
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

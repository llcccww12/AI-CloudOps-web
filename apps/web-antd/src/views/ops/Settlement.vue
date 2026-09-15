<template>
  <div class="ops-page">
    <a-card>
      <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
        <a-tab-pane key="settlement" tab="结算单">
          <div class="toolbar">
            <a-button type="primary" @click="openCreate">
              <template #icon><PlusOutlined /></template>
              新建结算单
            </a-button>
            <a-button :loading="billingLoading" @click="handleGenerateBilling">
              按合同生成当月草稿
            </a-button>
            <a-input-search
              v-model:value="searchQuery"
              placeholder="搜索结算标题..."
              style="width: 240px"
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
              <template v-if="column.key === 'amount'">¥{{ record.amount ?? 0 }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag>{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'due_at'">
                {{ formatTime(record.due_at) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="openAttachments(record)">附件</a-button>
                  <a-button
                    type="link"
                    size="small"
                    :disabled="record.status !== 'draft'"
                    @click="handleConfirm(record)"
                  >
                    确认
                  </a-button>
                  <a-button type="link" size="small" @click="openInvoice(record)">开票</a-button>
                  <a-button type="link" size="small" @click="openPayment(record)">回款</a-button>
                  <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="invoice" tab="发票">
          <div class="toolbar">
            <a-input-search
              v-model:value="invoiceSearch"
              placeholder="搜索发票号..."
              style="width: 240px"
              allow-clear
              @search="loadInvoices"
            />
            <a-button @click="loadInvoices">刷新</a-button>
          </div>
          <a-table
            :data-source="invoices"
            :columns="invoiceColumns"
            :loading="invoiceListLoading"
            :pagination="invoicePagination"
            row-key="id"
            bordered
            @change="onInvoiceTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">¥{{ record.amount ?? 0 }}</template>
              <template v-else-if="column.key === 'issued_at'">
                {{ formatTime(record.issued_at) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag>{{ invoiceStatusLabel(record.status) }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="payment" tab="回款">
          <div class="toolbar">
            <a-input-search
              v-model:value="paymentSearch"
              placeholder="搜索流水号..."
              style="width: 240px"
              allow-clear
              @search="loadPayments"
            />
            <a-button @click="loadPayments">刷新</a-button>
          </div>
          <a-table
            :data-source="payments"
            :columns="paymentColumns"
            :loading="paymentListLoading"
            :pagination="paymentPagination"
            row-key="id"
            bordered
            @change="onPaymentTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">¥{{ record.amount ?? 0 }}</template>
              <template v-else-if="column.key === 'paid_at'">
                {{ formatTime(record.paid_at) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag>{{ paymentStatusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button
                  type="link"
                  size="small"
                  :disabled="record.status === 'matched'"
                  @click="handleMatchPayment(record)"
                >
                  核销
                </a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      :open="formVisible"
      :title="editingId ? '编辑结算单' : '新建结算单'"
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
        <a-form-item label="合同" name="contract_id">
          <OpsContractSelect
            v-model="form.contract_id"
            :customer-id="form.customer_id"
            :disabled="!!editingId"
          />
        </a-form-item>
        <a-form-item label="标题" name="title">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="周期开始" name="period_start">
              <a-date-picker
                v-model:value="form.period_start"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="周期结束" name="period_end">
              <a-date-picker
                v-model:value="form.period_end"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="应结金额" name="amount">
              <a-input-number v-model:value="form.amount" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收款到期日" name="due_at">
              <a-date-picker
                v-model:value="form.due_at"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="form.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="invoiceVisible"
      title="创建发票"
      :confirm-loading="invoiceLoading"
      destroy-on-close
      @ok="submitInvoice"
      @cancel="invoiceVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="发票号">
          <a-input v-model:value="invoiceForm.invoice_no" />
        </a-form-item>
        <a-form-item label="开票类型">
          <a-select
            v-model:value="invoiceForm.invoice_type"
            placeholder="选择开票类型"
            :options="OpsInvoiceTypeOptions"
          />
        </a-form-item>
        <a-form-item label="金额">
          <a-input-number v-model:value="invoiceForm.amount" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="开票日期">
          <a-date-picker
            v-model:value="invoiceForm.issued_at"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="paymentVisible"
      title="登记回款"
      :confirm-loading="paymentLoading"
      destroy-on-close
      @ok="submitPayment"
      @cancel="paymentVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="回款金额" required>
          <a-input-number v-model:value="paymentForm.amount" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="到账日期">
          <a-date-picker
            v-model:value="paymentForm.paid_at"
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
          />
        </a-form-item>
        <a-form-item label="流水号">
          <a-input v-model:value="paymentForm.bank_ref" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="paymentForm.remark" :rows="2" />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          message="创建后可在回款记录中点击核销匹配"
          style="margin-bottom: 8px"
        />
      </a-form>
    </a-modal>

    <a-drawer
      :open="attachmentVisible"
      title="结算附件"
      width="520"
      destroy-on-close
      @close="attachmentVisible = false"
    >
      <OpsAttachments
        v-if="attachmentBizId"
        biz-type="settlement"
        :biz-id="attachmentBizId"
      />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal, type FormInstance } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import OpsAttachments from '#/views/ops/components/OpsAttachments.vue';
import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import OpsContractSelect from '#/views/ops/components/OpsContractSelect.vue';
import { OpsInvoiceTypeOptions } from '#/views/ops/constants/options';
import {
  type CreateOpsSettlementReq,
  type OpsSettlementItem,
  confirmOpsSettlement,
  createOpsSettlement,
  deleteOpsSettlement,
  listOpsSettlement,
  updateOpsSettlement,
} from '#/api/core/ops/settlement';
import {
  createOpsInvoice,
  listOpsInvoice,
  type OpsInvoiceItem,
} from '#/api/core/ops/invoice';
import {
  createOpsPayment,
  listOpsPayment,
  matchOpsPayment,
  type OpsPaymentItem,
} from '#/api/core/ops/payment';
import { generateOpsMonthlyBilling } from '#/api/core/ops/survey';

const route = useRoute();
const activeTab = ref('settlement');
const billingLoading = ref(false);

async function handleGenerateBilling() {
  billingLoading.value = true;
  try {
    const res: any = await generateOpsMonthlyBilling();
    const reasons = Array.isArray(res?.skip_reasons) ? res.skip_reasons : [];
    const content = [
      `账期：${res?.period || '-'}`,
      `检查正式生效合同：${res?.contract_checked ?? 0} 份`,
      `新建结算草稿：${res?.settlement_created ?? 0}`,
      `新建发票草稿：${res?.invoice_created ?? 0}`,
      `跳过：${res?.skipped ?? 0}`,
      res?.hint ? `\n说明：${res.hint}` : '',
      reasons.length ? `\n详情：\n- ${reasons.slice(0, 8).join('\n- ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    Modal.info({
      title: '月结算草稿生成结果',
      content,
      width: 560,
      okText: '知道了',
    });
    if ((res?.settlement_created ?? 0) > 0) {
      message.success('已生成草稿，请在下方列表查看');
    }
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '生成失败');
  } finally {
    billingLoading.value = false;
  }
}

function parseQueryCustomerId(): number | null {
  const raw = route.query.customer_id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return id > 0 ? id : null;
}

const attachmentVisible = ref(false);
const attachmentBizId = ref(0);

function openAttachments(record: OpsSettlementItem) {
  attachmentBizId.value = record.id!;
  attachmentVisible.value = true;
}

const loading = ref(false);
const submitLoading = ref(false);
const list = ref<OpsSettlementItem[]>([]);
const searchQuery = ref('');
const customerFilter = ref<number | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const formVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive<
  Omit<CreateOpsSettlementReq, 'customer_id' | 'contract_id'> & {
    customer_id: number | null;
    contract_id: number | null;
  }
>({
  customer_id: null,
  contract_id: null,
  title: '',
  period_start: null,
  period_end: null,
  amount: 0,
  due_at: null,
  remark: '',
});

const rules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  contract_id: [{ required: true, message: '请选择合同', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '合同ID', dataIndex: 'contract_id', key: 'contract_id', width: 90 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: '到期日', dataIndex: 'due_at', key: 'due_at', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作', key: 'action', width: 320, fixed: 'right' as const },
];

const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const invoiceVisible = ref(false);
const invoiceLoading = ref(false);
const currentSettlement = ref<OpsSettlementItem | null>(null);
const invoiceForm = reactive({
  invoice_no: '',
  invoice_type: '专票',
  amount: 0,
  issued_at: null as string | null,
});

const paymentVisible = ref(false);
const paymentLoading = ref(false);
const paymentForm = reactive({
  amount: 0,
  paid_at: null as string | null,
  bank_ref: '',
  remark: '',
});

function statusLabel(s?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    invoiced: '已开票',
    paid: '已回款',
    overdue: '逾期',
  };
  return map[s || ''] || s || '-';
}

function invoiceStatusLabel(s?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    issued: '已开具',
    void: '作废',
  };
  return map[s || ''] || s || '-';
}

function paymentStatusLabel(s?: string) {
  const map: Record<string, string> = {
    pending: '待核销',
    matched: '已核销',
  };
  return map[s || ''] || s || '-';
}

function formatTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleDateString('zh-CN');
}

const invoices = ref<OpsInvoiceItem[]>([]);
const invoiceListLoading = ref(false);
const invoiceSearch = ref('');
const invoicePage = ref(1);
const invoiceSize = ref(10);
const invoiceTotal = ref(0);
const invoiceColumns = [
  { title: '发票号', dataIndex: 'invoice_no', key: 'invoice_no', ellipsis: true },
  { title: '结算单ID', dataIndex: 'settlement_id', key: 'settlement_id', width: 100 },
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '类型', dataIndex: 'invoice_type', key: 'invoice_type', width: 100 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: '开票日期', dataIndex: 'issued_at', key: 'issued_at', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '操作人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
];
const invoicePagination = computed(() => ({
  current: invoicePage.value,
  pageSize: invoiceSize.value,
  total: invoiceTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const payments = ref<OpsPaymentItem[]>([]);
const paymentListLoading = ref(false);
const paymentSearch = ref('');
const paymentPage = ref(1);
const paymentSize = ref(10);
const paymentTotal = ref(0);
const paymentColumns = [
  { title: '结算单ID', dataIndex: 'settlement_id', key: 'settlement_id', width: 100 },
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 },
  { title: '到账日期', dataIndex: 'paid_at', key: 'paid_at', width: 140 },
  { title: '流水号', dataIndex: 'bank_ref', key: 'bank_ref', ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'action', width: 100 },
];
const paymentPagination = computed(() => ({
  current: paymentPage.value,
  pageSize: paymentSize.value,
  total: paymentTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

async function loadInvoices() {
  invoiceListLoading.value = true;
  try {
    const res: any = await listOpsInvoice({
      page: invoicePage.value,
      size: invoiceSize.value,
      search: invoiceSearch.value.trim() || undefined,
      customer_id: customerFilter.value || undefined,
    });
    invoices.value = res?.items || [];
    invoiceTotal.value = res?.total || 0;
  } catch {
    message.error('加载发票列表失败');
    invoices.value = [];
    invoiceTotal.value = 0;
  } finally {
    invoiceListLoading.value = false;
  }
}

async function loadPayments() {
  paymentListLoading.value = true;
  try {
    const res: any = await listOpsPayment({
      page: paymentPage.value,
      size: paymentSize.value,
      search: paymentSearch.value.trim() || undefined,
      customer_id: customerFilter.value || undefined,
    });
    payments.value = res?.items || [];
    paymentTotal.value = res?.total || 0;
  } catch {
    message.error('加载回款列表失败');
    payments.value = [];
    paymentTotal.value = 0;
  } finally {
    paymentListLoading.value = false;
  }
}

function onInvoiceTableChange(pag: any) {
  invoicePage.value = pag.current;
  invoiceSize.value = pag.pageSize;
  loadInvoices();
}

function onPaymentTableChange(pag: any) {
  paymentPage.value = pag.current;
  paymentSize.value = pag.pageSize;
  loadPayments();
}

function onTabChange(key: string | number) {
  if (key === 'invoice') loadInvoices();
  if (key === 'payment') loadPayments();
}

async function handleMatchPayment(record: OpsPaymentItem) {
  try {
    await matchOpsPayment(record.id!);
    message.success('已核销');
    await loadPayments();
    await loadList();
  } catch {
    message.error('核销失败');
  }
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsSettlement({
      page: currentPage.value,
      size: pageSize.value,
      search: searchQuery.value.trim() || undefined,
      customer_id: customerFilter.value || undefined,
    });
    list.value = res?.items || [];
    total.value = res?.total || 0;
  } catch {
    message.error('加载结算列表失败');
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
    contract_id: null,
    title: '',
    period_start: null,
    period_end: null,
    amount: 0,
    due_at: null,
    remark: '',
  });
  formVisible.value = true;
}

function openEdit(record: OpsSettlementItem) {
  editingId.value = record.id!;
  Object.assign(form, {
    customer_id: record.customer_id,
    contract_id: record.contract_id,
    title: record.title,
    period_start: record.period_start || null,
    period_end: record.period_end || null,
    amount: record.amount || 0,
    due_at: record.due_at || null,
    remark: record.remark || '',
  });
  formVisible.value = true;
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (!form.customer_id || !form.contract_id) {
    message.warning('请选择客户和合同');
    return;
  }
  const normalizeDate = (v: string | null | undefined) => {
    if (v == null || String(v).trim() === '') return undefined;
    return String(v).trim();
  };
  const customerId = Number(form.customer_id);
  const contractId = Number(form.contract_id);
  if (!Number.isFinite(customerId) || customerId <= 0) {
    message.warning('请选择客户');
    return;
  }
  if (!Number.isFinite(contractId) || contractId <= 0) {
    message.warning('请选择合同');
    return;
  }
  const title = String(form.title || '').trim();
  if (!title) {
    message.warning('请输入标题');
    return;
  }
  submitLoading.value = true;
  try {
    if (editingId.value) {
      await updateOpsSettlement({
        id: editingId.value,
        title,
        period_start: normalizeDate(form.period_start),
        period_end: normalizeDate(form.period_end),
        amount: form.amount ?? 0,
        due_at: normalizeDate(form.due_at),
        remark: form.remark || '',
      });
      message.success('已更新');
    } else {
      await createOpsSettlement({
        customer_id: customerId,
        contract_id: contractId,
        title,
        period_start: normalizeDate(form.period_start),
        period_end: normalizeDate(form.period_end),
        amount: form.amount ?? 0,
        due_at: normalizeDate(form.due_at),
        remark: form.remark || '',
      });
      message.success('已创建');
      currentPage.value = 1;
    }
    formVisible.value = false;
    await loadList();
  } catch (e: any) {
    const apiMsg = e?.message || e?.msg;
    // 全局拦截器已提示时避免重复；仅兜底无文案
    if (!apiMsg) {
      message.error('保存失败，请确认已选择有效客户与合同');
    }
  } finally {
    submitLoading.value = false;
  }
}

function handleConfirm(record: OpsSettlementItem) {
  Modal.confirm({
    title: '确认结算',
    content: `确认结算单「${record.title}」？`,
    async onOk() {
      try {
        await confirmOpsSettlement(record.id!);
        message.success('已确认');
        await loadList();
      } catch {
        message.error('确认失败');
      }
    },
  });
}

function openInvoice(record: OpsSettlementItem) {
  currentSettlement.value = record;
  invoiceForm.invoice_no = '';
  invoiceForm.invoice_type = '专票';
  invoiceForm.amount = record.amount || 0;
  invoiceForm.issued_at = null;
  invoiceVisible.value = true;
}

async function submitInvoice() {
  if (!currentSettlement.value) return;
  invoiceLoading.value = true;
  try {
    await createOpsInvoice({
      customer_id: currentSettlement.value.customer_id,
      settlement_id: currentSettlement.value.id!,
      invoice_no: invoiceForm.invoice_no,
      invoice_type: invoiceForm.invoice_type,
      amount: invoiceForm.amount,
      issued_at: invoiceForm.issued_at,
    });
    message.success('发票已创建，可在「发票」页签查看');
    invoiceVisible.value = false;
    activeTab.value = 'invoice';
    await loadList();
    await loadInvoices();
  } catch {
    message.error('创建发票失败');
  } finally {
    invoiceLoading.value = false;
  }
}

function openPayment(record: OpsSettlementItem) {
  currentSettlement.value = record;
  paymentForm.amount = record.amount || 0;
  paymentForm.paid_at = null;
  paymentForm.bank_ref = '';
  paymentForm.remark = '';
  paymentVisible.value = true;
}

async function submitPayment() {
  if (!currentSettlement.value) return;
  if (!paymentForm.amount) {
    message.warning('请填写回款金额');
    return;
  }
  paymentLoading.value = true;
  try {
    const res: any = await createOpsPayment({
      customer_id: currentSettlement.value.customer_id,
      settlement_id: currentSettlement.value.id!,
      amount: paymentForm.amount,
      paid_at: paymentForm.paid_at,
      bank_ref: paymentForm.bank_ref,
      remark: paymentForm.remark,
    });
    const paymentId = res?.id;
    if (paymentId) {
      try {
        await matchOpsPayment(paymentId);
        message.success('回款已登记并核销');
      } catch {
        message.success('回款已登记，核销可稍后处理');
      }
    } else {
      message.success('回款已登记');
    }
    paymentVisible.value = false;
    activeTab.value = 'payment';
    await loadList();
    await loadPayments();
  } catch {
    message.error('登记回款失败');
  } finally {
    paymentLoading.value = false;
  }
}

function handleDelete(record: OpsSettlementItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除结算单「${record.title}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsSettlement(record.id!);
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

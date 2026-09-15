<template>
  <div class="ops-page">
    <a-card>
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="contract" tab="合同">
          <div class="toolbar">
            <a-button type="primary" @click="openContractCreate()">
              <template #icon><PlusOutlined /></template>
              新建合同
            </a-button>
            <a-input-search
              v-model:value="contractSearch"
              placeholder="搜索合同标题..."
              style="width: 240px"
              allow-clear
              @search="loadContracts"
            />
          </div>
          <a-table
            :data-source="contracts"
            :columns="contractColumns"
            :loading="contractLoading"
            :pagination="contractPagination"
            row-key="id"
            bordered
            @change="onContractTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                {{ record.type === 'trial' ? '试用合同' : '正式合同' }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag>{{ contractStatusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'unit_price'">
                ¥{{ record.unit_price ?? 0 }}
              </template>
              <template v-else-if="column.key === 'billing_mode'">
                {{ OpsBillingModeLabel[record.billing_mode] || record.billing_mode || '-' }}
              </template>
              <template v-else-if="column.key === 'billing_cycle'">
                {{ OpsBillingCycleLabel[record.billing_cycle] || record.billing_cycle || '-' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="openContractEdit(record)">编辑</a-button>
                  <a-button type="link" size="small" @click="openContractItems(record)">行项目</a-button>
                  <a-button type="link" size="small" @click="openContractAttachments(record)">附件</a-button>
                  <a-button type="link" size="small" danger @click="deleteContract(record)">删除</a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="activation" tab="开通归档">
          <div class="toolbar">
            <a-button @click="downloadTpl('trial')">下载测试开通模版</a-button>
            <a-button @click="downloadTpl('formal')">下载正式开通模版</a-button>
            <a-select
              v-model:value="deliveryScene"
              style="width: 140px"
              allow-clear
              placeholder="全部类型"
              :options="[
                { label: '测试开通', value: 'trial' },
                { label: '正式开通', value: 'formal' },
              ]"
              @change="loadDeliveryPacks"
            />
            <a-input-search
              v-model:value="deliverySearch"
              placeholder="搜索开通标题..."
              style="width: 240px"
              allow-clear
              @search="loadDeliveryPacks"
            />
          </div>
          <a-table
            :data-source="deliveryPacks"
            :columns="deliveryColumns"
            :loading="deliveryLoading"
            :pagination="deliveryPagination"
            row-key="row_key"
            bordered
            :scroll="{ x: 2200 }"
            @change="onDeliveryTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'customer_id'">
                {{ record.customer_id || '-' }}
              </template>
              <template v-else-if="column.key === 'customer_short_name'">
                <a @click="goCustomer(record.customer_id)">
                  {{ record.customer_short_name || record.customer_name || `#${record.customer_id}` }}
                </a>
              </template>
              <template v-else-if="column.key === 'product_type'">
                {{ productTypeLabel(record.product_type) }}
                <a-tag v-if="record.ledger_incomplete" color="warning" style="margin-left: 4px">
                  台账未完善
                </a-tag>
              </template>
              <template v-else-if="column.key === 'open_method'">
                {{ record.open_method_label || openMethodLabel(record.open_method) || record.scene_label }}
              </template>
              <template v-else-if="column.key === 'contract_range'">
                {{ formatDate(record.contract_start_at) }} ~ {{ formatDate(record.contract_end_at) }}
              </template>
              <template v-else-if="column.key === 'files'">
                开通单 {{ record.sheet_count || 0 }} · 邮件 {{ record.email_count || 0 }}
                <template v-if="record.contract_file_count">
                  · 合同 {{ record.contract_file_count }}
                </template>
              </template>
              <template v-else-if="column.key === 'created'">
                <div>{{ record.operator_name || '-' }}</div>
                <div class="muted">{{ formatTime(record.created_at) }}</div>
              </template>
              <template v-else-if="column.key === 'updated'">
                <div>{{ record.updater_name || '-' }}</div>
                <div class="muted">{{ formatTime(record.updated_at) }}</div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag>{{ activationStatusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="openDeliveryDetail(record)">
                    查看/上传开通单
                  </a-button>
                  <a-button
                    v-if="record.workorder_instance_id"
                    type="link"
                    size="small"
                    @click="openWorkorder(record.workorder_instance_id)"
                  >
                    工单
                  </a-button>
                  <a-button
                    v-if="record.biz_type === 'trial' || record.biz_type === 'activation'"
                    type="link"
                    size="small"
                    danger
                    @click="deleteDeliveryPack(record)"
                  >
                    删除
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      :open="contractVisible"
      :title="contractEditingId ? '编辑合同' : '新建合同'"
      :confirm-loading="contractSubmitLoading"
      destroy-on-close
      width="640px"
      @ok="submitContract"
      @cancel="contractVisible = false"
    >
      <a-form ref="contractFormRef" :model="contractForm" :rules="contractRules" layout="vertical">
        <a-form-item label="客户" name="customer_id">
          <OpsCustomerSelect
            v-model="contractForm.customer_id"
            :disabled="!!contractEditingId"
            placeholder="选择客户"
          />
        </a-form-item>
        <a-form-item label="合同类型" name="type">
          <a-select v-model:value="contractForm.type" :disabled="!!contractEditingId">
            <a-select-option value="trial">试用合同</a-select-option>
            <a-select-option value="formal">正式合同</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标题" name="title">
          <a-input v-model:value="contractForm.title" />
        </a-form-item>
        <a-form-item label="算力产品类型" name="product_type">
          <a-select
            v-model:value="contractForm.product_type"
            allow-clear
            placeholder="选择产品类型"
            :options="OpsProductTypeOptions"
          />
        </a-form-item>
        <a-form-item label="付费方式" name="payment_method">
          <a-select
            v-model:value="contractForm.payment_method"
            allow-clear
            placeholder="选择付费方式"
            :options="OpsPaymentMethodOptions"
          />
        </a-form-item>
        <a-form-item label="计费模式" name="billing_mode">
          <a-select
            v-model:value="contractForm.billing_mode"
            allow-clear
            placeholder="选择计费模式"
            :options="OpsBillingModeOptions"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="单价" name="unit_price">
              <a-input-number v-model:value="contractForm.unit_price" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账期天数" name="payment_term_days">
              <a-select
                v-model:value="contractForm.payment_term_days"
                placeholder="选择账期"
                :options="OpsPaymentTermOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="计费周期" name="billing_cycle">
          <a-select
            v-model:value="contractForm.billing_cycle"
            allow-clear
            placeholder="选择计费周期"
            :options="OpsBillingCycleOptions"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="开始" name="start_at">
              <a-date-picker
                v-model:value="contractForm.start_at"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束" name="end_at">
              <a-date-picker
                v-model:value="contractForm.end_at"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="自动续约" name="auto_renew">
          <a-radio-group v-model:value="contractForm.auto_renew">
            <a-radio :value="1">是</a-radio>
            <a-radio :value="2">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="contractEditingId" label="状态" name="status">
          <a-select v-model:value="contractForm.status">
            <a-select-option value="draft">草稿</a-select-option>
            <a-select-option value="active">生效</a-select-option>
            <a-select-option value="expired">到期</a-select-option>
            <a-select-option value="terminated">终止</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="contractForm.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      :open="deliveryDetailVisible"
      :title="deliveryDetailTitle"
      width="640"
      destroy-on-close
      @close="
        deliveryDetailVisible = false;
        loadDeliveryPacks();
      "
    >
      <OpsDeliveryPack
        v-if="deliveryEditing"
        :scene="deliveryEditing.scene === 'formal' ? 'formal' : 'trial'"
        :biz-id="deliveryEditing.biz_id"
        :contract-id="deliveryEditing.contract_id || 0"
      />
    </a-drawer>

    <a-drawer
      :open="attachmentVisible"
      title="合同附件"
      width="520"
      destroy-on-close
      @close="attachmentVisible = false"
    >
      <OpsAttachments
        v-if="attachmentBizId"
        biz-type="contract"
        :biz-id="attachmentBizId"
      />
    </a-drawer>

    <a-modal
      :open="itemVisible"
      :title="`合同行项目 — ${itemContractTitle}`"
      :footer="null"
      width="760px"
      destroy-on-close
      @cancel="itemVisible = false"
    >
      <div class="toolbar" style="margin-bottom: 12px">
        <a-button type="primary" size="small" @click="openItemCreate">新增行项目</a-button>
      </div>
      <a-table
        :data-source="itemList"
        :columns="itemColumns"
        :loading="itemLoading"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'item_type'">
            {{ record.item_type === 'main' ? '主产品' : '增值服务' }}
          </template>
          <template v-else-if="column.key === 'unit_price'">¥{{ record.unit_price ?? 0 }}</template>
          <template v-else-if="column.key === 'amount'">¥{{ record.amount ?? 0 }}</template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeContractItem(record.id)">
              删除
            </a-button>
          </template>
        </template>
      </a-table>

      <a-modal
        :open="itemFormVisible"
        title="新增行项目"
        :confirm-loading="itemSubmitLoading"
        @ok="submitContractItem"
        @cancel="itemFormVisible = false"
      >
        <a-form layout="vertical">
          <a-form-item label="类型" required>
            <a-select v-model:value="itemForm.item_type">
              <a-select-option value="main">主产品</a-select-option>
              <a-select-option value="addon">增值服务</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="名称" required>
            <a-input v-model:value="itemForm.name" />
          </a-form-item>
          <a-form-item label="产品类型">
            <a-select
              v-model:value="itemForm.product_type"
              allow-clear
              :options="OpsProductTypeOptions"
            />
          </a-form-item>
          <a-form-item label="数量">
            <a-input-number v-model:value="itemForm.quantity" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="单价">
            <a-input-number v-model:value="itemForm.unit_price" :min="0" style="width: 100%" />
          </a-form-item>
          <a-form-item label="备注">
            <a-input v-model:value="itemForm.remark" />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal, type FormInstance } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import OpsAttachments from '#/views/ops/components/OpsAttachments.vue';
import OpsDeliveryPack from '#/views/ops/components/OpsDeliveryPack.vue';
import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import {
  OpsBillingCycleLabel,
  OpsBillingCycleOptions,
  OpsBillingModeLabel,
  OpsBillingModeOptions,
  OpsOpenMethodOptions,
  OpsPaymentMethodOptions,
  OpsPaymentTermOptions,
  OpsProductTypeLabel,
  OpsProductTypeOptions,
} from '#/views/ops/constants/options';
import {
  type CreateOpsContractReq,
  type OpsContractItem,
  createOpsContract,
  deleteOpsContract,
  listOpsContract,
  updateOpsContract,
} from '#/api/core/ops/contract';
import { deleteOpsActivation } from '#/api/core/ops/activation';
import { deleteOpsTrial } from '#/api/core/ops/trial';
import {
  downloadOpsActivationTemplate,
  listOpsDeliveryPacks,
  type OpsCustomerEvidencePack,
} from '#/api/core/ops/attachment';
import {
  createOpsContractItem,
  deleteOpsContractItem,
  listOpsContractItem,
} from '#/api/core/ops/survey';

const router = useRouter();
const route = useRoute();

function parseQueryCustomerId(): number | null {
  const raw = route.query.customer_id;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  return id > 0 ? id : null;
}

const attachmentVisible = ref(false);
const attachmentBizId = ref(0);
const queryCustomerId = ref<number | null>(null);

const itemVisible = ref(false);
const itemLoading = ref(false);
const itemSubmitLoading = ref(false);
const itemFormVisible = ref(false);
const itemContractId = ref(0);
const itemContractTitle = ref('');
const itemList = ref<any[]>([]);
const itemForm = reactive({
  item_type: 'addon',
  name: '',
  product_type: '',
  quantity: 1,
  unit_price: 0,
  remark: '',
});
const itemColumns = [
  { title: '类型', key: 'item_type', width: 90 },
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '产品类型', dataIndex: 'product_type', key: 'product_type', width: 110 },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
  { title: '单价', key: 'unit_price', width: 100 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '操作', key: 'action', width: 80 },
];

function openContractAttachments(record: OpsContractItem) {
  attachmentBizId.value = record.id!;
  attachmentVisible.value = true;
}

async function openContractItems(record: OpsContractItem) {
  itemContractId.value = record.id!;
  itemContractTitle.value = record.title || `#${record.id}`;
  itemVisible.value = true;
  await loadContractItems();
}

async function loadContractItems() {
  if (!itemContractId.value) return;
  itemLoading.value = true;
  try {
    const res: any = await listOpsContractItem(itemContractId.value);
    itemList.value = Array.isArray(res) ? res : res?.items || [];
  } catch {
    message.error('加载行项目失败');
  } finally {
    itemLoading.value = false;
  }
}

function openItemCreate() {
  itemForm.item_type = 'addon';
  itemForm.name = '';
  itemForm.product_type = '';
  itemForm.quantity = 1;
  itemForm.unit_price = 0;
  itemForm.remark = '';
  itemFormVisible.value = true;
}

async function submitContractItem() {
  if (!itemForm.name.trim()) {
    message.warning('请填写名称');
    return;
  }
  itemSubmitLoading.value = true;
  try {
    await createOpsContractItem({
      contract_id: itemContractId.value,
      item_type: itemForm.item_type,
      name: itemForm.name.trim(),
      product_type: itemForm.product_type,
      quantity: itemForm.quantity,
      unit_price: itemForm.unit_price,
      remark: itemForm.remark,
    });
    message.success('已添加');
    itemFormVisible.value = false;
    await loadContractItems();
  } catch (e: any) {
    message.error(e?.message || '添加失败');
  } finally {
    itemSubmitLoading.value = false;
  }
}

function removeContractItem(id: number) {
  Modal.confirm({
    title: '确认删除该行项目？',
    onOk: async () => {
      await deleteOpsContractItem(id);
      message.success('已删除');
      await loadContractItems();
    },
  });
}

function openWorkorder(instanceId: number) {
  router.push({ path: '/workorder/center', query: { id: String(instanceId) } });
}
const activeTab = ref('contract');

const contractLoading = ref(false);
const contractSubmitLoading = ref(false);
const contracts = ref<OpsContractItem[]>([]);
const contractSearch = ref('');
const contractPage = ref(1);
const contractSize = ref(10);
const contractTotal = ref(0);
const contractVisible = ref(false);
const contractEditingId = ref<number | null>(null);
const contractFormRef = ref<FormInstance>();
const contractForm = reactive<
  Omit<CreateOpsContractReq, 'customer_id'> & { customer_id: number | null; status?: string }
>({
  customer_id: null,
  type: 'formal',
  title: '',
  product_type: '',
  billing_mode: '',
  unit_price: 0,
  billing_cycle: '',
  payment_method: '',
  payment_term_days: 30,
  start_at: null,
  end_at: null,
  auto_renew: 2,
  remark: '',
  status: 'draft',
});
const contractRules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};
const contractColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '计费模式', dataIndex: 'billing_mode', key: 'billing_mode', width: 110 },
  { title: '计费周期', dataIndex: 'billing_cycle', key: 'billing_cycle', width: 100 },
  { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' as const },
];
const contractPagination = computed(() => ({
  current: contractPage.value,
  pageSize: contractSize.value,
  total: contractTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const deliveryLoading = ref(false);
const deliveryPacks = ref<(OpsCustomerEvidencePack & { row_key: string })[]>([]);
const deliverySearch = ref('');
const deliveryScene = ref<'trial' | 'formal' | undefined>(undefined);
const deliveryPage = ref(1);
const deliverySize = ref(10);
const deliveryTotal = ref(0);
const deliveryDetailVisible = ref(false);
const deliveryEditing = ref<OpsCustomerEvidencePack | null>(null);
const deliveryDetailTitle = computed(() => {
  if (!deliveryEditing.value) return '开通单材料';
  return `${deliveryEditing.value.scene_label} · ${deliveryEditing.value.title}`;
});
const deliveryColumns = [
  { title: '客户ID', key: 'customer_id', width: 90 },
  { title: '客户简称', key: 'customer_short_name', width: 140, ellipsis: true },
  { title: '产品类型', key: 'product_type', width: 110 },
  { title: '所属大区', dataIndex: 'region', key: 'region', width: 90 },
  { title: '归属客户经理', dataIndex: 'owner_name', key: 'owner_name', width: 120, ellipsis: true },
  { title: '主账号', dataIndex: 'main_account', key: 'main_account', width: 120, ellipsis: true },
  { title: '项目名称', dataIndex: 'project_name', key: 'project_name', width: 140, ellipsis: true },
  { title: '开通方式', key: 'open_method', width: 100 },
  { title: '合同编号', dataIndex: 'contract_no', key: 'contract_no', width: 130, ellipsis: true },
  { title: '订单编号', dataIndex: 'order_no', key: 'order_no', width: 130, ellipsis: true },
  { title: '开通周期', dataIndex: 'open_period', key: 'open_period', width: 110 },
  { title: '合同起止', key: 'contract_range', width: 200 },
  { title: '对应附件', key: 'files', width: 180 },
  { title: '创建人/时间', key: 'created', width: 160 },
  { title: '更新人/时间', key: 'updated', width: 160 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 260, fixed: 'right' as const },
];
const deliveryPagination = computed(() => ({
  current: deliveryPage.value,
  pageSize: deliverySize.value,
  total: deliveryTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function contractStatusLabel(s?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    active: '生效',
    expired: '到期',
    terminated: '终止',
  };
  return map[s || ''] || s || '-';
}

function activationStatusLabel(s?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    active: '已开通',
  };
  return map[s || ''] || s || '-';
}

async function loadContracts() {
  contractLoading.value = true;
  try {
    const res: any = await listOpsContract({
      page: contractPage.value,
      size: contractSize.value,
      search: contractSearch.value.trim() || undefined,
      customer_id: queryCustomerId.value || undefined,
    });
    contracts.value = res?.items || [];
    contractTotal.value = res?.total || 0;
  } catch {
    message.error('加载合同列表失败');
  } finally {
    contractLoading.value = false;
  }
}

async function loadDeliveryPacks() {
  deliveryLoading.value = true;
  try {
    const res: any = await listOpsDeliveryPacks({
      page: deliveryPage.value,
      size: deliverySize.value,
      search: deliverySearch.value.trim() || undefined,
      scene: deliveryScene.value || undefined,
      customer_id: queryCustomerId.value || undefined,
    });
    const items: OpsCustomerEvidencePack[] = res?.items || [];
    deliveryPacks.value = items.map((item) => ({
      ...item,
      row_key: `${item.biz_type}-${item.biz_id}`,
    }));
    deliveryTotal.value = res?.total || 0;
  } catch (e: any) {
    message.error(e?.message || '加载开通单归档失败');
  } finally {
    deliveryLoading.value = false;
  }
}

function onDeliveryTableChange(pag: any) {
  deliveryPage.value = pag.current;
  deliverySize.value = pag.pageSize;
  loadDeliveryPacks();
}

function openDeliveryDetail(record: OpsCustomerEvidencePack) {
  deliveryEditing.value = record;
  deliveryDetailVisible.value = true;
}

function deleteDeliveryPack(record: OpsCustomerEvidencePack) {
  const kind = record.biz_type === 'activation' ? 'activation' : 'trial';
  if (record.biz_type !== 'activation' && record.biz_type !== 'trial') {
    message.warning('仅支持删除测试/正式开通归档');
    return;
  }
  const label = record.scene_label || (kind === 'activation' ? '正式开通' : '测试开通');
  Modal.confirm({
    title: '确认删除开通归档',
    content: `确定删除「${record.title || label}」吗？将删除对应${kind === 'activation' ? '正式开通单' : '试用单'}记录；已上传的材料与算力台账不会自动清理，请自行核对。`,
    okType: 'danger',
    async onOk() {
      try {
        if (kind === 'activation') {
          await deleteOpsActivation(record.biz_id);
        } else {
          await deleteOpsTrial(record.biz_id);
        }
        message.success('已删除');
        if (deliveryEditing.value?.biz_id === record.biz_id) {
          deliveryDetailVisible.value = false;
          deliveryEditing.value = null;
        }
        await loadDeliveryPacks();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

function goCustomer(customerId?: number) {
  if (!customerId) return;
  router.push(`/ops/customers/detail/${customerId}`);
}

function formatTime(v?: string) {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN');
}

function formatDate(v?: string) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('zh-CN');
}

function productTypeLabel(v?: string) {
  if (!v) return '-';
  return OpsProductTypeLabel[v] || v;
}

function openMethodLabel(v?: string) {
  if (!v) return '';
  return OpsOpenMethodOptions.find((i) => i.value === v)?.label || v;
}

async function downloadTpl(scene: 'trial' | 'formal') {
  try {
    const blob = await downloadOpsActivationTemplate(scene);
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      scene === 'formal'
        ? '思明智算业务开通单v1.0-正式开通.xlsx'
        : '思明智算业务开通单v1.0-测试开通.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    message.error(e?.message || '模版下载失败');
  }
}

function onContractTableChange(pag: any) {
  contractPage.value = pag.current;
  contractSize.value = pag.pageSize;
  loadContracts();
}

function openContractCreate(prefillCustomerId?: number | null) {
  contractEditingId.value = null;
  const customerId = prefillCustomerId ?? parseQueryCustomerId() ?? queryCustomerId.value;
  Object.assign(contractForm, {
    customer_id: customerId,
    type: 'formal',
    title: '',
    product_type: '',
    billing_mode: '',
    unit_price: 0,
    billing_cycle: '',
    payment_method: '',
    payment_term_days: 30,
    start_at: null,
    end_at: null,
    auto_renew: 2,
    remark: '',
    status: 'draft',
  });
  contractVisible.value = true;
}

function openContractEdit(record: OpsContractItem) {
  contractEditingId.value = record.id!;
  Object.assign(contractForm, {
    customer_id: record.customer_id,
    type: record.type,
    title: record.title,
    product_type: record.product_type || '',
    billing_mode: record.billing_mode || '',
    unit_price: record.unit_price || 0,
    billing_cycle: record.billing_cycle || '',
    payment_method: record.payment_method || '',
    payment_term_days: record.payment_term_days || 30,
    start_at: record.start_at || null,
    end_at: record.end_at || null,
    auto_renew: record.auto_renew || 2,
    remark: record.remark || '',
    status: record.status || 'draft',
  });
  contractVisible.value = true;
}

async function submitContract() {
  try {
    await contractFormRef.value?.validate();
  } catch {
    return;
  }
  if (!contractForm.customer_id) {
    message.warning('请选择客户');
    return;
  }
  contractSubmitLoading.value = true;
  try {
    if (contractEditingId.value) {
      await updateOpsContract({
        id: contractEditingId.value,
        title: contractForm.title,
        product_type: contractForm.product_type,
        billing_mode: contractForm.billing_mode,
        unit_price: contractForm.unit_price,
        billing_cycle: contractForm.billing_cycle,
        payment_method: contractForm.payment_method,
        payment_term_days: contractForm.payment_term_days,
        start_at: contractForm.start_at,
        end_at: contractForm.end_at,
        auto_renew: contractForm.auto_renew,
        status: contractForm.status,
        remark: contractForm.remark,
      });
      message.success('合同已更新');
    } else {
      await createOpsContract({
        ...contractForm,
        customer_id: contractForm.customer_id,
      });
      message.success('合同已创建');
    }
    contractVisible.value = false;
    await loadContracts();
  } catch {
    message.error('保存合同失败');
  } finally {
    contractSubmitLoading.value = false;
  }
}

function deleteContract(record: OpsContractItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除合同「${record.title}」吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await deleteOpsContract(record.id!);
        message.success('已删除');
        await loadContracts();
      } catch {
        message.error('删除失败');
      }
    },
  });
}

watch(activeTab, (key) => {
  if (key === 'contract') loadContracts();
  else loadDeliveryPacks();
});

onMounted(async () => {
  const qid = parseQueryCustomerId();
  queryCustomerId.value = qid;
  await loadContracts();
  if (route.query.tab === 'activation') {
    activeTab.value = 'activation';
    await loadDeliveryPacks();
  }
  const createFlag = route.query.create;
  if (qid && (createFlag === '1' || createFlag === 'true')) {
    openContractCreate(qid);
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
.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>

<template>
  <div class="ops-page">
    <a-card>
      <div class="toolbar">
        <a-button type="primary" @click="openCreate()">登记分配</a-button>
        <a-select
          v-model:value="lifeFilter"
          allow-clear
          placeholder="生命周期状态"
          style="width: 140px"
          :options="OpsComputeLifeStatusOptions"
          @change="loadList"
        />
        <a-select
          v-model:value="gpuFilter"
          allow-clear
          placeholder="GPU型号"
          style="width: 140px"
          :options="OpsComputeGPUModelOptions"
          @change="loadList"
        />
        <a-checkbox v-model:checked="overbookOnly" @change="loadList">仅超配</a-checkbox>
        <a-input-number
          v-model:value="customerFilter"
          placeholder="客户ID"
          style="width: 120px"
          :min="1"
          @change="loadList"
        />
        <a-input-search
          v-model:value="search"
          placeholder="搜索记录/服务器/合同"
          style="width: 240px"
          allow-clear
          @search="loadList"
        />
      </div>
      <a-table
        :data-source="list"
        :columns="columns"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        bordered
        :scroll="{ x: 2800 }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'customer'">
            <a @click="goCustomer(record.customer_id)">
              {{ record.customer_name || `#${record.customer_id}` }}
            </a>
          </template>
          <template v-else-if="column.key === 'lease'">
            {{ leaseLabel(record.lease_mode) }}
          </template>
          <template v-else-if="column.key === 'phase'">
            {{ record.biz_phase_label || phaseLabel(record.biz_phase) || '-' }}
          </template>
          <template v-else-if="column.key === 'life'">
            <a-tag :color="record.life_status === 'pending_release' ? 'orange' : undefined">
              {{ record.life_status_label || record.life_status }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'capacity'">
            <a-tag :color="record.capacity_check === 'overbook' ? 'red' : 'green'">
              {{ record.capacity_check_label || '-' }}
            </a-tag>
            <span class="muted">占 {{ record.server_occupied || 0 }}/{{ record.server_gpu_count ?? '-' }}</span>
          </template>
          <template v-else-if="column.key === 'evidence'">
            <a-tag :color="record.evidence_ok ? 'green' : 'orange'">
              {{ record.evidence_ok ? '有佐证' : '缺佐证' }}
            </a-tag>
            <template v-if="record.activation_id">
              <a-button type="link" size="small" @click="goActivation(record)">开通归档</a-button>
            </template>
            <template v-else-if="record.trial_id">
              <a-button type="link" size="small" @click="goTrial(record)">试用单</a-button>
            </template>
          </template>
          <template v-else-if="column.key === 'opened'">
            <div>{{ formatDate(record.opened_at) }}</div>
            <div class="muted">首次开通</div>
          </template>
          <template v-else-if="column.key === 'period'">
            <div>
              {{ formatDate(record.current_period_start_at || record.opened_at) }}
              ~
              {{ formatDate(record.plan_release_at) }}
            </div>
            <div class="muted">
              {{ record.biz_phase_label || phaseLabel(record.biz_phase) || '当前周期' }}
            </div>
          </template>
          <template v-else-if="column.key === 'history'">
            <a
              v-if="record.phase_history_summary || (record.phase_history && record.phase_history.length)"
              @click="openHistory(record)"
            >
              {{ record.phase_history_summary || `${record.phase_history.length} 段` }}
            </a>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'actual_rel'">
            {{ formatDate(record.actual_release_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button
                type="link"
                size="small"
                :disabled="!!record.actual_release_at"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="!!record.actual_release_at"
                @click="openExtend(record)"
              >
                续期/转阶段
              </a-button>
              <a-button
                type="link"
                size="small"
                :disabled="!!record.actual_release_at"
                @click="handleRelease(record)"
              >
                释放
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :open="visible"
      :title="editingId ? '编辑分配' : '登记分配'"
      :confirm-loading="submitting"
      destroy-on-close
      width="760px"
      @ok="submit"
      @cancel="visible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-alert
          type="info"
          show-icon
          style="margin-bottom: 12px"
          message="先选客户，再选开通单/试用单/合同；关联字段会自动带出，无需手填 ID"
        />
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="客户" name="customer_id">
              <OpsCustomerSelect
                v-model="form.customer_id"
                :disabled="!!editingId"
                @change="onCustomerChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="物理服务器" name="server_code">
              <a-select
                v-model:value="form.server_code"
                show-search
                :options="serverOptions"
                placeholder="选择服务器"
                option-filter-prop="label"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="租赁粒度" name="lease_mode">
              <a-select v-model:value="form.lease_mode" :options="OpsComputeLeaseModeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="实际分配卡数" name="allocated_gpus">
              <a-input-number v-model:value="form.allocated_gpus" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="form.lease_mode === 'gpu_pool'" label="卡/分区ID" name="partition_id">
          <a-input v-model:value="form.partition_id" placeholder="按卡必填" />
        </a-form-item>

        <a-divider orientation="left" style="margin: 8px 0 16px">业务关联（选其一即可互相关联）</a-divider>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="正式开通单">
              <a-select
                v-model:value="form.activation_id"
                allow-clear
                show-search
                :disabled="!form.customer_id"
                :loading="bizLoading"
                :placeholder="form.customer_id ? '选择开通单' : '请先选择客户'"
                :options="activationOptions"
                option-filter-prop="label"
                @change="onActivationChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="试用单">
              <a-select
                v-model:value="form.trial_id"
                allow-clear
                show-search
                :disabled="!form.customer_id"
                :loading="bizLoading"
                :placeholder="form.customer_id ? '选择试用单' : '请先选择客户'"
                :options="trialOptions"
                option-filter-prop="label"
                @change="onTrialChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="合同">
              <a-select
                v-model:value="form.contract_id"
                allow-clear
                show-search
                :disabled="!form.customer_id"
                :loading="bizLoading"
                :placeholder="form.customer_id ? '选择合同' : '请先选择客户'"
                :options="contractOptions"
                option-filter-prop="label"
                @change="onContractChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="合同编号">
              <a-input v-model:value="form.contract_no" placeholder="选合同/开通单后自动带出" readonly />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="开通申请单号">
              <a-input v-model:value="form.apply_no" placeholder="选开通单/试用单后自动带出" readonly />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="执行人">
              <a-input v-model:value="form.executor_name" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="首次开通日" name="opened_at">
              <a-date-picker
                v-model:value="form.opened_at"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="当前周期截止">
              <a-date-picker
                v-model:value="form.plan_release_at"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="releaseVisible"
      title="释放算力（真正下机）"
      :confirm-loading="releaseSubmitting"
      destroy-on-close
      @ok="submitRelease"
      @cancel="releaseVisible = false"
    >
      <a-alert
        type="warning"
        show-icon
        style="margin-bottom: 12px"
        :message="`确认释放 ${releaseTarget?.record_no || ''}？仅真正下机时使用；转正/续签请用「续期/转阶段」。释放后不再占用容量。`"
      />
      <a-form layout="vertical">
        <a-form-item label="变更单号" required>
          <a-input v-model:value="releaseForm.change_ticket_no" placeholder="变更/工单号" />
        </a-form-item>
        <a-form-item label="释放说明" required>
          <a-textarea v-model:value="releaseForm.remark" :rows="3" placeholder="请说明释放原因与佐证位置" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="extendVisible"
      title="续期 / 转阶段"
      :confirm-loading="extendSubmitting"
      destroy-on-close
      width="560px"
      @ok="submitExtend"
      @cancel="extendVisible = false"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="同一物理占用可连续测试→正式→续签。续签可沿用原合同，也可换绑新合同；履历会按段保留各份合同编号。"
      />
      <a-form layout="vertical">
        <a-form-item label="商业阶段" required>
          <a-select v-model:value="extendForm.biz_phase" :options="OpsComputeBizPhaseOptions" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="新阶段开始日">
              <a-date-picker
                v-model:value="extendForm.period_start_at"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                style="width: 100%"
                placeholder="默认今天"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="新周期截止日" required>
              <a-date-picker
                v-model:value="extendForm.plan_release_at"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="合同处理" required>
          <a-radio-group v-model:value="extendForm.contract_mode">
            <a-radio value="keep">沿用当前合同</a-radio>
            <a-radio value="new">关联新合同</a-radio>
          </a-radio-group>
        </a-form-item>
        <template v-if="extendForm.contract_mode === 'keep'">
          <a-form-item label="当前合同">
            <a-input
              :value="extendTarget?.contract_no || '（暂无合同编号）'"
              disabled
            />
          </a-form-item>
        </template>
        <template v-else>
          <a-form-item label="选择已有合同">
            <a-select
              v-model:value="extendForm.contract_id"
              allow-clear
              show-search
              :options="extendContractOptions"
              :loading="extendContractLoading"
              placeholder="可选：从客户合同中选择"
              option-filter-prop="label"
              @change="onExtendContractPick"
            />
          </a-form-item>
          <a-form-item label="新合同编号" required>
            <a-input
              v-model:value="extendForm.contract_no"
              placeholder="必填：续签合同编号"
            />
          </a-form-item>
        </template>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="租赁粒度">
              <a-select
                v-model:value="extendForm.lease_mode"
                allow-clear
                :options="OpsComputeLeaseModeOptions"
                placeholder="可不改"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="变更单号">
              <a-input v-model:value="extendForm.change_ticket_no" placeholder="可选" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="变更说明">
          <a-textarea
            v-model:value="extendForm.remark"
            :rows="2"
            placeholder="如：正式转续签1年 / 续签换新合同 HT-xxx"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      :open="historyVisible"
      title="阶段履历"
      :footer="null"
      destroy-on-close
      width="640px"
      @cancel="historyVisible = false"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        :message="`${historyTarget?.record_no || ''} · 同一物理占用上的测试→正式→续签时间线`"
      />
      <a-timeline v-if="historyTarget?.phase_history?.length">
        <a-timeline-item
          v-for="(seg, idx) in historyTarget.phase_history"
          :key="idx"
          :color="idx === (historyTarget.phase_history.length - 1) ? 'blue' : 'gray'"
        >
          <div>
            <strong>{{ phaseLabel(seg.phase) || seg.phase }}</strong>
            <span class="muted" style="margin-left: 8px">
              {{ formatDate(seg.start_at) }} ~ {{ formatDate(seg.end_at) }}
            </span>
          </div>
          <div class="muted" v-if="seg.contract_no || seg.contract_id">
            合同 {{ seg.contract_no || `#${seg.contract_id}` }}
          </div>
          <div class="muted" v-if="seg.lease_mode">
            {{ leaseLabel(seg.lease_mode) }}
            <template v-if="seg.allocated_gpus"> · {{ seg.allocated_gpus }} 卡</template>
          </div>
          <div v-if="seg.note">{{ seg.note }}</div>
        </a-timeline-item>
      </a-timeline>
      <a-empty v-else description="暂无阶段履历" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal, type FormInstance } from 'ant-design-vue';

import {
  createOpsComputeAllocation,
  deleteOpsComputeAllocation,
  extendOpsComputeAllocation,
  listOpsComputeAllocation,
  listOpsComputeAsset,
  releaseOpsComputeAllocation,
  updateOpsComputeAllocation,
  type OpsComputeAllocation,
} from '#/api/core/ops/compute';
import { listOpsActivation } from '#/api/core/ops/activation';
import { listOpsContract } from '#/api/core/ops/contract';
import { listOpsTrial } from '#/api/core/ops/trial';
import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import {
  OpsComputeBizPhaseOptions,
  OpsComputeGPUModelOptions,
  OpsComputeLeaseModeOptions,
  OpsComputeLifeStatusOptions,
} from '#/views/ops/constants/options';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const bizLoading = ref(false);
const list = ref<OpsComputeAllocation[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(10);
const search = ref('');
const lifeFilter = ref<string>();
const gpuFilter = ref<string>();
const overbookOnly = ref(false);
const customerFilter = ref<number | null>(null);
const visible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const serverOptions = ref<{ label: string; value: string }[]>([]);
const releaseVisible = ref(false);
const releaseSubmitting = ref(false);
const releaseTarget = ref<OpsComputeAllocation | null>(null);
const releaseForm = reactive({
  change_ticket_no: '',
  remark: '',
});
const extendVisible = ref(false);
const extendSubmitting = ref(false);
const extendTarget = ref<OpsComputeAllocation | null>(null);
const extendForm = reactive({
  biz_phase: 'formal' as string,
  period_start_at: undefined as string | undefined,
  plan_release_at: undefined as string | undefined,
  lease_mode: undefined as string | undefined,
  contract_mode: 'keep' as 'keep' | 'new',
  contract_id: undefined as number | undefined,
  contract_no: '',
  change_ticket_no: '',
  remark: '',
});
const extendContractLoading = ref(false);
const extendContractOptions = ref<{ label: string; value: number; raw: any }[]>([]);
const historyVisible = ref(false);
const historyTarget = ref<OpsComputeAllocation | null>(null);
const activationOptions = ref<{ label: string; value: number; raw: any }[]>([]);
const trialOptions = ref<{ label: string; value: number; raw: any }[]>([]);
const contractOptions = ref<{ label: string; value: number; raw: any }[]>([]);
const activations = ref<any[]>([]);
const trials = ref<any[]>([]);
const contracts = ref<any[]>([]);
let linking = false;

const form = reactive<Record<string, any>>({
  customer_id: null,
  server_code: undefined,
  lease_mode: 'full',
  allocated_gpus: 1,
  partition_id: '',
  activation_id: undefined,
  trial_id: undefined,
  contract_id: undefined,
  contract_no: '',
  opened_at: undefined,
  plan_release_at: undefined,
  apply_no: '',
  executor_name: '',
  remark: '',
});

const rules = {
  customer_id: [{ required: true, message: '请选择客户' }],
  server_code: [{ required: true, message: '请选择服务器' }],
  lease_mode: [{ required: true, message: '请选择租赁粒度' }],
  allocated_gpus: [{ required: true, message: '请填写分配卡数' }],
  opened_at: [{ required: true, message: '请填写开通日' }],
};

const columns = [
  { title: '记录ID', dataIndex: 'record_no', key: 'record_no', width: 170 },
  { title: '服务器', dataIndex: 'server_code', key: 'server_code', width: 120 },
  { title: 'GPU', dataIndex: 'gpu_model', key: 'gpu_model', width: 100 },
  { title: '租赁', key: 'lease', width: 110 },
  { title: '当前阶段', key: 'phase', width: 80 },
  { title: '分配卡数', dataIndex: 'allocated_gpus', key: 'allocated_gpus', width: 90 },
  { title: '卡/分区', dataIndex: 'partition_id', key: 'partition_id', width: 100 },
  { title: '客户', key: 'customer', width: 140 },
  { title: '当前合同', dataIndex: 'contract_no', key: 'contract_no', width: 130 },
  { title: '合同链条', dataIndex: 'contract_trail_summary', key: 'contract_trail', width: 180, ellipsis: true },
  { title: '首次开通', key: 'opened', width: 120 },
  { title: '当前周期', key: 'period', width: 200 },
  { title: '阶段履历', key: 'history', width: 280, ellipsis: true },
  { title: '实际释放', key: 'actual_rel', width: 110 },
  { title: '状态', key: 'life', width: 110 },
  { title: '容量', key: 'capacity', width: 150 },
  { title: '佐证', key: 'evidence', width: 140 },
  { title: '操作', key: 'action', width: 280, fixed: 'right' as const },
];

const pagination = computed(() => ({
  current: page.value,
  pageSize: size.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function leaseLabel(v?: string) {
  return OpsComputeLeaseModeOptions.find((i) => i.value === v)?.label || v || '-';
}

function phaseLabel(v?: string) {
  return OpsComputeBizPhaseOptions.find((i) => i.value === v)?.label || v || '';
}
function formatDate(v?: string) {
  if (!v) return '-';
  return String(v).slice(0, 10);
}
/** 后端 *time.Time 需要 RFC3339；兼容 YYYY-MM-DD */
function toAPITime(v?: string | null) {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s || s === '-') return undefined;
  if (s.includes('T')) return s;
  return `${s.slice(0, 10)}T00:00:00Z`;
}
function toDate(v?: string | null) {
  return toAPITime(v);
}
function goCustomer(id?: number) {
  if (!id) return;
  router.push(`/ops/customers/detail/${id}`);
}
function goActivation(record: OpsComputeAllocation) {
  router.push({ path: '/ops/contracts', query: { tab: 'activation', customer_id: String(record.customer_id) } });
}
function goTrial(record: OpsComputeAllocation) {
  router.push({ path: '/ops/trials', query: { customer_id: String(record.customer_id) } });
}

async function loadServers() {
  const res: any = await listOpsComputeAsset({ page: 1, size: 100 });
  serverOptions.value = (res?.items || []).map((i: any) => ({
    label: `${i.server_code} (${i.gpu_model}${i.gpu_count != null ? '/' + i.gpu_count + '卡' : ''})`,
    value: i.server_code,
  }));
}

async function loadBizOptions(customerId?: number | null, keepSelection = false) {
  if (!customerId) {
    activations.value = [];
    trials.value = [];
    contracts.value = [];
    activationOptions.value = [];
    trialOptions.value = [];
    contractOptions.value = [];
    if (!keepSelection) clearBizLinks();
    return;
  }
  bizLoading.value = true;
  try {
    const [actRes, trialRes, contractRes]: any[] = await Promise.all([
      listOpsActivation({ page: 1, size: 50, customer_id: customerId }),
      listOpsTrial({ page: 1, size: 50, customer_id: customerId }),
      listOpsContract({ page: 1, size: 50, customer_id: customerId }),
    ]);
    activations.value = actRes?.items || [];
    trials.value = trialRes?.items || [];
    contracts.value = contractRes?.items || [];
    activationOptions.value = activations.value.map((i) => ({
      value: i.id,
      label: `#${i.id} ${i.title || '开通单'}${i.order_no ? ' · ' + i.order_no : ''}${i.contract_no ? ' · ' + i.contract_no : ''}`,
      raw: i,
    }));
    trialOptions.value = trials.value.map((i) => ({
      value: i.id,
      label: `#${i.id} ${i.title || '试用单'}${i.order_no ? ' · ' + i.order_no : ''}`,
      raw: i,
    }));
    contractOptions.value = contracts.value.map((i) => ({
      value: i.id,
      label: `#${i.id} ${i.title || '合同'}${i.contract_no ? ' · ' + i.contract_no : ''} · ${i.type || ''}`,
      raw: i,
    }));
  } finally {
    bizLoading.value = false;
  }
}

function clearBizLinks() {
  form.activation_id = undefined;
  form.trial_id = undefined;
  form.contract_id = undefined;
  form.contract_no = '';
  form.apply_no = '';
}

function applyDatesFrom(src: any, force = false) {
  const start = toDate(src?.contract_start_at || src?.start_at || src?.activated_at || src?.plan_start_at);
  const end = toDate(src?.contract_end_at || src?.end_at || src?.plan_end_at);
  if (start && (force || !form.opened_at)) form.opened_at = start;
  if (end && (force || !form.plan_release_at)) form.plan_release_at = end;
}

function applyFromActivation(id?: number | null, forceDates = false) {
  if (!id) return;
  const act = activations.value.find((i) => i.id === id);
  if (!act) return;
  linking = true;
  form.activation_id = act.id;
  form.apply_no = act.order_no || `ACT-${act.id}`;
  if (act.contract_no) form.contract_no = act.contract_no;
  if (act.contract_id) {
    form.contract_id = act.contract_id;
    const c = contracts.value.find((i) => i.id === act.contract_id);
    if (c) {
      if (c.contract_no) form.contract_no = c.contract_no;
      if (c.trial_id) form.trial_id = c.trial_id;
      applyDatesFrom(c, forceDates);
    }
  }
  applyDatesFrom(act, forceDates);
  linking = false;
}

function applyFromTrial(id?: number | null, forceDates = false) {
  if (!id) return;
  const trial = trials.value.find((i) => i.id === id);
  if (!trial) return;
  linking = true;
  form.trial_id = trial.id;
  form.apply_no = trial.order_no || `TRL-${trial.id}`;
  if (trial.contract_no) form.contract_no = trial.contract_no;
  const c = contracts.value.find((i) => i.trial_id === trial.id);
  if (c) {
    form.contract_id = c.id;
    if (c.contract_no) form.contract_no = c.contract_no;
    applyDatesFrom(c, forceDates);
    const act = activations.value.find((i) => i.contract_id === c.id);
    if (act) {
      form.activation_id = act.id;
      if (!form.apply_no || String(form.apply_no).startsWith('TRL-')) {
        form.apply_no = act.order_no || `ACT-${act.id}`;
      }
      if (act.contract_no) form.contract_no = act.contract_no;
    }
  }
  applyDatesFrom(trial, forceDates);
  linking = false;
}

function applyFromContract(id?: number | null, forceDates = false) {
  if (!id) return;
  const c = contracts.value.find((i) => i.id === id);
  if (!c) return;
  linking = true;
  form.contract_id = c.id;
  if (c.contract_no) form.contract_no = c.contract_no;
  if (c.trial_id) form.trial_id = c.trial_id;
  const act = activations.value.find((i) => i.contract_id === c.id);
  if (act) {
    form.activation_id = act.id;
    form.apply_no = act.order_no || `ACT-${act.id}`;
    if (act.contract_no) form.contract_no = act.contract_no;
    applyDatesFrom(act, forceDates);
  } else if (c.trial_id) {
    const trial = trials.value.find((i) => i.id === c.trial_id);
    if (trial) {
      form.apply_no = trial.order_no || `TRL-${trial.id}`;
      applyDatesFrom(trial, forceDates);
    }
  }
  applyDatesFrom(c, forceDates);
  linking = false;
}

async function onCustomerChange() {
  clearBizLinks();
  await loadBizOptions(form.customer_id);
  // 仅一条时自动选中，减少点选
  if (activations.value.length === 1) {
    applyFromActivation(activations.value[0].id, true);
  } else if (trials.value.length === 1 && activations.value.length === 0) {
    applyFromTrial(trials.value[0].id, true);
  } else if (contracts.value.length === 1) {
    applyFromContract(contracts.value[0].id, true);
  }
}

function onActivationChange(v?: number) {
  if (linking) return;
  if (!v) {
    form.apply_no = '';
    return;
  }
  applyFromActivation(v, true);
}

function onTrialChange(v?: number) {
  if (linking) return;
  if (!v) return;
  applyFromTrial(v, true);
}

function onContractChange(v?: number) {
  if (linking) return;
  if (!v) {
    form.contract_no = '';
    return;
  }
  applyFromContract(v, true);
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await listOpsComputeAllocation({
      page: page.value,
      size: size.value,
      search: search.value || undefined,
      life_status: lifeFilter.value || undefined,
      gpu_model: gpuFilter.value || undefined,
      overbook_only: overbookOnly.value || undefined,
      customer_id: customerFilter.value || undefined,
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

async function openCreate(preset?: Partial<Record<string, any>>) {
  editingId.value = null;
  Object.assign(form, {
    customer_id: preset?.customer_id || customerFilter.value || null,
    server_code: undefined,
    lease_mode: 'full',
    allocated_gpus: 1,
    partition_id: '',
    activation_id: undefined,
    trial_id: undefined,
    contract_id: undefined,
    contract_no: '',
    opened_at: undefined,
    plan_release_at: undefined,
    apply_no: '',
    executor_name: '',
    remark: '',
  });
  visible.value = true;
  await loadBizOptions(form.customer_id);
  if (preset?.activation_id) {
    applyFromActivation(Number(preset.activation_id), true);
  } else if (preset?.trial_id) {
    applyFromTrial(Number(preset.trial_id), true);
  } else if (preset?.contract_id) {
    applyFromContract(Number(preset.contract_id), true);
  } else if (form.customer_id) {
    if (activations.value.length === 1) applyFromActivation(activations.value[0].id, true);
    else if (trials.value.length === 1) applyFromTrial(trials.value[0].id, true);
    else if (contracts.value.length === 1) applyFromContract(contracts.value[0].id, true);
  }
}

async function openEdit(record: OpsComputeAllocation) {
  editingId.value = record.id;
  Object.assign(form, {
    customer_id: record.customer_id,
    server_code: record.server_code,
    lease_mode: record.lease_mode,
    allocated_gpus: record.allocated_gpus,
    partition_id: record.partition_id || '',
    activation_id: record.activation_id || undefined,
    trial_id: record.trial_id || undefined,
    contract_id: record.contract_id || undefined,
    contract_no: record.contract_no || '',
    opened_at: formatDate(record.opened_at) === '-' ? undefined : toAPITime(record.opened_at),
    plan_release_at: formatDate(record.plan_release_at) === '-' ? undefined : toAPITime(record.plan_release_at),
    apply_no: record.apply_no || '',
    executor_name: record.executor_name || '',
    remark: record.remark || '',
  });
  visible.value = true;
  await loadBizOptions(record.customer_id, true);
}

async function submit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (form.lease_mode === 'gpu_pool' && !String(form.partition_id || '').trim()) {
    message.error('按卡池化必须填写卡/分区ID');
    return;
  }
  if (!form.activation_id && !form.trial_id) {
    message.error('请关联正式开通单或试用单');
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      ...form,
      opened_at: toAPITime(form.opened_at),
      plan_release_at: toAPITime(form.plan_release_at),
    };
    if (editingId.value) {
      await updateOpsComputeAllocation(editingId.value, payload);
      message.success('已更新');
    } else {
      await createOpsComputeAllocation(payload);
      message.success('已登记');
    }
    visible.value = false;
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

function handleRelease(record: OpsComputeAllocation) {
  releaseTarget.value = record;
  releaseForm.change_ticket_no = '';
  releaseForm.remark = '';
  releaseVisible.value = true;
}

async function openExtend(record: OpsComputeAllocation) {
  extendTarget.value = record;
  const nextPhase =
    record.biz_phase === 'trial'
      ? 'formal'
      : record.biz_phase === 'formal' || record.biz_phase === 'renew'
        ? 'renew'
        : 'formal';
  extendForm.biz_phase = nextPhase;
  extendForm.period_start_at = undefined;
  extendForm.plan_release_at = undefined;
  extendForm.lease_mode = record.lease_mode === 'temp_test' ? 'full' : record.lease_mode;
  extendForm.contract_mode = 'keep';
  extendForm.contract_id = undefined;
  extendForm.contract_no = '';
  extendForm.change_ticket_no = '';
  extendForm.remark = '';
  extendVisible.value = true;
  await loadExtendContracts(record.customer_id);
}

async function loadExtendContracts(customerId?: number) {
  extendContractOptions.value = [];
  if (!customerId) return;
  extendContractLoading.value = true;
  try {
    const res: any = await listOpsContract({
      page: 1,
      size: 50,
      customer_id: customerId,
    });
    extendContractOptions.value = (res?.items || []).map((c: any) => ({
      value: c.id,
      label: `${c.contract_no || '无编号'} · ${c.title || c.id}`,
      raw: c,
    }));
  } catch {
    extendContractOptions.value = [];
  } finally {
    extendContractLoading.value = false;
  }
}

function onExtendContractPick(id?: number) {
  const hit = extendContractOptions.value.find((i) => i.value === id);
  if (hit?.raw?.contract_no) {
    extendForm.contract_no = hit.raw.contract_no;
  }
  if (hit?.raw?.end_at && !extendForm.plan_release_at) {
    extendForm.plan_release_at = toAPITime(hit.raw.end_at);
  }
  if (hit?.raw?.start_at && !extendForm.period_start_at) {
    extendForm.period_start_at = toAPITime(hit.raw.start_at);
  }
}

function openHistory(record: OpsComputeAllocation) {
  historyTarget.value = record;
  historyVisible.value = true;
}

async function submitExtend() {
  if (!extendTarget.value) return;
  if (!extendForm.biz_phase) {
    message.error('请选择商业阶段');
    return;
  }
  if (!extendForm.plan_release_at) {
    message.error('请填写新周期截止日');
    return;
  }
  if (extendForm.contract_mode === 'new' && !String(extendForm.contract_no || '').trim()) {
    message.error('关联新合同时请填写合同编号');
    return;
  }
  extendSubmitting.value = true;
  try {
    const payload: Record<string, any> = {
      biz_phase: extendForm.biz_phase,
      period_start_at: extendForm.period_start_at || undefined,
      plan_release_at: extendForm.plan_release_at,
      lease_mode: extendForm.lease_mode || undefined,
      change_ticket_no: extendForm.change_ticket_no || undefined,
      remark: extendForm.remark || undefined,
    };
    if (extendForm.contract_mode === 'new') {
      payload.contract_id = extendForm.contract_id || undefined;
      payload.contract_no = extendForm.contract_no;
    }
    // keep：不传合同字段，后端沿用当前合同
    await extendOpsComputeAllocation(extendTarget.value.id, payload);
    message.success('已续期/转阶段');
    extendVisible.value = false;
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '续期失败');
  } finally {
    extendSubmitting.value = false;
  }
}

async function submitRelease() {
  if (!releaseTarget.value) return;
  if (!String(releaseForm.change_ticket_no || '').trim()) {
    message.error('请填写变更单号');
    return;
  }
  if (!String(releaseForm.remark || '').trim()) {
    message.error('请填写释放说明');
    return;
  }
  releaseSubmitting.value = true;
  try {
    await releaseOpsComputeAllocation(releaseTarget.value.id, {
      change_ticket_no: releaseForm.change_ticket_no,
      remark: releaseForm.remark,
    });
    message.success('已释放');
    releaseVisible.value = false;
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '释放失败');
  } finally {
    releaseSubmitting.value = false;
  }
}

function handleDelete(record: OpsComputeAllocation) {
  Modal.confirm({
    title: `删除 ${record.record_no}？`,
    onOk: async () => {
      try {
        await deleteOpsComputeAllocation(record.id);
        message.success('已删除');
        await loadList();
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
  });
}

watch(
  () => route.query.customer_id,
  (v) => {
    if (v) customerFilter.value = Number(v) || null;
  },
  { immediate: true },
);

onMounted(async () => {
  if (route.query.customer_id) {
    customerFilter.value = Number(route.query.customer_id) || null;
  }
  await loadServers();
  await loadList();
  if (route.query.create === '1') {
    openCreate({
      customer_id: customerFilter.value,
      activation_id: route.query.activation_id ? Number(route.query.activation_id) : undefined,
      trial_id: route.query.trial_id ? Number(route.query.trial_id) : undefined,
      contract_id: route.query.contract_id ? Number(route.query.contract_id) : undefined,
    });
  }
});
</script>

<style scoped>
.ops-page { padding: 12px; }
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.muted { color: rgba(0,0,0,.45); margin-left: 6px; font-size: 12px; }
</style>

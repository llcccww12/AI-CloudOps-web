<template>
  <div class="lifecycle-node-form">
    <a-alert
      v-if="nodeKey !== 'trial_accept'"
      type="info"
      show-icon
      style="margin-bottom: 12px"
      :message="`本节点将同步写入运营台账：${nodeTitle}`"
    />

    <!-- 意向确认 -->
    <template v-if="nodeKey === 'intent'">
      <a-form-item label="意向说明" required>
        <a-textarea
          v-model:value="local.content"
          :rows="3"
          placeholder="确认客户意向、需求要点等"
        />
      </a-form-item>
      <a-form-item label="下一步计划">
        <a-input v-model:value="local.next_plan" placeholder="如：安排试用方案沟通" />
      </a-form-item>
    </template>

    <!-- 试用审批 -->
    <template v-else-if="nodeKey === 'trial'">
      <a-form-item label="试用标题" required>
        <a-input v-model:value="local.title" placeholder="试用单标题" />
      </a-form-item>
      <a-form-item label="需求类别">
        <a-select
          v-model:value="local.demand_type"
          :options="OpsDemandTypeOptions"
          allow-clear
          placeholder="选择需求类别"
        />
      </a-form-item>
      <a-form-item label="算力规模">
        <a-select
          v-model:value="local.resource_scale"
          :options="OpsResourceScaleOptions"
          allow-clear
          placeholder="选择规模"
        />
      </a-form-item>
      <a-form-item label="用途说明">
        <a-textarea v-model:value="local.purpose" :rows="2" />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="计划开始">
            <a-date-picker
              v-model:value="local.plan_start_at"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :get-popup-container="popupContainer"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计划结束">
            <a-date-picker
              v-model:value="local.plan_end_at"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :get-popup-container="popupContainer"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </template>

    <!-- 试用验收：验收结论；台账未登记时允许在本节点补登，避免开通归档空白 -->
    <template v-else-if="nodeKey === 'trial_accept'">
      <template v-if="needAcceptLedgerBackfill">
        <a-alert
          type="warning"
          show-icon
          style="margin-bottom: 12px"
          message="开通台账尚未写入试用单。若跳过「资源开通」直接验收，归档会没有产品/项目等信息，请在下方补齐后再通过。"
        />
        <a-divider orientation="left">开通台账（补登，必填）</a-divider>
        <DeliveryLedgerFields :form="local" default-open-method="trial" />
        <a-divider orientation="left">算力生命周期台账（补登，必填）</a-divider>
        <ComputeAllocFields :form="local" default-lease-mode="temp_test" />
      </template>
      <a-form-item label="验收评价" required>
        <a-textarea
          v-model:value="local.evaluation"
          :rows="3"
          placeholder="试用效果、问题与建议"
        />
      </a-form-item>
      <a-form-item label="转正意向" required>
        <a-select
          v-model:value="local.convert_intent"
          :options="OpsConvertIntentOptions"
          placeholder="选择转正意向"
        />
      </a-form-item>
    </template>

    <!-- 资源开通：开通台账 + 算力分配 + 材料 -->
    <template v-else-if="nodeKey === 'provision'">
      <a-divider orientation="left">开通台账（必填）</a-divider>
      <DeliveryLedgerFields :form="local" default-open-method="trial" />
      <a-divider orientation="left">算力生命周期台账（必填）</a-divider>
      <ComputeAllocFields :form="local" default-lease-mode="temp_test" />
      <a-alert
        type="info"
        show-icon
        style="margin-top: 8px"
        message="开通单与邮件佐证请在工单详情「开通交付材料」中上传，本节点无需重复上传"
      />
    </template>

    <!-- 正式合同 / 合同与开通：只填台账与合同要素，材料统一在工单详情上传 -->
    <template v-else-if="nodeKey === 'contract' || nodeKey === 'trial_contract'">
      <a-divider orientation="left">开通台账（必填）</a-divider>
      <DeliveryLedgerFields
        :form="local"
        :default-open-method="nodeKey === 'trial_contract' ? 'trial' : 'formal'"
      />
      <a-divider orientation="left">算力生命周期台账（必填）</a-divider>
      <ComputeAllocFields
        :form="local"
        :default-lease-mode="nodeKey === 'trial_contract' ? 'temp_test' : 'full'"
      />
      <a-divider orientation="left">合同要素</a-divider>
      <a-form-item :label="nodeKey === 'trial_contract' ? '试用合同标题' : '合同标题'" required>
        <a-input v-model:value="local.title" :placeholder="nodeKey === 'trial_contract' ? '试用合同标题' : '正式合同标题'" />
      </a-form-item>
      <a-form-item v-if="nodeKey === 'contract'" label="合同类型">
        <a-select
          v-model:value="local.type"
          :options="[
            { label: '正式合同', value: 'formal' },
            { label: '试用合同', value: 'trial' },
          ]"
        />
      </a-form-item>
      <a-form-item label="付费方式">
        <a-select v-model:value="local.payment_method" :options="OpsPaymentMethodOptions" allow-clear />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="计费模式">
            <a-select
              v-model:value="local.billing_mode"
              :options="OpsBillingModeOptions"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="计费周期">
            <a-select
              v-model:value="local.billing_cycle"
              :options="OpsBillingCycleOptions"
              allow-clear
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="单价">
            <a-input-number
              v-model:value="local.unit_price"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="账期(天)">
            <a-select
              v-model:value="local.payment_term_days"
              :options="OpsPaymentTermOptions"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="合同备注">
        <a-textarea v-model:value="local.remark" :rows="2" />
      </a-form-item>
      <a-alert
        type="info"
        show-icon
        style="margin-top: 8px"
        message="合同扫描件、开通单与邮件佐证请在工单详情「开通交付材料」中上传，审批本节点无需再传"
      />
    </template>

    <!-- 开通申请 -->
    <template v-else-if="nodeKey === 'open_request'">
      <a-form-item label="开通申请标题" required>
        <a-input v-model:value="local.title" />
      </a-form-item>
      <a-form-item label="资源摘要">
        <a-textarea v-model:value="local.resource_summary" :rows="2" />
      </a-form-item>
      <a-form-item label="用途">
        <a-textarea v-model:value="local.purpose" :rows="2" />
      </a-form-item>
    </template>

    <!-- 开通回馈 -->
    <template v-else-if="nodeKey === 'open_feedback'">
      <a-form-item label="开通账号" required>
        <a-input v-model:value="local.feedback_account" />
      </a-form-item>
      <a-form-item label="租户/项目">
        <a-input v-model:value="local.feedback_tenant" />
      </a-form-item>
      <a-form-item label="访问入口">
        <a-input v-model:value="local.feedback_endpoint" />
      </a-form-item>
      <a-form-item label="回馈说明">
        <a-textarea v-model:value="local.feedback_remark" :rows="2" />
      </a-form-item>
      <a-divider orientation="left">算力生命周期台账（必填）</a-divider>
      <ComputeAllocFields :form="local" default-lease-mode="full" />
      <a-alert
        type="info"
        show-icon
        style="margin-top: 8px"
        message="正式开通材料请到「合同与开通 → 开通归档」或客户详情「交付与佐证」上传"
      />
    </template>

    <!-- 结算确认 -->
    <template v-else-if="nodeKey === 'settlement'">
      <a-alert
        v-if="context?.latest_contract"
        type="success"
        show-icon
        style="margin-bottom: 12px"
        :message="`关联合同：${context.latest_contract.title || '#' + context.latest_contract.id}`"
      />
      <a-form-item label="结算标题" required>
        <a-input v-model:value="local.title" />
      </a-form-item>
      <a-form-item label="应结金额" required>
        <a-input-number
          v-model:value="local.amount"
          :min="0"
          style="width: 100%"
        />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="周期开始">
            <a-date-picker
              v-model:value="local.period_start"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :get-popup-container="popupContainer"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="周期结束">
            <a-date-picker
              v-model:value="local.period_end"
              style="width: 100%"
              value-format="YYYY-MM-DD"
              :get-popup-container="popupContainer"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="收款到期日">
        <a-date-picker
          v-model:value="local.due_at"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          :get-popup-container="popupContainer"
        />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="local.remark" :rows="2" />
      </a-form-item>
    </template>

    <!-- 开票 -->
    <template v-else-if="nodeKey === 'invoice'">
      <a-alert
        v-if="context?.latest_settlement"
        type="success"
        show-icon
        style="margin-bottom: 12px"
        :message="`关联结算：${context.latest_settlement.title || '#' + context.latest_settlement.id}`"
      />
      <a-form-item label="发票号">
        <a-input v-model:value="local.invoice_no" />
      </a-form-item>
      <a-form-item label="开票类型">
        <a-input v-model:value="local.invoice_type" placeholder="如：专票/普票" />
      </a-form-item>
      <a-form-item label="开票金额" required>
        <a-input-number v-model:value="local.invoice_amount" :min="0" style="width: 100%" />
      </a-form-item>
      <a-form-item label="开票日期">
        <a-date-picker
          v-model:value="local.issued_at"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          :get-popup-container="popupContainer"
        />
      </a-form-item>
    </template>

    <!-- 回款 -->
    <template v-else-if="nodeKey === 'payment'">
      <a-alert
        v-if="context?.latest_settlement"
        type="success"
        show-icon
        style="margin-bottom: 12px"
        :message="`关联结算：${context.latest_settlement.title || '#' + context.latest_settlement.id}`"
      />
      <a-form-item label="回款金额" required>
        <a-input-number v-model:value="local.amount" :min="0" style="width: 100%" />
      </a-form-item>
      <a-form-item label="到账日期">
        <a-date-picker
          v-model:value="local.paid_at"
          style="width: 100%"
          value-format="YYYY-MM-DD"
          :get-popup-container="popupContainer"
        />
      </a-form-item>
      <a-form-item label="银行流水号">
        <a-input v-model:value="local.bank_ref" />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="local.remark" :rows="2" />
      </a-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue';

import type { OpsLifecycleApproveContext } from '#/api/core/ops/customer';
import {
  OpsBillingCycleOptions,
  OpsBillingModeOptions,
  OpsConvertIntentOptions,
  OpsDemandTypeOptions,
  OpsPaymentMethodOptions,
  OpsPaymentTermOptions,
  OpsResourceScaleOptions,
} from '#/views/ops/constants/options';
import ComputeAllocFields from '#/views/workorder/components/ComputeAllocFields.vue';
import DeliveryLedgerFields from '#/views/workorder/components/DeliveryLedgerFields.vue';

const props = defineProps<{
  nodeKey: string;
  context: OpsLifecycleApproveContext | null;
  modelValue: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, any>): void;
}>();

const local = reactive<Record<string, any>>({});
let syncingFromParent = false;
let syncingFromChild = false;

const popupContainer = () => document.body;

const applyModelValue = (v: Record<string, any> | undefined) => {
  syncingFromParent = true;
  Object.keys(local).forEach((k) => delete local[k]);
  Object.assign(local, v || {});
  nextTick(() => {
    syncingFromParent = false;
  });
};

// 仅在父级整体替换时同步，避免选日期时双向 watch 把面板重置掉
watch(
  () => props.modelValue,
  (v) => {
    if (syncingFromChild) return;
    applyModelValue(v);
  },
  { immediate: true },
);

watch(
  () => props.nodeKey,
  () => {
    applyModelValue(props.modelValue);
  },
);

watch(
  local,
  () => {
    if (syncingFromParent) return;
    syncingFromChild = true;
    emit('update:modelValue', { ...local });
    nextTick(() => {
      syncingFromChild = false;
    });
  },
  { deep: true },
);

const needAcceptLedgerBackfill = computed(() => {
  if (props.nodeKey !== 'trial_accept') return false;
  const t = props.context?.latest_trial as Record<string, any> | undefined;
  if (!t) return true;
  return !(
    String(t.product_type || '').trim() &&
    String(t.project_name || '').trim() &&
    String(t.customer_short_name || '').trim() &&
    String(t.region || '').trim()
  );
});

const nodeTitle = computed(() => {
  const map: Record<string, string> = {
    intent: '跟进记录 + 客户阶段→意向',
    trial: '试用单',
    trial_contract: '试用合同 + 开通台账 + 算力台账',
    open_request: '开通申请单',
    open_feedback: '开通回馈账号 + 算力台账',
    trial_accept: needAcceptLedgerBackfill.value
      ? '开通台账补登 + 验收评价 + 转正意向'
      : '试用验收评价 + 转正意向',
    provision: '开通台账 + 算力台账',
    contract: '正式合同 + 开通台账 + 算力台账',
    settlement: '结算单（确认）',
    invoice: '发票',
    payment: '回款',
  };
  return map[props.nodeKey] || props.nodeKey;
});

function validateLedger(): string | null {
  const required: Array<[string, string]> = [
    ['customer_short_name', '客户简称'],
    ['product_type', '产品类型'],
    ['region', '所属大区'],
    ['owner_name', '归属客户经理'],
    ['main_account', '主账号'],
    ['project_name', '项目名称'],
    ['open_method', '开通方式'],
    ['contract_no', '合同编号'],
    ['order_no', '订单编号'],
    ['open_period', '开通周期'],
    ['contract_start_at', '合同开始时间'],
    ['contract_end_at', '合同结束时间'],
  ];
  for (const [key, label] of required) {
    if (!String(local[key] || '').trim()) {
      return `请填写开通台账：${label}`;
    }
  }
  return null;
}

function validateComputeAlloc(): string | null {
  if (!String(local.server_code || '').trim()) {
    return '请填写算力生命周期台账：物理服务器';
  }
  if (!String(local.lease_mode || '').trim()) {
    return '请填写算力生命周期台账：租赁粒度';
  }
  if (!(Number(local.allocated_gpus) >= 1)) {
    return '请填写算力生命周期台账：实际分配卡数';
  }
  if (local.lease_mode === 'gpu_pool' && !String(local.partition_id || '').trim()) {
    return '请填写算力生命周期台账：卡/分区ID';
  }
  if (!String(local.opened_at || '').trim()) {
    return '请填写算力生命周期台账：实际开通日';
  }
  return null;
}

function validate(): string | null {
  switch (props.nodeKey) {
    case 'intent':
      if (!String(local.content || '').trim()) return '请填写意向说明';
      break;
    case 'trial':
      if (!String(local.title || '').trim()) return '请填写试用标题';
      break;
    case 'trial_contract':
    case 'contract': {
      const ledgerErr = validateLedger();
      if (ledgerErr) return ledgerErr;
      const allocErr = validateComputeAlloc();
      if (allocErr) return allocErr;
      if (!String(local.title || '').trim()) return '请填写合同标题';
      break;
    }
    case 'provision': {
      const ledgerErr = validateLedger();
      if (ledgerErr) return ledgerErr;
      return validateComputeAlloc();
    }
    case 'open_request':
      if (!String(local.title || '').trim()) return '请填写开通申请标题';
      break;
    case 'open_feedback': {
      if (!String(local.feedback_account || '').trim()) return '请填写开通账号';
      return validateComputeAlloc();
    }
    case 'trial_accept': {
      if (needAcceptLedgerBackfill.value) {
        const ledgerErr = validateLedger();
        if (ledgerErr) return ledgerErr;
        const allocErr = validateComputeAlloc();
        if (allocErr) return allocErr;
      }
      if (!String(local.evaluation || '').trim()) return '请填写验收评价';
      if (!local.convert_intent) return '请选择转正意向';
      break;
    }
    case 'settlement':
      if (!String(local.title || '').trim()) return '请填写结算标题';
      if (!(Number(local.amount) >= 0) || local.amount === undefined || local.amount === null) {
        return '请填写应结金额';
      }
      break;
    case 'invoice':
      if (!(Number(local.invoice_amount) > 0)) return '请填写开票金额';
      break;
    case 'payment':
      if (!(Number(local.amount) > 0)) return '请填写回款金额';
      break;
  }
  return null;
}

defineExpose({ validate, getPayload: () => ({ ...local }) });
</script>

<style scoped>
.lifecycle-node-form {
  margin-bottom: 8px;
}
</style>

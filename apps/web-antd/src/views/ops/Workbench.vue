<template>
  <div class="ops-page">
    <a-page-header title="运营工作台" sub-title="每日简报：该盯的客户与事项">
      <template #extra>
        <a-space>
          <a-select v-model:value="withinDays" style="width: 140px" @change="loadBriefing">
            <a-select-option :value="3">近 3 天</a-select-option>
            <a-select-option :value="7">近 7 天</a-select-option>
            <a-select-option :value="14">近 14 天</a-select-option>
          </a-select>
          <a-checkbox v-model:checked="mineOnly" @change="loadBriefing">仅看我负责的</a-checkbox>
          <a-button :loading="loading" @click="loadBriefing">刷新</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 16px"
      message="简报基于台账规则自动汇总（试用/合同到期、结算逾期、低满意度、不续费待闭环）。可一键生成提醒文案，确认后再到提醒中心发送。"
    />

    <a-row :gutter="12" class="mb16">
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small"><a-statistic title="合计事项" :value="summary.total" /></a-card>
      </a-col>
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small"><a-statistic title="试用将到期" :value="summary.trial_expiring" /></a-card>
      </a-col>
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small"><a-statistic title="合同将到期" :value="summary.contract_expiring" /></a-card>
      </a-col>
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small"><a-statistic title="结算将到期" :value="summary.settlement_due_soon" /></a-card>
      </a-col>
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small"><a-statistic title="结算已逾期" :value="summary.settlement_overdue" /></a-card>
      </a-col>
      <a-col :xs="12" :sm="8" :md="4">
        <a-card size="small">
          <a-statistic
            title="低满意度 / 不续费"
            :value="(summary.survey_low_score || 0) + (summary.non_renewal_pending || 0)"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-card title="今日必盯" size="small">
      <a-table
        :data-source="items"
        :columns="columns"
        :loading="loading"
        row-key="rowKey"
        bordered
        :pagination="{ pageSize: 15 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'severity'">
            <a-tag :color="severityColor(record.severity)">{{ severityLabel(record.severity) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'type'">
            {{ typeLabel(record.type) }}
          </template>
          <template v-else-if="column.key === 'due_at'">
            {{ formatTime(record.due_at) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="goRef(record)">查看</a-button>
              <a-button type="link" size="small" @click="openDraft(record)">生成文案</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <div v-if="briefing?.generated_at" class="muted">
        生成于 {{ formatTime(briefing.generated_at) }} · 窗口 {{ briefing.within_days }} 天
      </div>
    </a-card>

    <a-modal
      :open="draftVisible"
      title="提醒文案草稿"
      :confirm-loading="draftLoading"
      ok-text="复制正文"
      @ok="copyDraft"
      @cancel="draftVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="渠道">
          <a-select v-model:value="draftChannel" @change="regenDraft">
            <a-select-option value="inbox">站内信</a-select-option>
            <a-select-option value="feishu">飞书</a-select-option>
            <a-select-option value="sms">短信</a-select-option>
            <a-select-option value="email">邮件</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标题">
          <a-input v-model:value="draftSubject" />
        </a-form-item>
        <a-form-item label="正文">
          <a-textarea v-model:value="draftBody" :rows="6" />
        </a-form-item>
        <a-alert v-if="draftHint" type="info" show-icon :message="draftHint" />
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

import {
  createOpsReminderDraft,
  getOpsWorkbenchBriefing,
  type OpsRiskItem,
  type OpsWorkbenchBriefing,
} from '#/api/core/ops/workbench';

const router = useRouter();
const loading = ref(false);
const withinDays = ref(7);
const mineOnly = ref(true);
const briefing = ref<OpsWorkbenchBriefing | null>(null);

const draftVisible = ref(false);
const draftLoading = ref(false);
const draftChannel = ref('inbox');
const draftSubject = ref('');
const draftBody = ref('');
const draftHint = ref('');
const draftItem = ref<OpsRiskItem | null>(null);

const summary = computed(
  () =>
    briefing.value?.summary || {
      total: 0,
      trial_expiring: 0,
      contract_expiring: 0,
      settlement_due_soon: 0,
      settlement_overdue: 0,
      survey_low_score: 0,
      non_renewal_pending: 0,
    },
);

const items = computed(() =>
  (briefing.value?.items || []).map((it, idx) => ({
    ...it,
    rowKey: `${it.type}-${it.biz_id}-${it.customer_id}-${idx}`,
  })),
);

const columns = [
  { title: '级别', key: 'severity', width: 90 },
  { title: '类型', key: 'type', width: 120 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
  { title: '事项', dataIndex: 'title', key: 'title', width: 140 },
  { title: '说明', dataIndex: 'summary', key: 'summary', ellipsis: true },
  { title: '建议', dataIndex: 'suggestion', key: 'suggestion', ellipsis: true, width: 180 },
  { title: '截止', key: 'due_at', width: 160 },
  { title: '负责人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];

function typeLabel(t: string) {
  const map: Record<string, string> = {
    trial_expiring: '试用到期',
    contract_expiring: '合同到期',
    settlement_due_soon: '结算将到期',
    settlement_overdue: '结算逾期',
    survey_low_score: '低满意度',
    non_renewal_pending: '不续费待闭环',
  };
  return map[t] || t;
}

function severityLabel(s: string) {
  return ({ high: '高', medium: '中', low: '低' } as Record<string, string>)[s] || s;
}

function severityColor(s: string) {
  return ({ high: 'red', medium: 'orange', low: 'blue' } as Record<string, string>)[s] || 'default';
}

function formatTime(v?: string | null) {
  if (!v) return '-';
  return new Date(v).toLocaleString('zh-CN');
}

function goRef(record: OpsRiskItem) {
  if (record.ref_path) {
    router.push(record.ref_path);
    return;
  }
  if (record.customer_id) {
    router.push(`/ops/customers/detail/${record.customer_id}`);
  }
}

async function loadBriefing() {
  loading.value = true;
  try {
    briefing.value = await getOpsWorkbenchBriefing({
      within_days: withinDays.value,
      mine_only: mineOnly.value,
    });
  } catch (e: any) {
    message.error(e?.message || '加载简报失败');
  } finally {
    loading.value = false;
  }
}

async function openDraft(record: OpsRiskItem) {
  draftItem.value = record;
  draftChannel.value = 'inbox';
  draftVisible.value = true;
  await regenDraft();
}

async function regenDraft() {
  if (!draftItem.value) return;
  draftLoading.value = true;
  try {
    const res = await createOpsReminderDraft({
      type: draftItem.value.draft_hint || draftItem.value.type,
      channel: draftChannel.value,
      customer_id: draftItem.value.customer_id,
      customer_name: draftItem.value.customer_name,
      title: draftItem.value.title,
      summary: draftItem.value.summary,
      suggestion: draftItem.value.suggestion,
      biz_type: draftItem.value.biz_type,
      biz_id: draftItem.value.biz_id,
      due_at: draftItem.value.due_at || '',
    });
    draftSubject.value = res.subject || '';
    draftBody.value = res.body || '';
    draftHint.value = `${res.source === 'llm' ? '智能润色' : '模板生成'} · ${res.hint || ''}`;
  } catch (e: any) {
    message.error(e?.message || '生成文案失败');
  } finally {
    draftLoading.value = false;
  }
}

async function copyDraft() {
  const text = `${draftSubject.value}\n\n${draftBody.value}`.trim();
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制，可粘贴到提醒中心或飞书发送');
    draftVisible.value = false;
  } catch {
    message.info(text);
  }
}

onMounted(loadBriefing);
</script>

<style scoped>
.ops-page {
  padding: 12px;
}
.mb16 {
  margin-bottom: 16px;
}
.muted {
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 12px;
}
</style>

<template>
  <div class="inspection-findings">
    <div class="findings-toolbar">
      <a-radio-group v-model:value="severityFilter" size="small" button-style="solid">
        <a-radio-button value="all">全部 {{ findings.length }}</a-radio-button>
        <a-radio-button value="high">高危 {{ highCount }}</a-radio-button>
        <a-radio-button value="medium">中危 {{ mediumCount }}</a-radio-button>
        <a-radio-button value="low">低危 {{ lowCount }}</a-radio-button>
      </a-radio-group>
    </div>

    <a-table
      :row-key="rowKey"
      :columns="columns"
      :data-source="filteredFindings"
      :pagination="{ pageSize: 8 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'severity'">
          <a-tag :color="severityColor(record.severity)">{{ severityLabel(record.severity) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'resource'">
          <div class="res-name">{{ resourceName(record) }}</div>
          <div class="res-meta">{{ resourceMeta(record) }}</div>
        </template>
        <template v-else-if="column.key === 'problem'">
          <div class="problem-title">{{ record.title }}</div>
          <div class="problem-desc">{{ record.description }}</div>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button
              v-for="action in record.next_actions || []"
              :key="action.type"
              type="link"
              size="small"
              @click="goAction(action)"
            >
              {{ action.label }}
            </a-button>
          </a-space>
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <div class="finding-detail">
          <div v-if="record.recommendations?.length">
            <div class="detail-label">建议</div>
            <ul>
              <li v-for="item in record.recommendations" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div v-if="record.evidence?.length">
            <div class="detail-label">证据</div>
            <ul>
              <li v-for="(item, index) in record.evidence" :key="index">
                {{ formatEvidence(item) }}
              </li>
            </ul>
          </div>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { InspectionFinding, InspectionNextAction } from '#/api/core/aiops/inspection';

const props = defineProps<{
  findings: InspectionFinding[];
  clusterId?: number;
}>();

const router = useRouter();
const severityFilter = ref<'all' | 'high' | 'medium' | 'low'>('all');

const highCount = computed(() => props.findings.filter((item) => item.severity === 'high').length);
const mediumCount = computed(
  () => props.findings.filter((item) => item.severity === 'medium').length,
);
const lowCount = computed(() => props.findings.filter((item) => item.severity === 'low').length);

const filteredFindings = computed(() => {
  if (severityFilter.value === 'all') {
    return props.findings;
  }
  return props.findings.filter((item) => item.severity === severityFilter.value);
});

const columns = [
  { title: '级别', key: 'severity', width: 80 },
  { title: '资源', key: 'resource', width: 220 },
  { title: '问题', key: 'problem' },
  { title: '下一步', key: 'action', width: 220 },
];

function rowKey(record: InspectionFinding, index: number) {
  return record.finding_id || `${record.rule_id}-${resourceName(record)}-${index}`;
}

function severityColor(level: string) {
  if (level === 'high') return 'red';
  if (level === 'medium') return 'orange';
  return 'blue';
}

function severityLabel(level: string) {
  if (level === 'high') return '高危';
  if (level === 'medium') return '中危';
  return '低危';
}

function resourceName(record: InspectionFinding) {
  const res = record.resource || {};
  return String(res.name || res.workload || '-');
}

function resourceMeta(record: InspectionFinding) {
  const res = record.resource || {};
  const kind = String(res.type || 'object');
  const ns = String(res.namespace || '');
  const workload = res.workload && res.workload !== res.name ? String(res.workload) : '';
  return [kind, ns, workload].filter(Boolean).join(' / ');
}

function formatEvidence(item: Record<string, any>) {
  const type = item.type || 'info';
  const reason = item.reason || item.phase || '';
  const message = item.message || '';
  if (type === 'endpoints') {
    const pods = (item.matched_pods || [])
      .map((pod: Record<string, any>) => `${pod.name}(${pod.phase || '-'})`)
      .join(', ');
    const selector = item.selector
      ? Object.entries(item.selector)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')
      : '-';
    return `选择器 ${selector}${pods ? `；匹配 Pod: ${pods}` : '；未匹配到 Pod'}`;
  }
  return [type, reason, message].filter(Boolean).join(' · ');
}

function goAction(action: InspectionNextAction) {
  const query = { ...(action.query || {}) };
  if (props.clusterId) {
    query.clusterId = String(props.clusterId);
  }
  if (action.type === 'autofix') {
    router.push({ path: '/autofix/workflow', query });
    return;
  }
  router.push({ path: '/rca/analysis', query });
}
</script>

<style scoped>
.findings-toolbar {
  margin-bottom: 12px;
}

.res-name,
.problem-title {
  font-weight: 500;
}

.res-meta,
.problem-desc {
  margin-top: 2px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  line-height: 1.4;
}

.problem-desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.finding-detail {
  display: grid;
  gap: 8px;
  padding: 4px 8px;
}

.detail-label {
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.65);
  font-weight: 500;
}

.finding-detail ul {
  margin: 0;
  padding-left: 18px;
}
</style>

<template>
  <div class="compute-dash">
    <div class="compute-dash__head">
      <div>
        <div class="compute-dash__eyebrow">CacOps · 算力交付</div>
        <h2 class="compute-dash__title">容量看板</h2>
        <p class="compute-dash__sub">
          按 GPU 型号看池化占用 · 未释放即占容 · 超配与缺佐证一眼可见
        </p>
      </div>
      <a-space wrap>
        <a-button type="primary" @click="$router.push('/ops/compute/allocations')">
          生命周期台账
        </a-button>
        <a-button @click="$router.push('/ops/compute/assets')">算力资产</a-button>
        <a-button :loading="loading" @click="load">刷新</a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <a-row :gutter="[12, 12]" class="metric-row">
        <a-col v-for="item in metricCards" :key="item.key" :xs="12" :sm="8" :md="6" :lg="4">
          <div class="metric-card" :class="item.tone">
            <div class="metric-card__label">{{ item.label }}</div>
            <div class="metric-card__value">{{ item.value }}</div>
            <div v-if="item.hint" class="metric-card__hint">{{ item.hint }}</div>
          </div>
        </a-col>
      </a-row>

      <a-alert
        v-if="(dashboard?.overbook_count || 0) > 0"
        type="error"
        show-icon
        class="dash-alert"
        :message="`存在 ${dashboard?.overbook_count} 台服务器超配，请到生命周期台账按服务器核对占用卡数。`"
      />
      <a-alert
        v-else-if="(dashboard?.missing_evidence || 0) > 0"
        type="warning"
        show-icon
        class="dash-alert"
        :message="`有 ${dashboard?.missing_evidence} 条未释放记录缺开通佐证，请补齐开通单/邮件材料。`"
      />

      <a-row :gutter="[12, 12]">
        <a-col :xs="24" :lg="10">
          <a-card class="chart-card" title="整体利用率" size="small">
            <div ref="utilChartRef" class="chart-box chart-box--donut" />
            <div class="util-legend">
              <div>
                <span class="dot used" />已占用
                <strong>{{ dashboard?.used_gpus ?? 0 }}</strong> 卡
              </div>
              <div>
                <span class="dot free" />可用
                <strong>{{ dashboard?.available_gpus ?? 0 }}</strong> 卡
              </div>
              <div class="util-rate">
                利用率
                <strong>{{ utilizationRate }}%</strong>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="14">
          <a-card class="chart-card" title="分型号容量（总/占用/可用）" size="small">
            <div ref="modelChartRef" class="chart-box chart-box--bar" />
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[12, 12]" style="margin-top: 12px">
        <a-col :xs="24" :lg="10">
          <a-card class="chart-card" title="台账生命周期分布" size="small">
            <div ref="lifeChartRef" class="chart-box chart-box--donut" />
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="14">
          <a-card class="chart-card" title="型号明细" size="small">
            <a-table
              :data-source="modelRows"
              :columns="modelColumns"
              row-key="gpu_model"
              bordered
              size="small"
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'usage'">
                  <div class="usage-cell">
                    <a-progress
                      :percent="record.usageRate"
                      :status="record.overbook_count > 0 ? 'exception' : 'active'"
                      size="small"
                      :show-info="true"
                    />
                  </div>
                </template>
                <template v-else-if="column.key === 'overbook'">
                  <a-tag :color="record.overbook_count > 0 ? 'red' : 'green'">
                    {{ record.overbook_count > 0 ? `${record.overbook_count} 台超配` : '正常' }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';

import { getOpsComputeDashboard, type OpsComputeDashboard } from '#/api/core/ops/compute';

echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

const loading = ref(false);
const dashboard = ref<OpsComputeDashboard | null>(null);
const utilChartRef = ref<HTMLDivElement | null>(null);
const modelChartRef = ref<HTMLDivElement | null>(null);
const lifeChartRef = ref<HTMLDivElement | null>(null);

let utilChart: EChartsType | null = null;
let modelChart: EChartsType | null = null;
let lifeChart: EChartsType | null = null;

const COLOR = {
  used: '#0f766e',
  free: '#94a3b8',
  pendingOpen: '#0284c7',
  pendingRel: '#d97706',
  inUse: '#0f766e',
  overbook: '#dc2626',
  axis: '#64748b',
  split: '#e2e8f0',
};

const metricCards = computed(() => {
  const d = dashboard.value;
  return [
    {
      key: 'assets',
      label: '资产总台数',
      value: d?.asset_total ?? 0,
      hint: '物理服务器',
      tone: '',
    },
    {
      key: 'total',
      label: '总 GPU 卡',
      value: d?.total_gpus ?? 0,
      hint: '已核验容量',
      tone: '',
    },
    {
      key: 'used',
      label: '已占用卡',
      value: d?.used_gpus ?? 0,
      hint: '未释放均计入',
      tone: 'tone-teal',
    },
    {
      key: 'free',
      label: '可用卡',
      value: d?.available_gpus ?? 0,
      hint: '可新分配',
      tone: 'tone-slate',
    },
    {
      key: 'pending',
      label: '到期待处理',
      value: d?.pending_release ?? 0,
      hint: '可续签或释放，仍占容量',
      tone: 'tone-amber',
    },
    {
      key: 'risk',
      label: '超配 / 缺佐证',
      value: `${d?.overbook_count ?? 0} / ${d?.missing_evidence ?? 0}`,
      hint: '需优先处理',
      tone: (d?.overbook_count || d?.missing_evidence) ? 'tone-danger' : '',
    },
  ];
});

const utilizationRate = computed(() => {
  const total = Number(dashboard.value?.total_gpus || 0);
  const used = Number(dashboard.value?.used_gpus || 0);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 1000) / 10);
});

const modelRows = computed(() =>
  (dashboard.value?.by_model || []).map((m) => {
    const total = Number(m.total_gpus || 0);
    const used = Number(m.used_gpus || 0);
    return {
      ...m,
      usageRate: total > 0 ? Math.min(100, Math.round((used / total) * 1000) / 10) : 0,
    };
  }),
);

const modelColumns = [
  { title: 'GPU 型号', dataIndex: 'gpu_model', key: 'gpu_model', width: 120 },
  { title: '服务器', dataIndex: 'server_count', key: 'server_count', width: 80 },
  { title: '总卡', dataIndex: 'total_gpus', key: 'total_gpus', width: 80 },
  { title: '占用', dataIndex: 'used_gpus', key: 'used_gpus', width: 80 },
  { title: '可用', dataIndex: 'available_gpus', key: 'available_gpus', width: 80 },
  { title: '利用率', key: 'usage', width: 160 },
  { title: '超配', key: 'overbook', width: 110 },
];

function ensureCharts() {
  if (utilChartRef.value && !utilChart) {
    utilChart = echarts.init(utilChartRef.value);
  }
  if (modelChartRef.value && !modelChart) {
    modelChart = echarts.init(modelChartRef.value);
  }
  if (lifeChartRef.value && !lifeChart) {
    lifeChart = echarts.init(lifeChartRef.value);
  }
}

function renderCharts() {
  ensureCharts();
  const d = dashboard.value;
  const used = Number(d?.used_gpus || 0);
  const free = Number(d?.available_gpus || 0);
  const total = used + free;

  utilChart?.setOption({
    color: [COLOR.used, COLOR.free],
    tooltip: { trigger: 'item', formatter: '{b}: {c} 卡 ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['58%', '78%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data:
          total > 0
            ? [
                { name: '已占用', value: used },
                { name: '可用', value: free },
              ]
            : [{ name: '暂无容量数据', value: 1, itemStyle: { color: COLOR.split } }],
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '40%',
        style: {
          text: total > 0 ? `${utilizationRate.value}%` : '-',
          fill: '#0f172a',
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'DIN Alternate, Tabular Figures, sans-serif',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '54%',
        style: {
          text: '利用率',
          fill: COLOR.axis,
          fontSize: 12,
        },
      },
    ],
  });

  const models = [...(d?.by_model || [])].sort((a, b) =>
    String(a.gpu_model).localeCompare(String(b.gpu_model)),
  );
  const names = models.map((m) => m.gpu_model || '未知');
  modelChart?.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['已占用', '可用'],
      top: 0,
      textStyle: { color: COLOR.axis },
    },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: names.length ? names : ['暂无型号'],
      axisLabel: { color: COLOR.axis },
      axisLine: { lineStyle: { color: COLOR.split } },
    },
    yAxis: {
      type: 'value',
      name: '卡数',
      nameTextStyle: { color: COLOR.axis },
      splitLine: { lineStyle: { color: COLOR.split, type: 'dashed' } },
      axisLabel: { color: COLOR.axis },
    },
    series: [
      {
        name: '已占用',
        type: 'bar',
        stack: 'cap',
        barMaxWidth: 42,
        itemStyle: { color: COLOR.used, borderRadius: [0, 0, 0, 0] },
        data: models.map((m) => m.used_gpus || 0),
      },
      {
        name: '可用',
        type: 'bar',
        stack: 'cap',
        barMaxWidth: 42,
        itemStyle: { color: COLOR.free, borderRadius: [4, 4, 0, 0] },
        data: models.map((m) => m.available_gpus || 0),
      },
    ],
  });

  const lifeData = [
    { name: '在用', value: Number(d?.in_use_records || 0), itemStyle: { color: COLOR.inUse } },
    { name: '待开通', value: Number(d?.pending_open || 0), itemStyle: { color: COLOR.pendingOpen } },
    { name: '到期待处理', value: Number(d?.pending_release || 0), itemStyle: { color: COLOR.pendingRel } },
  ].filter((i) => i.value > 0);
  lifeChart?.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: COLOR.axis } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: { color: '#334155', formatter: '{b}\n{c}' },
        data: lifeData.length
          ? lifeData
          : [{ name: '暂无占用记录', value: 1, itemStyle: { color: COLOR.split } }],
      },
    ],
  });
}

function resizeCharts() {
  utilChart?.resize();
  modelChart?.resize();
  lifeChart?.resize();
}

async function load() {
  loading.value = true;
  try {
    dashboard.value = await getOpsComputeDashboard();
    await nextTick();
    renderCharts();
  } catch (e: any) {
    message.error(e?.message || '加载看板失败');
  } finally {
    loading.value = false;
  }
}

watch(
  () => dashboard.value,
  async () => {
    await nextTick();
    renderCharts();
  },
);

onMounted(async () => {
  window.addEventListener('resize', resizeCharts);
  await load();
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts);
  utilChart?.dispose();
  modelChart?.dispose();
  lifeChart?.dispose();
  utilChart = null;
  modelChart = null;
  lifeChart = null;
});
</script>

<style scoped>
.compute-dash {
  padding: 16px;
  background:
    radial-gradient(1200px 400px at 10% -10%, rgba(15, 118, 110, 0.08), transparent 60%),
    radial-gradient(900px 360px at 100% 0%, rgba(2, 132, 199, 0.06), transparent 55%),
    #f8fafc;
  min-height: calc(100vh - 120px);
}

.compute-dash__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.compute-dash__eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f766e;
  font-weight: 600;
  margin-bottom: 4px;
}

.compute-dash__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.compute-dash__sub {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.metric-row {
  margin-bottom: 4px;
}

.metric-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  min-height: 92px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.metric-card__label {
  color: #64748b;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-card__value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.metric-card__hint {
  margin-top: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.metric-card.tone-teal {
  border-color: #99f6e4;
  background: linear-gradient(180deg, #f0fdfa 0%, #fff 70%);
}
.metric-card.tone-teal .metric-card__value { color: #0f766e; }

.metric-card.tone-slate {
  border-color: #cbd5e1;
}

.metric-card.tone-amber {
  border-color: #fcd34d;
  background: linear-gradient(180deg, #fffbeb 0%, #fff 70%);
}
.metric-card.tone-amber .metric-card__value { color: #b45309; }

.metric-card.tone-danger {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fef2f2 0%, #fff 70%);
}
.metric-card.tone-danger .metric-card__value { color: #dc2626; }

.dash-alert {
  margin: 12px 0;
}

.chart-card {
  border-radius: 12px;
  border-color: #e2e8f0;
}

.chart-box {
  width: 100%;
}

.chart-box--donut {
  height: 280px;
}

.chart-box--bar {
  height: 280px;
}

.util-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 8px 8px;
  color: #64748b;
  font-size: 13px;
}

.util-legend strong {
  color: #0f172a;
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}

.util-rate strong {
  color: #0f766e;
  font-size: 16px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.dot.used { background: #0f766e; }
.dot.free { background: #94a3b8; }

.usage-cell {
  min-width: 120px;
}
</style>

<template>
  <div ref="screenRef" class="ops-screen" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="ops-fx" aria-hidden="true">
      <div class="ops-fx__grid"></div>
      <div class="ops-fx__beam ops-fx__beam--a"></div>
      <div class="ops-fx__beam ops-fx__beam--b"></div>
      <div class="ops-fx__beam ops-fx__beam--c"></div>
      <div class="ops-fx__glow ops-fx__glow--tl"></div>
      <div class="ops-fx__glow ops-fx__glow--br"></div>
      <canvas ref="particleRef" class="ops-fx__particles"></canvas>
    </div>

    <div class="ops-screen__inner">
      <header class="ops-header">
        <div class="ops-header__side">
          <span class="ops-header__meta">DATA STREAM ONLINE</span>
          <span class="ops-header__clock">{{ currentTime }}</span>
        </div>

        <div class="ops-header__center">
          <div class="ops-title-bar">
            <span class="ops-title-bar__line"></span>
            <span class="ops-title-bar__dash"></span>
            <span class="ops-title-bar__dash ops-title-bar__dash--short"></span>
          </div>
          <div class="ops-core">
            <div class="ops-core__ring ops-core__ring--outer"></div>
            <div class="ops-core__ring ops-core__ring--mid"></div>
            <div class="ops-core__shield" title="算力引擎核心">
              <svg viewBox="0 0 64 64" class="ops-core__svg">
                <path
                  d="M32 6 L52 16 V34 C52 46 42 54 32 58 C22 54 12 46 12 34 V16 Z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                />
                <circle cx="32" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="2" />
                <path d="M32 22 V38 M24 30 H40" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>
          </div>
          <div class="ops-title-block">
            <h1 class="ops-title">运营指挥大屏</h1>
            <p class="ops-subtitle">算力流动 · 数据驱动 · 转化可视</p>
          </div>
          <div class="ops-title-bar ops-title-bar--right">
            <span class="ops-title-bar__dash ops-title-bar__dash--short"></span>
            <span class="ops-title-bar__dash"></span>
            <span class="ops-title-bar__line"></span>
          </div>
        </div>

        <div class="ops-header__side ops-header__side--right">
          <span class="ops-header__meta">{{ refreshLeft }}s AUTO SYNC</span>
          <div class="ops-header__actions">
            <button type="button" class="ops-btn" :disabled="loading" @click="loadData">刷新</button>
            <button type="button" class="ops-btn ops-btn--primary" @click="toggleFullscreen">
              {{ isFullscreen ? '退出全屏' : '全屏投屏' }}
            </button>
          </div>
        </div>
      </header>

      <div v-if="error" class="ops-alert">{{ error }}</div>

      <section class="ops-cols">
        <!-- 左列 -->
        <aside class="ops-col ops-col--left">
          <div class="glass-card ops-panel ops-panel--kpi">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">核心指标</h3>
            </div>
            <div class="ops-kpi-stack">
              <div
                v-for="item in kpiCards"
                :key="item.key"
                class="ops-kpi-stack__item"
                :class="{ danger: item.danger }"
                @click="go(item.path)"
              >
                <span class="ops-kpi-stack__label">{{ item.label }}</span>
                <span class="ops-kpi-stack__value">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <div class="glass-card ops-panel ops-panel--grow">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">近 {{ days }} 日展厅接待</h3>
            </div>
            <div ref="trendRef" class="ops-chart"></div>
            <div class="ops-panel__head ops-panel__head--sub">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">展厅意向分布</h3>
            </div>
            <div ref="intentRef" class="ops-chart ops-chart--sm"></div>
          </div>
        </aside>

        <!-- 中列 -->
        <main class="ops-col ops-col--center">
          <div class="glass-card ops-panel ops-panel--map">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">
                全国算力分布示意
                <span class="ops-badge">演示数据</span>
              </h3>
            </div>
            <div class="ops-map-wrap">
              <div class="ops-map-core" aria-hidden="true">
                <div class="ops-map-core__pulse"></div>
                <svg viewBox="0 0 64 64" class="ops-map-core__icon">
                  <path
                    d="M32 8 L50 18 V36 C50 47 41 54 32 58 C23 54 14 47 14 36 V18 Z"
                    fill="rgba(45,212,191,0.08)"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <circle cx="32" cy="32" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
                </svg>
              </div>
              <div ref="mapRef" class="ops-chart ops-chart--map"></div>
            </div>
            <div v-if="mapError" class="ops-empty">{{ mapError }}</div>
          </div>
        </main>

        <!-- 右列 -->
        <aside class="ops-col ops-col--right">
          <div class="glass-card ops-panel">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">转化漏斗</h3>
            </div>
            <div class="ops-funnel">
              <div
                v-for="(stage, idx) in overview?.funnel || []"
                :key="stage.key"
                class="ops-funnel__row"
                @click="goFunnel(stage.key)"
              >
                <div class="ops-funnel__meta">
                  <span>{{ stage.label }}</span>
                  <strong>{{ stage.count }}</strong>
                </div>
                <div class="ops-funnel__bar-wrap">
                  <div class="ops-funnel__bar" :style="{ width: funnelWidth(stage.count) }"></div>
                </div>
                <div class="ops-funnel__rate">{{ idx === 0 ? '基线' : `${stage.rate}%` }}</div>
              </div>
              <div v-if="!(overview?.funnel || []).length" class="ops-empty">暂无漏斗数据</div>
            </div>
          </div>

          <div class="glass-card ops-panel ops-panel--grow">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">外访预警 / 待办</h3>
            </div>
            <div class="ops-list">
              <div
                v-for="alert in overview?.visit_alerts || []"
                :key="`${alert.alert_type}-${alert.id}`"
                class="ops-list__item"
                @click="go('/ops/visits')"
              >
                <span class="ops-tag" :class="`ops-tag--${alert.alert_type}`">
                  {{ alertTypeLabel(alert.alert_type) }}
                </span>
                <div class="ops-list__body">
                  <div class="ops-list__name">{{ alert.target_org || alert.title }}</div>
                  <div class="ops-list__sub">
                    {{ alert.follow_owner_name || '未指定对接人' }}
                    <template v-if="alert.due_at"> · 截止 {{ formatShort(alert.due_at) }}</template>
                  </div>
                </div>
              </div>
              <div v-if="!(overview?.visit_alerts || []).length" class="ops-empty">暂无预警</div>
            </div>
          </div>

          <div class="glass-card ops-panel ops-panel--grow">
            <div class="ops-panel__head">
              <span class="ops-panel__corner"></span>
              <h3 class="ops-panel__title">近期动态</h3>
            </div>
            <div class="ops-ticker ops-ticker--col">
              <div
                v-for="(ev, idx) in overview?.recent_events || []"
                :key="`${ev.type}-${ev.id}-${idx}`"
                class="ops-ticker__item"
                @click="go(ev.ref_path || '/ops/customers')"
              >
                <span class="ops-ticker__time">{{ formatShort(ev.time) }}</span>
                <span>{{ ev.title }}</span>
              </div>
              <div v-if="!(overview?.recent_events || []).length" class="ops-empty">暂无动态</div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts/core';
import { BarChart, EffectScatterChart, MapChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GeoComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';

import {
  getOpsDashboardOverview,
  type OpsDashboardOverview,
} from '#/api/core/ops/dashboard';

echarts.use([
  BarChart,
  PieChart,
  MapChart,
  ScatterChart,
  EffectScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GeoComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

const DEMO_COMPUTE_NODES = [
  { name: '北京智算中心', value: [116.4074, 39.9042, 1280] },
  { name: '上海临港节点', value: [121.4737, 31.2304, 1120] },
  { name: '深圳算力枢纽', value: [114.0579, 22.5431, 980] },
  { name: '杭州云节点', value: [120.1551, 30.2741, 760] },
  { name: '成都西部节点', value: [104.0665, 30.5723, 690] },
  { name: '武汉中部节点', value: [114.3055, 30.5928, 540] },
  { name: '贵阳绿色算力', value: [106.6302, 26.6477, 820] },
  { name: '呼和浩特节点', value: [111.6708, 40.8183, 610] },
  { name: '乌兰察布节点', value: [113.1145, 41.0342, 730] },
  { name: '广州南沙节点', value: [113.5372, 22.7946, 880] },
];

const DEMO_PROVINCE_HEAT = [
  { name: '北京市', value: 92 },
  { name: '上海市', value: 88 },
  { name: '广东省', value: 95 },
  { name: '浙江省', value: 78 },
  { name: '江苏省', value: 74 },
  { name: '四川省', value: 70 },
  { name: '湖北省', value: 62 },
  { name: '贵州省', value: 81 },
  { name: '内蒙古自治区', value: 76 },
  { name: '山东省', value: 58 },
  { name: '福建省', value: 55 },
  { name: '安徽省', value: 48 },
  { name: '河南省', value: 52 },
  { name: '重庆市', value: 60 },
  { name: '陕西省', value: 54 },
];

const router = useRouter();
const days = 7;
const refreshIntervalSec = 45;

const screenRef = ref<HTMLElement | null>(null);
const particleRef = ref<HTMLCanvasElement | null>(null);
const trendRef = ref<HTMLElement | null>(null);
const intentRef = ref<HTMLElement | null>(null);
const mapRef = ref<HTMLElement | null>(null);
const overview = ref<OpsDashboardOverview | null>(null);
const loading = ref(false);
const error = ref('');
const mapError = ref('');
const currentTime = ref('');
const refreshLeft = ref(refreshIntervalSec);
const isFullscreen = ref(false);

let trendChart: EChartsType | null = null;
let intentChart: EChartsType | null = null;
let mapChart: EChartsType | null = null;
let chinaMapReady: Promise<boolean> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let particleRaf = 0;
let reduceMotion = false;

type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number };
let particles: Particle[] = [];

const kpiCards = computed(() => {
  const k = overview.value?.kpis;
  return [
    { key: 'ex_today', label: '今日展厅', value: k?.exhibition_today ?? 0, path: '/ops/exhibitions' },
    { key: 'ex_week', label: '近7日展厅', value: k?.exhibition_week ?? 0, path: '/ops/exhibitions' },
    { key: 'visit_pending', label: '待外访', value: k?.visit_pending ?? 0, path: '/ops/visits' },
    { key: 'due_soon', label: '3日内到期', value: k?.visit_due_soon ?? 0, path: '/ops/visits', danger: (k?.visit_due_soon ?? 0) > 0 },
    { key: 'overdue', label: '外访逾期', value: k?.visit_overdue ?? 0, path: '/ops/visits', danger: (k?.visit_overdue ?? 0) > 0 },
    { key: 'intent', label: '意向客户', value: k?.customer_intent ?? 0, path: '/ops/customers?stage=intent' },
    { key: 'trial', label: '试用中', value: k?.customer_trial ?? 0, path: '/ops/customers?stage=trial' },
    { key: 'formal', label: '正式客户', value: k?.customer_formal ?? 0, path: '/ops/customers?stage=formal' },
    { key: 'closed', label: '本月闭环', value: k?.customer_closed_month ?? 0, path: '/ops/customers?stage=closed' },
  ];
});

function funnelWidth(count: number) {
  const max = Math.max(...(overview.value?.funnel || []).map((s) => s.count), 1);
  return `${Math.max(8, Math.round((count / max) * 100))}%`;
}

function alertTypeLabel(t: string) {
  if (t === 'overdue') return '逾期';
  if (t === 'due_soon') return '将到期';
  if (t === 'high_intent') return '高意向';
  return t || '待办';
}

function formatShort(v?: string) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mi = `${d.getMinutes()}`.padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

function go(path: string) {
  if (!path) return;
  router.push(path);
}

function goFunnel(key: string) {
  if (key === 'exhibition' || key === 'transferred') go('/ops/exhibitions');
  else if (key === 'visit') go('/ops/visits');
  else if (key === 'intent') go('/ops/customers?stage=intent');
  else if (key === 'trial') go('/ops/customers?stage=trial');
  else if (key === 'formal') go('/ops/customers?stage=formal');
  else go('/ops/customers');
}

function updateClock() {
  currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false });
}

function initParticles() {
  const canvas = particleRef.value;
  const host = screenRef.value;
  if (!canvas || !host || reduceMotion) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(48, Math.floor((rect.width * rect.height) / 28000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.15 - Math.random() * 0.45,
      r: 0.8 + Math.random() * 1.6,
      a: 0.25 + Math.random() * 0.45,
    }));
  };

  resize();

  const tick = () => {
    const rect = host.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4) {
        p.y = rect.height + 4;
        p.x = Math.random() * rect.width;
      }
      if (p.x < -4) p.x = rect.width + 4;
      if (p.x > rect.width + 4) p.x = -4;
      ctx.beginPath();
      ctx.fillStyle = `rgba(94, 234, 212, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    particleRaf = requestAnimationFrame(tick);
  };
  particleRaf = requestAnimationFrame(tick);
  window.addEventListener('resize', resize);
  (canvas as any).__particleResize = resize;
}

function stopParticles() {
  if (particleRaf) cancelAnimationFrame(particleRaf);
  const canvas = particleRef.value as any;
  if (canvas?.__particleResize) {
    window.removeEventListener('resize', canvas.__particleResize);
  }
}

async function ensureChinaMap() {
  if (chinaMapReady) return chinaMapReady;
  chinaMapReady = (async () => {
    try {
      const resp = await fetch(
        'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
      );
      if (!resp.ok) throw new Error(`地图资源加载失败 (${resp.status})`);
      const geoJson = await resp.json();
      echarts.registerMap('china', geoJson as any);
      mapError.value = '';
      return true;
    } catch (e: any) {
      mapError.value = e?.message || '演示地图加载失败（需可访问外网）';
      return false;
    }
  })();
  return chinaMapReady;
}

function renderMapChart() {
  if (!mapRef.value) return;
  if (!mapChart) mapChart = echarts.init(mapRef.value);
  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8,16,28,0.92)',
      borderColor: 'rgba(45,212,191,0.35)',
      textStyle: { color: '#e8eef7' },
      formatter(params: any) {
        if (params.seriesType === 'effectScatter' || params.seriesType === 'scatter') {
          const v = params.value || [];
          return `${params.name}<br/>算力容量（演示）：${v[2] ?? '-'} PF`;
        }
        if (params.data?.value != null) {
          return `${params.name}<br/>算力指数（演示）：${params.data.value}`;
        }
        return params.name;
      },
    },
    geo: {
      map: 'china',
      roam: false,
      zoom: 1.12,
      center: [105, 36],
      itemStyle: {
        areaColor: 'rgba(15, 35, 55, 0.85)',
        borderColor: 'rgba(45, 212, 191, 0.35)',
        borderWidth: 1,
        shadowColor: 'rgba(45, 212, 191, 0.15)',
        shadowBlur: 12,
      },
      emphasis: {
        itemStyle: { areaColor: 'rgba(20, 55, 70, 0.95)' },
        label: { show: false },
      },
    },
    visualMap: {
      min: 40,
      max: 100,
      left: 8,
      bottom: 8,
      text: ['高', '低'],
      textStyle: { color: '#8fa3bf' },
      inRange: { color: ['#0a1c2e', '#0f766e', '#5eead4'] },
      calculable: false,
      seriesIndex: 0,
    },
    series: [
      {
        name: '区域算力指数',
        type: 'map',
        map: 'china',
        geoIndex: 0,
        data: DEMO_PROVINCE_HEAT,
      },
      {
        name: '智算节点',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: DEMO_COMPUTE_NODES,
        symbolSize(val: number[]) {
          return Math.max(10, Math.min(22, (val[2] || 500) / 80));
        },
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3.4 },
        itemStyle: {
          color: '#5eead4',
          shadowBlur: 16,
          shadowColor: 'rgba(45, 212, 191, 0.7)',
        },
        label: {
          show: true,
          formatter: '{b}',
          position: 'right',
          color: '#d7e6f7',
          fontSize: 10,
        },
        zlevel: 2,
      },
    ],
  });
}

function renderCharts() {
  if (!trendRef.value || !intentRef.value) return;
  if (!trendChart) trendChart = echarts.init(trendRef.value);
  if (!intentChart) intentChart = echarts.init(intentRef.value);

  const trend = overview.value?.exhibition_trend || [];
  trendChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 36, right: 12, top: 24, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8,16,28,0.92)',
      borderColor: 'rgba(45,212,191,0.35)',
      textStyle: { color: '#e8eef7' },
    },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.date.slice(5)),
      axisLabel: { color: '#8fa3bf' },
      axisLine: { lineStyle: { color: '#2a3f5c' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#8fa3bf' },
      splitLine: { lineStyle: { color: 'rgba(42,63,92,0.45)' } },
    },
    series: [
      {
        type: 'bar',
        data: trend.map((t) => t.count),
        barWidth: 14,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5eead4' },
            { offset: 1, color: '#0f766e' },
          ]),
        },
      },
    ],
  });

  const intent = overview.value?.intent_dist || [];
  intentChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(8,16,28,0.92)',
      borderColor: 'rgba(45,212,191,0.35)',
      textStyle: { color: '#e8eef7' },
    },
    legend: { bottom: 0, textStyle: { color: '#8fa3bf' } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        label: { color: '#c9d7ea' },
        data: intent.length
          ? intent.map((i) => ({ name: i.label, value: i.count }))
          : [{ name: '暂无', value: 0 }],
        color: ['#64748b', '#38bdf8', '#f59e0b', '#2dd4bf'],
      },
    ],
  });
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    overview.value = await getOpsDashboardOverview({ days });
    await nextTick();
    renderCharts();
    const ok = await ensureChinaMap();
    if (ok) {
      await nextTick();
      renderMapChart();
    }
    refreshLeft.value = refreshIntervalSec;
  } catch (e: any) {
    error.value = e?.message || '加载运营看板失败';
  } finally {
    loading.value = false;
  }
}

async function toggleFullscreen() {
  const el = screenRef.value;
  if (!el) return;
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      isFullscreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullscreen.value = false;
    }
  } catch {
    isFullscreen.value = !!document.fullscreenElement;
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
  nextTick(() => {
    trendChart?.resize();
    intentChart?.resize();
    mapChart?.resize();
  });
}

function onResize() {
  trendChart?.resize();
  intentChart?.resize();
  mapChart?.resize();
}

onMounted(async () => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  await nextTick();
  initParticles();
  await loadData();
  refreshTimer = setInterval(() => {
    refreshLeft.value -= 1;
    if (refreshLeft.value <= 0) {
      loadData();
    }
  }, 1000);
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (refreshTimer) clearInterval(refreshTimer);
  stopParticles();
  window.removeEventListener('resize', onResize);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  trendChart?.dispose();
  intentChart?.dispose();
  mapChart?.dispose();
});
</script>

<style scoped>
.ops-screen {
  --bg: #050b16;
  --text: #eaf3ff;
  --muted: #8eabc8;
  --cyan: #2dd4bf;
  --cyan-2: #5eead4;
  --sky: #38bdf8;
  --warn: #f59e0b;
  --danger: #fb7185;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: calc(100vh - 120px);
  color: var(--text);
  background: #050b16;
  box-sizing: border-box;
}

.ops-screen.is-fullscreen {
  min-height: 100vh;
}

.ops-screen__inner {
  position: relative;
  z-index: 2;
  padding: 18px 22px 22px;
}

.ops-fx {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.ops-fx__grid {
  position: absolute;
  inset: -20%;
  background-image:
    linear-gradient(rgba(45, 212, 191, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  transform: perspective(600px) rotateX(58deg) translateY(-12%);
  transform-origin: center top;
  animation: gridDrift 28s linear infinite;
  opacity: 0.7;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.75), transparent 88%);
}

.ops-fx__beam {
  position: absolute;
  width: 42%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.85), transparent);
  filter: blur(0.4px);
  opacity: 0.45;
  animation: beamSweep 9s ease-in-out infinite;
}

.ops-fx__beam--a {
  top: 18%;
  left: -10%;
  transform: rotate(-8deg);
}

.ops-fx__beam--b {
  top: 46%;
  right: -12%;
  width: 50%;
  animation-duration: 12s;
  animation-delay: -3s;
  background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.7), transparent);
  transform: rotate(6deg);
}

.ops-fx__beam--c {
  bottom: 22%;
  left: 8%;
  width: 36%;
  animation-duration: 14s;
  animation-delay: -6s;
  transform: rotate(-3deg);
}

.ops-fx__glow {
  position: absolute;
  width: 46vw;
  height: 46vw;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.28;
}

.ops-fx__glow--tl {
  top: -18%;
  left: -12%;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.55), transparent 68%);
}

.ops-fx__glow--br {
  right: -16%;
  bottom: -22%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 68%);
}

.ops-fx__particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ops-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.ops-header__side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ops-header__side--right {
  align-items: flex-end;
}

.ops-header__meta {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: rgba(94, 234, 212, 0.75);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.ops-header__clock {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: #d7e8f8;
}

.ops-header__actions {
  display: flex;
  gap: 8px;
}

.ops-header__center {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: center;
}

.ops-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 88px;
}

.ops-title-bar--right {
  flex-direction: row-reverse;
}

.ops-title-bar__line {
  display: block;
  width: 72px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #5eead4, #38bdf8);
  box-shadow:
    0 0 10px rgba(45, 212, 191, 0.85),
    0 0 22px rgba(56, 189, 248, 0.45);
  animation: barPulse 2.4s ease-in-out infinite;
}

.ops-title-bar--right .ops-title-bar__line {
  background: linear-gradient(90deg, #38bdf8, #5eead4, transparent);
}

.ops-title-bar__dash {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.75);
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.7);
}

.ops-title-bar__dash--short {
  width: 8px;
  opacity: 0.7;
}

.ops-core {
  position: relative;
  width: 54px;
  height: 54px;
  flex-shrink: 0;
}

.ops-core__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(45, 212, 191, 0.35);
}

.ops-core__ring--outer {
  animation: spinSlow 16s linear infinite;
  border-style: dashed;
}

.ops-core__ring--mid {
  inset: 6px;
  border-color: rgba(56, 189, 248, 0.4);
  animation: spinSlow 10s linear infinite reverse;
}

.ops-core__shield {
  position: absolute;
  inset: 10px;
  display: grid;
  place-items: center;
  color: #5eead4;
  background: radial-gradient(circle at 40% 30%, rgba(94, 234, 212, 0.22), rgba(8, 20, 36, 0.85));
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.45),
    0 0 18px rgba(45, 212, 191, 0.35);
}

.ops-core__svg {
  width: 22px;
  height: 22px;
}

.ops-title-block {
  text-align: center;
}

.ops-title {
  margin: 0;
  font-size: clamp(22px, 2.4vw, 34px);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-shadow:
    0 0 18px rgba(45, 212, 191, 0.35),
    0 0 36px rgba(56, 189, 248, 0.18);
}

.ops-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  letter-spacing: 0.28em;
  color: var(--muted);
}

.ops-btn {
  border: 1px solid rgba(45, 212, 191, 0.28);
  background: rgba(10, 24, 40, 0.55);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ops-btn:hover {
  border-color: rgba(94, 234, 212, 0.55);
  box-shadow: 0 0 14px rgba(45, 212, 191, 0.2);
}

.ops-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ops-btn--primary {
  border-color: rgba(45, 212, 191, 0.5);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.45), rgba(8, 47, 73, 0.55));
  color: #ccfbf1;
}

.ops-alert {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(251, 113, 133, 0.35);
  background: rgba(127, 29, 29, 0.25);
  color: #fecdd3;
  backdrop-filter: blur(8px);
}

.glass-card {
  position: relative;
  background: linear-gradient(160deg, rgba(14, 28, 48, 0.62), rgba(8, 16, 30, 0.48));
  border: 1px solid rgba(45, 212, 191, 0.22);
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(56, 189, 248, 0.05) inset,
    0 0 24px rgba(45, 212, 191, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px) saturate(1.15);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  overflow: hidden;
}

.glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.05), transparent 28%, transparent 72%, rgba(56, 189, 248, 0.05));
}

.ops-cols {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(420px, 1.4fr) minmax(280px, 1fr);
  gap: 12px;
  align-items: stretch;
  min-height: calc(100vh - 200px);
}

.ops-screen.is-fullscreen .ops-cols {
  min-height: calc(100vh - 140px);
}

.ops-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.ops-col--center {
  min-height: 0;
}

.ops-panel {
  padding: 14px;
  min-height: 0;
}

.ops-panel--grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ops-panel--kpi {
  flex: 0 0 auto;
}

.ops-panel--map {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ops-kpi-stack {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ops-kpi-stack__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 10px;
  border-radius: 10px;
  background: rgba(8, 16, 28, 0.45);
  border: 1px solid rgba(45, 212, 191, 0.14);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.ops-kpi-stack__item:hover {
  border-color: rgba(94, 234, 212, 0.45);
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.14);
  transform: translateY(-1px);
}

.ops-kpi-stack__item.danger .ops-kpi-stack__value {
  color: var(--danger);
  text-shadow: 0 0 12px rgba(251, 113, 133, 0.4);
}

.ops-kpi-stack__label {
  color: var(--muted);
  font-size: 11px;
}

.ops-kpi-stack__value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--cyan-2);
  text-shadow: 0 0 12px rgba(45, 212, 191, 0.3);
  line-height: 1.1;
}

.ops-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.ops-panel__head--sub {
  margin-top: 8px;
}

.ops-panel__corner {
  width: 8px;
  height: 8px;
  border-left: 2px solid var(--cyan);
  border-top: 2px solid var(--cyan);
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.6);
}

.ops-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ops-badge {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fde68a;
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
}

.ops-chart {
  height: 160px;
  flex: 0 0 auto;
}

.ops-chart--sm {
  height: 150px;
}

.ops-chart--map {
  height: auto;
  flex: 1;
  min-height: 420px;
}

.ops-map-wrap {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 420px;
}

.ops-map-core {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  z-index: 1;
  pointer-events: none;
  color: rgba(94, 234, 212, 0.55);
  display: grid;
  place-items: center;
}

.ops-map-core__pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(45, 212, 191, 0.35);
  animation: corePulse 2.8s ease-out infinite;
}

.ops-map-core__icon {
  width: 34px;
  height: 34px;
  opacity: 0.55;
  filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.45));
}

.ops-funnel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ops-funnel__row {
  cursor: pointer;
}

.ops-funnel__meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 3px;
}

.ops-funnel__bar-wrap {
  height: 8px;
  border-radius: 999px;
  background: rgba(8, 16, 28, 0.7);
  overflow: hidden;
  border: 1px solid rgba(45, 212, 191, 0.18);
}

.ops-funnel__bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #0f766e, #5eead4, #38bdf8);
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.45);
}

.ops-funnel__rate {
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
}

.ops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.ops-list__item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border-radius: 10px;
  background: rgba(8, 16, 28, 0.45);
  border: 1px solid rgba(45, 212, 191, 0.14);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ops-list__item:hover {
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.12);
}

.ops-list__name {
  font-size: 13px;
  font-weight: 600;
}

.ops-list__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

.ops-tag {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.8);
  color: #cbd5e1;
}

.ops-tag--overdue {
  background: rgba(251, 113, 133, 0.16);
  color: #fecdd3;
  box-shadow: 0 0 10px rgba(251, 113, 133, 0.2);
}

.ops-tag--due_soon {
  background: rgba(245, 158, 11, 0.16);
  color: #fde68a;
}

.ops-tag--high_intent {
  background: rgba(45, 212, 191, 0.14);
  color: #99f6e4;
}

.ops-ticker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.ops-ticker--col .ops-ticker__item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(8, 16, 28, 0.45);
  border: 1px solid rgba(45, 212, 191, 0.14);
  font-size: 13px;
  cursor: pointer;
}

.ops-ticker__time {
  color: var(--muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ops-empty {
  color: var(--muted);
  font-size: 13px;
  padding: 20px 0;
  text-align: center;
}

@keyframes gridDrift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 0 48px, 48px 0; }
}

@keyframes beamSweep {
  0%, 100% { opacity: 0.15; transform: translateX(-8%) rotate(-8deg); }
  50% { opacity: 0.55; transform: translateX(12%) rotate(-8deg); }
}

@keyframes barPulse {
  0%, 100% { opacity: 0.65; filter: brightness(1); }
  50% { opacity: 1; filter: brightness(1.35); }
}

@keyframes spinSlow {
  to { transform: rotate(360deg); }
}

@keyframes corePulse {
  0% { transform: scale(0.7); opacity: 0.7; }
  100% { transform: scale(1.8); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ops-fx__grid,
  .ops-fx__beam,
  .ops-title-bar__line,
  .ops-core__ring,
  .ops-map-core__pulse {
    animation: none !important;
  }
}

@media (max-width: 1400px) {
  .ops-header {
    grid-template-columns: 1fr;
  }
  .ops-header__side--right {
    align-items: flex-start;
  }
  .ops-cols {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .ops-chart--map,
  .ops-map-wrap {
    min-height: 320px;
  }
}
</style>

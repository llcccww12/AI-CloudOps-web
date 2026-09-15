<template>
  <div class="ops-page">
    <a-page-header title="管理者周报" sub-title="超管专属 · 可视化预览，可复制外发">
      <template #extra>
        <a-space wrap>
          <a-select v-model:value="days" style="width: 140px" @change="() => loadReport(false)">
            <a-select-option :value="7">近 7 天</a-select-option>
            <a-select-option :value="14">近 14 天</a-select-option>
            <a-select-option :value="30">近 30 天</a-select-option>
          </a-select>
          <a-button :loading="loading" type="primary" ghost @click="() => loadReport(true)">
            重新生成
          </a-button>
          <a-button :disabled="!html" @click="openPrint">新窗口打开</a-button>
          <a-button type="primary" :disabled="!markdown" @click="copyReport">复制 Markdown</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-alert
      v-if="forbidden"
      type="warning"
      show-icon
      message="仅超管（admin）可查看管理者周报"
      style="margin-bottom: 16px"
    />

    <template v-else>
      <a-alert
        v-if="hint"
        :type="llmEnabled ? (source === 'hybrid' ? 'success' : 'info') : 'warning'"
        show-icon
        :message="hint"
        style="margin-bottom: 16px"
      >
        <template v-if="!llmEnabled" #description>
          配置方式：在后端进程环境变量设置
          <code>LLM_API_KEY</code>
          ，可选
          <code>LLM_BASE_URL</code>
          （兼容 OpenAI Chat Completions），然后点「重新生成」。
        </template>
      </a-alert>

      <a-card size="small" class="report-card" :loading="loading">
        <template #title>
          <span>可视化周报</span>
          <span v-if="meta" class="muted title-meta">
            {{ meta.period_start }} ~ {{ meta.period_end }} ·
            {{ source === 'hybrid' ? '事实 + LLM 润色' : '台账模板' }}
            · LLM {{ llmEnabled ? '已配置' : '未配置' }}
            <template v-if="cached"> · 缓存</template>
            <template v-if="meta.generated_at"> · 生成于 {{ formatGeneratedAt(meta.generated_at) }}</template>
          </span>
        </template>
        <iframe
          v-if="html"
          class="report-frame"
          title="CacOps 运营周报"
          :srcdoc="html"
        />
        <a-empty v-else description="暂无内容" />
      </a-card>

      <a-collapse v-if="markdown" ghost style="margin-top: 8px">
        <a-collapse-panel key="md" header="Markdown 原文（复制用）">
          <pre class="report-md">{{ markdown }}</pre>
        </a-collapse-panel>
      </a-collapse>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';

import {
  getOpsManagerWeeklyReport,
  type OpsManagerWeeklyReport,
} from '#/api/core/ops/manager-report';

defineOptions({ name: 'OpsManagerReport' });

const CACHE_PREFIX = 'cacops:ops-manager-report:';

const loading = ref(false);
const forbidden = ref(false);
const days = ref(7);
const markdown = ref('');
const html = ref('');
const hint = ref('');
const source = ref('template');
const llmEnabled = ref(false);
const cached = ref(false);
const meta = ref<{
  period_start: string;
  period_end: string;
  generated_at?: string;
} | null>(null);

function cacheKey(d: number) {
  const day = new Date().toISOString().slice(0, 10);
  return `${CACHE_PREFIX}${day}:${d}`;
}

function applyReport(res: OpsManagerWeeklyReport) {
  markdown.value = res.markdown || '';
  html.value = res.html || '';
  hint.value = res.hint || '';
  source.value = res.source || 'template';
  llmEnabled.value = !!res.llm_enabled;
  cached.value = !!res.cached;
  meta.value = {
    period_start: res.period_start,
    period_end: res.period_end,
    generated_at: res.generated_at,
  };
}

function readLocalCache(d: number): OpsManagerWeeklyReport | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(d));
    if (!raw) return null;
    return JSON.parse(raw) as OpsManagerWeeklyReport;
  } catch {
    return null;
  }
}

function writeLocalCache(d: number, res: OpsManagerWeeklyReport) {
  try {
    sessionStorage.setItem(cacheKey(d), JSON.stringify(res));
  } catch {
    // ignore quota
  }
}

function formatGeneratedAt(v?: string) {
  if (!v) return '';
  const t = new Date(v);
  if (Number.isNaN(t.getTime())) return v;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

async function loadReport(forceRefresh: boolean) {
  // 切回页面时：有本地缓存且非强制刷新，直接展示，不重复请求
  if (!forceRefresh) {
    const local = readLocalCache(days.value);
    if (local?.html || local?.markdown) {
      applyReport({ ...local, cached: true });
      if (!hint.value.includes('缓存')) {
        hint.value = (hint.value || '展示本地缓存周报') + '（点「重新生成」可刷新）';
      }
      return;
    }
    // keep-alive 场景：内存里已有内容也不再请求
    if (html.value || markdown.value) {
      return;
    }
  }

  loading.value = true;
  forbidden.value = false;
  try {
    const res = await getOpsManagerWeeklyReport({
      days: days.value,
      refresh: forceRefresh,
    });
    applyReport(res);
    writeLocalCache(days.value, res);
    if (forceRefresh) {
      message.success('周报已重新生成');
    }
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('超管') || msg.includes('403') || msg.includes('无权限')) {
      forbidden.value = true;
      markdown.value = '';
      html.value = '';
    } else {
      message.error(msg || '生成周报失败');
    }
  } finally {
    loading.value = false;
  }
}

async function copyReport() {
  if (!markdown.value) return;
  try {
    await navigator.clipboard.writeText(markdown.value);
    message.success('周报 Markdown 已复制，可粘贴到飞书/邮件');
  } catch {
    message.info(markdown.value);
  }
}

function openPrint() {
  if (!html.value) return;
  const w = window.open('', '_blank');
  if (!w) {
    message.warning('浏览器拦截了弹窗，请允许后重试');
    return;
  }
  w.document.open();
  w.document.write(html.value);
  w.document.close();
}

onMounted(() => loadReport(false));
</script>

<style scoped>
.ops-page {
  padding: 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.muted {
  color: #8c8c8c;
  font-size: 12px;
}
.title-meta {
  margin-left: 12px;
  font-weight: 400;
}
.report-card {
  width: 100%;
}
.report-card :deep(.ant-card-body) {
  padding: 0;
  width: 100%;
}
.report-frame {
  display: block;
  width: 100%;
  min-height: calc(100vh - 260px);
  border: 0;
  background: #f3f6fa;
}
.report-md {
  margin: 0;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  max-height: 360px;
  overflow: auto;
}
code {
  padding: 0 4px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>

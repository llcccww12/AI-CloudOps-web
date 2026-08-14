<template>
  <div class="inspection-report">
    <div class="page-header">
      <div class="header-content">
        <div class="header-text">
          <h1 class="page-title">巡检报告</h1>
          <p class="page-subtitle">{{ reportId }}</p>
        </div>
        <a-space>
          <a-button @click="router.push('/inspection/history')">返回历史</a-button>
          <a-button :loading="mdLoading" @click="loadMarkdown">导出 Markdown</a-button>
        </a-space>
      </div>
    </div>

    <a-alert v-if="pageError" type="error" show-icon :message="pageError" style="margin-bottom: 16px" />

    <a-card v-if="report" :loading="loading">
      <a-descriptions bordered :column="3" style="margin-bottom: 16px">
        <a-descriptions-item label="范围">{{ report.summary.scope }}</a-descriptions-item>
        <a-descriptions-item label="命名空间">{{ report.summary.namespace || '-' }}</a-descriptions-item>
        <a-descriptions-item label="时间">{{ report.timestamp }}</a-descriptions-item>
        <a-descriptions-item label="规则数">{{ report.summary.total_checks }}</a-descriptions-item>
        <a-descriptions-item label="问题数">{{ report.summary.issues_found }}</a-descriptions-item>
        <a-descriptions-item label="高/中/低">
          {{ report.summary.high }} / {{ report.summary.medium }} / {{ report.summary.low }}
        </a-descriptions-item>
        <a-descriptions-item label="采集 Pod">{{ report.stats?.pods ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="采集事件">{{ report.stats?.events ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="采集 Node">{{ report.stats?.nodes ?? 0 }}</a-descriptions-item>
      </a-descriptions>

      <a-alert
        v-if="Number(report.stats?.pods || 0) === 0 && Number(report.stats?.nodes || 0) === 0"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
        message="未采集到集群数据"
        :description="((report.stats?.collect_errors as string[]) || []).join('；') || '请确认巡检时传入了可连接的集群 kubeconfig'"
      />

      <h3>发现项</h3>
      <InspectionFindings
        :findings="report.findings"
        :cluster-id="Number(report.stats?.cluster_id || 0) || undefined"
      />

      <div v-if="report.recommendations?.length" style="margin-top: 16px">
        <h3>处置要点</h3>
        <ul>
          <li v-for="item in report.recommendations" :key="item">{{ item }}</li>
        </ul>
      </div>
    </a-card>

    <a-modal v-model:open="mdVisible" title="Markdown 报告" width="720px">
      <pre class="md-block">{{ markdown }}</pre>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  getInspectionReport,
  getInspectionReportMarkdown,
  type InspectionReport,
} from '#/api/core/aiops/inspection';
import InspectionFindings from './InspectionFindings.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const mdLoading = ref(false);
const mdVisible = ref(false);
const pageError = ref('');
const markdown = ref('');
const report = ref<InspectionReport>();
const reportId = String(route.params.reportId || '');

async function loadReport() {
  if (!reportId) {
    pageError.value = '缺少报告 ID';
    return;
  }
  loading.value = true;
  try {
    const data = await getInspectionReport(reportId);
    if ((data as any).error) {
      pageError.value = '报告不存在或已过期（巡检报告当前保存在 AIOps 内存中）';
      return;
    }
    report.value = data;
  } catch (error: any) {
    pageError.value = error?.message || '加载报告失败';
  } finally {
    loading.value = false;
  }
}

async function loadMarkdown() {
  mdLoading.value = true;
  try {
    const data = await getInspectionReportMarkdown(reportId);
    markdown.value = data.markdown || '';
    mdVisible.value = true;
  } catch (error: any) {
    message.error(error?.message || '导出 Markdown 失败');
  } finally {
    mdLoading.value = false;
  }
}

onMounted(() => {
  void loadReport();
});
</script>

<style scoped>
.inspection-report {
  min-height: 100vh;
  padding: 24px;
  background: #fafafa;
}

.page-header {
  margin-bottom: 24px;
  padding: 18px 22px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.md-block {
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>

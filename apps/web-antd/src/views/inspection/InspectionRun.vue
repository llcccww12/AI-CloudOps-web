<template>
  <div class="inspection-run">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon">
            <Icon icon="lucide:clipboard-check" width="34" />
          </div>
          <div class="header-text">
            <h1 class="page-title">执行巡检</h1>
            <p class="page-subtitle">对命名空间或集群运行规则体检，查看发现项与建议</p>
          </div>
        </div>
        <div class="header-actions">
          <a-button @click="goHistory">历史报告</a-button>
          <a-button type="primary" :loading="running" :disabled="!isFormValid" @click="handleRun">
            开始巡检
          </a-button>
        </div>
      </div>
    </div>

    <a-row :gutter="[24, 24]">
      <a-col :xs="24" :lg="7">
        <a-card title="巡检配置" class="config-card">
          <a-form layout="vertical">
            <a-form-item label="Kubernetes 集群" required>
              <a-select
                v-model:value="clusterId"
                :loading="clustersLoading"
                :options="clusterOptions"
                placeholder="选择要巡检的集群"
                show-search
                option-filter-prop="label"
              />
              <div class="form-hint">使用 cluster 管理中已接入集群的 kubeconfig</div>
            </a-form-item>
            <a-form-item label="范围">
              <a-select v-model:value="form.scope">
                <a-select-option value="namespace">命名空间</a-select-option>
                <a-select-option value="cluster">集群</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item v-if="form.scope === 'namespace'" label="命名空间" required>
              <a-select
                v-model:value="namespace"
                :disabled="!clusterId"
                :loading="namespacesLoading"
                :options="namespaceOptions"
                placeholder="选择命名空间"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
            <a-form-item label="规则集">
              <a-select v-model:value="form.profiles" mode="multiple" :options="profileOptions" />
            </a-form-item>
            <a-form-item label="时间窗口（分钟）">
              <a-input-number v-model:value="form.time_window_minutes" :min="5" :max="1440" style="width: 100%" />
            </a-form-item>
            <a-form-item label="包含事件 / 日志">
              <a-space>
                <a-switch v-model:checked="form.include_events" checked-children="事件" un-checked-children="事件" />
                <a-switch v-model:checked="form.include_logs" checked-children="日志" un-checked-children="日志" />
              </a-space>
            </a-form-item>
            <a-form-item label="异步执行">
              <a-switch v-model:checked="form.async" />
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="17">
        <a-alert v-if="pageError" type="error" show-icon :message="pageError" style="margin-bottom: 16px" />
        <a-card v-if="running" class="loading-card">
          正在巡检，请稍候…
        </a-card>
        <a-card v-else-if="report" title="巡检结果">
          <a-alert
            v-if="noClusterData"
            type="warning"
            show-icon
            style="margin-bottom: 16px"
            message="未采集到集群数据，规则没有可检查对象，所以统计为 0。"
            :description="collectErrorText"
          />
          <a-space style="margin-bottom: 16px">
            <a-statistic title="规则数" :value="report.summary.total_checks" />
            <a-statistic title="发现问题" :value="report.summary.issues_found" />
            <a-statistic title="高危" :value="report.summary.high" />
            <a-statistic title="中危" :value="report.summary.medium" />
            <a-statistic title="低危" :value="report.summary.low" />
            <a-statistic title="采集 Pod" :value="Number(report.stats?.pods || 0)" />
          </a-space>
          <InspectionFindings
            :findings="report.findings"
            :cluster-id="clusterId"
          />
          <a-button type="link" @click="goReport(report.report_id)">查看完整报告</a-button>
        </a-card>
        <a-card v-else>
          <a-empty description="配置左侧参数后开始巡检" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';
import { Icon } from '@iconify/vue';

import {
  getInspectionReport,
  getInspectionTask,
  listInspectionProfiles,
  runInspection,
  type InspectionReport,
} from '#/api/core/aiops/inspection';
import InspectionFindings from './InspectionFindings.vue';
import { useRcaClusterNamespace } from '../rca/useRcaClusterNamespace';

const router = useRouter();
const running = ref(false);
const pageError = ref('');
const report = ref<InspectionReport>();
const profileOptions = ref<Array<{ label: string; value: string }>>([
  { label: 'basic', value: 'basic' },
  { label: 'extended', value: 'extended' },
]);

const {
  clusters,
  clustersLoading,
  clusterId,
  namespace,
  namespaces,
  namespacesLoading,
  getSelectedKubeConfig,
} = useRcaClusterNamespace();

const form = reactive({
  async: false,
  include_events: true,
  include_logs: false,
  profiles: ['basic'],
  scope: 'namespace',
  time_window_minutes: 60,
});

const clusterOptions = computed(() =>
  clusters.value.map((item) => ({
    label: item.api_server_addr ? `${item.name} (${item.api_server_addr})` : item.name,
    value: item.id,
  })),
);

const namespaceOptions = computed(() =>
  namespaces.value.map((item) => ({ label: item.name, value: item.name })),
);

const isFormValid = computed(
  () => Boolean(clusterId.value) && (form.scope !== 'namespace' || Boolean(namespace.value)),
);

const noClusterData = computed(() => {
  const stats = report.value?.stats || {};
  return Number(stats.pods || 0) === 0 && Number(stats.nodes || 0) === 0;
});

const collectErrorText = computed(() => {
  const errors = (report.value?.stats?.collect_errors as string[]) || [];
  if (errors.length) {
    return errors.join('；');
  }
  return '请确认已选择可连接的集群，且该集群 kubeconfig 可用。';
});

function goHistory() {
  router.push('/inspection/history');
}

function goReport(id: string) {
  router.push(`/inspection/report/${id}`);
}

async function pollTask(taskId: string) {
  for (let i = 0; i < 40; i += 1) {
    const status = await getInspectionTask(taskId);
    if (status.status === 'completed' && status.report_id) {
      report.value = await getInspectionReport(status.report_id);
      return;
    }
    if (status.status === 'failed') {
      throw new Error(status.error || '巡检任务失败');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('巡检超时，请到历史页查看');
}

async function handleRun() {
  running.value = true;
  pageError.value = '';
  report.value = undefined;
  try {
    const kubeConfig = await getSelectedKubeConfig();
    const data = await runInspection({
      async: form.async,
      cluster_id: clusterId.value,
      include_events: form.include_events,
      include_logs: form.include_logs,
      kube_config: kubeConfig,
      namespace: form.scope === 'namespace' ? namespace.value : undefined,
      profiles: form.profiles,
      scope: form.scope,
      time_window_minutes: form.time_window_minutes,
    });
    if ((data as any).task_id) {
      await pollTask((data as any).task_id);
    } else {
      report.value = data as InspectionReport;
    }
    message.success('巡检完成');
  } catch (error: any) {
    pageError.value = error?.message || '巡检失败';
    message.error(pageError.value);
  } finally {
    running.value = false;
  }
}

onMounted(async () => {
  try {
    const res = await listInspectionProfiles();
    if (res?.items?.length) {
      profileOptions.value = res.items.map((item) => ({
        label: `${item.name}（${item.description}）`,
        value: item.name,
      }));
    }
  } catch {
    // 使用默认规则集
  }
});
</script>

<style scoped>
.inspection-run {
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

.header-content,
.header-left {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.loading-card {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-hint {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>

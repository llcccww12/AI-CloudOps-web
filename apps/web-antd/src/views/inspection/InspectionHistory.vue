<template>
  <div class="inspection-history">
    <div class="page-header">
      <div class="header-content">
        <div class="header-text">
          <h1 class="page-title">巡检历史</h1>
          <p class="page-subtitle">最近生成的巡检报告，重启后仍会保留</p>
        </div>
        <a-space>
          <a-button @click="loadHistory" :loading="loading">刷新</a-button>
          <a-button type="primary" @click="router.push('/inspection/run')">新建巡检</a-button>
        </a-space>
      </div>
    </div>

    <a-card>
      <a-table
        row-key="report_id"
        :loading="loading"
        :columns="columns"
        :data-source="items"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'timestamp'">
            {{ formatTime(record.timestamp) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="router.push(`/inspection/report/${record.report_id}`)">
              查看报告
            </a-button>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无已保存的巡检报告。此前仅保存在内存中的记录在服务重启后已丢失，之后新跑的报告会落盘保留。" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';

import { listInspectionHistory, type InspectionHistoryItem } from '#/api/core/aiops/inspection';

const router = useRouter();
const loading = ref(false);
const items = ref<InspectionHistoryItem[]>([]);

const columns = [
  { title: '时间', key: 'timestamp', dataIndex: 'timestamp', width: 180 },
  { title: '报告 ID', dataIndex: 'report_id', key: 'report_id' },
  { title: '范围', dataIndex: 'scope', key: 'scope', width: 120 },
  { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
  { title: '规则数', dataIndex: 'total_checks', key: 'total_checks', width: 90 },
  { title: '问题', dataIndex: 'issues_found', key: 'issues_found', width: 80 },
  { title: '高危', dataIndex: 'high', key: 'high', width: 80 },
  { title: '操作', key: 'action', width: 120 },
];

function formatTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function loadHistory() {
  loading.value = true;
  try {
    const res = await listInspectionHistory(50);
    items.value = res?.items || [];
  } catch (error: any) {
    message.error(error?.message || '加载巡检历史失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadHistory();
});
</script>

<style scoped>
.inspection-history {
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
</style>

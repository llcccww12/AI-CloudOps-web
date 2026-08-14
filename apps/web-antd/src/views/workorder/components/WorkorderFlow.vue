<template>
  <div>
    <a-modal
      :open="flowDialog.visible"
      title="工单流转"
      :width="previewDialogWidth"
      :footer="null"
      centered
      wrap-class-name="wo-record-modal"
      @cancel="flowDialog.visible = false"
    >
      <div class="wo-record-shell">
        <div class="wo-record-toolbar">
          <div class="wo-record-toolbar-meta">记录工单节点和状态怎么走过来的</div>
          <div class="wo-record-toolbar-actions">
            <a-select
              v-model:value="filterType"
              size="small"
              style="width: 120px"
              :options="filterOptions"
            />
            <a-button size="small" :loading="loading" @click="refreshFlow">刷新</a-button>
          </div>
        </div>

        <div class="wo-record-summary">
          <div class="wo-record-summary-cell">
            <div class="wo-record-summary-label">审批通过</div>
            <div class="wo-record-summary-value">{{ getFlowCount('approve') }}</div>
          </div>
          <div class="wo-record-summary-cell">
            <div class="wo-record-summary-label">审批拒绝</div>
            <div class="wo-record-summary-value">{{ getFlowCount('reject') }}</div>
          </div>
          <div class="wo-record-summary-cell">
            <div class="wo-record-summary-label">指派操作</div>
            <div class="wo-record-summary-value">{{ getFlowCount('assign') }}</div>
          </div>
          <div class="wo-record-summary-cell">
            <div class="wo-record-summary-label">总流转</div>
            <div class="wo-record-summary-value">{{ flowList.length }}</div>
          </div>
        </div>

        <div class="wo-record-scroll">
          <a-spin :spinning="loading">
            <div v-if="filteredFlowList.length > 0">
              <div v-for="(item, index) in filteredFlowList" :key="item.id" class="wo-axis-event">
                <div class="wo-axis-time">
                  <div class="wo-axis-clock">{{ formatClock(item.created_at) }}</div>
                  <div class="wo-axis-index">#{{ index + 1 }}</div>
                </div>
                <div class="wo-axis-rail">
                  <span class="wo-axis-dot" :class="flowDotClass(item.action)"></span>
                </div>
                <div class="wo-axis-card">
                  <div class="wo-axis-card-top">
                    <span class="wo-axis-action">{{ getFlowActionText(item.action) }}</span>
                    <span class="wo-axis-operator">{{ item.operator_name || '系统' }}</span>
                  </div>
                  <div class="wo-axis-status">
                    <a-tag>{{ getStatusText(item.from_status) }}</a-tag>
                    <span class="wo-axis-arrow">→</span>
                    <a-tag color="blue">{{ getStatusText(item.to_status) }}</a-tag>
                  </div>
                  <div v-if="item.comment" class="wo-axis-comment">{{ item.comment }}</div>
                  <a-button type="link" size="small" @click="showFlowDetail(item)">详情</a-button>
                </div>
              </div>
            </div>
            <a-empty v-else-if="!loading" description="暂无流转记录" />
          </a-spin>
        </div>
      </div>
    </a-modal>

    <a-modal
      :open="detailDialog.visible"
      title="流转详情"
      :width="560"
      :footer="null"
      wrap-class-name="wo-record-modal"
      @cancel="detailDialog.visible = false"
    >
      <a-descriptions v-if="detailDialog.item" bordered :column="1" size="small">
        <a-descriptions-item label="操作类型">
          {{ getFlowActionText(detailDialog.item.action) }}
          <a-tag v-if="detailDialog.item.is_system_action === 1" color="orange">系统操作</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="操作人">
          {{ detailDialog.item.operator_name || '系统' }}
        </a-descriptions-item>
        <a-descriptions-item label="操作时间">
          {{ formatFullDateTime(detailDialog.item.created_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态变更">
          {{ getStatusText(detailDialog.item.from_status) }} →
          {{ getStatusText(detailDialog.item.to_status) }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detailDialog.item.comment" label="处理说明">
          {{ detailDialog.item.comment }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  FlowAction,
  listWorkorderInstanceFlow,
  type ListWorkorderInstanceFlowReq,
  type WorkorderInstanceFlowItem,
} from '#/api/core/workorder/workorder_instance_flow';
import { InstanceStatus } from '#/api/core/workorder/workorder_instance';

import './workorder-record-dialog.css';

const loading = ref(false);
const flowList = ref<WorkorderInstanceFlowItem[]>([]);
const filterType = ref('all');

const filterOptions = [
  { label: '全部流转', value: 'all' },
  { label: '审批操作', value: 'approve' },
  { label: '分配操作', value: 'assign' },
  { label: '状态变更', value: 'status' },
];

const detailDialog = reactive({
  visible: false,
  item: null as WorkorderInstanceFlowItem | null,
});

const flowDialog = reactive({
  visible: false,
  instanceId: 0,
});

const previewDialogWidth = computed(() => {
  if (typeof window === 'undefined') return 760;
  const width = window.innerWidth;
  if (width < 768) return '96%';
  if (width < 1024) return 720;
  return 760;
});

const formatFullDateTime = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
};

const formatClock = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('HH:mm:ss');
};

const filteredFlowList = computed(() => {
  let filtered = [...flowList.value];
  switch (filterType.value) {
    case 'approve':
      filtered = filtered.filter((item) =>
        [FlowAction.Approve as string, FlowAction.Reject as string].includes(item.action),
      );
      break;
    case 'assign':
      filtered = filtered.filter((item) => item.action === FlowAction.Assign);
      break;
    case 'status':
      filtered = filtered.filter((item) => item.from_status !== item.to_status);
      break;
  }
  return filtered.sort(
    (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime(),
  );
});

const getFlowCount = (type: string): number => {
  switch (type) {
    case 'approve':
      return flowList.value.filter((item) => item.action === FlowAction.Approve).length;
    case 'reject':
      return flowList.value.filter((item) => item.action === FlowAction.Reject).length;
    case 'assign':
      return flowList.value.filter((item) => item.action === FlowAction.Assign).length;
    default:
      return 0;
  }
};

const getStatusText = (status: number): string => {
  const textMap: Record<number, string> = {
    [InstanceStatus.Draft]: '草稿',
    [InstanceStatus.Pending]: '待处理',
    [InstanceStatus.Processing]: '处理中',
    [InstanceStatus.Completed]: '已完成',
    [InstanceStatus.Rejected]: '已拒绝',
    [InstanceStatus.Cancelled]: '已取消',
  };
  return textMap[status] || '未知';
};

const getFlowActionText = (action: string): string => {
  const textMap: Record<string, string> = {
    [FlowAction.Submit]: '提交工单',
    [FlowAction.Approve]: '审批通过',
    [FlowAction.Reject]: '审批拒绝',
    [FlowAction.Assign]: '指派处理人',
    [FlowAction.Cancel]: '取消工单',
    [FlowAction.Complete]: '完成工单',
    [FlowAction.Return]: '退回工单',
  };
  return textMap[action] || action;
};

const flowDotClass = (action: string) => {
  if ([FlowAction.Approve as string, FlowAction.Complete as string].includes(action)) return 'is-ok';
  if ([FlowAction.Reject as string, FlowAction.Cancel as string].includes(action)) return 'is-bad';
  if (action === FlowAction.Return) return 'is-warn';
  return '';
};

const showFlowDetail = (item: WorkorderInstanceFlowItem) => {
  detailDialog.item = item;
  detailDialog.visible = true;
};

const refreshFlow = async () => {
  if (flowDialog.instanceId) {
    await loadFlow(flowDialog.instanceId);
  }
};

const loadFlow = async (instanceId: number) => {
  try {
    loading.value = true;
    const allFlows: WorkorderInstanceFlowItem[] = [];
    let currentPage = 1;
    const pageSize = 50;
    let hasMoreData = true;

    while (hasMoreData) {
      const params: ListWorkorderInstanceFlowReq = {
        page: currentPage,
        size: pageSize,
        instance_id: instanceId,
      };
      const res = await listWorkorderInstanceFlow(params);
      if (res && res.items && res.items.length > 0) {
        allFlows.push(...res.items);
        if (res.items.length < pageSize || allFlows.length >= (res.total || 0)) {
          hasMoreData = false;
        } else {
          currentPage += 1;
        }
      } else {
        hasMoreData = false;
      }
    }
    flowList.value = allFlows;
  } catch (error: any) {
    message.error(`加载流转记录失败: ${error.message || '未知错误'}`);
    flowList.value = [];
  } finally {
    loading.value = false;
  }
};

const showFlow = async (instanceId: number) => {
  flowDialog.instanceId = instanceId;
  flowDialog.visible = true;
  filterType.value = 'all';
  await loadFlow(instanceId);
};

defineExpose({
  showFlow,
});
</script>

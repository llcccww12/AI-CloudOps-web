<template>
  <a-modal
    :open="dialog.visible"
    title="处理时间轴"
    :width="dialogWidth"
    :footer="null"
    centered
    destroy-on-close
    wrap-class-name="wo-record-modal"
    @cancel="dialog.visible = false"
  >
    <div class="wo-record-shell">
      <div class="wo-record-toolbar">
        <div class="wo-record-toolbar-meta">
          {{ dialog.serialNumber || '工单时间轴' }}
          <template v-if="dialog.title"> · {{ dialog.title }}</template>
        </div>
        <div class="wo-record-toolbar-actions">
          <a-button size="small" @click="toggleSort">
            {{ timeSortOrder === 'asc' ? '正序' : '倒序' }}
          </a-button>
          <a-button size="small" :loading="loading" @click="refresh">刷新</a-button>
          <a-button size="small" @click="copyReport('text')">复制文本</a-button>
          <a-button size="small" type="primary" @click="copyReport('markdown')">
            复制报告
          </a-button>
        </div>
      </div>

      <div class="wo-record-summary">
        <div class="wo-record-summary-cell">
          <div class="wo-record-summary-label">开始</div>
          <div class="wo-record-summary-value">{{ summary.startText }}</div>
        </div>
        <div class="wo-record-summary-cell">
          <div class="wo-record-summary-label">结束</div>
          <div class="wo-record-summary-value">{{ summary.endText }}</div>
        </div>
        <div class="wo-record-summary-cell">
          <div class="wo-record-summary-label">历时</div>
          <div class="wo-record-summary-value">{{ summary.elapsedText }}</div>
        </div>
        <div class="wo-record-summary-cell">
          <div class="wo-record-summary-label">事件</div>
          <div class="wo-record-summary-value">{{ axisEvents.length }}</div>
        </div>
      </div>

      <div class="wo-record-scroll">
        <a-spin :spinning="loading">
          <div v-if="axisRows.length > 0">
            <div v-for="row in axisRows" :key="row.event.key">
              <div
                v-if="row.showGap"
                class="wo-axis-gap"
                :style="{ '--gap-h': row.gapHeight + 'px' }"
              >
                <div class="wo-axis-gap-rail"></div>
                <div class="wo-axis-gap-label">间隔 {{ formatDuration(row.gapMs) }}</div>
              </div>
              <div v-if="row.showDay" class="wo-axis-day">{{ row.dayLabel }}</div>
              <div class="wo-axis-event">
                <div class="wo-axis-time">
                  <div class="wo-axis-clock">{{ row.clock }}</div>
                  <div class="wo-axis-index">#{{ row.index }}</div>
                </div>
                <div class="wo-axis-rail">
                  <span class="wo-axis-dot" :class="dotClass(row.event.tone)"></span>
                </div>
                <div class="wo-axis-card">
                  <div class="wo-axis-card-top">
                    <span class="wo-axis-action">{{ row.event.title }}</span>
                    <span class="wo-axis-operator">{{ row.event.operator || '系统' }}</span>
                  </div>
                  <div v-if="row.event.comment" class="wo-axis-comment">{{ row.event.comment }}</div>
                  <a-button
                    v-if="row.event.detail"
                    type="link"
                    size="small"
                    @click="toggleDetail(row.event.key)"
                  >
                    {{ expanded[row.event.key] ? '收起详情' : '展开详情' }}
                  </a-button>
                  <pre v-if="row.event.detail && expanded[row.event.key]" class="wo-axis-detail">{{
                    formatDetail(row.event.detail)
                  }}</pre>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else-if="!loading" description="暂无时间轴记录" />
        </a-spin>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  CommentStatus,
  listWorkorderInstanceComment,
  type WorkorderInstanceCommentItem,
} from '#/api/core/workorder/workorder_instance_comment';
import {
  listWorkorderInstanceTimeline,
  TimelineAction,
  type WorkorderInstanceTimelineItem,
} from '#/api/core/workorder/workorder_instance_time_line';

import './workorder-record-dialog.css';

type ShowTimelineArg =
  | number
  | {
      id: number;
      title?: string;
      serial_number?: string;
    };

interface AxisEvent {
  key: string;
  at: string;
  action: string;
  title: string;
  operator: string;
  comment?: string;
  detail?: string;
  tone: string;
}

const loading = ref(false);
const timeSortOrder = ref<'asc' | 'desc'>('asc');
const timelineList = ref<WorkorderInstanceTimelineItem[]>([]);
const commentList = ref<WorkorderInstanceCommentItem[]>([]);
const expanded = ref<Record<string, boolean>>({});

const dialog = reactive({
  visible: false,
  instanceId: 0,
  title: '',
  serialNumber: '',
});

const dialogWidth = computed(() => {
  if (typeof window === 'undefined') return 760;
  const width = window.innerWidth;
  if (width < 768) return '96%';
  if (width < 1024) return 720;
  return 760;
});

const actionText: Record<string, string> = {
  [TimelineAction.Create]: '创建工单',
  [TimelineAction.Update]: '更新工单',
  [TimelineAction.Submit]: '提交工单',
  [TimelineAction.Assign]: '分配处理人',
  [TimelineAction.Approve]: '审批通过',
  [TimelineAction.Reject]: '拒绝工单',
  [TimelineAction.Cancel]: '取消工单',
  [TimelineAction.Complete]: '完成工单',
  [TimelineAction.Return]: '退回工单',
  [TimelineAction.Comment]: '添加评论',
  [TimelineAction.View]: '查看工单',
  [TimelineAction.Attach]: '添加附件',
  [TimelineAction.Notify]: '发送通知',
  [TimelineAction.Remind]: '催办提醒',
};

const actionTone: Record<string, string> = {
  [TimelineAction.Create]: 'create',
  [TimelineAction.Submit]: 'process',
  [TimelineAction.Assign]: 'process',
  [TimelineAction.Update]: 'neutral',
  [TimelineAction.Approve]: 'ok',
  [TimelineAction.Complete]: 'ok',
  [TimelineAction.Reject]: 'bad',
  [TimelineAction.Cancel]: 'bad',
  [TimelineAction.Return]: 'warn',
  [TimelineAction.Comment]: 'note',
  [TimelineAction.Notify]: 'note',
  [TimelineAction.Remind]: 'warn',
  [TimelineAction.Attach]: 'neutral',
  [TimelineAction.View]: 'neutral',
};

const getActionText = (action: string) => actionText[action] || action;
const getTone = (action: string) => actionTone[action] || 'neutral';

const dotClass = (tone: string) => {
  if (tone === 'ok') return 'is-ok';
  if (tone === 'bad') return 'is-bad';
  if (tone === 'warn') return 'is-warn';
  if (tone === 'note') return 'is-note';
  return '';
};

const parseTime = (value?: string) => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const formatClock = (value: string) => dayjs(value).format('HH:mm:ss');
const formatStamp = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '—';
const formatDay = (value: string) => dayjs(value).format('YYYY年M月D日');

const formatDuration = (ms: number) => {
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}天`);
  if (hours) parts.push(`${hours}小时`);
  if (minutes) parts.push(`${minutes}分`);
  if (!days && !hours && seconds && minutes < 2) parts.push(`${seconds}秒`);
  if (parts.length === 0) parts.push('不到1分');
  return parts.join('');
};

const gapHeight = (ms: number) => {
  const hours = ms / 3_600_000;
  if (hours < 0.05) return 10;
  if (hours < 0.5) return 18;
  if (hours < 2) return 28;
  if (hours < 8) return 40;
  if (hours < 24) return 52;
  return 64;
};

const formatDetail = (detail?: string) => {
  if (!detail) return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
};

const axisEvents = computed<AxisEvent[]>(() => {
  const events: AxisEvent[] = timelineList.value.map((item) => ({
    key: `t-${item.id}`,
    at: item.created_at,
    action: item.action,
    title: getActionText(item.action),
    operator: item.operator_name,
    comment: item.comment,
    detail: item.action_detail,
    tone: getTone(item.action),
  }));

  const relatedCommentIds = new Set(
    timelineList.value
      .filter((item) => item.action === TimelineAction.Comment && item.related_id)
      .map((item) => item.related_id as number),
  );

  for (const comment of commentList.value) {
    if (comment.status === CommentStatus.DELETED || comment.status === CommentStatus.HIDDEN) {
      continue;
    }
    if (relatedCommentIds.has(comment.id)) continue;
    events.push({
      key: `c-${comment.id}`,
      at: comment.created_at,
      action: TimelineAction.Comment,
      title: comment.is_system === 1 ? '系统备注' : '评论',
      operator: comment.operator_name,
      comment: comment.content,
      tone: 'note',
    });
  }

  return events.sort((a, b) => parseTime(a.at) - parseTime(b.at));
});

const summary = computed(() => {
  const events = axisEvents.value;
  if (events.length === 0) {
    return { startText: '—', endText: '—', elapsedText: '—' };
  }
  const start = events[0].at;
  const end = events[events.length - 1].at;
  return {
    startText: formatStamp(start),
    endText: formatStamp(end),
    elapsedText: formatDuration(parseTime(end) - parseTime(start)),
  };
});

const axisRows = computed(() => {
  const events = axisEvents.value;
  const rows = events.map((event, index) => {
    const prev = index > 0 ? events[index - 1] : undefined;
    const gapMs = prev ? Math.max(0, parseTime(event.at) - parseTime(prev.at)) : 0;
    const showDay = !prev || dayjs(prev.at).format('YYYY-MM-DD') !== dayjs(event.at).format('YYYY-MM-DD');
    return {
      event,
      index: index + 1,
      clock: formatClock(event.at),
      dayLabel: formatDay(event.at),
      showDay,
      gapMs,
      showGap: Boolean(prev),
      gapHeight: gapHeight(gapMs),
    };
  });
  return timeSortOrder.value === 'desc' ? [...rows].reverse() : rows;
});

const toggleSort = () => {
  timeSortOrder.value = timeSortOrder.value === 'asc' ? 'desc' : 'asc';
};

const toggleDetail = (key: string) => {
  expanded.value[key] = !expanded.value[key];
};

async function fetchAllPages<T>(
  loader: (page: number, size: number) => Promise<{ items?: T[]; total?: number }>,
): Promise<T[]> {
  const size = 100;
  let page = 1;
  const all: T[] = [];
  while (page <= 50) {
    const res = await loader(page, size);
    const items = res?.items || [];
    all.push(...items);
    if (items.length < size || all.length >= (res.total || 0)) break;
    page += 1;
  }
  return all;
}

const loadTimeline = async (instanceId: number) => {
  loading.value = true;
  try {
    const [timelines, comments] = await Promise.all([
      fetchAllPages<WorkorderInstanceTimelineItem>((page, size) =>
        listWorkorderInstanceTimeline({ page, size, instance_id: instanceId }),
      ),
      fetchAllPages<WorkorderInstanceCommentItem>((page, size) =>
        listWorkorderInstanceComment({
          page,
          size,
          instance_id: instanceId,
          status: CommentStatus.NORMAL,
        }),
      ).catch(() => [] as WorkorderInstanceCommentItem[]),
    ]);
    timelineList.value = timelines;
    commentList.value = comments;
  } catch {
    message.error('加载时间轴失败');
    timelineList.value = [];
    commentList.value = [];
  } finally {
    loading.value = false;
  }
};

const refresh = async () => {
  if (dialog.instanceId) {
    await loadTimeline(dialog.instanceId);
  }
};

const buildReport = (mode: 'markdown' | 'text') => {
  const events = axisEvents.value;
  const serial = dialog.serialNumber || `工单#${dialog.instanceId}`;
  const title = dialog.title || '未命名工单';
  const lines: string[] = [];

  if (mode === 'markdown') {
    lines.push(`# 故障处理时间轴`);
    lines.push('');
    lines.push(`- 工单编号：${serial}`);
    lines.push(`- 工单标题：${title}`);
    lines.push(`- 开始时间：${summary.value.startText}`);
    lines.push(`- 结束时间：${summary.value.endText}`);
    lines.push(`- 历时：${summary.value.elapsedText}`);
    lines.push(`- 事件数：${events.length}`);
    lines.push('');
    lines.push(`## 时间轴`);
    lines.push('');
    events.forEach((event, index) => {
      const prev = index > 0 ? events[index - 1] : undefined;
      const gap = prev ? formatDuration(parseTime(event.at) - parseTime(prev.at)) : '起点';
      lines.push(
        `${index + 1}. **${formatStamp(event.at)}** · ${event.operator || '系统'} · ${event.title}（间隔 ${gap}）`,
      );
      if (event.comment) {
        lines.push(`   > ${event.comment.replace(/\n/g, '\n   > ')}`);
      }
    });
  } else {
    lines.push(`【故障处理时间轴】${serial}  ${title}`);
    lines.push(`起止：${summary.value.startText} — ${summary.value.endText}`);
    lines.push(`历时：${summary.value.elapsedText}    事件：${events.length}`);
    lines.push('');
    events.forEach((event, index) => {
      const prev = index > 0 ? events[index - 1] : undefined;
      if (prev) {
        lines.push(`          └ 间隔 ${formatDuration(parseTime(event.at) - parseTime(prev.at))}`);
      }
      lines.push(
        `${formatStamp(event.at)}  ${event.operator || '系统'}  ${event.title}`,
      );
      if (event.comment) {
        lines.push(`          ${event.comment.replace(/\n/g, '\n          ')}`);
      }
    });
  }

  return lines.join('\n');
};

const copyReport = async (mode: 'markdown' | 'text') => {
  if (axisEvents.value.length === 0) {
    message.warning('暂无时间轴内容可复制');
    return;
  }
  const text = buildReport(mode);
  try {
    await navigator.clipboard.writeText(text);
    message.success(mode === 'markdown' ? '已复制 Markdown 报告' : '已复制纯文本时间轴');
  } catch {
    message.error('复制失败，请检查浏览器剪贴板权限');
  }
};

const showTimeline = async (arg: ShowTimelineArg) => {
  const instanceId = typeof arg === 'number' ? arg : arg.id;
  dialog.instanceId = instanceId;
  dialog.title = typeof arg === 'number' ? '' : arg.title || '';
  dialog.serialNumber = typeof arg === 'number' ? '' : arg.serial_number || '';
  dialog.visible = true;
  timeSortOrder.value = 'asc';
  expanded.value = {};
  await loadTimeline(instanceId);
};

defineExpose({
  showTimeline,
});
</script>

<template>
  <div class="ops-page">
    <a-card title="提醒中心">
      <template #extra>
        <a-space>
          <a-button :loading="previewLoading" @click="handlePreview">预览命中</a-button>
          <a-button type="primary" :loading="scanLoading" @click="handleScan">
            立即扫描发送
          </a-button>
        </a-space>
      </template>

      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="系统每小时自动扫描。支持站内信 / 飞书 / 短信 / 邮件；飞书需用户绑定飞书 ID，短信需配置 ops.sms。同一业务同日同渠道不会重复发送。"
      />

      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="rules" tab="场景规则">
          <div style="margin-bottom: 12px; text-align: right">
            <a-button type="primary" @click="openCreateRule">
              <template #icon><PlusOutlined /></template>
              添加规则
            </a-button>
          </div>
          <a-table
            :data-source="ruleList"
            :columns="ruleColumns"
            :loading="ruleLoading"
            :pagination="false"
            row-key="id"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'scene'">
                {{ sceneLabel(record.scene) }}
              </template>
              <template v-else-if="column.key === 'enabled'">
                <a-switch
                  :checked="record.enabled === 1"
                  checked-children="启用"
                  un-checked-children="停用"
                  @change="(checked: boolean) => toggleEnabled(record, checked)"
                />
              </template>
              <template v-else-if="column.key === 'channels'">
                {{ (record.channels || []).join(' / ') || '-' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" size="small" @click="openEditRule(record)">编辑</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="tasks" tab="我的提醒">
          <div style="margin-bottom: 12px; text-align: right">
            <a-button type="primary" @click="openCreateTask">
              <template #icon><PlusOutlined /></template>
              新建到期提醒
            </a-button>
          </div>
          <a-table
            :data-source="taskList"
            :columns="taskColumns"
            :loading="taskLoading"
            :pagination="taskPagination"
            row-key="id"
            bordered
            @change="handleTaskTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'channels'">
                {{ (record.channels || []).join(' / ') || '-' }}
              </template>
              <template v-else-if="column.key === 'status'">
                {{ taskStatusLabel(record.status) }}
              </template>
              <template v-else-if="column.key === 'due_at'">
                {{ formatTime(record.due_at) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="openEditTask(record)">编辑</a-button>
                  <a-popconfirm title="确认删除该提醒？" @confirm="handleDeleteTask(record.id)">
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="deliveries" tab="投递记录">
          <a-table
            :data-source="deliveryList"
            :columns="deliveryColumns"
            :loading="deliveryLoading"
            :pagination="deliveryPagination"
            row-key="id"
            bordered
            @change="handleDeliveryTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'scene'">
                {{ sceneLabel(record.scene) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="deliveryStatusColor(record.status)">
                  {{ deliveryStatusLabel(record.status) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'created_at'">
                {{ formatTime(record.created_at) }}
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      :open="ruleFormVisible"
      :title="editingRuleId ? '编辑提醒规则' : '添加提醒规则'"
      :confirm-loading="submitLoading"
      destroy-on-close
      @ok="handleSubmitRule"
      @cancel="ruleFormVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="场景" required>
          <a-select v-model:value="ruleForm.scene" :disabled="!!editingRuleId">
            <a-select-option value="trial_expire">试用到期</a-select-option>
            <a-select-option value="contract_renew">合同续约</a-select-option>
            <a-select-option value="settlement_due">结算到期</a-select-option>
            <a-select-option value="invoice">开票提醒</a-select-option>
            <a-select-option value="payment_followup">回款跟进</a-select-option>
            <a-select-option value="visit_pre_due">外访到期前</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="规则名称" required>
          <a-input v-model:value="ruleForm.name" />
        </a-form-item>
        <a-form-item label="提前天数">
          <a-input-number v-model:value="ruleForm.advance_days" :min="0" :max="365" style="width: 100%" />
        </a-form-item>
        <a-form-item label="通知渠道">
          <a-checkbox-group v-model:value="ruleForm.channels">
            <a-checkbox value="inbox">站内信</a-checkbox>
            <a-checkbox value="feishu">飞书</a-checkbox>
            <a-checkbox value="sms">短信</a-checkbox>
            <a-checkbox value="email">邮件</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item label="启用状态">
          <a-radio-group v-model:value="ruleForm.enabled">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="2">停用</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="ruleForm.remark" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="taskFormVisible"
      :title="editingTaskId ? '编辑到期提醒' : '新建到期提醒'"
      :confirm-loading="submitLoading"
      destroy-on-close
      @ok="handleSubmitTask"
      @cancel="taskFormVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model:value="taskForm.title" />
        </a-form-item>
        <a-form-item label="到期时间" required>
          <a-date-picker
            v-model:value="taskForm.due_at"
            show-time
            style="width: 100%"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
          />
        </a-form-item>
        <a-form-item label="提前天数">
          <a-input-number v-model:value="taskForm.advance_days" :min="0" :max="365" style="width: 100%" />
        </a-form-item>
        <a-form-item label="接收人用户ID" required>
          <a-input-number v-model:value="taskForm.target_user_id" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="客户ID（可选）">
          <a-input-number v-model:value="taskForm.customer_id" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="通知渠道">
          <a-checkbox-group v-model:value="taskForm.channels">
            <a-checkbox value="inbox">站内信</a-checkbox>
            <a-checkbox value="feishu">飞书</a-checkbox>
            <a-checkbox value="sms">短信</a-checkbox>
            <a-checkbox value="email">邮件</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item label="提醒内容">
          <a-textarea v-model:value="taskForm.content" :rows="3" />
        </a-form-item>
        <a-form-item v-if="editingTaskId" label="状态">
          <a-select v-model:value="taskForm.status">
            <a-select-option value="pending">待发送</a-select-option>
            <a-select-option value="sent">已发送</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer
      :open="previewVisible"
      title="提醒命中预览"
      width="860"
      destroy-on-close
      @close="previewVisible = false"
    >
      <a-table
        :data-source="previewHits"
        :columns="previewColumns"
        :loading="previewLoading"
        :pagination="false"
        row-key="rowKey"
        bordered
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scene'">
            {{ sceneLabel(record.scene) }}
          </template>
          <template v-else-if="column.key === 'link'">
            <a-button
              v-if="record.link"
              type="link"
              size="small"
              @click="openHitLink(record.link)"
            >
              打开链接
            </a-button>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import {
  type OpsReminderDeliveryItem,
  type OpsReminderHit,
  type OpsReminderRuleItem,
  type OpsReminderTaskItem,
  createOpsReminderRule,
  createOpsReminderTask,
  deleteOpsReminderTask,
  listOpsReminderDelivery,
  listOpsReminderRule,
  listOpsReminderTask,
  previewOpsReminderHits,
  scanOpsReminder,
  updateOpsReminderRule,
  updateOpsReminderTask,
} from '#/api/core/ops/reminder';

const router = useRouter();
const activeTab = ref('rules');

const ruleLoading = ref(false);
const taskLoading = ref(false);
const deliveryLoading = ref(false);
const submitLoading = ref(false);
const previewLoading = ref(false);
const scanLoading = ref(false);

const ruleList = ref<OpsReminderRuleItem[]>([]);
const taskList = ref<OpsReminderTaskItem[]>([]);
const deliveryList = ref<OpsReminderDeliveryItem[]>([]);

const taskPage = ref(1);
const taskPageSize = ref(20);
const taskTotal = ref(0);
const deliveryPage = ref(1);
const deliveryPageSize = ref(20);
const deliveryTotal = ref(0);

const ruleFormVisible = ref(false);
const taskFormVisible = ref(false);
const editingRuleId = ref<number | null>(null);
const editingTaskId = ref<number | null>(null);
const previewVisible = ref(false);
const previewHits = ref<(OpsReminderHit & { rowKey: string })[]>([]);

const ruleForm = reactive({
  scene: 'trial_expire',
  name: '',
  advance_days: 7,
  enabled: 1 as number,
  channels: ['inbox'] as string[],
  remark: '',
});

const taskForm = reactive({
  title: '',
  due_at: undefined as string | undefined,
  advance_days: 1,
  target_user_id: undefined as number | undefined,
  customer_id: undefined as number | undefined,
  channels: ['inbox'] as string[],
  content: '',
  status: 'pending',
});

const ruleColumns = [
  { title: '场景', dataIndex: 'scene', key: 'scene', width: 140 },
  { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: '提前天数', dataIndex: 'advance_days', key: 'advance_days', width: 100 },
  { title: '渠道', dataIndex: 'channels', key: 'channels', width: 200 },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 110 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' as const },
];

const taskColumns = [
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '到期时间', dataIndex: 'due_at', key: 'due_at', width: 170 },
  { title: '提前', dataIndex: 'advance_days', key: 'advance_days', width: 80 },
  { title: '接收人', dataIndex: 'target_user_id', key: 'target_user_id', width: 90 },
  { title: '渠道', dataIndex: 'channels', key: 'channels', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];

const deliveryColumns = [
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 170 },
  { title: '场景', dataIndex: 'scene', key: 'scene', width: 110 },
  { title: '渠道', dataIndex: 'channel', key: 'channel', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '接收人', dataIndex: 'target_user_id', key: 'target_user_id', width: 90 },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '错误', dataIndex: 'error_msg', key: 'error_msg', ellipsis: true },
];

const previewColumns = [
  { title: '场景', dataIndex: 'scene', key: 'scene', width: 110 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 140, ellipsis: true },
  { title: '业务标题', dataIndex: 'biz_title', key: 'biz_title', ellipsis: true },
  { title: '目标用户', dataIndex: 'target_user_hint', key: 'target_user_hint', width: 120 },
  { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: '链接', key: 'link', width: 100 },
];

const taskPagination = computed(() => ({
  current: taskPage.value,
  pageSize: taskPageSize.value,
  total: taskTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const deliveryPagination = computed(() => ({
  current: deliveryPage.value,
  pageSize: deliveryPageSize.value,
  total: deliveryTotal.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function sceneLabel(scene?: string) {
  const map: Record<string, string> = {
    trial_expire: '试用到期',
    contract_renew: '合同续约',
    settlement_due: '结算到期',
    invoice: '开票提醒',
    payment_followup: '回款跟进',
    visit_pre_due: '外访到期前',
    custom: '自定义',
  };
  return (scene && map[scene]) || scene || '-';
}

function taskStatusLabel(status?: string) {
  return ({ pending: '待发送', sent: '已发送', cancelled: '已取消' } as Record<string, string>)[
    status || ''
  ] || status || '-';
}

function deliveryStatusLabel(status?: string) {
  return (
    ({ success: '成功', failed: '失败', skipped: '跳过', pending: '待发' } as Record<string, string>)[
      status || ''
    ] || status || '-'
  );
}

function deliveryStatusColor(status?: string) {
  return (
    ({ success: 'green', failed: 'red', skipped: 'orange', pending: 'blue' } as Record<string, string>)[
      status || ''
    ] || 'default'
  );
}

function formatTime(v?: string) {
  if (!v) return '-';
  return v.replace('T', ' ').replace(/\+.*/, '').replace('Z', '');
}

async function loadRules() {
  ruleLoading.value = true;
  try {
    const res: any = await listOpsReminderRule({ page: 1, size: 100 });
    const items = Array.isArray(res) ? res : res?.items || [];
    ruleList.value = items;
  } catch {
    message.error('加载提醒规则失败');
    ruleList.value = [];
  } finally {
    ruleLoading.value = false;
  }
}

async function loadTasks() {
  taskLoading.value = true;
  try {
    const res: any = await listOpsReminderTask({
      page: taskPage.value,
      size: taskPageSize.value,
    });
    const items = Array.isArray(res) ? res : res?.items || [];
    taskList.value = items;
    taskTotal.value = res?.total ?? items.length;
  } catch {
    message.error('加载自定义提醒失败');
    taskList.value = [];
    taskTotal.value = 0;
  } finally {
    taskLoading.value = false;
  }
}

async function loadDeliveries() {
  deliveryLoading.value = true;
  try {
    const res: any = await listOpsReminderDelivery({
      page: deliveryPage.value,
      size: deliveryPageSize.value,
    });
    const items = Array.isArray(res) ? res : res?.items || [];
    deliveryList.value = items;
    deliveryTotal.value = res?.total ?? items.length;
  } catch {
    message.error('加载投递记录失败');
    deliveryList.value = [];
    deliveryTotal.value = 0;
  } finally {
    deliveryLoading.value = false;
  }
}

function handleTaskTableChange(pag: any) {
  taskPage.value = pag.current;
  taskPageSize.value = pag.pageSize;
  loadTasks();
}

function handleDeliveryTableChange(pag: any) {
  deliveryPage.value = pag.current;
  deliveryPageSize.value = pag.pageSize;
  loadDeliveries();
}

function openCreateRule() {
  editingRuleId.value = null;
  ruleForm.scene = 'trial_expire';
  ruleForm.name = '';
  ruleForm.advance_days = 7;
  ruleForm.enabled = 1;
  ruleForm.channels = ['inbox'];
  ruleForm.remark = '';
  ruleFormVisible.value = true;
}

function openEditRule(record: OpsReminderRuleItem) {
  editingRuleId.value = record.id!;
  ruleForm.scene = record.scene;
  ruleForm.name = record.name;
  ruleForm.advance_days = record.advance_days;
  ruleForm.enabled = record.enabled;
  ruleForm.channels = record.channels?.length ? [...record.channels] : ['inbox'];
  ruleForm.remark = record.remark || '';
  ruleFormVisible.value = true;
}

async function handleSubmitRule() {
  if (!ruleForm.name.trim()) {
    message.warning('请填写规则名称');
    return;
  }
  submitLoading.value = true;
  try {
    if (editingRuleId.value) {
      await updateOpsReminderRule({
        id: editingRuleId.value,
        name: ruleForm.name,
        advance_days: ruleForm.advance_days,
        enabled: ruleForm.enabled,
        channels: ruleForm.channels,
        remark: ruleForm.remark,
      });
      message.success('规则已更新');
    } else {
      await createOpsReminderRule({
        scene: ruleForm.scene,
        name: ruleForm.name,
        advance_days: ruleForm.advance_days,
        enabled: ruleForm.enabled,
        channels: ruleForm.channels,
        remark: ruleForm.remark,
      });
      message.success('规则已创建');
    }
    ruleFormVisible.value = false;
    await loadRules();
  } catch {
    message.error(editingRuleId.value ? '更新规则失败' : '创建规则失败');
  } finally {
    submitLoading.value = false;
  }
}

async function toggleEnabled(record: OpsReminderRuleItem, checked: boolean) {
  try {
    await updateOpsReminderRule({
      id: record.id!,
      enabled: checked ? 1 : 2,
      name: record.name,
      advance_days: record.advance_days,
    });
    message.success(checked ? '已启用' : '已停用');
    await loadRules();
  } catch {
    message.error('更新状态失败');
  }
}

function openCreateTask() {
  editingTaskId.value = null;
  taskForm.title = '';
  taskForm.due_at = undefined;
  taskForm.advance_days = 1;
  taskForm.target_user_id = undefined;
  taskForm.customer_id = undefined;
  taskForm.channels = ['inbox'];
  taskForm.content = '';
  taskForm.status = 'pending';
  taskFormVisible.value = true;
}

function openEditTask(record: OpsReminderTaskItem) {
  editingTaskId.value = record.id!;
  taskForm.title = record.title;
  taskForm.due_at = record.due_at;
  taskForm.advance_days = record.advance_days;
  taskForm.target_user_id = record.target_user_id;
  taskForm.customer_id = record.customer_id;
  taskForm.channels = record.channels?.length ? [...record.channels] : ['inbox'];
  taskForm.content = record.content || '';
  taskForm.status = record.status || 'pending';
  taskFormVisible.value = true;
}

async function handleSubmitTask() {
  if (!taskForm.title.trim() || !taskForm.due_at || !taskForm.target_user_id) {
    message.warning('请填写标题、到期时间和接收人');
    return;
  }
  submitLoading.value = true;
  try {
    if (editingTaskId.value) {
      await updateOpsReminderTask({
        id: editingTaskId.value,
        title: taskForm.title,
        due_at: taskForm.due_at,
        advance_days: taskForm.advance_days,
        channels: taskForm.channels,
        target_user_id: taskForm.target_user_id,
        content: taskForm.content,
        status: taskForm.status,
      });
      message.success('提醒已更新');
    } else {
      await createOpsReminderTask({
        title: taskForm.title,
        due_at: taskForm.due_at,
        advance_days: taskForm.advance_days,
        channels: taskForm.channels,
        target_user_id: taskForm.target_user_id,
        customer_id: taskForm.customer_id || 0,
        content: taskForm.content,
      });
      message.success('提醒已创建');
    }
    taskFormVisible.value = false;
    await loadTasks();
  } catch {
    message.error(editingTaskId.value ? '更新提醒失败' : '创建提醒失败');
  } finally {
    submitLoading.value = false;
  }
}

async function handleDeleteTask(id?: number) {
  if (!id) return;
  try {
    await deleteOpsReminderTask(id);
    message.success('已删除');
    await loadTasks();
  } catch {
    message.error('删除失败');
  }
}

async function handlePreview() {
  previewLoading.value = true;
  previewVisible.value = true;
  try {
    const res: any = await previewOpsReminderHits();
    const items: OpsReminderHit[] = Array.isArray(res) ? res : res?.items || [];
    previewHits.value = items.map((item, index) => ({
      ...item,
      rowKey: `${item.source_type || 'rule'}-${item.rule_id || item.task_id || 0}-${item.biz_id || 0}-${index}`,
    }));
  } catch {
    message.error('预览命中失败');
    previewHits.value = [];
  } finally {
    previewLoading.value = false;
  }
}

async function handleScan() {
  scanLoading.value = true;
  try {
    const res: any = await scanOpsReminder();
    message.success(
      `扫描完成：命中 ${res?.hit_count ?? 0}，通知 ${res?.notify_count ?? 0}，投递 ${res?.delivery_count ?? 0}，跳过无负责人 ${res?.skipped_no_owner ?? 0}`,
    );
    if (activeTab.value === 'deliveries') {
      await loadDeliveries();
    }
  } catch {
    message.error('扫描发送失败');
  } finally {
    scanLoading.value = false;
  }
}

function openHitLink(link: string) {
  if (!link) return;
  if (link.startsWith('http://') || link.startsWith('https://')) {
    window.open(link, '_blank');
    return;
  }
  router.push(link);
}

watch(activeTab, (key) => {
  if (key === 'tasks') loadTasks();
  if (key === 'deliveries') loadDeliveries();
});

onMounted(loadRules);
</script>

<style scoped>
.ops-page {
  padding: 12px;
}
</style>

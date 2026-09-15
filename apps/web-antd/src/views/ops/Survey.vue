<template>
  <div class="ops-page">
    <a-card title="客户问卷">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="openInvite">生成外链发给客户</a-button>
          <a-button @click="openSubmit">运营代填</a-button>
        </a-space>
      </template>
      <a-tabs v-model:activeKey="tab">
        <a-tab-pane key="templates" tab="问卷模板">
          <a-table :data-source="surveys" :columns="surveyColumns" :loading="loading" row-key="id" bordered />
        </a-tab-pane>
        <a-tab-pane key="invites" tab="外链记录">
          <a-table
            :data-source="invites"
            :columns="inviteColumns"
            :loading="inviteLoading"
            :pagination="invitePagination"
            row-key="id"
            bordered
            @change="onInviteTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === 'used' ? 'default' : 'processing'">
                  {{ record.status === 'used' ? '已填写' : '待填写' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button
                  type="link"
                  size="small"
                  :disabled="record.status === 'used'"
                  @click="copyInviteLink(record)"
                >
                  复制链接
                </a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="responses" tab="作答记录">
          <a-table
            :data-source="responses"
            :columns="responseColumns"
            :loading="respLoading"
            :pagination="respPagination"
            row-key="id"
            bordered
            @change="onRespTableChange"
          />
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      :open="inviteVisible"
      title="生成问卷外链"
      :confirm-loading="inviteLoadingSubmit"
      ok-text="生成并复制"
      @ok="handleCreateInvite"
      @cancel="inviteVisible = false"
    >
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 12px"
        message="生成后复制链接发给客户，客户无需登录即可填写；每个链接默认只能填一次。"
      />
      <a-form layout="vertical">
        <a-form-item label="问卷" required>
          <a-select v-model:value="inviteForm.survey_code" :options="surveyOptions" />
        </a-form-item>
        <a-form-item label="客户" required>
          <OpsCustomerSelect v-model="inviteForm.customer_id" placeholder="选择客户" />
        </a-form-item>
        <a-form-item label="有效天数">
          <a-input-number v-model:value="inviteForm.expire_days" :min="1" :max="365" style="width: 100%" />
        </a-form-item>
      </a-form>
      <a-input
        v-if="lastInviteURL"
        :value="lastInviteURL"
        readonly
        style="margin-top: 8px"
        addon-before="链接"
      />
    </a-modal>

    <a-modal
      :open="visible"
      title="运营代填问卷"
      :confirm-loading="submitLoading"
      @ok="handleSubmit"
      @cancel="visible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="问卷" required>
          <a-select v-model:value="form.survey_code" :options="surveyOptions" />
        </a-form-item>
        <a-form-item label="客户" required>
          <OpsCustomerSelect v-model="form.customer_id" placeholder="选择客户" />
        </a-form-item>
        <a-form-item label="评分（1-5）">
          <a-input-number v-model:value="form.score" :min="1" :max="5" style="width: 100%" />
        </a-form-item>
        <a-form-item label="反馈内容" required>
          <a-textarea v-model:value="form.content" :rows="4" placeholder="服务情况 / 不续费原因等" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';

import OpsCustomerSelect from '#/views/ops/components/OpsCustomerSelect.vue';
import {
  createOpsSurveyInvite,
  listOpsSurvey,
  listOpsSurveyInvite,
  listOpsSurveyResponse,
  submitOpsSurvey,
  type OpsSurveyItem,
} from '#/api/core/ops/survey';

const tab = ref('templates');
const loading = ref(false);
const respLoading = ref(false);
const inviteLoading = ref(false);
const submitLoading = ref(false);
const inviteLoadingSubmit = ref(false);
const visible = ref(false);
const inviteVisible = ref(false);
const surveys = ref<OpsSurveyItem[]>([]);
const responses = ref<any[]>([]);
const invites = ref<any[]>([]);
const respPage = ref(1);
const respSize = ref(20);
const respTotal = ref(0);
const invitePage = ref(1);
const inviteSize = ref(20);
const inviteTotal = ref(0);
const lastInviteURL = ref('');

const form = reactive({
  survey_code: 'formal_csat',
  customer_id: null as number | null,
  score: 5,
  content: '',
});

const inviteForm = reactive({
  survey_code: 'formal_csat',
  customer_id: null as number | null,
  expire_days: 30,
});

const surveyColumns = [
  { title: '编码', dataIndex: 'code', key: 'code', width: 140 },
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '类型', dataIndex: 'survey_type', key: 'survey_type', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
];

const responseColumns = [
  { title: '客户ID', dataIndex: 'customer_id', key: 'customer_id', width: 90 },
  { title: '类型', dataIndex: 'survey_type', key: 'survey_type', width: 120 },
  { title: '评分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '作答', dataIndex: 'answers', key: 'answers', ellipsis: true },
  { title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at', width: 180 },
];

const inviteColumns = [
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
  { title: '问卷', dataIndex: 'survey_code', key: 'survey_code', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '过期时间', dataIndex: 'expire_at', key: 'expire_at', width: 180 },
  { title: '操作', key: 'action', width: 100 },
];

const surveyOptions = computed(() =>
  surveys.value.map((s) => ({ label: `${s.title} (${s.code})`, value: s.code })),
);

const respPagination = computed(() => ({
  current: respPage.value,
  pageSize: respSize.value,
  total: respTotal.value,
  showTotal: (t: number) => `共 ${t} 条`,
}));

const invitePagination = computed(() => ({
  current: invitePage.value,
  pageSize: inviteSize.value,
  total: inviteTotal.value,
  showTotal: (t: number) => `共 ${t} 条`,
}));

function inviteURL(token: string) {
  // 后端返回完整 url；列表复制时用当前后端端口兜底
  return `http://127.0.0.1:8889/public/survey?token=${token}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('链接已复制，可发给客户');
  } catch {
    message.info(text);
  }
}

async function loadSurveys() {
  loading.value = true;
  try {
    const res: any = await listOpsSurvey();
    surveys.value = Array.isArray(res) ? res : res?.items || [];
  } catch {
    message.error('加载问卷失败');
  } finally {
    loading.value = false;
  }
}

async function loadResponses() {
  respLoading.value = true;
  try {
    const res: any = await listOpsSurveyResponse({
      page: respPage.value,
      size: respSize.value,
    });
    const items = Array.isArray(res) ? res : res?.items || [];
    responses.value = items.map((i: any) => ({
      ...i,
      answers: typeof i.answers === 'object' ? JSON.stringify(i.answers) : i.answers,
    }));
    respTotal.value = res?.total ?? items.length;
  } catch {
    message.error('加载作答失败');
  } finally {
    respLoading.value = false;
  }
}

async function loadInvites() {
  inviteLoading.value = true;
  try {
    const res: any = await listOpsSurveyInvite({
      page: invitePage.value,
      size: inviteSize.value,
    });
    invites.value = Array.isArray(res) ? res : res?.items || [];
    inviteTotal.value = res?.total ?? invites.value.length;
  } catch {
    message.error('加载外链记录失败');
  } finally {
    inviteLoading.value = false;
  }
}

function onRespTableChange(pag: any) {
  respPage.value = pag.current;
  respSize.value = pag.pageSize;
  loadResponses();
}

function onInviteTableChange(pag: any) {
  invitePage.value = pag.current;
  inviteSize.value = pag.pageSize;
  loadInvites();
}

function openSubmit() {
  form.survey_code = surveys.value[0]?.code || 'formal_csat';
  form.customer_id = null;
  form.score = 5;
  form.content = '';
  visible.value = true;
}

function openInvite() {
  inviteForm.survey_code = surveys.value[0]?.code || 'formal_csat';
  inviteForm.customer_id = null;
  inviteForm.expire_days = 30;
  lastInviteURL.value = '';
  inviteVisible.value = true;
}

async function handleCreateInvite() {
  if (!inviteForm.survey_code || !inviteForm.customer_id) {
    message.warning('请选择问卷和客户');
    return;
  }
  inviteLoadingSubmit.value = true;
  try {
    const res: any = await createOpsSurveyInvite({
      survey_code: inviteForm.survey_code,
      customer_id: inviteForm.customer_id,
      expire_days: inviteForm.expire_days,
    });
    const url = res?.url || inviteURL(res?.token);
    lastInviteURL.value = url;
    await copyText(url);
    if (tab.value === 'invites') await loadInvites();
  } catch (e: any) {
    message.error(e?.message || '生成失败');
  } finally {
    inviteLoadingSubmit.value = false;
  }
}

function copyInviteLink(record: any) {
  copyText(inviteURL(record.token));
}

async function handleSubmit() {
  if (!form.survey_code || !form.customer_id || !form.content.trim()) {
    message.warning('请完善问卷信息');
    return;
  }
  submitLoading.value = true;
  try {
    await submitOpsSurvey({
      survey_code: form.survey_code,
      customer_id: form.customer_id,
      score: form.score,
      answers: {
        content: form.content,
        score: form.score,
      },
    });
    message.success('问卷已提交');
    visible.value = false;
    if (tab.value === 'responses') await loadResponses();
  } catch {
    message.error('提交失败');
  } finally {
    submitLoading.value = false;
  }
}

watch(tab, (k) => {
  if (k === 'responses') loadResponses();
  if (k === 'invites') loadInvites();
});

onMounted(loadSurveys);
</script>

<style scoped>
.ops-page {
  padding: 12px;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { message, Upload } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import {
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';

import {
  type OpsAttachmentItem,
  deleteOpsAttachment,
  downloadOpsActivationTemplate,
  downloadOpsAttachment,
  listOpsAttachment,
  uploadOpsAttachment,
} from '#/api/core/ops/attachment';

const props = withDefaults(
  defineProps<{
    /** trial=测试开通 formal=正式开通 */
    scene: 'trial' | 'formal';
    /** 试用单 ID 或正式开通单 ID */
    bizId: number;
    /** 正式开通时可附带合同 ID，用于上传合同扫描件 */
    contractId?: number;
    compact?: boolean;
  }>(),
  { contractId: 0, compact: false },
);

const sheetBizType = computed(() =>
  props.scene === 'formal' ? 'activation_sheet' : 'trial_sheet',
);
const emailBizType = computed(() =>
  props.scene === 'formal' ? 'activation_email' : 'trial_email',
);
const sceneLabel = computed(() =>
  props.scene === 'formal' ? '正式开通' : '测试开通',
);

const loading = ref(false);
const sheets = ref<OpsAttachmentItem[]>([]);
const emails = ref<OpsAttachmentItem[]>([]);
const contracts = ref<OpsAttachmentItem[]>([]);
const uploadingSheet = ref(false);
const uploadingEmail = ref(false);
const uploadingContract = ref(false);
const downloadingTpl = ref(false);

async function loadAll() {
  if (!props.bizId) {
    sheets.value = [];
    emails.value = [];
    contracts.value = [];
    return;
  }
  loading.value = true;
  try {
    const tasks: Promise<any>[] = [
      listOpsAttachment(sheetBizType.value, props.bizId),
      listOpsAttachment(emailBizType.value, props.bizId),
    ];
    if (props.contractId > 0) {
      tasks.push(listOpsAttachment('contract', props.contractId));
    }
    const results = await Promise.all(tasks);
    sheets.value = Array.isArray(results[0]) ? results[0] : results[0]?.items || [];
    emails.value = Array.isArray(results[1]) ? results[1] : results[1]?.items || [];
    if (props.contractId > 0) {
      contracts.value = Array.isArray(results[2])
        ? results[2]
        : results[2]?.items || [];
    } else {
      contracts.value = [];
    }
  } catch {
    message.error('加载开通材料失败');
  } finally {
    loading.value = false;
  }
}

async function handleDownloadTpl() {
  downloadingTpl.value = true;
  try {
    const blob = await downloadOpsActivationTemplate(props.scene);
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      props.scene === 'formal'
        ? '思明智算业务开通单v1.0-正式开通.xlsx'
        : '思明智算业务开通单v1.0-测试开通.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    message.error(e?.message || '模版下载失败');
  } finally {
    downloadingTpl.value = false;
  }
}

function makeUploader(
  bizType: string | (() => string),
  getBizId: () => number,
  loadingRef: typeof uploadingSheet,
): UploadProps['beforeUpload'] {
  return async (file) => {
    const type = typeof bizType === 'function' ? bizType() : bizType;
    const bizId = Number(getBizId());
    if (!Number.isFinite(bizId) || bizId <= 0) {
      message.warning('业务单据尚未创建，无法上传');
      return Upload.LIST_IGNORE;
    }
    loadingRef.value = true;
    try {
      await uploadOpsAttachment(type, bizId, file as File);
      message.success('上传成功');
      await loadAll();
    } catch (e: any) {
      message.error(e?.message || '上传失败');
    } finally {
      loadingRef.value = false;
    }
    return Upload.LIST_IGNORE;
  };
}

const beforeSheet = computed(() =>
  makeUploader(
    () => sheetBizType.value,
    () => Number(props.bizId),
    uploadingSheet,
  ),
);
const beforeEmail = computed(() =>
  makeUploader(
    () => emailBizType.value,
    () => Number(props.bizId),
    uploadingEmail,
  ),
);
const beforeContract = computed(() =>
  makeUploader(
    'contract',
    () => Number(props.contractId || 0),
    uploadingContract,
  ),
);

async function handleDownload(item: OpsAttachmentItem) {
  try {
    const blob = await downloadOpsAttachment(item.id);
    const url = window.URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.file_name;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch {
    message.error('下载失败');
  }
}

async function handleDelete(item: OpsAttachmentItem) {
  try {
    await deleteOpsAttachment(item.id);
    message.success('已删除');
    await loadAll();
  } catch {
    message.error('删除失败');
  }
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

watch(
  () => [props.scene, props.bizId, props.contractId],
  () => loadAll(),
);

onMounted(loadList);

function loadList() {
  loadAll();
}

defineExpose({ reload: loadAll });
</script>

<template>
  <div class="ops-delivery-pack" :class="{ compact }">
    <a-alert
      type="info"
      show-icon
      style="margin-bottom: 12px"
      :message="`${sceneLabel}材料：下载标准开通单模版 → 填写后上传 → 再上传相关邮件佐证`"
    />

    <div class="toolbar">
      <a-button :loading="downloadingTpl" @click="handleDownloadTpl">
        <template #icon><DownloadOutlined /></template>
        下载开通单模版
      </a-button>
      <span class="hint">测试/正式共用同一 Excel，仅业务意义不同</span>
    </div>

    <a-spin :spinning="loading">
      <a-card size="small" title="开通单（已填写）" class="mb12">
        <template #extra>
          <a-upload
            :before-upload="beforeSheet"
            :show-upload-list="false"
            :disabled="!bizId"
            accept=".xlsx,.xls"
          >
            <a-button size="small" type="primary" :loading="uploadingSheet" :disabled="!bizId">
              <template #icon><UploadOutlined /></template>
              上传开通单
            </a-button>
          </a-upload>
        </template>
        <a-empty v-if="!sheets.length" description="尚未上传开通单" />
        <a-list v-else :data-source="sheets" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :title="item.file_name" :description="formatSize(item.size)" />
              <template #actions>
                <a @click="handleDownload(item)">下载</a>
                <a-popconfirm title="确认删除？" @confirm="handleDelete(item)">
                  <a class="danger">删除</a>
                </a-popconfirm>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <a-card size="small" title="邮件佐证" class="mb12">
        <template #extra>
          <a-upload
            :before-upload="beforeEmail"
            :show-upload-list="false"
            :disabled="!bizId"
            accept=".eml,.msg,.pdf,.png,.jpg,.jpeg,.zip"
          >
            <a-button size="small" type="primary" :loading="uploadingEmail" :disabled="!bizId">
              <template #icon><UploadOutlined /></template>
              上传邮件
            </a-button>
          </a-upload>
        </template>
        <a-empty v-if="!emails.length" description="尚未上传邮件佐证" />
        <a-list v-else :data-source="emails" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :title="item.file_name" :description="formatSize(item.size)" />
              <template #actions>
                <a @click="handleDownload(item)">下载</a>
                <a-popconfirm title="确认删除？" @confirm="handleDelete(item)">
                  <a class="danger">删除</a>
                </a-popconfirm>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>

      <a-card v-if="contractId > 0" size="small" title="关联合同附件">
        <template #extra>
          <a-upload
            :before-upload="beforeContract"
            :show-upload-list="false"
            :disabled="!contractId"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
          >
            <a-button
              size="small"
              type="primary"
              :loading="uploadingContract"
              :disabled="!contractId"
            >
              <template #icon><UploadOutlined /></template>
              上传合同
            </a-button>
          </a-upload>
        </template>
        <a-empty v-if="!contracts.length" description="尚未上传合同扫描件" />
        <a-list v-else :data-source="contracts" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta :title="item.file_name" :description="formatSize(item.size)" />
              <template #actions>
                <a @click="handleDownload(item)">下载</a>
                <a-popconfirm title="确认删除？" @confirm="handleDelete(item)">
                  <a class="danger"><DeleteOutlined /> 删除</a>
                </a-popconfirm>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </a-spin>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.hint {
  color: #8c8c8c;
  font-size: 12px;
}
.mb12 {
  margin-bottom: 12px;
}
.danger {
  color: #ff4d4f;
}
.ops-delivery-pack.compact :deep(.ant-card-head) {
  min-height: 36px;
}
</style>

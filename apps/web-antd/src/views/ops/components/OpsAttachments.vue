<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { message, Upload } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import { DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons-vue';

import {
  type OpsAttachmentItem,
  deleteOpsAttachment,
  downloadOpsAttachment,
  listOpsAttachment,
  uploadOpsAttachment,
} from '#/api/core/ops/attachment';

const props = defineProps<{
  bizType:
    | 'contract'
    | 'settlement'
    | 'exhibition'
    | 'trial_sheet'
    | 'trial_email'
    | 'activation_sheet'
    | 'activation_email';
  bizId: number;
}>();

const loading = ref(false);
const uploading = ref(false);
const list = ref<OpsAttachmentItem[]>([]);

async function loadList() {
  if (!props.bizId) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    const res: any = await listOpsAttachment(props.bizType, props.bizId);
    list.value = Array.isArray(res) ? res : res?.items || [];
  } catch {
    message.error('加载附件失败');
    list.value = [];
  } finally {
    loading.value = false;
  }
}

const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
  const bizId = Number(props.bizId);
  if (!Number.isFinite(bizId) || bizId <= 0) {
    message.warning('业务单据尚未创建，无法上传');
    return Upload.LIST_IGNORE;
  }
  uploading.value = true;
  try {
    await uploadOpsAttachment(props.bizType, bizId, file as File);
    message.success('上传成功');
    await loadList();
  } catch (e: any) {
    message.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
  return Upload.LIST_IGNORE;
};

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
    await loadList();
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
  () => [props.bizType, props.bizId],
  () => loadList(),
);

onMounted(loadList);
</script>

<template>
  <div class="ops-attachments">
    <div class="ops-attachments__toolbar">
      <a-upload :before-upload="beforeUpload" :show-upload-list="false" :disabled="!bizId">
        <a-button type="primary" :loading="uploading" :disabled="!bizId">
          <template #icon><UploadOutlined /></template>
          上传附件
        </a-button>
      </a-upload>
      <span class="hint">支持 PDF / Office / 图片 / ZIP / EML，单文件默认 ≤20MB</span>
    </div>
    <a-spin :spinning="loading">
      <a-empty v-if="!list.length" description="暂无附件" />
      <a-list v-else :data-source="list" size="small" bordered>
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta :title="item.file_name" :description="formatSize(item.size)" />
            <template #actions>
              <a @click="handleDownload(item)"><DownloadOutlined /> 下载</a>
              <a-popconfirm title="确认删除该附件？" @confirm="handleDelete(item)">
                <a class="danger"><DeleteOutlined /> 删除</a>
              </a-popconfirm>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-spin>
  </div>
</template>

<style scoped>
.ops-attachments__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.hint {
  color: #8c8c8c;
  font-size: 12px;
}
.danger {
  color: #ff4d4f;
}
</style>

<template>
  <div>
    <a-modal
      :open="commentDialog.visible"
      title="添加评论"
      :width="dialogWidth"
      :confirm-loading="loading"
      ok-text="发布评论"
      cancel-text="取消"
      wrap-class-name="wo-record-modal"
      destroy-on-close
      @ok="saveComment"
      @cancel="commentDialog.visible = false"
    >
      <a-textarea
        v-model:value="commentDialog.form.content"
        :rows="5"
        placeholder="输入评论内容"
        show-count
        :maxlength="500"
      />
    </a-modal>

    <a-modal
      :open="commentsViewDialog.visible"
      title="工单评论"
      :width="previewDialogWidth"
      :footer="null"
      centered
      wrap-class-name="wo-record-modal"
      @cancel="commentsViewDialog.visible = false"
    >
      <div class="wo-record-shell">
        <div class="wo-record-toolbar">
          <div class="wo-record-toolbar-meta">
            <template v-if="instance?.serial_number">{{ instance.serial_number }} · </template>
            {{ commentsList.length }} 条评论
          </div>
          <div class="wo-record-toolbar-actions">
            <a-button size="small" :loading="loading" @click="refreshComments">刷新</a-button>
          </div>
        </div>

        <div ref="chatListRef" class="wo-chat-list">
          <a-spin :spinning="loading">
            <a-empty
              v-if="!loading && sortedComments.length === 0"
              description="还没有评论，在下方发第一条"
            />
            <div
              v-for="comment in sortedComments"
              :key="comment.id"
              class="wo-chat-item"
            >
              <a-avatar :size="32" :style="{ backgroundColor: getAvatarColor(comment.operator_name) }">
                {{ getInitials(comment.operator_name) }}
              </a-avatar>
              <div class="wo-chat-body">
                <div class="wo-chat-meta">
                  <span class="wo-chat-name">{{ comment.operator_name || '未知用户' }}</span>
                  <a-tag v-if="comment.is_system === 1" color="orange">系统</a-tag>
                  <span class="wo-chat-time">{{ formatRelativeTime(comment.created_at) }}</span>
                </div>
                <div v-if="comment.content" class="wo-chat-bubble">{{ comment.content }}</div>
                <div v-if="comment.attachments?.length" class="wo-chat-attachments">
                  <div
                    v-for="file in comment.attachments"
                    :key="file.id"
                    class="wo-chat-attachment"
                  >
                    <a-image
                      v-if="isImageAttachment(file) && previewObjectUrls[file.id]"
                      :src="previewObjectUrls[file.id]"
                      :width="120"
                    />
                    <button
                      v-else-if="isImageAttachment(file)"
                      type="button"
                      class="wo-chat-file"
                      @click="handleDownloadAttachment(file)"
                    >
                      <span class="wo-chat-file-name">{{ file.file_name }}</span>
                      <span class="wo-chat-file-size">{{ formatFileSize(file.size) }}</span>
                    </button>
                    <button
                      v-else
                      type="button"
                      class="wo-chat-file"
                      @click="handleDownloadAttachment(file)"
                    >
                      <span class="wo-chat-file-name">{{ file.file_name }}</span>
                      <span class="wo-chat-file-size">{{ formatFileSize(file.size) }}</span>
                    </button>
                  </div>
                </div>
                <div class="wo-chat-actions">
                  <a-button type="link" size="small" @click="startReply(comment)">回复</a-button>
                  <a-button type="link" size="small" @click="startQuote(comment)">引用</a-button>
                  <a-button
                    v-if="comment.content"
                    type="link"
                    size="small"
                    @click="copyComment(comment.content)"
                  >
                    复制
                  </a-button>
                </div>
                <div v-if="comment.children?.length" class="wo-chat-replies">
                  <div
                    v-for="reply in comment.children"
                    :key="reply.id"
                    class="wo-chat-item"
                  >
                    <a-avatar :size="24" :style="{ backgroundColor: getAvatarColor(reply.operator_name) }">
                      {{ getInitials(reply.operator_name) }}
                    </a-avatar>
                    <div class="wo-chat-body">
                      <div class="wo-chat-meta">
                        <span class="wo-chat-name">{{ reply.operator_name || '未知用户' }}</span>
                        <span class="wo-chat-time">{{ formatRelativeTime(reply.created_at) }}</span>
                      </div>
                      <div v-if="reply.content" class="wo-chat-bubble">{{ reply.content }}</div>
                      <div v-if="reply.attachments?.length" class="wo-chat-attachments">
                        <div
                          v-for="file in reply.attachments"
                          :key="file.id"
                          class="wo-chat-attachment"
                        >
                          <a-image
                            v-if="isImageAttachment(file) && previewObjectUrls[file.id]"
                            :src="previewObjectUrls[file.id]"
                            :width="100"
                          />
                          <button
                            v-else
                            type="button"
                            class="wo-chat-file"
                            @click="handleDownloadAttachment(file)"
                          >
                            <span class="wo-chat-file-name">{{ file.file_name }}</span>
                            <span class="wo-chat-file-size">{{ formatFileSize(file.size) }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-spin>
        </div>

        <div class="wo-chat-composer">
          <div v-if="composingReply || composingQuote" class="wo-chat-quote">
            <div class="wo-chat-quote-text">
              <template v-if="composingReply">回复 @{{ composingReply.operator_name }}</template>
              <template v-else-if="composingQuote">
                引用 @{{ composingQuote.operator_name }}：{{ truncateText(composingQuote.content, 48) }}
              </template>
            </div>
            <a-button type="text" size="small" @click="clearComposerContext">取消</a-button>
          </div>
          <a-textarea
            ref="quickTextareaRef"
            v-model:value="quickCommentText"
            :placeholder="composerPlaceholder"
            :rows="2"
            :maxlength="500"
            @keydown.ctrl.enter="submitQuickComment"
          />
          <div v-if="pendingAttachments.length" class="wo-pending-files">
            <div
              v-for="item in pendingAttachments"
              :key="item.id"
              class="wo-pending-file"
            >
              <span class="wo-pending-name">{{ item.file_name }}</span>
              <span class="wo-pending-size">{{ formatFileSize(item.size) }}</span>
              <a-button type="link" size="small" danger @click="removePendingAttachment(item.id)">
                移除
              </a-button>
            </div>
          </div>
          <div class="wo-chat-composer-actions">
            <div class="wo-composer-left">
              <a-upload
                :show-upload-list="false"
                :multiple="true"
                :before-upload="beforeUploadAttachment"
                :disabled="uploadingAttachment || pendingAttachments.length >= maxAttachmentCount"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.log,.md,.docx,.xlsx,.pptx,.zip"
              >
                <a-button size="small" :loading="uploadingAttachment">附件</a-button>
              </a-upload>
              <span class="wo-chat-hint">最多 {{ maxAttachmentCount }} 个，单文件 10MB</span>
            </div>
            <div class="wo-composer-right">
              <span class="wo-chat-hint">Ctrl + Enter 发送</span>
              <a-button
                type="primary"
                size="small"
                :loading="quickCommenting"
                :disabled="uploadingAttachment"
                @click="submitQuickComment"
              >
                发送
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';

import {
  CommentType,
  createWorkorderInstanceComment,
  deleteCommentAttachment,
  downloadCommentAttachment,
  getInstanceCommentsTree,
  uploadCommentAttachment,
  type CommentAttachment,
  type CreateWorkorderInstanceCommentReq,
  type GetInstanceCommentsTreeReq,
  type WorkorderInstanceCommentItem,
} from '#/api/core/workorder/workorder_instance_comment';
import type { WorkorderInstanceItem } from '#/api/core/workorder/workorder_instance';

import './workorder-record-dialog.css';

const emit = defineEmits<{
  commentAdded: [];
}>();

interface Props {
  instance?: WorkorderInstanceItem;
}

withDefaults(defineProps<Props>(), {
  instance: undefined,
});

const maxAttachmentCount = 5;
const maxAttachmentSize = 10 * 1024 * 1024;

const loading = ref(false);
const commentsList = ref<WorkorderInstanceCommentItem[]>([]);
const quickCommenting = ref(false);
const uploadingAttachment = ref(false);
const quickCommentText = ref('');
const composingReply = ref<WorkorderInstanceCommentItem | null>(null);
const composingQuote = ref<WorkorderInstanceCommentItem | null>(null);
const pendingAttachments = ref<CommentAttachment[]>([]);
const previewObjectUrls = ref<Record<number, string>>({});
const chatListRef = ref<HTMLElement | null>(null);
const quickTextareaRef = ref();

const commentDialog = reactive({
  visible: false,
  form: {
    instance_id: 0,
    content: '',
  } as CreateWorkorderInstanceCommentReq,
});

const commentsViewDialog = reactive({
  visible: false,
  instanceId: 0,
});

const dialogWidth = computed(() => {
  if (typeof window === 'undefined') return '600px';
  const width = window.innerWidth;
  if (width < 768) return '95%';
  if (width < 1024) return '80%';
  return '600px';
});

const previewDialogWidth = computed(() => {
  if (typeof window === 'undefined') return 720;
  const width = window.innerWidth;
  if (width < 768) return '96%';
  if (width < 1024) return 680;
  return 720;
});

const composerPlaceholder = computed(() => {
  if (composingReply.value) return `回复 ${composingReply.value.operator_name}...`;
  if (composingQuote.value) return '补充说明后发送';
  return '输入消息或添加附件，Ctrl + Enter 发送';
});

const sortedComments = computed(() => {
  return [...commentsList.value].sort((a, b) => {
    return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
  });
});

const formatRelativeTime = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFileSize = (size: number) => {
  if (!size || size < 0) return '0B';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
};

const getInitials = (name: string | undefined) => {
  if (!name) return '';
  return name.split('').slice(0, 2).join('').toUpperCase();
};

const getAvatarColor = (name: string | undefined) => {
  if (!name) return '#1677ff';
  const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#13c2c2', '#722ed1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
};

const isImageAttachment = (file: CommentAttachment) => {
  return (file.content_type || '').startsWith('image/');
};

const ensurePreviewBlob = async (id: number) => {
  if (previewObjectUrls.value[id]) return;
  try {
    const blob = await downloadCommentAttachment(id);
    previewObjectUrls.value[id] = URL.createObjectURL(blob);
  } catch {
    // 预览失败时走下载按钮
  }
};

const scrollChatToBottom = async () => {
  await nextTick();
  const el = chatListRef.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
};

const focusComposer = () => {
  nextTick(() => {
    const textarea =
      quickTextareaRef.value?.$el?.querySelector?.('textarea') ||
      quickTextareaRef.value?.resizableTextArea?.textArea;
    textarea?.focus?.();
  });
};

const startReply = (comment: WorkorderInstanceCommentItem) => {
  composingReply.value = comment;
  composingQuote.value = null;
  focusComposer();
};

const startQuote = (comment: WorkorderInstanceCommentItem) => {
  composingQuote.value = comment;
  composingReply.value = null;
  focusComposer();
};

const clearComposerContext = () => {
  composingReply.value = null;
  composingQuote.value = null;
};

const copyComment = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
};

const loadComments = async (instanceId: number) => {
  try {
    loading.value = true;
    const params: GetInstanceCommentsTreeReq = { id: instanceId };
    const res = await getInstanceCommentsTree(params);
    commentsList.value = res || [];
    const imageIds: number[] = [];
    const collect = (items: WorkorderInstanceCommentItem[]) => {
      for (const item of items) {
        for (const file of item.attachments || []) {
          if (isImageAttachment(file)) imageIds.push(file.id);
        }
        if (item.children?.length) collect(item.children);
      }
    };
    collect(commentsList.value);
    await Promise.all(imageIds.map((id) => ensurePreviewBlob(id)));
    await scrollChatToBottom();
  } catch (error: any) {
    message.error(`加载评论失败: ${error.message || '未知错误'}`);
    commentsList.value = [];
  } finally {
    loading.value = false;
    await scrollChatToBottom();
  }
};

const refreshComments = async () => {
  if (commentsViewDialog.instanceId) {
    await loadComments(commentsViewDialog.instanceId);
  }
};

const buildSendContent = () => {
  const text = quickCommentText.value.trim();
  if (!composingQuote.value) return text;
  const quoted = truncateText(composingQuote.value.content || '', 80);
  return `引用 @${composingQuote.value.operator_name}：${quoted}\n${text}`.trim();
};

const beforeUploadAttachment = async (file: File & { originFileObj?: File }) => {
  if (!commentsViewDialog.instanceId) {
    message.warning('工单信息不存在');
    return false;
  }
  const rawFile = file.originFileObj || file;
  if (pendingAttachments.value.length >= maxAttachmentCount) {
    message.warning(`最多上传 ${maxAttachmentCount} 个附件`);
    return false;
  }
  if (rawFile.size > maxAttachmentSize) {
    message.warning('单文件不能超过 10MB');
    return false;
  }
  try {
    uploadingAttachment.value = true;
    const res = await uploadCommentAttachment(
      commentsViewDialog.instanceId,
      rawFile,
    );
    pendingAttachments.value.push(res);
    message.success(`已添加 ${rawFile.name || file.name}`);
  } catch (error: any) {
    const msg =
      typeof error === 'string'
        ? error
        : error?.message || error?.msg || '未知错误';
    message.error(`上传失败: ${msg}`);
  } finally {
    uploadingAttachment.value = false;
  }
  return false;
};

const removePendingAttachment = async (id: number) => {
  try {
    await deleteCommentAttachment(id);
  } catch {
    // 本地移除即可，避免卡住发送
  }
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id);
};

const clearPendingAttachments = () => {
  pendingAttachments.value = [];
};

const handleDownloadAttachment = async (file: CommentAttachment) => {
  try {
    const blob = await downloadCommentAttachment(file.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.file_name || `attachment-${file.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    message.error(`下载失败: ${error.message || '未知错误'}`);
  }
};

const submitQuickComment = async () => {
  const content = buildSendContent();
  const attachmentIds = pendingAttachments.value.map((item) => item.id);
  if (!content && attachmentIds.length === 0) {
    message.warning('请输入评论内容或添加附件');
    return;
  }

  try {
    quickCommenting.value = true;
    await createWorkorderInstanceComment({
      instance_id: commentsViewDialog.instanceId,
      content,
      parent_id: composingReply.value?.id,
      type: CommentType.NORMAL,
      is_system: 2,
      attachment_ids: attachmentIds,
    });
    quickCommentText.value = '';
    clearComposerContext();
    clearPendingAttachments();
    message.success('已发送');
    await refreshComments();
    emit('commentAdded');
  } catch (error: any) {
    message.error(`发送失败: ${error.message || '未知错误'}`);
  } finally {
    quickCommenting.value = false;
  }
};

const saveComment = async () => {
  try {
    if (!commentDialog.form.content?.trim()) {
      message.error('请输入评论内容');
      return;
    }
    loading.value = true;
    await createWorkorderInstanceComment({
      ...commentDialog.form,
      content: commentDialog.form.content.trim(),
      type: CommentType.NORMAL,
      is_system: 2,
    });
    message.success('评论添加成功');
    commentDialog.visible = false;
    emit('commentAdded');
  } catch (error: any) {
    message.error(`添加评论失败: ${error.message || '未知错误'}`);
  } finally {
    loading.value = false;
  }
};

const showCommentDialog = (instanceId: number) => {
  commentDialog.form = {
    instance_id: instanceId,
    content: '',
  };
  commentDialog.visible = true;
};

const showCommentsView = async (instanceId: number) => {
  commentsViewDialog.instanceId = instanceId;
  commentsViewDialog.visible = true;
  quickCommentText.value = '';
  clearComposerContext();
  clearPendingAttachments();
  await loadComments(instanceId);
};

onBeforeUnmount(() => {
  Object.values(previewObjectUrls.value).forEach((url) => URL.revokeObjectURL(url));
});

defineExpose({
  showCommentDialog,
  showCommentsView,
});
</script>

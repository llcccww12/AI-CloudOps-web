<template>
  <div class="knowledge-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon">
            <FileTextOutlined />
          </div>
          <div class="header-text">
            <h1 class="page-title">知识库管理</h1>
            <p class="page-subtitle">
              文档已按运营/运维/公共分域存放；选「全部文档」可一次看到原来的内容
            </p>
          </div>
        </div>
        <div class="header-actions">
          <a-segmented
            v-model:value="listFilter"
            :options="listFilterOptions"
            @change="onDomainChange"
          />
          <a-button type="primary" @click="refreshKnowledge" :loading="refreshing">
            <template #icon><ReloadOutlined /></template>
            同步索引到 AI
          </a-button>
        </div>
      </div>
    </div>

    <div class="knowledge-content">
      <a-alert
        class="index-hint-alert"
        type="info"
        show-icon
        message="两层存储说明"
        description="文档仍在磁盘上，已拆到运营/运维/公共三个目录。默认看「全部文档」；上传/编辑请先切到具体域。同步索引会重建向量库，RAG 才用到最新内容。"
      />
      <div class="stats-grid">
        <a-card class="stat-card">
          <a-statistic
            title="文档数量"
            :value="knowledgeStats.documents_count"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix><FileTextOutlined /></template>
          </a-statistic>
        </a-card>
        <a-card class="stat-card">
          <a-statistic
            title="向量数量"
            :value="knowledgeStats.vector_count"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix><NodeIndexOutlined /></template>
          </a-statistic>
        </a-card>
        <a-card class="stat-card">
          <a-statistic
            title="最后更新"
            :value="knowledgeStats.last_update"
            :value-style="{ color: '#fa8c16' }"
          >
            <template #prefix><ClockCircleOutlined /></template>
          </a-statistic>
        </a-card>
      </div>

      <!-- 功能区域 -->
      <div class="function-area">
        <a-row :gutter="24">
          <!-- 文件上传 -->
          <a-col :span="12">
            <a-card title="文档上传" class="function-card">
              <a-form layout="vertical" class="upload-meta-form">
                <a-form-item label="写入知识域">
                  <a-select v-model:value="writeDomain" :options="writeDomainOptions" />
                </a-form-item>
                <a-form-item label="文档标题">
                  <a-input
                    v-model:value="uploadMeta.title"
                    placeholder="例如：智算中心运营管理平台需求书"
                  />
                </a-form-item>
                <a-form-item label="何时查阅（给 AI 的备注）">
                  <a-textarea
                    v-model:value="uploadMeta.use_when"
                    :rows="2"
                    placeholder="例如：用户问到平台功能、需求范围、模块划分时优先查阅"
                  />
                </a-form-item>
              </a-form>
              <div class="upload-area">
                <a-upload-dragger
                  v-model:fileList="fileList"
                  :before-upload="beforeUpload"
                  :custom-request="handleUpload"
                  :multiple="true"
                  accept=".txt,.md,.pdf,.docx"
                  class="upload-dragger"
                >
                  <p class="ant-upload-drag-icon">
                    <InboxOutlined style="font-size: 48px; color: #1890ff;" />
                  </p>
                  <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p class="ant-upload-hint">
                    支持 .txt / .md / .pdf / .docx；会保存到知识库目录并写入向量索引
                  </p>
                </a-upload-dragger>
              </div>
            </a-card>
          </a-col>

          <!-- 手动添加文档 -->
          <a-col :span="12">
            <a-card title="手动添加文档" class="function-card">
              <a-form layout="vertical" :model="documentForm">
                <a-form-item label="文档标题" name="title">
                  <a-input 
                    v-model:value="documentForm.title" 
                    placeholder="请输入文档标题"
                  />
                </a-form-item>
                <a-form-item label="文件名" name="file_name">
                  <a-input 
                    v-model:value="documentForm.file_name" 
                    placeholder="例如: document.md"
                  />
                </a-form-item>
                <a-form-item label="何时查阅（给 AI 的备注）" name="use_when">
                  <a-textarea
                    v-model:value="documentForm.use_when"
                    :rows="2"
                    placeholder="例如：排查镜像拉取失败、ImagePullBackOff 时查阅"
                  />
                </a-form-item>
                <a-form-item label="文档内容" name="content">
                  <a-textarea 
                    v-model:value="documentForm.content" 
                    placeholder="请输入文档内容"
                    :rows="6"
                  />
                </a-form-item>
                <a-form-item>
                  <a-button 
                    type="primary" 
                    @click="addDocument" 
                    :loading="adding"
                    block
                  >
                    添加文档
                  </a-button>
                </a-form-item>
              </a-form>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <a-card title="已保存文档目录" class="document-list-card">
        <template #extra>
          <a-space>
            <a-button size="small" @click="loadDocuments" :loading="documentsLoading">刷新列表</a-button>
            <a-button size="small" type="primary" ghost @click="refreshKnowledge" :loading="refreshing">
              同步索引到 AI
            </a-button>
          </a-space>
        </template>
        <a-table
          :columns="documentColumns"
          :data-source="documents"
          :loading="documentsLoading"
          :pagination="{ pageSize: 8 }"
          row-key="document_id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'domain'">
              <a-tag color="processing">{{ knowledgeDomainLabel(record.domain || writeDomain) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'source'">
              <a-tag :color="record.source === 'builtin' ? 'blue' : 'default'">
                {{ record.source === 'builtin' ? '内置' : '用户' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'indexed'">
              <a-tooltip
                :title="record.indexed
                  ? '已写入向量库，RAG 可检索'
                  : '仅磁盘保存；点「同步索引到 AI」后才会被 RAG 使用最新内容'"
              >
                <a-tag :color="record.indexed ? 'green' : 'orange'">
                  {{ record.indexed ? 'AI 可检索' : '需同步' }}
                </a-tag>
              </a-tooltip>
            </template>
            <template v-else-if="column.key === 'use_when'">
              <span>{{ record.use_when || '未标注适用场景' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <a-button type="link" size="small" @click="openView(record)">查看</a-button>
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-popconfirm
                  title="确认删除该文档？删除后建议再点「同步索引到 AI」清理旧向量。"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="handleDelete(record)"
                >
                  <a-button type="link" size="small" danger :loading="deletingKey === docKey(record)">
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
        <div class="document-list-hint">
          「内置」文档是仓库自带的运维手册（平台总览、部署指南、故障诊断等），和用户上传的文件在同一知识库目录，都会参与 RAG。
          「需同步」≠ 文件丢失，只表示向量索引还没跟上磁盘最新内容。
        </div>
      </a-card>

      <a-drawer
        v-model:open="viewOpen"
        title="查看文档"
        width="720"
        :destroy-on-close="true"
      >
        <a-spin :spinning="detailLoading">
          <a-descriptions bordered :column="1" size="small">
            <a-descriptions-item label="标题">{{ viewDetail.title || '-' }}</a-descriptions-item>
            <a-descriptions-item label="文件名">{{ viewDetail.filename || '-' }}</a-descriptions-item>
            <a-descriptions-item label="何时查阅">{{ viewDetail.use_when || '未标注' }}</a-descriptions-item>
            <a-descriptions-item label="索引状态">
              {{ viewDetail.indexed ? 'AI 可检索' : '需同步' }}
            </a-descriptions-item>
          </a-descriptions>
          <div class="doc-content-preview">
            <pre>{{ viewDetail.content || '（无正文）' }}</pre>
          </div>
        </a-spin>
      </a-drawer>

      <a-modal
        v-model:open="editOpen"
        title="编辑文档"
        ok-text="保存"
        :confirm-loading="editSaving"
        :destroy-on-close="true"
        width="720"
        @ok="saveEdit"
      >
        <a-form layout="vertical">
          <a-form-item label="文档标题">
            <a-input v-model:value="editForm.title" />
          </a-form-item>
          <a-form-item label="文件名">
            <a-input :value="editForm.filename" disabled />
          </a-form-item>
          <a-form-item label="何时查阅（给 AI 的备注）">
            <a-textarea v-model:value="editForm.use_when" :rows="2" />
          </a-form-item>
          <a-form-item label="文档内容">
            <a-textarea v-model:value="editForm.content" :rows="12" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 操作日志 -->
      <a-card title="操作日志" class="log-card">
        <div class="log-container">
          <div v-if="operationLogs.length === 0" class="empty-log">
            <a-empty description="暂无操作记录" />
          </div>
          <div v-else class="log-list">
            <div 
              v-for="(log, index) in operationLogs" 
              :key="index" 
              class="log-item"
              :class="{ 'success': log.type === 'success', 'error': log.type === 'error' }"
            >
              <div class="log-icon">
                <CheckCircleOutlined v-if="log.type === 'success'" />
                <CloseCircleOutlined v-else-if="log.type === 'error'" />
                <InfoCircleOutlined v-else />
              </div>
              <div class="log-content">
                <div class="log-message">{{ log.message }}</div>
                <div class="log-time">{{ log.timestamp }}</div>
              </div>
            </div>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import {
  ReloadOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue';
import { 
  refreshKnowledgeBase, 
  uploadKnowledgeFile, 
  addDocument as addDocumentAPI,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument,
  type AddDocumentRequest,
  type RefreshKnowledgeResponse,
  type UploadKnowledgeResponse,
  type AddDocumentResponse,
  type KnowledgeDocumentItem,
} from '#/api/core/aiops/assistant';
import {
  knowledgeDomainLabel,
  resolveAvailableKnowledgeDomains,
  resolveDefaultKnowledgeDomain,
  resolveKnowledgeListFilters,
  type KnowledgeDomain,
  type KnowledgeDomainFilter,
} from '#/constants/knowledge-domain';
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();
const availableDomains = computed(() =>
  resolveAvailableKnowledgeDomains(userStore.userInfo?.roles as string[] | undefined),
);
/** 列表筛选：默认全部，避免拆域后看起来像「内容没了」 */
const listFilter = ref<KnowledgeDomainFilter>('all');
/** 写入目标域（上传/新增/同步） */
const writeDomain = ref<KnowledgeDomain>(
  resolveDefaultKnowledgeDomain(userStore.userInfo?.roles as string[] | undefined),
);
const listFilterOptions = computed(() =>
  resolveKnowledgeListFilters(userStore.userInfo?.roles as string[] | undefined).map(
    (value) => ({
      value,
      label: knowledgeDomainLabel(value),
    }),
  ),
);
const writeDomainOptions = computed(() =>
  availableDomains.value.map((value) => ({
    value,
    label: knowledgeDomainLabel(value),
  })),
);

const onDomainChange = () => {
  if (listFilter.value !== 'all') {
    writeDomain.value = listFilter.value;
  }
  loadDocuments();
};

const resolveDocDomain = (record?: KnowledgeDocumentItem): KnowledgeDomain =>
  (record?.domain as KnowledgeDomain) ||
  (listFilter.value !== 'all' ? listFilter.value : writeDomain.value);

// 响应式数据
const refreshing = ref(false);
const adding = ref(false);
const documentsLoading = ref(false);
const detailLoading = ref(false);
const editSaving = ref(false);
const deletingKey = ref('');
const fileList = ref<any[]>([]);
const documents = ref<KnowledgeDocumentItem[]>([]);
const viewOpen = ref(false);
const editOpen = ref(false);

const uploadMeta = reactive({
  title: '',
  use_when: '',
});

// 知识库统计
const knowledgeStats = reactive({
  documents_count: 0,
  vector_count: 0,
  last_update: '暂无数据'
});

// 文档表单
const documentForm = reactive<AddDocumentRequest>({
  title: '',
  content: '',
  file_name: '',
  use_when: '',
});

const viewDetail = reactive({
  title: '',
  filename: '',
  use_when: '',
  content: '',
  indexed: false,
});

const editForm = reactive({
  key: '',
  title: '',
  filename: '',
  use_when: '',
  content: '',
  domain: '' as KnowledgeDomain | '',
});

const documentColumns = [
  { title: '知识域', key: 'domain', width: 110 },
  { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: '来源', key: 'source', width: 90 },
  { title: '文件名', dataIndex: 'filename', key: 'filename', width: 180, ellipsis: true },
  { title: '何时查阅', dataIndex: 'use_when', key: 'use_when', ellipsis: true },
  { title: 'AI 索引', key: 'indexed', width: 100 },
  { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 170 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
];

const docKey = (record: KnowledgeDocumentItem) =>
  record.filename || record.document_id;

// 操作日志
interface OperationLog {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
}

const operationLogs = ref<OperationLog[]>([]);

// 添加日志
const addLog = (type: OperationLog['type'], message: string) => {
  operationLogs.value.unshift({
    type,
    message,
    timestamp: new Date().toLocaleString()
  });
  // 保持最多显示 50 条日志
  if (operationLogs.value.length > 50) {
    operationLogs.value = operationLogs.value.slice(0, 50);
  }
};

// 加载文档目录与统计
const loadDocuments = async () => {
  try {
    documentsLoading.value = true;
    const response = (await listKnowledgeDocuments(listFilter.value)) as any;
    documents.value = response?.documents || [];
    knowledgeStats.documents_count = response?.documents_count ?? documents.value.length;
    knowledgeStats.vector_count = response?.vector_count ?? 0;
    knowledgeStats.last_update = response?.timestamp
      ? new Date(response.timestamp).toLocaleString()
      : knowledgeStats.last_update;
  } catch (error: any) {
    addLog('error', `加载文档目录失败: ${error.message}`);
  } finally {
    documentsLoading.value = false;
  }
};

const openView = async (record: KnowledgeDocumentItem) => {
  viewOpen.value = true;
  detailLoading.value = true;
  viewDetail.title = record.title || '';
  viewDetail.filename = record.filename || '';
  viewDetail.use_when = record.use_when || '';
  viewDetail.content = '';
  viewDetail.indexed = !!record.indexed;
  try {
    const detail = (await getKnowledgeDocument(
      docKey(record),
      resolveDocDomain(record),
    )) as any;
    viewDetail.title = detail?.title || viewDetail.title;
    viewDetail.filename = detail?.filename || viewDetail.filename;
    viewDetail.use_when = detail?.use_when || '';
    viewDetail.content = detail?.content || '';
    viewDetail.indexed = !!detail?.indexed;
  } catch (error: any) {
    message.error(`加载文档失败: ${error.message}`);
    addLog('error', `查看文档失败: ${error.message}`);
  } finally {
    detailLoading.value = false;
  }
};

const openEdit = async (record: KnowledgeDocumentItem) => {
  editOpen.value = true;
  editSaving.value = false;
  editForm.key = docKey(record);
  editForm.title = record.title || '';
  editForm.filename = record.filename || '';
  editForm.use_when = record.use_when || '';
  editForm.content = '';
  editForm.domain = resolveDocDomain(record);
  try {
    const detail = (await getKnowledgeDocument(
      docKey(record),
      resolveDocDomain(record),
    )) as any;
    editForm.title = detail?.title || editForm.title;
    editForm.filename = detail?.filename || editForm.filename;
    editForm.use_when = detail?.use_when || '';
    editForm.content = detail?.content || '';
  } catch (error: any) {
    message.error(`加载文档失败: ${error.message}`);
    editOpen.value = false;
  }
};

const saveEdit = async () => {
  if (!editForm.title.trim()) {
    message.warning('请输入文档标题');
    return;
  }
  if (!editForm.content.trim()) {
    message.warning('请输入文档内容');
    return;
  }
  try {
    editSaving.value = true;
    const result = (await updateKnowledgeDocument(
      editForm.key,
      {
        title: editForm.title,
        use_when: editForm.use_when,
        content: editForm.content,
      },
      resolveDocDomain({
        domain: editForm.domain || writeDomain.value,
      } as KnowledgeDocumentItem),
    )) as any;
    message.success(result?.message || '文档已更新');
    addLog('success', `文档已更新: ${editForm.filename}`);
    editOpen.value = false;
    await loadDocuments();
  } catch (error: any) {
    message.error(`保存失败: ${error.message}`);
    addLog('error', `编辑文档失败: ${error.message}`);
  } finally {
    editSaving.value = false;
  }
};

const handleDelete = async (record: KnowledgeDocumentItem) => {
  const key = docKey(record);
  try {
    deletingKey.value = key;
    const result = (await deleteKnowledgeDocument(
      key,
      resolveDocDomain(record),
    )) as any;
    message.success(result?.message || '文档已删除');
    addLog('success', `文档已删除: ${record.filename}`);
    await loadDocuments();
  } catch (error: any) {
    message.error(`删除失败: ${error.message}`);
    addLog('error', `删除文档失败: ${error.message}`);
  } finally {
    deletingKey.value = '';
  }
};

// 刷新知识库
const refreshKnowledge = async () => {
  try {
    refreshing.value = true;
    const syncDomain =
      listFilter.value === 'all' ? undefined : listFilter.value;
    const response = await refreshKnowledgeBase(syncDomain);
    const data = response as RefreshKnowledgeResponse;
    
    if (data.refreshed) {
      knowledgeStats.documents_count = data.documents_count || 0;
      knowledgeStats.vector_count = data.vector_count || 0;
      knowledgeStats.last_update = new Date(data.timestamp).toLocaleString();
      
      message.success('已同步索引到 AI');
      addLog('success', `同步索引成功：${data.message}`);
      await loadDocuments();
    } else {
      message.error(data.message || '同步索引失败');
      addLog('error', data.message || '同步索引失败');
      await loadDocuments();
    }
  } catch (error: any) {
    message.error(`同步索引失败: ${error.message}`);
    addLog('error', `同步索引失败: ${error.message}`);
  } finally {
    refreshing.value = false;
  }
};

// 文件上传前处理
const beforeUpload = (file: File) => {
  const isValidType = ['txt', 'md', 'pdf', 'docx'].some(ext => 
    file.name.toLowerCase().endsWith(`.${ext}`)
  );
  if (!isValidType) {
    message.error('只能上传 txt / md / pdf / docx；旧版 .doc 请先另存为 .docx');
    return false;
  }
  
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB');
    return false;
  }
  
  return true;
};

// 处理文件上传
const handleUpload = async (options: any) => {
  const { file, onSuccess, onError } = options;
  
  try {
    const response = await uploadKnowledgeFile(file, {
      title: uploadMeta.title || undefined,
      use_when: uploadMeta.use_when || undefined,
      domain: writeDomain.value,
    });
    const data = response as UploadKnowledgeResponse;
    
    if (data.uploaded) {
      message.success(`文件 ${data.filename} 上传成功`);
      addLog('success', `文件上传成功: ${data.filename} (${data.file_size} 字节)`);
      onSuccess?.(data);
      await loadDocuments();
    } else {
      message.error(`文件上传失败: ${data.message}`);
      addLog('error', `文件上传失败: ${data.message}`);
      onError?.(new Error(data.message));
    }
  } catch (error: any) {
    message.error(`文件上传失败: ${error.message}`);
    addLog('error', `文件上传失败: ${error.message}`);
    onError?.(error);
  }
};

// 添加文档
const addDocument = async () => {
  if (!documentForm.title.trim()) {
    message.warning('请输入文档标题');
    return;
  }
  if (!documentForm.file_name.trim()) {
    message.warning('请输入文件名');
    return;
  }
  if (!documentForm.content.trim()) {
    message.warning('请输入文档内容');
    return;
  }
  
  try {
    adding.value = true;
    const response = await addDocumentAPI({
      ...documentForm,
      domain: writeDomain.value,
    });
    const data = response as AddDocumentResponse;
    
    if (data.added) {
      message.success('文档添加成功');
      addLog('success', `文档添加成功: ${documentForm.title} (ID: ${data.document_id})`);
      
      documentForm.title = '';
      documentForm.content = '';
      documentForm.file_name = '';
      documentForm.use_when = '';
      await loadDocuments();
    } else {
      message.error(`文档添加失败: ${data.message}`);
      addLog('error', `文档添加失败: ${data.message}`);
    }
  } catch (error: any) {
    message.error(`添加文档失败: ${error.message}`);
    addLog('error', `添加文档失败: ${error.message}`);
  } finally {
    adding.value = false;
  }
};

// 页面初始化
onMounted(() => {
  void loadDocuments();
  addLog('info', '知识库管理页面已加载');
});
</script>

<style scoped>
.knowledge-container {
  padding: 24px;
  background-color: var(--ant-background-color-light, #fafafa);
  min-height: 100vh;
}

/* 页面头部 */
.knowledge-container .page-header {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.knowledge-container .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.knowledge-container .header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.knowledge-container .header-icon {
  font-size: 32px;
  color: #1890ff;
}

.knowledge-container .header-text {
  display: flex;
  flex-direction: column;
}

.knowledge-container .page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #262626;
  line-height: 1.2;
}

.knowledge-container .page-subtitle {
  color: #8c8c8c;
  margin: 0;
  font-size: 14px;
  margin-top: 4px;
}

.knowledge-container .header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.knowledge-content {
  .index-hint-alert {
    margin-bottom: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;

    .stat-card {
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
  }

  .upload-meta-form {
    margin-bottom: 12px;
  }

  .document-list-card {
    margin-bottom: 24px;
    border-radius: 8px;
  }

  .document-list-hint {
    margin-top: 12px;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 1.6;
  }

  .doc-content-preview {
    margin-top: 16px;
    max-height: 60vh;
    overflow: auto;
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
  }

  .function-area {
    margin-bottom: 24px;

    .function-card {
      height: 100%;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }
    }

    .upload-area {
      .upload-dragger {
        border-radius: 8px;
        border: 2px dashed var(--ant-border-color);
        transition: all 0.3s ease;

        &:hover {
          border-color: #1890ff;
        }

        .ant-upload-text {
          font-size: 16px;
          color: var(--ant-text-color);
          margin-top: 8px;
          font-weight: 500;
        }

        .ant-upload-hint {
          color: var(--ant-text-color-secondary);
          font-size: 14px;
          margin-top: 4px;
        }
      }
    }
  }

  .log-card {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-bottom: 24px;

    .log-container {
      max-height: 400px;
      overflow-y: auto;

      .empty-log {
        text-align: center;
        padding: 40px 0;
        color: var(--ant-text-color-secondary);
      }

      .log-list {
        .log-item {
          display: flex;
          align-items: flex-start;
          padding: 12px 0;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--ant-border-color-split);
          transition: all 0.3s;

          &:hover {
            background: var(--ant-background-color-light);
          }

          &.success {
            .log-icon {
              color: #52c41a;
            }
          }

          &.error {
            .log-icon {
              color: #ff4d4f;
            }
          }

          &:not(.success):not(.error) {
            .log-icon {
              color: #1890ff;
            }
          }

          .log-icon {
            font-size: 16px;
            margin-right: 12px;
            margin-top: 2px;
          }

          .log-content {
            flex: 1;

            .log-message {
              font-size: 14px;
              color: var(--ant-text-color);
              margin-bottom: 4px;
              font-weight: 500;
              line-height: 1.4;
            }

            .log-time {
              font-size: 12px;
              color: var(--ant-text-color-secondary);
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .knowledge-container {
    padding: 16px;
  }
  
  .knowledge-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .upload-area {
    .upload-dragger {
      padding: 24px 16px;

      .ant-upload-text {
        font-size: 14px;
      }

      .ant-upload-hint {
        font-size: 12px;
      }
    }
  }

  .log-container {
    max-height: 300px;

    .log-list {
      .log-item {
        padding: 8px 0;

        .log-icon {
          font-size: 14px;
          margin-right: 10px;
        }

        .log-content {
          .log-message {
            font-size: 13px;
          }

          .log-time {
            font-size: 11px;
          }
        }
      }
    }
  }
}
</style>

<template>
  <div class="department-management">
    <div class="page-header">
      <h1>部门管理</h1>
      <div class="header-actions">
        <a-button @click="handleRefresh">
          <Icon icon="material-symbols:refresh" />
          刷新
        </a-button>
        <a-button type="primary" @click="handleAdd()">
          <Icon icon="material-symbols:add" />
          新建部门
        </a-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">{{ flatCount }}</div>
        <div class="stat-label">部门总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ enabledCount }}</div>
        <div class="stat-label">启用</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ rootCount }}</div>
        <div class="stat-label">一级部门</div>
      </div>
    </div>

    <div class="search-section">
      <div class="search-left">
        <a-input
          v-model:value="keyword"
          placeholder="搜索部门名称/编码"
          allow-clear
          class="search-input"
        >
          <template #prefix>
            <Icon icon="material-symbols:search" />
          </template>
        </a-input>
        <a-select
          v-model:value="statusFilter"
          placeholder="状态"
          allow-clear
          class="filter-select"
        >
          <a-select-option :value="1">启用</a-select-option>
          <a-select-option :value="2">禁用</a-select-option>
        </a-select>
      </div>
      <div class="search-right">
        <a-button @click="handleReset">重置</a-button>
      </div>
    </div>

    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="displayTree"
        :loading="loading"
        :pagination="false"
        row-key="id"
        size="middle"
        :default-expand-all-rows="true"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="name-cell">
              <Icon icon="lucide:building-2" class="dept-icon" />
              <div>
                <div class="dept-name">{{ record.name }}</div>
                <div class="dept-code">{{ record.code }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'default'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="action-buttons">
              <a-button type="text" size="small" @click="handleAdd(record.id)">
                子级
              </a-button>
              <a-button type="text" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-popconfirm title="确定删除该部门？" @confirm="handleDelete(record)">
                <a-button type="text" size="small" danger>删除</a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑部门' : '新建部门'"
      :confirm-loading="saving"
      width="680px"
      @ok="handleSubmit"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="部门名称" name="name">
              <a-input v-model:value="formData.name" placeholder="请输入部门名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="部门编码" name="code">
              <a-input v-model:value="formData.code" placeholder="如 OPS" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="上级部门" name="parent_id">
              <a-tree-select
                v-model:value="formData.parent_id"
                :tree-data="parentOptions"
                allow-clear
                tree-default-expand-all
                placeholder="根部门"
                :field-names="{ label: 'name', value: 'id', children: 'children' }"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序" name="sort">
              <a-input-number v-model:value="formData.sort" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="负责人" name="leader">
              <a-input v-model:value="formData.leader" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="status">
              <a-select v-model:value="formData.status">
                <a-select-option :value="1">启用</a-select-option>
                <a-select-option :value="2">禁用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="联系电话" name="phone">
              <a-input v-model:value="formData.phone" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱" name="email">
              <a-input v-model:value="formData.email" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { Icon } from '@iconify/vue';
import type { FormInstance, Rule } from 'ant-design-vue/es/form';

import {
  createDepartmentApi,
  deleteDepartmentApi,
  getDepartmentTreeApi,
  updateDepartmentApi,
  type Department,
} from '#/api/core/system/department';

const loading = ref(false);
const saving = ref(false);
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const departmentTree = ref<Department[]>([]);
const keyword = ref('');
const statusFilter = ref<1 | 2 | undefined>();
const formRef = ref<FormInstance>();

const formData = reactive({
  name: '',
  code: '',
  parent_id: 0 as number,
  sort: 0,
  status: 1 as 1 | 2,
  leader: '',
  phone: '',
  email: '',
  description: '',
});

const formRules: Record<string, Rule[]> = {
  name: [{ required: true, message: '请输入部门名称' }],
  code: [{ required: true, message: '请输入部门编码' }],
};

const columns = [
  { title: '部门', key: 'name' },
  { title: '负责人', dataIndex: 'leader', key: 'leader', width: 120 },
  { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
  { title: '邮箱', dataIndex: 'email', key: 'email', ellipsis: true },
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'actions', width: 200 },
];

const flattenDepartments = (nodes: Department[]): Department[] => {
  const result: Department[] = [];
  const walk = (list: Department[]) => {
    list.forEach((item) => {
      result.push(item);
      if (item.children?.length) walk(item.children);
    });
  };
  walk(nodes);
  return result;
};

const flatCount = computed(() => flattenDepartments(departmentTree.value).length);
const enabledCount = computed(
  () => flattenDepartments(departmentTree.value).filter((d) => d.status === 1).length,
);
const rootCount = computed(() => departmentTree.value.length);

const filterTree = (nodes: Department[]): Department[] => {
  const kw = keyword.value.trim().toLowerCase();
  return nodes
    .map((node) => {
      const children = node.children ? filterTree(node.children) : [];
      const matched =
        (!kw ||
          node.name.toLowerCase().includes(kw) ||
          node.code.toLowerCase().includes(kw)) &&
        (!statusFilter.value || node.status === statusFilter.value);
      if (matched || children.length) {
        return { ...node, children };
      }
      return null;
    })
    .filter(Boolean) as Department[];
};

const displayTree = computed(() => filterTree(departmentTree.value));
const parentOptions = computed(() => [
  { id: 0, name: '根部门', children: departmentTree.value },
]);

const fetchTree = async () => {
  loading.value = true;
  try {
    const data = await getDepartmentTreeApi();
    departmentTree.value = (data as Department[]) || [];
  } catch (error: any) {
    message.error(error.message || '获取部门树失败');
    departmentTree.value = [];
  } finally {
    loading.value = false;
  }
};

const resetForm = (parentId = 0) => {
  Object.assign(formData, {
    name: '',
    code: '',
    parent_id: parentId,
    sort: 0,
    status: 1,
    leader: '',
    phone: '',
    email: '',
    description: '',
  });
};

const handleAdd = (parentId = 0) => {
  editingId.value = null;
  resetForm(parentId);
  modalVisible.value = true;
};

const handleEdit = (record: Department) => {
  editingId.value = record.id;
  Object.assign(formData, {
    name: record.name,
    code: record.code,
    parent_id: record.parent_id || 0,
    sort: record.sort || 0,
    status: record.status || 1,
    leader: record.leader || '',
    phone: record.phone || '',
    email: record.email || '',
    description: record.description || '',
  });
  modalVisible.value = true;
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...formData,
      parent_id: formData.parent_id || 0,
    };
    if (editingId.value) {
      await updateDepartmentApi(editingId.value, {
        ...payload,
        id: editingId.value,
      });
      message.success('更新成功');
    } else {
      await createDepartmentApi(payload);
      message.success('创建成功');
    }
    modalVisible.value = false;
    await fetchTree();
  } catch (error: any) {
    message.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (record: Department) => {
  try {
    await deleteDepartmentApi(record.id);
    message.success('删除成功');
    await fetchTree();
  } catch (error: any) {
    message.error(error.message || '删除失败');
  }
};

const handleRefresh = () => fetchTree();
const handleReset = () => {
  keyword.value = '';
  statusFilter.value = undefined;
};

onMounted(fetchTree);
</script>

<style scoped>
.department-management {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-actions :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  white-space: nowrap;
}

.header-actions :deep(.ant-btn .iconify) {
  display: inline-flex;
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.stat-label {
  color: #8c8c8c;
  margin-top: 4px;
}

.search-section {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.search-left {
  display: flex;
  gap: 8px;
  flex: 1;
}

.search-input {
  max-width: 280px;
}

.filter-select {
  width: 140px;
}

.search-right {
  display: flex;
  gap: 8px;
}

.table-container {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-icon {
  color: #1890ff;
}

.dept-name {
  font-weight: 600;
  color: #262626;
}

.dept-code {
  font-size: 12px;
  color: #8c8c8c;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.action-buttons {
  display: flex;
  gap: 4px;
}
</style>

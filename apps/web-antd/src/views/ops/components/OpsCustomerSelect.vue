<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { listOpsCustomer, type OpsCustomerItem } from '#/api/core/ops/customer';

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    placeholder?: string;
    allowClear?: boolean;
    stage?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    placeholder: '搜索并选择客户',
    allowClear: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'change', customer: OpsCustomerItem | null): void;
}>();

const loading = ref(false);
const options = ref<OpsCustomerItem[]>([]);
const search = ref('');

async function loadOptions(keyword = '') {
  loading.value = true;
  try {
    const res: any = await listOpsCustomer({
      page: 1,
      size: 50,
      search: keyword || undefined,
      stage: props.stage,
    });
    options.value = res?.items || [];
  } catch {
    options.value = [];
  } finally {
    loading.value = false;
  }
}

function onSelect(id: number) {
  emit('update:modelValue', id);
  const found = options.value.find((item) => item.id === id) || null;
  emit('change', found);
}

function onClear() {
  emit('update:modelValue', null);
  emit('change', null);
}

function onSearch(value: string) {
  search.value = value;
  loadOptions(value);
}

watch(
  () => props.modelValue,
  async (id) => {
    if (id && !options.value.some((item) => item.id === id)) {
      await loadOptions();
    }
  },
);

onMounted(() => loadOptions());
</script>

<template>
  <a-select
    :value="modelValue ?? undefined"
    show-search
    :filter-option="false"
    :allow-clear="allowClear"
    :disabled="disabled"
    :placeholder="placeholder"
    :loading="loading"
    style="width: 100%"
    @search="onSearch"
    @change="(v: number) => (v ? onSelect(v) : onClear())"
    @clear="onClear"
  >
    <a-select-option v-for="item in options" :key="item.id" :value="item.id">
      {{ item.name }}
      <span style="color: #8c8c8c; margin-left: 8px">
        #{{ item.id }} · {{ item.stage }}
      </span>
    </a-select-option>
  </a-select>
</template>

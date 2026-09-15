<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { listOpsContract, type OpsContractItem } from '#/api/core/ops/contract';

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    customerId?: number | null;
    placeholder?: string;
    allowClear?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    customerId: null,
    placeholder: '选择合同',
    allowClear: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void;
  (e: 'change', contract: OpsContractItem | null): void;
}>();

const loading = ref(false);
const options = ref<OpsContractItem[]>([]);

async function loadOptions() {
  const customerId = Number(props.customerId);
  if (!Number.isFinite(customerId) || customerId <= 0) {
    options.value = [];
    return;
  }
  loading.value = true;
  try {
    const res: any = await listOpsContract({
      page: 1,
      size: 50,
      customer_id: customerId,
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

watch(
  () => props.customerId,
  () => {
    emit('update:modelValue', null);
    emit('change', null);
    loadOptions();
  },
);

onMounted(loadOptions);
</script>

<template>
  <a-select
    :value="modelValue ?? undefined"
    :allow-clear="allowClear"
    :disabled="disabled || !customerId"
    :placeholder="customerId ? placeholder : '请先选择客户'"
    :loading="loading"
    style="width: 100%"
    @change="(v: number) => (v ? onSelect(v) : onClear())"
    @clear="onClear"
  >
    <a-select-option v-for="item in options" :key="item.id" :value="item.id">
      {{ item.title }}
      <span style="color: #8c8c8c; margin-left: 8px">
        #{{ item.id }} · {{ item.type }} · {{ item.status }}
      </span>
    </a-select-option>
  </a-select>
</template>

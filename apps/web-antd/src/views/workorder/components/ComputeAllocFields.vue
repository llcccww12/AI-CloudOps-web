<template>
  <div class="compute-alloc-fields">
    <a-alert
      type="warning"
      show-icon
      style="margin-bottom: 12px"
      message="请登记物理服务器分配。首次开通日只记一次；当前周期截止随测试→正式→续签延长，阶段履历会自动追加，不会因转正/续签新建占用或自动释放。"
    />
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="物理服务器" required>
          <a-select
            v-model:value="form.server_code"
            show-search
            :options="serverOptions"
            :loading="loadingServers"
            placeholder="选择服务器"
            option-filter-prop="label"
            @focus="loadServers"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="租赁粒度" required>
          <a-select
            v-model:value="form.lease_mode"
            :options="OpsComputeLeaseModeOptions"
            placeholder="选择租赁粒度"
          />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="实际分配卡数" required>
          <a-input-number
            v-model:value="form.allocated_gpus"
            :min="1"
            style="width: 100%"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item
          v-if="form.lease_mode === 'gpu_pool'"
          label="卡/分区ID"
          required
        >
          <a-input v-model:value="form.partition_id" placeholder="按卡必填" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="首次开通日" required>
          <a-date-picker
            v-model:value="form.opened_at"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :get-popup-container="popupContainer"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="当前周期截止">
          <a-date-picker
            v-model:value="form.plan_release_at"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            :get-popup-container="popupContainer"
          />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item label="技术运营执行人">
      <a-input v-model:value="form.executor_name" placeholder="执行人姓名" />
    </a-form-item>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { listOpsComputeAsset } from '#/api/core/ops/compute';
import { OpsComputeLeaseModeOptions } from '#/views/ops/constants/options';

const props = defineProps<{
  form: Record<string, any>;
  defaultLeaseMode?: string;
}>();

const loadingServers = ref(false);
const serverOptions = ref<{ label: string; value: string }[]>([]);
const popupContainer = () => document.body;

async function loadServers() {
  if (serverOptions.value.length) return;
  loadingServers.value = true;
  try {
    const res: any = await listOpsComputeAsset({ page: 1, size: 100 });
    serverOptions.value = (res?.items || []).map((i: any) => ({
      label: `${i.server_code} (${i.gpu_model}${i.gpu_count != null ? '/' + i.gpu_count + '卡' : ''})`,
      value: i.server_code,
    }));
  } finally {
    loadingServers.value = false;
  }
}

watch(
  () => [props.form, props.defaultLeaseMode] as const,
  ([form, mode]) => {
    if (!form) return;
    if (!form.lease_mode && mode) form.lease_mode = mode;
    if (!form.allocated_gpus) form.allocated_gpus = 1;
  },
  { immediate: true },
);

// 开通台账合同起止 → 默认开通/释放日，减少重复填写
watch(
  () => [props.form?.contract_start_at, props.form?.contract_end_at] as const,
  ([start, end]) => {
    if (!props.form) return;
    if (start && !props.form.opened_at) {
      props.form.opened_at = String(start).slice(0, 10);
    }
    if (end && !props.form.plan_release_at) {
      props.form.plan_release_at = String(end).slice(0, 10);
    }
  },
  { immediate: true },
);

onMounted(loadServers);
</script>

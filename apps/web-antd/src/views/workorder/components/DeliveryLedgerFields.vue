<template>
  <div class="delivery-ledger-fields">
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="客户简称" required>
          <a-input v-model:value="form.customer_short_name" placeholder="客户简称" />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="产品类型" required>
          <a-select
            v-model:value="form.product_type"
            :options="OpsProductTypeOptions"
            placeholder="选择产品类型"
          />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="所属大区" required>
          <a-select
            v-model:value="form.region"
            :options="OpsRegionOptions"
            placeholder="选择大区"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="归属客户经理" required>
          <a-input v-model:value="form.owner_name" placeholder="客户经理姓名" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="主账号" required>
          <a-input v-model:value="form.main_account" placeholder="平台主账号" />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="项目名称" required>
          <a-input v-model:value="form.project_name" placeholder="项目名称" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="开通方式" required>
          <a-select
            v-model:value="form.open_method"
            :options="OpsOpenMethodOptions"
            placeholder="选择开通方式"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="开通周期" required>
          <a-input v-model:value="form.open_period" placeholder="如：3个月 / 1年" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="合同编号" required>
          <a-input v-model:value="form.contract_no" placeholder="合同编号" />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="订单编号" required>
          <a-input v-model:value="form.order_no" placeholder="订单编号" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :span="12">
        <a-form-item label="合同开始" required>
          <a-date-picker
            v-model:value="form.contract_start_at"
            style="width: 100%"
            value-format="YYYY-MM-DD"
            :get-popup-container="popupContainer"
          />
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item label="合同结束" required>
          <a-date-picker
            v-model:value="form.contract_end_at"
            style="width: 100%"
            value-format="YYYY-MM-DD"
            :get-popup-container="popupContainer"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';

import {
  OpsOpenMethodOptions,
  OpsProductTypeOptions,
  OpsRegionOptions,
} from '#/views/ops/constants/options';

const props = defineProps<{
  form: Record<string, any>;
  defaultOpenMethod?: string;
}>();

const popupContainer = () => document.body;

watch(
  () => [props.form, props.defaultOpenMethod] as const,
  ([form, method]) => {
    if (form && !form.open_method && method) {
      form.open_method = method;
    }
  },
  { immediate: true },
);
</script>

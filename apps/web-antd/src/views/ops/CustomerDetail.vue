<template>
  <div class="ops-page">
    <a-page-header :title="customer?.name || '客户详情'" @back="() => $router.push('/ops/customers')">
      <template #extra>
        <a-space>
          <a-button type="primary" @click="openProcessModal">
            发起流程
          </a-button>
          <a-button @click="goComputeAllocations">算力台账</a-button>
          <a-button
            v-if="latestOpenLifecycle"
            @click="openWorkorder(latestOpenLifecycle.workorder_instance_id)"
          >
            查看进行中工单
          </a-button>
          <a-button @click="goCreateTrial">新建试用</a-button>
          <a-button @click="goCreateContract">新建合同</a-button>
          <a-button @click="goCreateSettlement">新建结算</a-button>
          <a-button @click="openStageModal">变更阶段</a-button>
          <a-button @click="loadAll">刷新</a-button>
        </a-space>
      </template>
    </a-page-header>

    <a-spin :spinning="loading">
      <a-card class="mb16" size="small" title="生命周期">
        <a-steps :current="stageIndex" size="small">
          <a-step title="意向" />
          <a-step title="试用" />
          <a-step title="正式" />
          <a-step title="闭环" />
        </a-steps>
        <a-alert
          v-if="customer && customer.stage === 'trial' && customer.vendor_profile_done !== 1"
          type="warning"
          show-icon
          style="margin-top: 12px"
          message="首次试用前请完成客商档案录入（单位/银行信息）"
        >
          <template #action>
            <a-button size="small" type="primary" @click="openVendorForm">
              填写客商档案
            </a-button>
          </template>
        </a-alert>
        <a-alert
          v-else-if="customer && customer.vendor_profile_done === 1"
          type="success"
          show-icon
          style="margin-top: 12px"
          message="客商档案已录入"
        >
          <template #action>
            <a-button size="small" type="link" @click="openVendorForm">查看/编辑</a-button>
          </template>
        </a-alert>
      </a-card>

      <a-row :gutter="16">
        <a-col :span="16">
          <a-card title="基本信息" class="mb16">
            <a-descriptions v-if="customer" bordered :column="2" size="small">
              <a-descriptions-item label="客户名称">{{ customer.name }}</a-descriptions-item>
              <a-descriptions-item label="阶段">
                <a-tag>{{ OpsCustomerStageLabel[customer.stage] || customer.stage }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="行业">{{ customer.industry || '-' }}</a-descriptions-item>
              <a-descriptions-item label="来源">{{ customer.source || '-' }}</a-descriptions-item>
              <a-descriptions-item label="联系人">{{ customer.contact_name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="职务">{{ customer.contact_title || '-' }}</a-descriptions-item>
              <a-descriptions-item label="电话">{{ customer.contact_phone || '-' }}</a-descriptions-item>
              <a-descriptions-item label="邮箱">{{ customer.contact_email || '-' }}</a-descriptions-item>
              <a-descriptions-item label="负责人">{{ customer.owner_name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="预算区间">{{ customer.budget_range || '-' }}</a-descriptions-item>
              <a-descriptions-item label="备注" :span="2">{{ customer.remark || '-' }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card title="算力占用" class="mb16" size="small">
            <template #extra>
              <a-space>
                <a-button type="link" size="small" @click="goComputeAllocations">查看全部</a-button>
                <a-button type="link" size="small" @click="goRegisterAllocation">登记分配</a-button>
              </a-space>
            </template>
            <a-spin :spinning="allocLoading">
              <a-empty v-if="!allocations.length" description="暂无算力分配记录" />
              <a-table
                v-else
                :data-source="allocations"
                :columns="allocColumns"
                :pagination="false"
                size="small"
                row-key="id"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'life'">
                    <a-tag>{{ record.life_status_label || record.life_status || '-' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'opened'">
                    {{ formatDateOnly(record.opened_at) }}
                  </template>
                  <template v-else-if="column.key === 'period'">
                    {{ formatDateOnly(record.current_period_start_at || record.opened_at) }}
                    ~
                    {{ formatDateOnly(record.plan_release_at) }}
                  </template>
                  <template v-else-if="column.key === 'history'">
                    <span :title="record.phase_history_summary">
                      {{ record.phase_history_summary || '-' }}
                    </span>
                  </template>
                  <template v-else-if="column.key === 'evidence'">
                    <a-tag :color="record.evidence_ok ? 'green' : 'orange'">
                      {{ record.evidence_ok ? '有佐证' : '缺佐证' }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </a-spin>
          </a-card>

          <a-card title="跟进记录" class="mb16">
            <template #extra>
              <a-button type="primary" size="small" @click="followVisible = true">添加跟进</a-button>
            </template>
            <a-timeline v-if="followups.length">
              <a-timeline-item v-for="item in followups" :key="item.id">
                <div class="follow-item">
                  <div class="follow-meta">
                    <a-tag>{{ item.type }}</a-tag>
                    <span>{{ item.operator_name || '-' }}</span>
                    <span class="muted">{{ formatTime(item.created_at) }}</span>
                  </div>
                  <div>{{ item.content }}</div>
                  <div v-if="item.next_plan" class="muted">下一步：{{ item.next_plan }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无跟进记录" />
          </a-card>
        </a-col>

        <a-col :span="8">
          <a-card title="公网报障" class="mb16" size="small">
            <a-form layout="vertical" size="small">
              <a-form-item label="组织编码">
                <a-input
                  v-model:value="reportForm.report_code"
                  placeholder="客户报障时填写"
                  allow-clear
                />
              </a-form-item>
              <a-form-item label="开放公网报障">
                <a-switch
                  :checked="reportForm.report_enabled === 1"
                  checked-children="开"
                  un-checked-children="关"
                  @change="(v: boolean) => (reportForm.report_enabled = v ? 1 : 2)"
                />
              </a-form-item>
              <a-form-item label="密钥状态">
                <span>
                  {{ customer?.report_secret_configured ? '已配置' : '未配置' }}
                </span>
              </a-form-item>
              <a-space>
                <a-button size="small" :loading="reportSaving" @click="saveReportSettings">
                  保存配置
                </a-button>
                <a-button
                  size="small"
                  type="primary"
                  :loading="reportRotating"
                  @click="rotateReportSecret"
                >
                  生成/轮换密钥
                </a-button>
              </a-space>
              <div v-if="publicFaultLink" class="muted" style="margin-top: 8px">
                报障链接：
                <a :href="publicFaultLink" target="_blank" rel="noopener">{{ publicFaultLink }}</a>
              </div>
            </a-form>
          </a-card>
          <a-card title="交付与佐证" class="mb16" size="small">
            <template #extra>
              <a-button type="link" size="small" @click="loadEvidence">刷新</a-button>
            </template>
            <a-spin :spinning="evidenceLoading">
              <a-empty
                v-if="!evidencePacks.length"
                description="暂无开通/合同佐证；发起测试或正式开通后可在此上传开通单与邮件"
              />
              <a-timeline v-else>
                <a-timeline-item
                  v-for="pack in evidencePacks"
                  :key="`${pack.biz_type}-${pack.biz_id}`"
                  :color="pack.scene === 'formal' ? 'green' : pack.scene === 'trial' ? 'blue' : 'gray'"
                >
                  <div class="evidence-item">
                    <div class="evidence-head">
                      <a-tag>{{ pack.scene_label }}</a-tag>
                      <strong>{{ pack.title }}</strong>
                      <span class="muted">{{ formatTime(pack.created_at) }}</span>
                    </div>
                    <div class="muted evidence-meta">
                      开通单 {{ pack.sheets?.length || 0 }} · 邮件
                      {{ pack.emails?.length || 0 }}
                      <template v-if="pack.contracts?.length">
                        · 合同 {{ pack.contracts.length }}
                      </template>
                      <template v-if="pack.status"> · {{ pack.status }}</template>
                    </div>
                    <a-space size="small" style="margin-top: 6px">
                      <a
                        v-if="pack.biz_type === 'trial' || pack.biz_type === 'activation'"
                        @click="openEvidencePack(pack)"
                      >
                        管理材料
                      </a>
                      <a
                        v-if="pack.workorder_instance_id"
                        @click="openWorkorder(pack.workorder_instance_id)"
                      >
                        打开工单
                      </a>
                    </a-space>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </a-spin>
          </a-card>
          <a-card title="流程工单" class="mb16" size="small">
            <a-list
              size="small"
              :data-source="lifecycleWorkorders"
              :locale="{ emptyText: '暂无流程工单，可发起全流程/测试开通/正式开通' }"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta>
                    <template #title>
                      <a @click="openWorkorder(item.workorder_instance_id)">
                        {{ item.title || `工单#${item.workorder_instance_id}` }}
                      </a>
                      <a-tag v-if="item.process_type_label" style="margin-left: 8px">
                        {{ item.process_type_label }}
                      </a-tag>
                    </template>
                    <template #description>
                      <span>
                        {{ item.serial_number || '-' }} · {{ item.status || item.link_status }}
                        <template v-if="item.current_step_id">
                          · 当前节点 {{ item.current_step_id }}
                        </template>
                      </span>
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <a @click="openWorkorder(item.workorder_instance_id)">打开工单</a>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
          <a-card title="试用摘要" class="mb16" size="small">
            <a-list size="small" :data-source="trials" :locale="{ emptyText: '暂无试用' }">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :description="item.status">
                    <template #title>
                      <a @click="goTrials">{{ item.title }}</a>
                      <a
                        v-if="item.workorder_instance_id"
                        style="margin-left: 8px; font-size: 12px"
                        @click="openWorkorder(item.workorder_instance_id)"
                      >
                        审批工单
                      </a>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
          <a-card title="合同摘要" class="mb16" size="small">
            <a-list size="small" :data-source="contracts" :locale="{ emptyText: '暂无合同' }">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :description="`${item.type} / ${item.status}`">
                    <template #title>
                      <a @click="goContracts">{{ item.title }}</a>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
          <a-card title="结算摘要" size="small">
            <a-list size="small" :data-source="settlements" :locale="{ emptyText: '暂无结算' }">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta :description="`¥${item.amount ?? 0} / ${item.status}`">
                    <template #title>
                      <a @click="goSettlements">{{ item.title }}</a>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>

    <a-modal
      :open="stageVisible"
      title="变更客户阶段"
      :confirm-loading="stageLoading"
      @ok="submitStage"
      @cancel="stageVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="目标阶段" required>
          <a-select v-model:value="stageForm.stage">
            <a-select-option value="intent">意向</a-select-option>
            <a-select-option value="trial">试用</a-select-option>
            <a-select-option value="formal">正式</a-select-option>
            <a-select-option value="closed">闭环</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="stageForm.stage === 'closed'" label="闭环原因">
          <a-select
            v-model:value="stageForm.closed_reason"
            allow-clear
            placeholder="选择闭环原因"
            :options="OpsClosedReasonOptions"
          />
        </a-form-item>
        <a-alert
          v-if="stageForm.stage === 'closed' && needsNonRenewalSurvey"
          type="warning"
          show-icon
          style="margin-bottom: 8px"
          message="该闭环原因需先提交不续费问卷，可前往「客户问卷」填写，或在下方快速提交"
        />
        <a-form-item
          v-if="stageForm.stage === 'closed' && needsNonRenewalSurvey"
          label="不续费原因说明"
        >
          <a-textarea
            v-model:value="stageForm.non_renewal_content"
            :rows="3"
            placeholder="提交闭环前将同步写入不续费问卷"
          />
        </a-form-item>
        <a-alert
          v-else-if="stageForm.stage === 'closed'"
          type="info"
          show-icon
          style="margin-bottom: 8px"
          message="成功交付闭环无需不续费问卷"
        />
      </a-form>
    </a-modal>

    <a-modal
      :open="vendorVisible"
      title="客商档案"
      :confirm-loading="vendorSaving"
      destroy-on-close
      width="720px"
      @ok="submitVendorProfile"
      @cancel="vendorVisible = false"
    >
      <a-form layout="vertical" :model="vendorForm">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="单位名称" required>
              <a-input v-model:value="vendorForm.unit_name" placeholder="单位名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="统一社会信用代码">
              <a-input v-model:value="vendorForm.credit_code" placeholder="统一社会信用代码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="负责人">
              <a-input v-model:value="vendorForm.principal" placeholder="负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="电话">
              <a-input v-model:value="vendorForm.phone" placeholder="电话" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="联系地址和电话">
              <a-input
                v-model:value="vendorForm.contact_address_phone"
                placeholder="联系地址和电话"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账号名称（收款人）">
              <a-input v-model:value="vendorForm.account_name" placeholder="收款人账号名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账户类型">
              <a-select v-model:value="vendorForm.account_type" placeholder="账户类型">
                <a-select-option value="corporate">对公</a-select-option>
                <a-select-option value="personal">对私</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="银行账号">
              <a-input v-model:value="vendorForm.bank_account" placeholder="银行账号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="联行号">
              <a-input v-model:value="vendorForm.cnaps_code" placeholder="联行号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="开户行名称（精确到支行）">
              <a-input v-model:value="vendorForm.bank_name" placeholder="开户行名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="银行所在省份">
              <a-input v-model:value="vendorForm.bank_province" placeholder="省份" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="银行所在市">
              <a-input v-model:value="vendorForm.bank_city" placeholder="城市" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-modal
      :open="followVisible"
      title="添加跟进"
      :confirm-loading="followLoading"
      destroy-on-close
      @ok="submitFollowup"
      @cancel="followVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="类型" required>
          <a-select v-model:value="followForm.type">
            <a-select-option value="电话">电话</a-select-option>
            <a-select-option value="拜访">拜访</a-select-option>
            <a-select-option value="邮件">邮件</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="内容" required>
          <a-textarea v-model:value="followForm.content" :rows="4" placeholder="跟进内容" />
        </a-form-item>
        <a-form-item label="下一步计划">
          <a-input v-model:value="followForm.next_plan" placeholder="下一步计划" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="secretVisible"
      title="报障密钥（仅展示一次）"
      :footer="null"
      @cancel="secretVisible = false"
    >
      <a-alert
        type="warning"
        show-icon
        message="请立即复制并妥善保存，关闭后将无法再次查看完整密钥"
      />
      <a-descriptions bordered size="small" style="margin-top: 12px" :column="1">
        <a-descriptions-item label="组织编码">
          {{ secretPayload.report_code }}
        </a-descriptions-item>
        <a-descriptions-item label="组织密钥">
          <code>{{ secretPayload.report_secret }}</code>
        </a-descriptions-item>
      </a-descriptions>
      <a-button type="primary" block style="margin-top: 12px" @click="copySecret">
        复制编码与密钥
      </a-button>
    </a-modal>

    <a-modal
      v-model:open="processVisible"
      title="发起流程"
      :confirm-loading="lifecycleStarting"
      ok-text="发起"
      cancel-text="取消"
      @ok="submitProcess"
    >
      <a-form layout="vertical">
        <a-form-item label="流程类型" required>
          <a-radio-group v-model:value="processForm.process_type">
            <a-radio-button value="lifecycle">运营全流程</a-radio-button>
            <a-radio-button value="trial">运营测试开通</a-radio-button>
            <a-radio-button value="activation">运营正式开通</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="标题（可选）">
          <a-input v-model:value="processForm.title" placeholder="留空则自动生成" allow-clear />
        </a-form-item>
        <a-form-item
          v-if="processForm.process_type === 'trial' || processForm.process_type === 'activation'"
          :label="processForm.process_type === 'trial' ? '申请算力规模' : '开通资源摘要'"
        >
          <a-input
            v-model:value="processForm.resource_scale"
            :placeholder="processForm.process_type === 'trial' ? '如 8卡 A100' : '产品/规格/数量'"
            allow-clear
          />
        </a-form-item>
        <a-form-item
          v-if="processForm.process_type === 'trial' || processForm.process_type === 'activation'"
          :label="processForm.process_type === 'trial' ? '试用用途' : '开通说明'"
        >
          <a-textarea
            v-model:value="processForm.purpose"
            :rows="3"
            placeholder="用途、验收标准或开通说明"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="processForm.remark" :rows="2" allow-clear />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          :message="processHint"
        />
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="evidenceVisible"
      :title="evidenceModalTitle"
      :footer="null"
      width="720px"
      destroy-on-close
      @cancel="
        evidenceVisible = false;
        loadEvidence();
      "
    >
      <OpsDeliveryPack
        v-if="evidenceEditing"
        :scene="evidenceEditing.scene === 'formal' ? 'formal' : 'trial'"
        :biz-id="evidenceEditing.biz_id"
        :contract-id="evidenceEditing.contract_id || 0"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';

import {
  OpsCustomerStageLabel,
  type OpsCustomerItem,
  type OpsCustomerLifecycleWorkorder,
  type OpsCustomerProcessType,
  type OpsFollowupItem,
  changeOpsCustomerStage,
  createOpsFollowup,
  detailOpsCustomer,
  getOpsVendorProfile,
  listOpsCustomerLifecycle,
  listOpsFollowup,
  startOpsCustomerProcess,
  upsertOpsVendorProfile,
  updateOpsCustomerReport,
  rotateOpsCustomerReportSecret,
  opsPublicFaultUrl,
} from '#/api/core/ops/customer';
import {
  listOpsCustomerEvidence,
  type OpsCustomerEvidencePack,
} from '#/api/core/ops/attachment';
import { submitOpsSurvey } from '#/api/core/ops/survey';
import { listOpsContract, type OpsContractItem } from '#/api/core/ops/contract';
import { listOpsSettlement, type OpsSettlementItem } from '#/api/core/ops/settlement';
import { listOpsTrial, type OpsTrialItem } from '#/api/core/ops/trial';
import {
  listOpsComputeAllocation,
  type OpsComputeAllocation,
} from '#/api/core/ops/compute';
import { OpsClosedReasonOptions } from '#/views/ops/constants/options';
import OpsDeliveryPack from '#/views/ops/components/OpsDeliveryPack.vue';

const route = useRoute();
const router = useRouter();

function resolveCustomerId() {
  const raw = route.params.id;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const customerId = resolveCustomerId();

const stageOrder = ['intent', 'trial', 'formal', 'closed'];
const nonRenewalReasons = new Set([
  '客户放弃',
  '竞品赢单',
  '预算不足',
  '需求变更',
  '长期无跟进',
  '其他',
]);

const loading = ref(false);
const customer = ref<OpsCustomerItem | null>(null);
const followups = ref<OpsFollowupItem[]>([]);
const trials = ref<OpsTrialItem[]>([]);
const contracts = ref<OpsContractItem[]>([]);
const settlements = ref<OpsSettlementItem[]>([]);
const lifecycleWorkorders = ref<OpsCustomerLifecycleWorkorder[]>([]);
const lifecycleStarting = ref(false);
const processVisible = ref(false);
const processForm = reactive({
  process_type: 'lifecycle' as OpsCustomerProcessType,
  title: '',
  resource_scale: '',
  purpose: '',
  remark: '',
});

const evidenceLoading = ref(false);
const evidencePacks = ref<OpsCustomerEvidencePack[]>([]);
const allocLoading = ref(false);
const allocations = ref<OpsComputeAllocation[]>([]);
const allocColumns = [
  { title: '服务器', dataIndex: 'server_code', key: 'server_code', width: 110 },
  { title: '卡数', dataIndex: 'allocated_gpus', key: 'allocated_gpus', width: 70 },
  { title: '阶段', dataIndex: 'biz_phase_label', key: 'phase', width: 70 },
  { title: '状态', key: 'life', width: 100 },
  { title: '当前合同', dataIndex: 'contract_no', key: 'contract_no', width: 120 },
  { title: '首次开通', key: 'opened', width: 100 },
  { title: '当前周期', key: 'period', width: 180 },
  { title: '阶段履历', key: 'history', width: 220, ellipsis: true },
  { title: '佐证', key: 'evidence', width: 90 },
];
const evidenceVisible = ref(false);
const evidenceEditing = ref<OpsCustomerEvidencePack | null>(null);
const evidenceModalTitle = computed(() => {
  if (!evidenceEditing.value) return '开通材料';
  return `${evidenceEditing.value.scene_label}材料 · ${evidenceEditing.value.title}`;
});

const processHint = computed(() => {
  switch (processForm.process_type) {
    case 'trial':
      return '将创建试用单并发起「运营测试开通」工单';
    case 'activation':
      return '将创建正式合同草稿与开通单，并发起「正式开通」流程（意向→合同开通→结算→开票回款，无试用阶段）';
    default:
      return '将发起完整的「运营全流程」审批工单（意向→试用→合同→结算等）';
  }
});

const reportForm = reactive({ report_code: '', report_enabled: 2 });
const reportSaving = ref(false);
const reportRotating = ref(false);
const secretVisible = ref(false);
const secretPayload = reactive({ report_code: '', report_secret: '' });

const publicFaultLink = computed(() => {
  const code = reportForm.report_code || customer.value?.report_code;
  return code ? opsPublicFaultUrl(code) : opsPublicFaultUrl();
});

const latestOpenLifecycle = computed(() => {
  // 进行中的全流程（待处理/处理中），便于快捷查看；同一客户可有多条历史工单
  return (
    lifecycleWorkorders.value.find(
      (item) =>
        item.workorder_instance_id > 0 &&
        (item.instance_status === 2 ||
          item.instance_status === 3 ||
          item.link_status === 'pending'),
    ) || null
  );
});

const stageVisible = ref(false);
const vendorVisible = ref(false);
const vendorSaving = ref(false);
const vendorForm = reactive({
  unit_name: '',
  credit_code: '',
  principal: '',
  contact_address_phone: '',
  cnaps_code: '',
  account_name: '',
  bank_name: '',
  bank_account: '',
  bank_province: '',
  bank_city: '',
  phone: '',
  account_type: 'corporate',
});

async function openVendorForm() {
  vendorVisible.value = true;
  try {
    const res: any = await getOpsVendorProfile(customerId);
    const p = res || {};
    vendorForm.unit_name = p.unit_name || customer.value?.name || '';
    vendorForm.credit_code = p.credit_code || '';
    vendorForm.principal = p.principal || customer.value?.contact_name || '';
    vendorForm.contact_address_phone = p.contact_address_phone || '';
    vendorForm.cnaps_code = p.cnaps_code || '';
    vendorForm.account_name = p.account_name || '';
    vendorForm.bank_name = p.bank_name || '';
    vendorForm.bank_account = p.bank_account || '';
    vendorForm.bank_province = p.bank_province || '';
    vendorForm.bank_city = p.bank_city || '';
    vendorForm.phone = p.phone || customer.value?.contact_phone || '';
    vendorForm.account_type = p.account_type || 'corporate';
  } catch {
    vendorForm.unit_name = customer.value?.name || '';
    vendorForm.principal = customer.value?.contact_name || '';
    vendorForm.phone = customer.value?.contact_phone || '';
  }
}

async function submitVendorProfile() {
  if (!vendorForm.unit_name.trim()) {
    message.warning('请填写单位名称');
    return;
  }
  vendorSaving.value = true;
  try {
    await upsertOpsVendorProfile({
      customer_id: customerId,
      unit_name: vendorForm.unit_name.trim(),
      credit_code: vendorForm.credit_code,
      principal: vendorForm.principal,
      contact_address_phone: vendorForm.contact_address_phone,
      cnaps_code: vendorForm.cnaps_code,
      account_name: vendorForm.account_name,
      bank_name: vendorForm.bank_name,
      bank_account: vendorForm.bank_account,
      bank_province: vendorForm.bank_province,
      bank_city: vendorForm.bank_city,
      phone: vendorForm.phone,
      account_type: vendorForm.account_type,
    });
    message.success('客商档案已保存');
    vendorVisible.value = false;
    await loadCustomer();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    vendorSaving.value = false;
  }
}

const stageLoading = ref(false);
const stageForm = reactive({
  stage: 'intent',
  closed_reason: '',
  non_renewal_content: '',
});

const needsNonRenewalSurvey = computed(
  () =>
    stageForm.stage === 'closed' &&
    !!stageForm.closed_reason &&
    nonRenewalReasons.has(stageForm.closed_reason),
);

const followVisible = ref(false);
const followLoading = ref(false);
const followForm = reactive({ type: '电话', content: '', next_plan: '' });

const stageIndex = computed(() => {
  let stage = customer.value?.stage || '';
  if (stage === 'lead') stage = 'intent';
  const idx = stageOrder.indexOf(stage);
  return idx >= 0 ? idx : 0;
});

function formatTime(v?: string) {
  if (!v) return '';
  return new Date(v).toLocaleString('zh-CN');
}

function goCreateTrial() {
  router.push({
    path: '/ops/trials',
    query: { customer_id: String(customerId), create: '1' },
  });
}

function goCreateContract() {
  router.push({
    path: '/ops/contracts',
    query: { customer_id: String(customerId), create: '1' },
  });
}

function goCreateSettlement() {
  router.push({
    path: '/ops/settlements',
    query: { customer_id: String(customerId), create: '1' },
  });
}

function goComputeAllocations() {
  router.push({
    path: '/ops/compute/allocations',
    query: { customer_id: String(customerId) },
  });
}

function goRegisterAllocation() {
  router.push({
    path: '/ops/compute/allocations',
    query: { customer_id: String(customerId), create: '1' },
  });
}

function formatDateOnly(v?: string) {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

function goTrials() {
  router.push({ path: '/ops/trials', query: { customer_id: String(customerId) } });
}

function goContracts() {
  router.push({ path: '/ops/contracts', query: { customer_id: String(customerId) } });
}

function goSettlements() {
  router.push({ path: '/ops/settlements', query: { customer_id: String(customerId) } });
}

function openWorkorder(instanceId: number) {
  router.push({ path: '/workorder/center', query: { id: String(instanceId) } });
}

async function loadLifecycle() {
  const res: any = await listOpsCustomerLifecycle(customerId);
  lifecycleWorkorders.value = Array.isArray(res) ? res : res?.items || [];
}

async function loadEvidence() {
  evidenceLoading.value = true;
  try {
    const res: any = await listOpsCustomerEvidence(customerId);
    evidencePacks.value = Array.isArray(res) ? res : res?.items || [];
  } catch {
    evidencePacks.value = [];
  } finally {
    evidenceLoading.value = false;
  }
}

function openEvidencePack(pack: OpsCustomerEvidencePack) {
  evidenceEditing.value = pack;
  evidenceVisible.value = true;
}

function openProcessModal() {
  processForm.process_type = 'lifecycle';
  processForm.title = '';
  processForm.resource_scale = '';
  processForm.purpose = '';
  processForm.remark = '';
  processVisible.value = true;
}

async function submitProcess() {
  const typeLabel =
    processForm.process_type === 'trial'
      ? '运营测试开通'
      : processForm.process_type === 'activation'
        ? '运营正式开通'
        : '运营全流程';
  const openCount = lifecycleWorkorders.value.filter(
    (item) =>
      item.workorder_instance_id > 0 &&
      item.process_type === processForm.process_type &&
      (item.instance_status === 2 ||
        item.instance_status === 3 ||
        item.link_status === 'pending'),
  ).length;
  if (openCount > 0) {
    const ok = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: `再次发起${typeLabel}？`,
        content: `该客户当前还有 ${openCount} 条进行中的同类型工单。确认再开一条？`,
        okText: '继续发起',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) {
      return Promise.reject(new Error('cancelled'));
    }
  }
  lifecycleStarting.value = true;
  try {
    const res: any = await startOpsCustomerProcess(customerId, {
      process_type: processForm.process_type,
      title: processForm.title.trim() || undefined,
      resource_scale: processForm.resource_scale.trim() || undefined,
      purpose: processForm.purpose.trim() || undefined,
      remark: processForm.remark.trim() || undefined,
    });
    message.success(`已发起${typeLabel}`);
    processVisible.value = false;
    await loadAll();
    if (res?.workorder_instance_id) {
      openWorkorder(res.workorder_instance_id);
    }
  } catch (e: any) {
    if (e?.message === 'cancelled') throw e;
    message.error(e?.message || '发起失败，请确认已配置对应工单模板');
    throw e;
  } finally {
    lifecycleStarting.value = false;
  }
}

async function loadCustomer() {
  const res: any = await detailOpsCustomer(customerId, true);
  customer.value = res || null;
  if (customer.value?.stage) {
    stageForm.stage = customer.value.stage;
  }
  reportForm.report_code = customer.value?.report_code || '';
  reportForm.report_enabled = customer.value?.report_enabled ?? 2;
}

async function saveReportSettings() {
  if (!reportForm.report_code.trim()) {
    message.warning('请填写组织编码');
    return;
  }
  reportSaving.value = true;
  try {
    await updateOpsCustomerReport(customerId, {
      report_code: reportForm.report_code.trim(),
      report_enabled: reportForm.report_enabled,
    });
    message.success('报障配置已保存');
    await loadCustomer();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    reportSaving.value = false;
  }
}

async function rotateReportSecret() {
  reportRotating.value = true;
  try {
    const res = await rotateOpsCustomerReportSecret(customerId);
    secretPayload.report_code = res.report_code;
    secretPayload.report_secret = res.report_secret;
    secretVisible.value = true;
    await loadCustomer();
    reportForm.report_code = res.report_code;
    reportForm.report_enabled = 1;
  } catch (e: any) {
    message.error(e?.message || '生成密钥失败');
  } finally {
    reportRotating.value = false;
  }
}

function copySecret() {
  const text = `组织编码：${secretPayload.report_code}\n组织密钥：${secretPayload.report_secret}`;
  navigator.clipboard.writeText(text).then(
    () => message.success('已复制'),
    () => message.warning('复制失败，请手动复制'),
  );
}

async function loadFollowups() {
  const res: any = await listOpsFollowup({
    page: 1,
    size: 50,
    customer_id: customerId,
  });
  followups.value = res?.items || [];
}

async function loadRelated() {
  const [t, c, s] = await Promise.all([
    listOpsTrial({ page: 1, size: 10, customer_id: customerId }),
    listOpsContract({ page: 1, size: 10, customer_id: customerId }),
    listOpsSettlement({ page: 1, size: 10, customer_id: customerId }),
  ]);
  trials.value = (t as any)?.items || [];
  contracts.value = (c as any)?.items || [];
  settlements.value = (s as any)?.items || [];
}

async function loadAllocations() {
  allocLoading.value = true;
  try {
    const res: any = await listOpsComputeAllocation({
      page: 1,
      size: 10,
      customer_id: customerId,
    });
    allocations.value = res?.items || [];
  } catch {
    allocations.value = [];
  } finally {
    allocLoading.value = false;
  }
}

async function loadAll() {
  const id = resolveCustomerId();
  if (!id) {
    message.warning('客户不存在或已删除');
    router.replace('/ops/customers');
    return;
  }
  loading.value = true;
  try {
    await loadCustomer();
    if (!customer.value) {
      message.warning('客户不存在或已删除');
      router.replace('/ops/customers');
      return;
    }
    await Promise.all([
      loadFollowups(),
      loadRelated(),
      loadLifecycle(),
      loadEvidence(),
      loadAllocations(),
    ]);
  } catch {
    message.warning('客户不存在或已删除');
    router.replace('/ops/customers');
  } finally {
    loading.value = false;
  }
}

function openStageModal() {
  stageForm.stage = customer.value?.stage || 'intent';
  stageForm.closed_reason = '';
  stageForm.non_renewal_content = '';
  stageVisible.value = true;
}

async function submitStage() {
  if (needsNonRenewalSurvey.value && !stageForm.non_renewal_content.trim()) {
    message.warning('请填写不续费原因说明，或先到「客户问卷」提交');
    return;
  }
  stageLoading.value = true;
  try {
    if (needsNonRenewalSurvey.value) {
      await submitOpsSurvey({
        survey_code: 'non_renewal',
        customer_id: customerId,
        answers: { content: stageForm.non_renewal_content.trim(), reason: stageForm.closed_reason },
        score: 0,
      });
    }
    await changeOpsCustomerStage({
      id: customerId,
      stage: stageForm.stage,
      closed_reason: stageForm.closed_reason,
    });
    message.success('阶段已更新');
    stageVisible.value = false;
    await loadCustomer();
  } catch (e: any) {
    message.error(e?.message || '变更阶段失败');
  } finally {
    stageLoading.value = false;
  }
}

async function submitFollowup() {
  if (!followForm.content.trim()) {
    message.warning('请填写跟进内容');
    return;
  }
  followLoading.value = true;
  try {
    await createOpsFollowup({
      customer_id: customerId,
      type: followForm.type,
      content: followForm.content,
      next_plan: followForm.next_plan,
    });
    message.success('跟进已添加');
    followVisible.value = false;
    followForm.content = '';
    followForm.next_plan = '';
    await loadFollowups();
  } catch {
    message.error('添加跟进失败');
  } finally {
    followLoading.value = false;
  }
}

onMounted(loadAll);
</script>

<style scoped>
.ops-page {
  padding: 12px;
}
.mb16 {
  margin-bottom: 16px;
}
.follow-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.follow-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}
.muted {
  color: #8c8c8c;
  font-size: 12px;
}
.evidence-item {
  padding-bottom: 4px;
}
.evidence-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.evidence-meta {
  margin-top: 4px;
}
</style>

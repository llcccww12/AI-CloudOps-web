<template>
  <div class="autofix-workflow">
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <div class="header-icon">
            <Icon icon="lucide:wrench" width="34" />
          </div>
          <div class="header-text">
            <h1 class="page-title">自动修复工作流</h1>
            <p class="page-subtitle">将诊断结果转换为候选动作，并由多智能体完成风险评估与受控执行</p>
          </div>
        </div>
        <div class="header-actions">
          <a-space class="action-toolbar" :size="10">
            <a-button class="tool-button" @click="loadServiceInfo" :loading="infoLoading">
              刷新服务
            </a-button>
            <a-button class="tool-button" @click="showRawDrawer = true" :disabled="!workflowResult">
              原始结果
            </a-button>
            <a-button
              class="tool-button tool-button-primary"
              type="primary"
              @click="runWorkflow"
              :loading="running"
              :disabled="!isFormValid"
            >
              执行工作流
            </a-button>
          </a-space>
        </div>
      </div>
    </div>

    <a-row :gutter="[24, 24]">
      <a-col :xs="24" :lg="7">
        <a-card title="修复输入" class="config-card">
          <a-form layout="vertical" :model="formData">
            <a-form-item label="Kubernetes 集群" required>
              <a-select
                v-model:value="clusterId"
                placeholder="选择要修复的集群"
                :loading="clustersLoading"
                :options="clusterOptions"
                show-search
                option-filter-prop="label"
              />
              <div class="form-hint">来自 cluster 管理中已接入的集群</div>
            </a-form-item>
            <a-form-item label="命名空间" required>
              <a-select
                v-model:value="namespace"
                placeholder="先选择集群，再选择命名空间"
                :loading="namespacesLoading"
                :disabled="!clusterId"
                :options="namespaceOptions"
                show-search
                option-filter-prop="label"
              />
              <a-alert
                v-if="isRestrictedNamespace"
                class="ns-warning"
                type="warning"
                show-icon
                message="当前命名空间可能被策略限制或缺少 RBAC，确认执行时会被再次校验并可能拒绝。"
              />
            </a-form-item>
            <a-form-item label="Deployment">
              <a-select
                v-model:value="formData.deployment"
                placeholder="选择 Deployment，也可输入后回车/失焦确认"
                :loading="deploymentsLoading"
                :disabled="!clusterId || !namespace"
                :options="deploymentOptions"
                show-search
                allow-clear
                option-filter-prop="label"
                @search="onDeploymentSearch"
                @blur="commitTypedDeployment"
              />
              <div v-if="deploymentFromAlertHint" class="form-hint">
                {{ deploymentFromAlertHint }}
              </div>
            </a-form-item>
            <a-form-item label="故障类型模板">
              <a-select v-model:value="templateKey" @change="applyTemplate">
                <a-select-option value="crashloop">CrashLoopBackOff 示例</a-select-option>
                <a-select-option value="resource">资源不足 示例</a-select-option>
                <a-select-option value="imagepull">镜像拉取失败 示例</a-select-option>
                <a-select-option value="custom">自定义（不清空手动故障类型）</a-select-option>
              </a-select>
              <div class="form-hint">模板只填充问题描述示例，真正决定动作的是下方「故障类型」</div>
            </a-form-item>
            <a-form-item label="故障类型" required>
              <a-select v-model:value="formData.fault_type">
                <a-select-option value="auto">自动识别（按问题描述/事件关键词）</a-select-option>
                <a-select-option value="crash_loop_backoff">CrashLoopBackOff</a-select-option>
                <a-select-option value="resource_insufficient">资源不足 / 调度失败</a-select-option>
                <a-select-option value="image_pull_failure">镜像拉取失败</a-select-option>
                <a-select-option value="unknown">未知（仅做通用检查）</a-select-option>
              </a-select>
              <div class="form-hint">
                选「自动识别」时按文案关键词判断；自定义 Pending 等场景建议手动指定，避免被 AI 误判
              </div>
            </a-form-item>
            <a-form-item label="问题描述" required>
              <a-textarea
                v-model:value="formData.problem_description"
                :auto-size="{ minRows: 4, maxRows: 8 }"
                placeholder="描述当前故障现象、涉及资源和期望处理方式"
              />
            </a-form-item>
            <a-form-item label="事件/诊断补充">
              <a-textarea
                v-model:value="formData.event"
                :auto-size="{ minRows: 3, maxRows: 6 }"
                placeholder="可粘贴 K8s Event、Pod 状态、错误日志摘要"
              />
            </a-form-item>
          </a-form>

          <div class="config-actions">
            <a-button class="config-action-button" @click="resetForm">重置</a-button>
            <a-button
              class="config-action-button config-action-button-primary"
              type="primary"
              @click="runWorkflow"
              :loading="running"
              :disabled="!isFormValid"
            >
              执行自动修复
            </a-button>
          </div>
        </a-card>

        <a-card title="服务状态" class="side-card">
          <a-skeleton v-if="infoLoading && !serviceInfo" active :paragraph="{ rows: 4 }" />
          <template v-else>
            <div class="service-status">
              <a-tag :color="readyInfo?.healthy ? 'green' : 'orange'">
                {{ readyInfo?.status || serviceInfo?.status || 'unknown' }}
              </a-tag>
              <span class="service-name">{{ serviceInfo?.service || '自动修复' }}</span>
            </div>
            <div class="service-desc">
              <div class="service-meta-item">
                <span class="service-meta-label">工作流引擎</span>
                <span class="service-meta-value">{{ serviceInfo?.workflow_engine || 'langgraph' }}</span>
              </div>
              <div class="service-meta-item service-meta-item-stack">
                <span class="service-meta-label">能力</span>
                <div class="service-capabilities">
                  <a-tag v-for="item in serviceInfo?.capabilities || defaultCapabilities" :key="item" color="blue">
                    {{ item }}
                  </a-tag>
                </div>
              </div>
            </div>
          </template>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="17">
        <a-alert
          v-if="pageError"
          class="page-error-alert"
          type="error"
          show-icon
          closable
          :message="pageError"
          @close="pageError = ''"
        />
        <a-alert
          v-if="riskDenialReasons.length"
          class="page-error-alert"
          type="warning"
          show-icon
          message="风险/权限校验提示"
          :description="riskDenialReasons.join('；')"
        />
        <a-row :gutter="[16, 16]" class="summary-grid">
          <a-col :xs="24" :sm="12" :xl="6">
            <div class="summary-card status">
              <div class="summary-icon"><Icon icon="lucide:activity" width="22" /></div>
              <div>
                <div class="summary-label">工作流状态</div>
                <div class="summary-value">
                  <a-tag :color="getStatusTagColor(normalizedResult?.status)">
                    {{ getStatusLabel(normalizedResult?.status) }}
                  </a-tag>
                </div>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <div class="summary-card fault">
              <div class="summary-icon"><Icon icon="lucide:alert-triangle" width="22" /></div>
              <div>
                <div class="summary-label">故障类型</div>
                <div class="summary-value">{{ getFaultLabel(normalizedResult?.fault_type) }}</div>
                <div class="summary-sub">
                  {{
                    normalizedResult?.plan?.fault_type_source === 'override'
                      ? '来源：手动指定'
                      : '来源：自动识别'
                  }}
                </div>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <div class="summary-card action">
              <div class="summary-icon"><Icon icon="lucide:list-checks" width="22" /></div>
              <div>
                <div class="summary-label">候选 / 放行动作</div>
                <div class="summary-value">{{ candidateActions.length }} / {{ allowedActionCount }}</div>
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :sm="12" :xl="6">
            <div class="summary-card blocked">
              <div class="summary-icon"><Icon icon="lucide:shield-alert" width="22" /></div>
              <div>
                <div class="summary-label">阻断动作</div>
                <div class="summary-value">{{ blockedActions.length }}</div>
              </div>
            </div>
          </a-col>
        </a-row>

        <a-card v-if="userBrief" class="conclusion-card" title="这次到底是什么情况">
          <a-alert
            :type="userBrief.resolved ? 'success' : 'warning'"
            show-icon
            :message="userBrief.resolved_label || (userBrief.resolved ? '已修复' : '未修复')"
            :description="userBrief.explanation || userBrief.cause"
            style="margin-bottom: 12px"
          />
          <div class="conclusion-block">
            <div class="conclusion-label">问题</div>
            <div>{{ userBrief.problem || '检查完成，但还不能确认根因' }}</div>
          </div>
          <div v-if="userBrief.cause" class="conclusion-block">
            <div class="conclusion-label">原因</div>
            <div>{{ userBrief.cause }}</div>
          </div>
          <div v-if="userBrief.next_steps?.length" class="conclusion-block">
            <div class="conclusion-label">建议你接下来做</div>
            <ol>
              <li v-for="item in userBrief.next_steps" :key="item">{{ item }}</li>
            </ol>
          </div>
          <div v-if="userBrief.evidence?.length" class="conclusion-block">
            <div class="conclusion-label">依据</div>
            <ul>
              <li v-for="item in userBrief.evidence" :key="item">{{ item }}</li>
            </ul>
          </div>
        </a-card>

        <a-row :gutter="[16, 16]" class="ai-insight-grid">
          <a-col :xs="24" :xl="8">
            <a-card title="AI分析" class="insight-card">
              <div v-if="aiAnalysisHighlights.length" class="insight-list">
                <div v-for="item in aiAnalysisHighlights" :key="item" class="insight-item">
                  {{ item }}
                </div>
              </div>
              <a-empty v-else description="执行后展示 AI 诊断分析" />
            </a-card>
          </a-col>
          <a-col :xs="24" :xl="8">
            <a-card title="AI计划摘要" class="insight-card">
              <div v-if="aiPlanHighlights.length" class="insight-list">
                <div v-for="item in aiPlanHighlights" :key="item" class="insight-item">
                  {{ item }}
                </div>
              </div>
              <a-empty v-else description="执行后展示 AI 计划摘要" />
            </a-card>
          </a-col>
          <a-col :xs="24" :xl="8">
            <a-card title="AI复核要点" class="insight-card">
              <div v-if="aiReviewHighlights.length" class="insight-list">
                <div v-for="item in aiReviewHighlights" :key="item" class="insight-item">
                  {{ item }}
                </div>
              </div>
              <a-empty v-else description="执行后展示 AI 风险复核" />
            </a-card>
          </a-col>
        </a-row>

        <a-card class="workflow-card" title="多智能体协作">
          <template #extra>
            <a-tag color="purple">{{ normalizedResult?.workflow_engine || 'LangGraph' }}</a-tag>
          </template>
          <a-steps :current="currentAgentStep" size="small" responsive>
            <a-step v-for="agent in workflowAgents" :key="agent.name" :title="agent.title" :description="agent.description">
              <template #icon>
                <Icon :icon="agent.icon" width="18" />
              </template>
            </a-step>
          </a-steps>

          <div class="agent-messages" v-if="visibleAgentMessages.length">
            <div v-for="(item, index) in visibleAgentMessages" :key="`${item.agent}-${index}`" class="agent-message">
              <div class="agent-message-icon"><Icon icon="lucide:bot" width="16" /></div>
              <div class="agent-message-content">
                <strong>{{ item.agent }}</strong>
                <span>{{ item.content || item.action || '已处理当前阶段' }}</span>
              </div>
            </div>
          </div>
          <a-empty v-else description="执行后展示智能体调度过程" />
        </a-card>

        <a-card class="result-card" title="候选修复动作与风险评估">
          <template #extra>
            <a-space>
              <a-tag color="green">允许 {{ allowedActionCount }}</a-tag>
              <a-tag color="red">阻断 {{ blockedActions.length }}</a-tag>
            </a-space>
          </template>
          <a-table
            :columns="actionColumns"
            :data-source="candidateActions"
            :locale="{ emptyText: '暂无候选动作' }"
            :pagination="false"
            row-key="action_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <div class="action-cell">
                  <Icon :icon="getActionIcon(record.action_type)" width="16" />
                  <div>
                    <div class="action-name">{{ getActionLabel(record.action_type) }}</div>
                    <div class="action-desc">{{ record.description || '-' }}</div>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'risk'">
                <a-tag :color="getRiskTagColor(record.risk_assessment?.risk_level)">
                  {{ record.risk_assessment?.risk_level || 'unknown' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'allowed'">
                <a-tag :color="getExecutionGateLabel(record).color">
                  {{ getExecutionGateLabel(record).label }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'riskDetails'">
                <div class="risk-details">
                  <span>资源 {{ formatBoolean(record.risk_assessment?.resource_exists) }}</span>
                  <span>权限 {{ formatBoolean(record.risk_assessment?.permission_allowed) }}</span>
                  <span>回滚 {{ formatBoolean(record.risk_assessment?.rollback_available) }}</span>
                </div>
                <div v-if="record.risk_assessment?.reasons?.length" class="risk-reasons">
                  {{ record.risk_assessment.reasons.join(' / ') }}
                </div>
              </template>
            </template>
          </a-table>
        </a-card>

        <a-row :gutter="[16, 16]" class="bottom-section">
          <a-col :xs="24" :xl="12">
            <a-card title="执行结果" class="execution-card">
              <div v-if="executedActionViews.length" class="execution-list">
                <div
                  v-for="item in executedActionViews"
                  :key="item.action.action_id || item.action.action_type"
                  class="execution-item"
                >
                  <div class="execution-main">
                    <div class="execution-header">
                      <div class="execution-left">
                        <Icon :icon="getActionIcon(item.action.action_type)" width="18" />
                        <div>
                          <div class="execution-title">{{ getActionLabel(item.action.action_type) }}</div>
                          <div class="execution-meta">
                            {{ getStatusLabel(item.action.status || 'succeeded') }}
                            <span v-if="item.action.started_at"> · {{ formatActionTime(item.action.started_at) }}</span>
                          </div>
                        </div>
                      </div>
                      <a-tag :color="item.action.status === 'failed' ? 'red' : 'green'">
                        {{ getStatusLabel(item.action.status || 'succeeded') }}
                      </a-tag>
                    </div>
                    <div v-if="item.details.summary" class="execution-summary">
                      {{ item.details.summary }}
                    </div>
                    <ul v-if="item.details.detailLines.length" class="execution-details">
                      <li
                        v-for="(line, index) in item.details.detailLines"
                        :key="`${item.action.action_id || item.action.action_type}-${index}`"
                      >
                        {{ line }}
                      </li>
                    </ul>
                    <div v-if="item.details.error" class="execution-error">
                      {{ item.details.error }}
                    </div>
                  </div>
                </div>
              </div>
              <a-empty v-else description="暂无执行动作；仅建议项不会进入审批，高风险变更会停留在人工确认阶段" />
            </a-card>
          </a-col>
          <a-col :xs="24" :xl="12">
            <a-card title="Reviewer结论" class="review-card">
              <template v-if="normalizedResult">
                <a-alert
                  :message="reviewApproved ? '允许自动执行' : '需要人工确认或补充诊断'"
                  :description="reviewReason"
                  :type="reviewApproved ? 'success' : 'warning'"
                  show-icon
                />
                <div
                  v-if="normalizedResult.status === 'needs_human_confirmation' && confirmableBlockedActions.length"
                  class="confirm-panel"
                >
                  <div class="confirm-panel-header">
                    <span class="confirm-panel-title">待人工确认动作</span>
                    <a-tag color="orange">{{ confirmableBlockedActions.length }}</a-tag>
                  </div>
                  <div class="confirm-action-list">
                    <label
                      v-for="action in confirmableBlockedActions"
                      :key="action.action_id"
                      class="confirm-action-item"
                    >
                      <a-checkbox
                        :checked="selectedBlockedActionIds.includes(action.action_id || '')"
                        @change="toggleBlockedAction(action.action_id || '', $event.target.checked)"
                      />
                      <div class="confirm-action-content">
                        <div class="confirm-action-title">{{ getActionLabel(action.action_type) }}</div>
                        <div class="confirm-action-meta">
                          <span>{{ action.description || '无动作说明' }}</span>
                          <span>风险 {{ action.risk_assessment?.risk_level || 'unknown' }}</span>
                        </div>
                        <div
                          v-if="action.risk_assessment?.reasons?.length"
                          class="confirm-action-reasons"
                        >
                          阻断原因：{{ action.risk_assessment.reasons.join(' / ') }}
                        </div>
                        <div
                          v-if="getActionExecutionPreview(action).lines.length"
                          class="confirm-action-preview"
                        >
                          <div
                            v-for="(line, index) in getActionExecutionPreview(action).lines"
                            :key="`${action.action_id}-preview-${index}`"
                            class="confirm-preview-line"
                          >
                            {{ line }}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <a-alert
                    class="confirm-warning"
                    type="warning"
                    show-icon
                    message="确认后将真实调用集群 API 执行上方命令/变更，请仔细核对目标命名空间与 Deployment"
                  />
                  <div class="confirm-toolbar">
                    <a-button
                      type="primary"
                      danger
                      @click="confirmWorkflowExecution"
                      :loading="confirmLoading"
                      :disabled="!canConfirmWorkflow"
                    >
                      确认并继续执行
                    </a-button>
                  </div>
                </div>
              </template>
              <a-empty v-else description="执行工作流后展示风险复核结论" />
            </a-card>
          </a-col>
        </a-row>
      </a-col>
    </a-row>

    <a-drawer v-model:open="showRawDrawer" title="自动修复工作流原始响应" width="720">
      <pre class="raw-json">{{ rawResultText }}</pre>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Icon } from '@iconify/vue';
import { message } from 'ant-design-vue';

import {
  confirmAutoFixWorkflow,
  executeAutoFixWorkflow,
  getAutoFixInfo,
  getAutoFixReady,
  type AutoFixAction,
  type AutoFixInfoResponse,
  type AutoFixReadyResponse,
  type AutoFixWorkflowMessage,
  type AutoFixWorkflowResponse,
} from '#/api/core/aiops/autofix';
import {
  getDeploymentListApi,
  type K8sDeployment,
} from '#/api/core/k8s/k8s_deployment';
import { useRcaClusterNamespace } from '../rca/useRcaClusterNamespace';

import {
  formatBoolean,
  getActionIcon,
  getActionLabel,
  getActionExecutionPreview,
  getAllowedActionCount,
  getAiAnalysisHighlights,
  getAiPlanHighlights,
  getAiReviewHighlights,
  getExecutionGateLabel,
  getExecutionResultDetails,
  getFaultLabel,
  getRiskTagColor,
  getStatusLabel,
  getStatusTagColor,
  inferFaultFromAlert,
  normalizeWorkflowResult,
} from './autofix-format';

const templates = {
  crashloop: {
    event: 'Pod处于CrashLoopBackOff状态，容器持续重启，需要查看日志、检查配置并评估是否允许重启Deployment。',
    fault_type: 'crash_loop_backoff',
    problem_description: 'Deployment 出现 CrashLoopBackOff，业务实例反复重启，请生成候选修复动作并评估自动执行风险。',
  },
  custom: {
    event: '',
    fault_type: 'auto',
    problem_description: '',
  },
  imagepull: {
    event: 'ImagePullBackOff: failed to pull image，可能和镜像地址、Secret或网络连通性有关。',
    fault_type: 'image_pull_failure',
    problem_description: 'Deployment 镜像拉取失败，请检查镜像地址、镜像拉取密钥和网络连通性，并给出可控修复动作。',
  },
  resource: {
    event: 'FailedScheduling: insufficient cpu or insufficient memory，当前资源不足导致Pod无法调度。',
    fault_type: 'resource_insufficient',
    problem_description: 'Deployment 资源不足，Pod调度失败或负载过高，请规划扩容副本或调整资源请求的修复动作。',
  },
};

const workflowAgents = [
  { description: '识别任务类型', icon: 'lucide:route', name: 'Coordinator', title: 'Coordinator' },
  { description: '分析事件和日志', icon: 'lucide:search', name: 'Analyzer', title: 'Analyzer' },
  { description: '规划修复步骤', icon: 'lucide:list-checks', name: 'Planner', title: 'Planner' },
  { description: '复核风险边界', icon: 'lucide:shield-check', name: 'Reviewer', title: 'Reviewer' },
  { description: '人工确认高风险动作', icon: 'lucide:user-check', name: 'HumanConfirm', title: 'HumanConfirm' },
  { description: '执行允许动作', icon: 'lucide:terminal', name: 'Executor', title: 'Executor' },
];

const defaultCapabilities = ['诊断转换', '风险评估', '多智能体协作', '受控执行'];
const templateKey = ref<keyof typeof templates>('imagepull');
const running = ref(false);
const confirmLoading = ref(false);
const infoLoading = ref(false);
const showRawDrawer = ref(false);
const serviceInfo = ref<AutoFixInfoResponse>();
const readyInfo = ref<AutoFixReadyResponse>();
const workflowResult = ref<AutoFixWorkflowResponse>();
const selectedBlockedActionIds = ref<string[]>([]);
const deployments = ref<K8sDeployment[]>([]);
const deploymentsLoading = ref(false);
const pageError = ref('');
const route = useRoute();
const RESTRICTED_NAMESPACES = new Set(['kube-system', 'kube-public', 'kube-node-lease']);
const preferDeploymentFromQuery = ref('');
const extraDeploymentNames = ref<string[]>([]);
let deploymentRequestId = 0;
let typedDeployment = '';

const {
  clusters,
  namespaces,
  clustersLoading,
  namespacesLoading,
  clusterId,
  namespace,
  preferredNamespace,
  preferredClusterId,
  getSelectedKubeConfig,
} = useRcaClusterNamespace();

const clusterOptions = computed(() =>
  clusters.value.map((item) => ({
    label: item.api_server_addr
      ? `${item.name} (${item.api_server_addr})`
      : item.name,
    value: item.id,
  })),
);

const isRestrictedNamespace = computed(() =>
  Boolean(namespace.value && RESTRICTED_NAMESPACES.has(namespace.value)),
);

const namespaceOptions = computed(() =>
  namespaces.value.map((item) => ({
    label: RESTRICTED_NAMESPACES.has(item.name)
      ? `${item.name}（受限）`
      : item.name,
    value: item.name,
  })),
);

const formData = reactive({
  deployment: undefined as string | undefined,
  event: templates.imagepull.event,
  fault_type: templates.imagepull.fault_type as string,
  problem_description: templates.imagepull.problem_description,
});

const deploymentOptions = computed(() => {
  const seen = new Set<string>();
  const options: Array<{ label: string; value: string }> = [];
  const extras = [
    preferDeploymentFromQuery.value,
    formData.deployment,
    ...extraDeploymentNames.value,
  ].filter((name): name is string => Boolean(name?.trim()));
  for (const name of extras) {
    if (seen.has(name)) continue;
    seen.add(name);
    const inCluster = deployments.value.some((item) => item.name === name);
    options.push({
      label: inCluster ? name : `${name}（来自告警/手动输入）`,
      value: name,
    });
  }
  for (const item of deployments.value) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    options.push({ label: item.name, value: item.name });
  }
  return options;
});

const deploymentFromAlertHint = computed(() => {
  const name = formData.deployment?.trim();
  if (!name) {
    return deployments.value.length
      ? ''
      : '当前命名空间未拉到 Deployment，可手动输入名称';
  }
  if (!deployments.value.some((item) => item.name === name)) {
    return '该名称不在当前集群列表中，已保留告警/手动输入值，执行时仍会按此名称操作';
  }
  return '';
});

const isFormValid = computed(() =>
  Boolean(clusterId.value && namespace.value?.trim() && formData.problem_description.trim()),
);

const riskDenialReasons = computed(() => {
  const reasons = new Set<string>();
  const result = workflowResult.value as any;
  if (result?.error) {
    reasons.add(String(result.error));
  }
  const reviewReason = result?.review?.reason;
  if (result?.status === 'confirmation_rejected' && reviewReason) {
    reasons.add(String(reviewReason));
  }
  const actions = [
    ...(result?.blocked_actions || []),
    ...(result?.candidate_actions || []),
    ...((result?.review?.rejected_actions as any[]) || []),
  ];
  for (const action of actions) {
    for (const reason of action?.risk_assessment?.reasons || []) {
      if (
        String(reason).includes('namespace') ||
        String(reason).includes('permission') ||
        String(reason).includes('命名空间') ||
        String(reason).includes('权限')
      ) {
        reasons.add(String(reason));
      }
    }
  }
  return [...reasons];
});

const fetchDeployments = async (id: number, ns: string) => {
  const requestId = ++deploymentRequestId;
  const keep = preferDeploymentFromQuery.value.trim() || formData.deployment?.trim() || '';
  try {
    deploymentsLoading.value = true;
    const res = await getDeploymentListApi(id, {
      namespace: ns,
      page: 1,
      size: 100,
    });
    if (requestId !== deploymentRequestId) {
      return;
    }
    deployments.value = res?.items || [];
    const names = deployments.value.map((item) => item.name);
    if (keep) {
      formData.deployment = keep;
      if (!names.includes(keep) && !extraDeploymentNames.value.includes(keep)) {
        extraDeploymentNames.value = [keep, ...extraDeploymentNames.value];
      }
    } else if (names[0]) {
      formData.deployment = names[0];
    }
  } catch {
    if (requestId !== deploymentRequestId) {
      return;
    }
    deployments.value = [];
    if (keep) {
      formData.deployment = keep;
    }
    message.warning('获取 Deployment 列表失败，可手动填写名称');
  } finally {
    if (requestId === deploymentRequestId) {
      deploymentsLoading.value = false;
    }
  }
};

watch(
  [clusterId, namespace],
  ([id, ns]) => {
    if (id && ns) {
      void fetchDeployments(id, ns);
      return;
    }
    deployments.value = [];
    if (!preferDeploymentFromQuery.value) {
      formData.deployment = undefined;
    }
  },
  { immediate: true },
);

function onDeploymentSearch(value: string) {
  typedDeployment = String(value || '').trim();
}

function commitTypedDeployment() {
  if (!typedDeployment) {
    return;
  }
  formData.deployment = typedDeployment;
  if (!extraDeploymentNames.value.includes(typedDeployment)) {
    extraDeploymentNames.value = [typedDeployment, ...extraDeploymentNames.value];
  }
  typedDeployment = '';
}
const normalizedResult = computed(() => (workflowResult.value ? normalizeWorkflowResult(workflowResult.value) : null));
const userBrief = computed(() => normalizedResult.value?.user_brief);

function formatActionTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
const candidateActions = computed<AutoFixAction[]>(() => normalizedResult.value?.candidate_actions || []);
const blockedActions = computed<AutoFixAction[]>(() => normalizedResult.value?.blocked_actions || []);
const executedActions = computed<AutoFixAction[]>(() => normalizedResult.value?.executed_actions || []);
const executedActionViews = computed(() =>
  executedActions.value.map((action) => ({
    action,
    details: getExecutionResultDetails(action),
  })),
);
const allowedActionCount = computed(() => getAllowedActionCount(candidateActions.value));
const agentMessages = computed<AutoFixWorkflowMessage[]>(() => normalizedResult.value?.messages || []);
const visibleAgentMessages = computed<AutoFixWorkflowMessage[]>(() =>
  agentMessages.value.map((item) => ({
    ...item,
    content: item.content || item.action || '',
  })),
);
const reviewApproved = computed(() => Boolean(normalizedResult.value?.review?.approved));
const reviewReason = computed(() => normalizedResult.value?.review?.reason || '暂无Reviewer结论');
const rawResultText = computed(() => JSON.stringify(workflowResult.value || {}, null, 2));
const aiAnalysisHighlights = computed(() => getAiAnalysisHighlights(normalizedResult.value?.diagnosis));
const aiPlanHighlights = computed(() => getAiPlanHighlights(normalizedResult.value?.plan));
const aiReviewHighlights = computed(() => getAiReviewHighlights(normalizedResult.value?.review));
const confirmableBlockedActions = computed<AutoFixAction[]>(() =>
  blockedActions.value.filter((action) => Boolean(action.action_id && action.executable !== false)),
);
const canConfirmWorkflow = computed(
  () =>
    normalizedResult.value?.status === 'needs_human_confirmation' &&
    selectedBlockedActionIds.value.length > 0 &&
    !confirmLoading.value,
);

const currentAgentStep = computed(() => {
  const used = normalizedResult.value?.agents_used || [];
  if (!used.length) return 0;
  const last = used[used.length - 1];
  return Math.max(0, workflowAgents.findIndex((agent) => agent.name === last));
});

const actionColumns = [
  { dataIndex: 'action_type', key: 'action', title: '动作', width: 260 },
  { dataIndex: ['risk_assessment', 'risk_level'], key: 'risk', title: '风险', width: 100 },
  { dataIndex: ['risk_assessment', 'allowed'], key: 'allowed', title: '执行门禁', width: 130 },
  { key: 'riskDetails', title: '风险评估明细' },
];

function applyTemplate() {
  const template = templates[templateKey.value];
  if (!template) return;
  formData.problem_description = template.problem_description;
  formData.event = template.event;
  formData.fault_type = template.fault_type;
}

function resetForm() {
  templateKey.value = 'imagepull';
  formData.deployment = undefined;
  formData.fault_type = templates.imagepull.fault_type;
  applyTemplate();
  workflowResult.value = undefined;
  selectedBlockedActionIds.value = [];
  if (clusterId.value && namespace.value) {
    void fetchDeployments(clusterId.value, namespace.value);
  }
}

function toggleBlockedAction(actionId: string, checked: boolean) {
  if (!actionId) return;
  if (checked) {
    if (!selectedBlockedActionIds.value.includes(actionId)) {
      selectedBlockedActionIds.value = [...selectedBlockedActionIds.value, actionId];
    }
    return;
  }
  selectedBlockedActionIds.value = selectedBlockedActionIds.value.filter(
    (currentActionId) => currentActionId !== actionId,
  );
}

async function loadServiceInfo() {
  infoLoading.value = true;
  try {
    const [info, ready] = await Promise.allSettled([getAutoFixInfo(), getAutoFixReady()]);
    if (info.status === 'fulfilled') serviceInfo.value = info.value;
    if (ready.status === 'fulfilled') readyInfo.value = ready.value;
  } catch (error: any) {
    message.warning(`自动修复服务状态获取失败: ${error.message || error}`);
  } finally {
    infoLoading.value = false;
  }
}

async function runWorkflow() {
  if (!isFormValid.value) {
    message.warning('请选择集群、命名空间并填写问题描述');
    return;
  }

  running.value = true;
  pageError.value = '';
  try {
    const kubeConfig = await getSelectedKubeConfig();
    const response = await executeAutoFixWorkflow({
      deployment: formData.deployment || undefined,
      event: formData.event || formData.problem_description,
      fault_type:
        formData.fault_type && formData.fault_type !== 'auto'
          ? formData.fault_type
          : undefined,
      kube_config: kubeConfig,
      namespace: namespace.value!,
      problem_description: formData.problem_description,
    });
    workflowResult.value = response;
    selectedBlockedActionIds.value = [];
    const normalized = normalizeWorkflowResult(response);
    if (normalized.status === 'needs_human_confirmation') {
      message.warning('工作流已生成修复计划，高风险动作需要人工确认');
    } else {
      message.success('自动修复工作流执行完成');
    }
  } catch (error: any) {
    const raw = error?.message || String(error);
    pageError.value = raw.includes('请先选择集群') || raw.includes('KubeConfig')
      ? raw
      : `自动修复工作流执行失败: ${raw}`;
    message.error(pageError.value);
  } finally {
    running.value = false;
  }
}

async function confirmWorkflowExecution() {
  if (!workflowResult.value) {
    message.warning('当前没有可确认的工作流结果');
    return;
  }

  const planId = workflowResult.value.plan?.plan_id;
  if (!planId) {
    message.warning('当前工作流缺少计划ID，无法继续确认执行');
    return;
  }

  if (!selectedBlockedActionIds.value.length) {
    message.warning('请先选择要批准执行的动作');
    return;
  }

  confirmLoading.value = true;
  pageError.value = '';
  try {
    const response = await confirmAutoFixWorkflow({
      approved_action_ids: selectedBlockedActionIds.value,
      plan_id: planId,
    });
    workflowResult.value = response;
    selectedBlockedActionIds.value = [];
    if (response.status === 'confirmation_rejected') {
      pageError.value =
        (response as any).error ||
        response.review?.reason ||
        '确认被拒绝：命名空间或 RBAC 不允许执行';
      message.error(pageError.value);
    } else if (response.status === 'needs_human_confirmation') {
      message.warning('已执行已确认动作，仍有待人工确认项');
    } else {
      message.success('已确认高风险动作并继续执行');
    }
  } catch (error: any) {
    const raw = error?.message || String(error);
    pageError.value = raw.includes('过期')
      ? '计划已过期，请重新诊断后再确认'
      : `确认执行失败: ${raw}`;
    message.error(pageError.value);
  } finally {
    confirmLoading.value = false;
  }
}

function applyQueryPrefill() {
  const q = route.query;
  const ns = String(q.namespace || '').trim();
  const deployment = String(q.deployment || q.workload || '').trim();
  const summary = String(q.summary || q.alert || '').trim();
  const fingerprint = String(q.alertFingerprint || '').trim();
  const cid = Number(q.clusterId || q.cluster_id || 0);
  const faultType = String(q.fault_type || '').trim();
  if (cid) {
    preferredClusterId.value = cid;
  }
  if (ns) {
    preferredNamespace.value = ns;
    namespace.value = ns;
  }
  if (deployment) {
    preferDeploymentFromQuery.value = deployment;
    formData.deployment = deployment;
    extraDeploymentNames.value = [deployment, ...extraDeploymentNames.value.filter((item) => item !== deployment)];
  }
  if (summary) {
    formData.problem_description = summary;
    formData.event = fingerprint
      ? `${summary}\n[alertFingerprint=${fingerprint}]`
      : summary;
    const inferred = inferFaultFromAlert(`${summary} ${q.alertname || ''} ${deployment}`);
    templateKey.value = inferred.templateKey;
    formData.fault_type = faultType || inferred.faultType;
  } else if (deployment || ns) {
    templateKey.value = 'custom';
    formData.fault_type = faultType || 'auto';
  }
}

applyQueryPrefill();

onMounted(() => {
  loadServiceInfo();
});
</script>

<style scoped>
.autofix-workflow {
  min-height: 100vh;
  padding: 24px;
  background-color: var(--ant-background-color-light, #fafafa);
}

.autofix-workflow .page-header {
  padding: 18px 22px;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.autofix-workflow .header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 20px;
}

.autofix-workflow .header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}

.autofix-workflow .header-text {
  min-width: 0;
}

.autofix-workflow .header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #1890ff;
  background: #e6f4ff;
  border-radius: 8px;
}

.autofix-workflow .page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  color: #262626;
}

.autofix-workflow .page-subtitle {
  margin: 4px 0 0;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 1.5;
}

.autofix-workflow .header-actions {
  display: flex;
  align-items: center;
}

.autofix-workflow .action-toolbar {
  align-items: center;
}

.autofix-workflow .tool-button,
.autofix-workflow .config-action-button {
  min-width: 96px;
  height: 40px;
  padding-inline: 14px;
  border-radius: 8px;
}

.autofix-workflow .tool-button-primary,
.autofix-workflow .config-action-button-primary {
  box-shadow: 0 10px 18px rgba(24, 144, 255, 0.18);
}

.config-card,
.side-card,
.workflow-card,
.result-card,
.execution-card,
.review-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.form-hint {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.service-name {
  color: #595959;
  font-weight: 500;
}

.service-desc {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-meta-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.service-meta-item-stack {
  align-items: flex-start;
  flex-direction: column;
}

.service-meta-label {
  flex-shrink: 0;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.4;
}

.service-meta-value {
  color: #262626;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.service-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-grid {
  margin-bottom: 8px;
}

.ai-insight-grid {
  margin-bottom: 8px;
}

.summary-card {
  display: flex;
  align-items: center;
  min-height: 92px;
  padding: 18px;
  gap: 14px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #1890ff;
  background: #e6f4ff;
  border-radius: 8px;
}

.summary-card.fault .summary-icon {
  color: #faad14;
  background: #fff7e6;
}

.summary-card.action .summary-icon {
  color: #52c41a;
  background: #f6ffed;
}

.summary-card.blocked .summary-icon {
  color: #ff4d4f;
  background: #fff1f0;
}

.summary-label {
  margin-bottom: 6px;
  color: #8c8c8c;
  font-size: 12px;
}

.summary-value {
  color: #262626;
  font-size: 18px;
  font-weight: 600;
}

.agent-messages {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.agent-message {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  gap: 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.agent-message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #1890ff;
  background: #e6f4ff;
  border-radius: 6px;
}

.agent-message-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: #595959;
  font-size: 12px;
  gap: 4px;
}

.agent-message-content strong {
  color: #262626;
  font-size: 13px;
}

.conclusion-card {
  margin-bottom: 16px;
}

.conclusion-block {
  margin-top: 10px;
  color: #262626;
  line-height: 1.6;
}

.conclusion-label {
  margin-bottom: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.conclusion-block ol,
.conclusion-block ul {
  margin: 0;
  padding-left: 18px;
}

.insight-card {
  height: 100%;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-item {
  padding: 12px;
  color: #262626;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.action-cell {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.action-name {
  color: #262626;
  font-weight: 500;
}

.action-desc {
  max-width: 360px;
  margin-top: 2px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.4;
}

.risk-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #595959;
  font-size: 12px;
}

.risk-reasons {
  margin-top: 4px;
  color: #fa8c16;
  font-size: 12px;
}

.bottom-section {
  margin-top: 0;
}

.execution-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.execution-item {
  display: block;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.execution-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.execution-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.execution-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.execution-title {
  color: #262626;
  font-weight: 500;
}

.execution-meta {
  margin-top: 2px;
  color: #8c8c8c;
  font-size: 12px;
}

.execution-summary {
  color: #262626;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.execution-details {
  margin: 0;
  padding-left: 18px;
  color: #595959;
  font-size: 12px;
  line-height: 1.6;
}

.execution-details li + li {
  margin-top: 2px;
}

.ns-warning,
.page-error-alert {
  margin-bottom: 12px;
}

.execution-error {
  color: #cf1322;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.summary-sub {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.confirm-action-preview {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
}

.confirm-preview-line {
  color: #ad6800;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.confirm-preview-line + .confirm-preview-line {
  margin-top: 2px;
}

.confirm-warning {
  margin-top: 12px;
}

.confirm-panel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.confirm-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.confirm-panel-title {
  color: #262626;
  font-size: 13px;
  font-weight: 600;
}

.confirm-action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-action-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.confirm-action-content {
  min-width: 0;
}

.confirm-action-title {
  color: #262626;
  font-size: 13px;
  font-weight: 600;
}

.confirm-action-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 4px;
  color: #595959;
  font-size: 12px;
  line-height: 1.5;
}

.confirm-action-reasons {
  margin-top: 4px;
  color: #fa8c16;
  font-size: 12px;
  line-height: 1.5;
}

.confirm-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.raw-json {
  padding: 16px;
  margin: 0;
  overflow: auto;
  color: #262626;
  background: #f7f8fa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .autofix-workflow {
    padding: 16px;
  }

  .autofix-workflow .header-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .autofix-workflow .header-actions,
  .autofix-workflow .header-actions :deep(.ant-space) {
    width: 100%;
  }

  .autofix-workflow .header-actions {
    justify-content: flex-end;
  }

  .config-actions {
    justify-content: flex-start;
  }

  .confirm-toolbar {
    justify-content: flex-start;
  }

  .autofix-workflow .tool-button,
  .autofix-workflow .config-action-button {
    min-width: 88px;
  }
}
</style>

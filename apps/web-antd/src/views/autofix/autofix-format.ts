import type {
  AutoFixAction,
  AutoFixWorkflowResponse,
} from '#/api/core/aiops/autofix';

const statusColorMap: Record<string, string> = {
  blocked: 'red',
  completed: 'green',
  confirmation_rejected: 'red',
  failed: 'red',
  needs_human_confirmation: 'orange',
  planned: 'blue',
  running: 'processing',
};

const riskColorMap: Record<string, string> = {
  high: 'red',
  low: 'green',
  medium: 'orange',
  none: 'default',
};

const statusLabelMap: Record<string, string> = {
  blocked: '已阻断',
  completed: '已完成',
  confirmation_rejected: '确认被拒绝',
  failed: '执行失败',
  needs_human_confirmation: '需要人工确认',
  planned: '已生成计划',
  running: '执行中',
  succeeded: '已完成',
};

const faultLabelMap: Record<string, string> = {
  crash_loop_backoff: '容器反复崩溃',
  image_pull_failure: '镜像拉取失败',
  network_issue: '网络/CNI 异常',
  resource_insufficient: '资源不足',
  unknown: '待补充诊断',
};

const actionLabelMap: Record<string, string> = {
  adjust_resource_requests: '调整资源请求',
  check_image_pull_secret: '检查镜像密钥',
  check_image_reference: '检查镜像地址',
  check_network_connectivity: '检查网络连通性',
  inspect_configuration: '检查配置',
  inspect_events: '查看事件',
  inspect_logs: '查看日志',
  inspect_resource_quota: '检查资源配额',
  patch_image_pull_policy: '调整镜像拉取策略',
  restart_deployment: '重启Deployment',
  scale_deployment: '扩缩容Deployment',
};

const actionIconMap: Record<string, string> = {
  adjust_resource_requests: 'lucide:sliders-horizontal',
  check_image_pull_secret: 'lucide:key-round',
  check_image_reference: 'lucide:package-search',
  check_network_connectivity: 'lucide:network',
  inspect_configuration: 'lucide:file-cog',
  inspect_events: 'lucide:list-tree',
  inspect_logs: 'lucide:file-search',
  inspect_resource_quota: 'lucide:gauge',
  patch_image_pull_policy: 'lucide:package-check',
  restart_deployment: 'lucide:rotate-cw',
  scale_deployment: 'lucide:boxes',
};

export type AutoFixTemplateKey = 'crashloop' | 'custom' | 'imagepull' | 'resource';

export function inferFaultFromAlert(text?: string): {
  faultType: string;
  templateKey: AutoFixTemplateKey;
} {
  const raw = String(text || '');
  const t = raw.toLowerCase();
  if (/sandbox|calico|cni|failedcreatepodsandbox|setup network for sandbox/.test(t)) {
    return { faultType: 'network_issue', templateKey: 'custom' };
  }
  if (/crashloop|crash_loop|oomkilled|back-off restarting/.test(t)) {
    return { faultType: 'crash_loop_backoff', templateKey: 'crashloop' };
  }
  if (/image.?pull|errimagepull|invalidimage/.test(t)) {
    return { faultType: 'image_pull_failure', templateKey: 'imagepull' };
  }
  if (
    /replica|unavailable|资源不足|副本不足|insufficient|unschedul|pending|failedscheduling/.test(
      t,
    )
  ) {
    return { faultType: 'resource_insufficient', templateKey: 'resource' };
  }
  return { faultType: 'auto', templateKey: 'custom' };
}

export function getStatusTagColor(status?: string) {
  return statusColorMap[status || ''] || 'default';
}

export function getRiskTagColor(level?: string) {
  return riskColorMap[level || ''] || 'default';
}

export function getStatusLabel(status?: string) {
  return statusLabelMap[status || ''] || status || '未知';
}

export function getFaultLabel(faultType?: string) {
  return faultLabelMap[faultType || ''] || faultType || '未知故障';
}

export function getActionLabel(actionType?: string) {
  return actionLabelMap[actionType || ''] || actionType || '未知动作';
}

export function getActionIcon(actionType?: string) {
  return actionIconMap[actionType || ''] || 'lucide:wrench';
}

export function formatBoolean(value?: boolean | null) {
  if (value === true) return '是';
  if (value === false) return '否';
  return '未知';
}

export function getExecutionGateLabel(action?: {
  executable?: boolean;
  risk_assessment?: {
    allowed?: boolean;
    reasons?: string[];
    requires_human_confirmation?: boolean;
    risk_level?: string;
  };
}) {
  const assessment = action?.risk_assessment || {};
  const reasons = assessment.reasons || [];
  const isSuggestionOnly =
    action?.executable === false ||
    reasons.includes('manual inspection action') ||
    reasons.includes('manual suggestion only');

  if (isSuggestionOnly) {
    return { color: 'default', label: '仅建议' };
  }
  if (assessment.allowed) {
    return { color: 'green', label: '允许执行' };
  }
  if (assessment.requires_human_confirmation || assessment.risk_level === 'high') {
    return { color: 'orange', label: '需要确认' };
  }
  return { color: 'orange', label: '需要确认' };
}

export function normalizeWorkflowResult(
  raw: Partial<AutoFixWorkflowResponse>,
): AutoFixWorkflowResponse & { fault_type: string } {
  const plan = raw.plan || {};
  const execution = raw.execution || {};
  const review = raw.review || {};
  const candidateActions = raw.candidate_actions || plan.candidate_actions || [];
  const executedActions = raw.executed_actions || execution.executed_actions || [];
  const blockedActions = raw.blocked_actions || review.blocked_actions || execution.blocked_actions || [];

  return {
    agents_used: raw.agents_used || [],
    blocked_actions: blockedActions,
    candidate_actions: candidateActions,
    diagnosis: raw.diagnosis || {},
    executed_actions: executedActions,
    execution,
    user_brief: raw.user_brief || execution.user_brief,
    fault_type: plan.fault_type || 'unknown',
    messages: raw.messages || [],
    next_action: raw.next_action || 'finish',
    plan,
    review,
    status: raw.status || 'planned',
    timestamp: raw.timestamp || new Date().toISOString(),
    workflow_engine: raw.workflow_engine,
    workflow_nodes: raw.workflow_nodes || [],
  };
}

export function getAllowedActionCount(actions: AutoFixAction[]) {
  return actions.filter((action) => action.risk_assessment?.allowed).length;
}

function appendHighlights(target: string[], value: unknown) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) target.push(item.trim());
    }
    return;
  }
  if (typeof value === 'string' && value.trim()) target.push(value.trim());
}

export function getAiAnalysisHighlights(diagnosis?: Record<string, any>) {
  const highlights: string[] = [];
  const aiAnalysis = diagnosis?.ai_analysis || diagnosis?.diagnosis?.ai_analysis || {};
  const faultAnalysis = aiAnalysis?.faultAnalysis || aiAnalysis;

  appendHighlights(highlights, faultAnalysis?.faultType);
  appendHighlights(highlights, faultAnalysis?.fault_type);
  appendHighlights(highlights, faultAnalysis?.rootCause);
  appendHighlights(highlights, faultAnalysis?.root_cause);
  appendHighlights(highlights, faultAnalysis?.analysis);
  appendHighlights(highlights, faultAnalysis?.observations);
  appendHighlights(highlights, faultAnalysis?.symptoms);
  appendHighlights(highlights, faultAnalysis?.suspected_causes);
  appendHighlights(highlights, faultAnalysis?.suggestedActions);
  appendHighlights(highlights, faultAnalysis?.suggested_actions);
  appendHighlights(highlights, faultAnalysis?.missing_evidence);

  return [...new Set(highlights)].slice(0, 4);
}

export function getAiPlanHighlights(plan?: Record<string, any>) {
  const highlights: string[] = [];
  const aiPlanSummary = plan?.ai_plan_summary || {};

  appendHighlights(highlights, aiPlanSummary?.summary);
  appendHighlights(highlights, aiPlanSummary?.priority_actions);
  appendHighlights(highlights, aiPlanSummary?.recommended_order);
  appendHighlights(highlights, aiPlanSummary?.blocked_actions?.map((item: any) => item?.action_type));

  if (!highlights.length && plan?.summary) {
    appendHighlights(highlights, `候选 ${plan.summary.total_actions || 0} 个动作`);
    appendHighlights(highlights, `阻断 ${plan.summary.blocked_actions || 0} 个动作`);
  }

  return [...new Set(highlights)].slice(0, 4);
}

export function getAiReviewHighlights(review?: Record<string, any>) {
  const highlights: string[] = [];
  const aiReview = review?.ai_review || {};
  const reviewerConclusion = aiReview?.reviewer_conclusion || aiReview;

  appendHighlights(highlights, aiReview?.reason);
  appendHighlights(highlights, aiReview?.human_confirmation_note);
  appendHighlights(highlights, aiReview?.risk_summary);
  appendHighlights(highlights, reviewerConclusion?.reason);
  appendHighlights(highlights, reviewerConclusion?.human_confirmation_note);
  appendHighlights(highlights, reviewerConclusion?.risk_summary);
  appendHighlights(highlights, reviewerConclusion?.reasons);
  appendHighlights(highlights, reviewerConclusion?.blocked_action_types);

  return [...new Set(highlights)].slice(0, 4);
}

export function getExecutionResultDetails(action?: AutoFixAction) {
  const result = (action?.result || {}) as Record<string, any>;
  const findings = Array.isArray(result.findings)
    ? result.findings.filter((item: unknown) => typeof item === 'string' && item.trim())
    : [];
  const events = Array.isArray(result.events)
    ? result.events
        .map((event: Record<string, any>) => {
          const reason = event?.reason || 'event';
          const message = String(event?.message || '').trim();
          return message ? `${reason}: ${message}` : String(reason);
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const podLogs = Array.isArray(result.pod_logs)
    ? result.pod_logs
        .map((item: Record<string, any>) => {
          const pod = item?.pod || 'pod';
          const preview = String(item?.preview || item?.error || '').trim();
          return preview ? `${pod}: ${preview}` : '';
        })
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const images = Array.isArray(result.images)
    ? result.images
        .map((item: Record<string, any>) => {
          const container = item?.container || 'container';
          const image = item?.image || '-';
          const tag = item?.tag ? ` tag=${item.tag}` : '';
          const policy = item?.image_pull_policy
            ? ` pullPolicy=${item.image_pull_policy}`
            : '';
          return `${container}: ${image}${tag}${policy}`;
        })
        .filter(Boolean)
    : [];

  const detailLines = [...findings];
  for (const line of images) {
    if (!detailLines.includes(line)) detailLines.push(line);
  }
  if (!findings.length) {
    for (const line of events) {
      if (!detailLines.some((item) => item.includes(String(line).slice(0, 40)))) {
        detailLines.push(line);
      }
    }
    for (const line of podLogs) {
      detailLines.push(line);
    }
  }

  const summary =
    (typeof result.summary === 'string' && result.summary.trim()) ||
    (detailLines[0] as string | undefined) ||
    (action?.error ? `执行失败: ${action.error}` : '') ||
    (result.ok === false ? '执行失败（未返回详细错误）' : '') ||
    '';

  const error =
    action?.error ||
    result.error ||
    (result.ok === false && !result.error ? '执行失败，后端未返回详细原因' : '') ||
    '';

  if (error && !detailLines.some((item) => String(item).includes(String(error).slice(0, 40)))) {
    detailLines.unshift(`失败原因: ${error}`);
  }
  if (result.patch && typeof result.patch === 'object') {
    detailLines.push(`变更内容: ${JSON.stringify(result.patch)}`);
  }

  return {
    detailLines: detailLines.slice(0, 16),
    error,
    summary,
  };
}

export function getActionExecutionPreview(action?: AutoFixAction) {
  const preview = action?.execution_preview || {};
  const target = action?.target || {};
  const params = action?.parameters || preview.parameters || {};
  const namespace = target.namespace || 'default';
  const name = target.name || 'unknown';
  const lines: string[] = [];

  if (preview.summary) lines.push(preview.summary);
  if (preview.impact) lines.push(`影响: ${preview.impact}`);
  if (preview.command) lines.push(`将执行: ${preview.command}`);
  if (!preview.command && action?.action_type === 'adjust_resource_requests') {
    lines.push(
      `将执行: kubectl -n ${namespace} patch deployment/${name} --type strategic -p '{"spec":{"template":{"spec":{"containers":[{"name":"${params.container || name}","resources":{"requests":{"cpu":"${params.cpu || '200m'}","memory":"${params.memory || '256Mi'}"}}}]}}}}'`,
    );
  }
  if (!preview.command && action?.action_type === 'scale_deployment') {
    lines.push(
      `将执行: kubectl -n ${namespace} scale deployment/${name} --replicas=${params.replicas ?? '?'}`,
    );
  }
  if (Object.keys(params).length) {
    lines.push(`参数: ${JSON.stringify(params)}`);
  }
  if (preview.patch) {
    lines.push(`Patch: ${JSON.stringify(preview.patch)}`);
  }
  if (action?.risk_assessment?.reasons?.length) {
    lines.push(`阻断原因: ${action.risk_assessment.reasons.join(' / ')}`);
  }

  return {
    command: preview.command || '',
    impact: preview.impact || '',
    lines,
    summary: preview.summary || action?.description || getActionLabel(action?.action_type),
  };
}

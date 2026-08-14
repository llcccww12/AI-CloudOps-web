import { describe, expect, it } from 'vitest';

import {
  getActionExecutionPreview,
  getActionLabel,
  getExecutionGateLabel,
  getExecutionResultDetails,
  getRiskTagColor,
  getStatusTagColor,
  inferFaultFromAlert,
  normalizeWorkflowResult,
} from './autofix-format';

describe('autofix-format', () => {
  it('infers fault type from alert text', () => {
    expect(inferFaultFromAlert('Deployment default/nginx 可用副本不足')).toEqual({
      faultType: 'resource_insufficient',
      templateKey: 'resource',
    });
    expect(inferFaultFromAlert('Pod CrashLoopBackOff')).toEqual({
      faultType: 'crash_loop_backoff',
      templateKey: 'crashloop',
    });
    expect(inferFaultFromAlert('ImagePullBackOff failed to pull image')).toEqual({
      faultType: 'image_pull_failure',
      templateKey: 'imagepull',
    });
    expect(inferFaultFromAlert('unknown issue')).toEqual({
      faultType: 'auto',
      templateKey: 'custom',
    });
    expect(inferFaultFromAlert('FailedCreatePodSandBox calico failed add')).toEqual({
      faultType: 'network_issue',
      templateKey: 'custom',
    });
  });

  it('maps workflow status and action names to stable display values', () => {
    expect(getStatusTagColor('completed')).toBe('green');
    expect(getStatusTagColor('needs_human_confirmation')).toBe('orange');
    expect(getActionLabel('patch_image_pull_policy')).toBe('调整镜像拉取策略');
    expect(getActionLabel('restart_deployment')).toBe('重启Deployment');
  });

  it('maps execution gate labels without treating suggestion-only as approval items', () => {
    expect(
      getExecutionGateLabel({
        executable: false,
        risk_assessment: { allowed: false, reasons: ['manual inspection action'], risk_level: 'none' },
      }).label,
    ).toBe('仅建议');
    expect(
      getExecutionGateLabel({
        executable: true,
        risk_assessment: { allowed: true, risk_level: 'low' },
      }).label,
    ).toBe('允许执行');
    expect(
      getExecutionGateLabel({
        executable: true,
        risk_assessment: {
          allowed: false,
          requires_human_confirmation: true,
          risk_level: 'high',
        },
      }).label,
    ).toBe('需要确认');
  });
  it('maps risk levels and normalizes missing workflow fields', () => {
    expect(getRiskTagColor('low')).toBe('green');
    expect(getRiskTagColor('medium')).toBe('orange');
    expect(getRiskTagColor('high')).toBe('red');

    const result = normalizeWorkflowResult({
      status: 'completed',
      plan: {
        fault_type: 'image_pull_failure',
        candidate_actions: [
          {
            action_id: 'patch-image-pull-policy',
            action_type: 'patch_image_pull_policy',
            risk_assessment: { allowed: true, risk_level: 'low' },
          },
        ],
      },
    });

    expect(result.agents_used).toEqual([]);
    expect(result.candidate_actions).toHaveLength(1);
    expect(result.fault_type).toBe('image_pull_failure');
  });

  it('formats execution details with findings instead of only summary', () => {
    const details = getExecutionResultDetails({
      action_id: 'check-image-reference',
      action_type: 'check_image_reference',
      status: 'succeeded',
      result: {
        summary: '已检查 kube-system/coredns 的 1 个容器镜像',
        findings: [
          '容器 coredns: image=registry.k8s.io/coredns/coredns:v1.11.1, registry=registry.k8s.io, tag=v1.11.1, imagePullPolicy=IfNotPresent',
          '未发现与镜像拉取直接相关的 Warning 事件',
        ],
      },
    });

    expect(details.summary).toContain('coredns');
    expect(details.detailLines.length).toBeGreaterThanOrEqual(2);
    expect(details.detailLines[0]).toContain('registry.k8s.io');
  });

  it('exposes failed execution errors and action previews for human confirm', () => {
    const details = getExecutionResultDetails({
      action_type: 'adjust_resource_requests',
      status: 'failed',
      error: 'K8s API 拒绝变更 (HTTP 403): Forbidden',
      result: { ok: false, patch: { spec: { replicas: 1 } } },
    });
    expect(details.error).toContain('403');
    expect(details.detailLines[0]).toContain('失败原因');

    const preview = getActionExecutionPreview({
      action_type: 'adjust_resource_requests',
      description: '按保守值调整容器requests',
      parameters: { container: 'coredns', cpu: '200m', memory: '256Mi' },
      target: { name: 'coredns', namespace: 'kube-system' },
      execution_preview: {
        summary: '调整 kube-system/coredns 容器 coredns 的 requests',
        impact: '会触发滚动更新',
        command: "kubectl -n kube-system patch deployment/coredns --type strategic -p '{}'",
      },
      risk_assessment: { reasons: ['namespace not allowed'] },
    });
    expect(preview.lines.some((line) => line.includes('kubectl'))).toBe(true);
    expect(preview.lines.some((line) => line.includes('namespace not allowed'))).toBe(true);
  });
});

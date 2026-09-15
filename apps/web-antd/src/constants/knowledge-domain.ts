import { RoleCode } from '#/constants/roles';

export type KnowledgeDomain = 'ops' | 'sre' | 'common';
export type KnowledgeDomainFilter = KnowledgeDomain | 'all';

export const KNOWLEDGE_DOMAIN_OPTIONS: Array<{
  label: string;
  value: KnowledgeDomain;
  hint: string;
}> = [
  { label: '运营知识库', value: 'ops', hint: '客户/合同/结算等运营资料' },
  { label: '运维知识库', value: 'sre', hint: '部署/故障/K8s 等运维手册' },
  { label: '公共知识库', value: 'common', hint: '平台总览等公共说明' },
];

export function normalizeKnowledgeDomain(
  domain?: string | null,
  fallback: KnowledgeDomain = 'sre',
): KnowledgeDomain {
  const value = (domain || '').trim().toLowerCase();
  if (value === 'ops' || value === 'sre' || value === 'common') {
    return value;
  }
  return fallback;
}

/** 根据角色决定默认可写/可读业务域 */
export function resolveDefaultKnowledgeDomain(
  roles: string[] | undefined | null,
): KnowledgeDomain {
  const set = new Set((roles || []).map((r) => String(r).toLowerCase()));
  if (set.has(RoleCode.Admin)) return 'sre';
  if (set.has(RoleCode.Ops) && !set.has(RoleCode.Sre)) return 'ops';
  if (set.has(RoleCode.Sre) && !set.has(RoleCode.Ops)) return 'sre';
  if (set.has(RoleCode.Ops)) return 'ops';
  if (set.has(RoleCode.Sre)) return 'sre';
  return 'sre';
}

/** 角色可见的业务域（公共库对所有人可读） */
export function resolveAvailableKnowledgeDomains(
  roles: string[] | undefined | null,
): KnowledgeDomain[] {
  const set = new Set((roles || []).map((r) => String(r).toLowerCase()));
  if (set.has(RoleCode.Admin)) {
    return ['ops', 'sre', 'common'];
  }
  const domains: KnowledgeDomain[] = [];
  if (set.has(RoleCode.Ops)) domains.push('ops');
  if (set.has(RoleCode.Sre)) domains.push('sre');
  domains.push('common');
  if (domains.length === 1) {
    return ['sre', 'common'];
  }
  return domains;
}

/** 知识库管理页筛选项：全部 + 可见域 */
export function resolveKnowledgeListFilters(
  roles: string[] | undefined | null,
): KnowledgeDomainFilter[] {
  return ['all', ...resolveAvailableKnowledgeDomains(roles)];
}

export function knowledgeDomainLabel(
  domain: KnowledgeDomainFilter | string,
): string {
  if (domain === 'all') return '全部文档';
  return (
    KNOWLEDGE_DOMAIN_OPTIONS.find((item) => item.value === domain)?.label ||
    domain
  );
}

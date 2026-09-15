/** 菜单/路由权限角色码，需与后端 cl_system_roles.code 一致 */
export const RoleCode = {
  Admin: 'admin',
  Ops: 'ops',
  Sre: 'sre', // 兼容历史账号；运维菜单已下线
} as const;

export type RoleCodeType = (typeof RoleCode)[keyof typeof RoleCode];

/** 运营相关菜单 */
export const AuthorityOps = [RoleCode.Admin, RoleCode.Ops];

/** 工单等跨业务菜单 */
export const AuthorityCommon = [RoleCode.Admin, RoleCode.Ops, RoleCode.Sre];

/** 系统管理页（仅管理员） */
export const AuthoritySystem = [RoleCode.Admin];

/** 仅超管 */
export const AuthorityAdmin = [RoleCode.Admin];

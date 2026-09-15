import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';
import { AuthoritySystem } from '#/constants/roles';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/',
    children: [
      {
        name: 'Welcome',
        path: '/system_welcome',
        component: () => import('#/views/dashboard/SystemWelcome.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:monitor',
          title: '运营大屏',
        },
      },
      {
        name: '用户管理',
        path: '/system_user',
        component: () => import('#/views/dashboard/SystemUser.vue'),
        meta: {
          authority: AuthoritySystem,
          icon: 'lucide:user',
          title: '用户管理',
        },
      },
      {
        name: '接口管理',
        path: '/system_api',
        component: () => import('#/views/dashboard/SystemApi.vue'),
        meta: {
          authority: AuthoritySystem,
          title: '接口管理',
          icon: 'lucide:zap',
        },
      },
      {
        name: '角色管理',
        path: '/system_role',
        component: () => import('#/views/dashboard/SystemRole.vue'),
        meta: {
          authority: AuthoritySystem,
          icon: 'lucide:users',
          title: '角色管理',
        },
      },
      {
        name: '部门管理',
        path: '/system_department',
        component: () => import('#/views/dashboard/SystemDepartment.vue'),
        meta: {
          authority: AuthoritySystem,
          icon: 'lucide:building-2',
          title: '部门管理',
        },
      },
      {
        name: '审计日志',
        path: '/system_audit',
        component: () => import('#/views/dashboard/SystemAudit.vue'),
        meta: {
          authority: AuthoritySystem,
          icon: 'lucide:file-text',
          title: '审计日志',
        },
      },
    ],
  },
];

export default routes;

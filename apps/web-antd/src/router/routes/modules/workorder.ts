import type { RouteRecordRaw } from 'vue-router';
import { RouterView } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { AuthorityCommon } from '#/constants/roles';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: AuthorityCommon,
      icon: 'lucide:ticket',
      order: -1,
      title: '工单管理',
    },
    name: 'WorkOrder',
    path: '/workorder',
    redirect: '/workorder/center',
    children: [
      {
        name: 'WorkorderMyGroup',
        path: '/workorder/my',
        component: RouterView,
        meta: {
          icon: 'lucide:clipboard-list',
          order: 1,
          title: '我的工单',
        },
        redirect: '/workorder/center',
        children: [
          {
            name: 'WorkorderCenter',
            path: '/workorder/center',
            component: () => import('#/views/workorder/Instance.vue'),
            meta: {
              icon: 'lucide:ticket',
              title: '工单中心',
            },
          },
        ],
      },
      {
        name: 'WorkorderConfigGroup',
        path: '/workorder/config',
        component: RouterView,
        meta: {
          icon: 'lucide:settings-2',
          order: 2,
          title: '配置中心',
        },
        redirect: '/workorder/category',
        children: [
          {
            name: 'WorkorderCategory',
            path: '/workorder/category',
            component: () => import('#/views/workorder/Category.vue'),
            meta: {
              icon: 'lucide:folder',
              order: 1,
              title: '分类管理',
            },
          },
          {
            name: 'WorkorderForms',
            path: '/workorder/forms',
            component: () => import('#/views/workorder/FormManagement.vue'),
            meta: {
              icon: 'lucide:file-text',
              order: 2,
              title: '表单管理',
            },
          },
          {
            name: 'WorkorderFormDesign',
            path: '/workorder/forms/design',
            component: () => import('#/views/workorder/FormDesign.vue'),
            meta: {
              hideInMenu: true,
              icon: 'lucide:pencil',
              title: '表单设计器',
            },
          },
          {
            name: 'WorkorderFormDesignEdit',
            path: '/workorder/forms/:id/design',
            component: () => import('#/views/workorder/FormDesign.vue'),
            meta: {
              hideInMenu: true,
              icon: 'lucide:pencil',
              title: '表单设计器',
            },
          },
          {
            name: 'WorkorderProcesses',
            path: '/workorder/processes',
            component: () => import('#/views/workorder/Process.vue'),
            meta: {
              icon: 'lucide:git-branch',
              order: 3,
              title: '流程管理',
            },
          },
          {
            name: 'WorkorderProcessDesign',
            path: '/workorder/processes/design',
            component: () => import('#/views/workorder/ProcessDesign.vue'),
            meta: {
              hideInMenu: true,
              icon: 'lucide:pencil',
              title: '流程设计器',
            },
          },
          {
            name: 'WorkorderProcessDesignEdit',
            path: '/workorder/processes/:id/design',
            component: () => import('#/views/workorder/ProcessDesign.vue'),
            meta: {
              hideInMenu: true,
              icon: 'lucide:pencil',
              title: '流程设计器',
            },
          },
          {
            name: 'WorkorderTemplates',
            path: '/workorder/templates',
            component: () => import('#/views/workorder/Template.vue'),
            meta: {
              icon: 'lucide:copy',
              order: 4,
              title: '模板管理',
            },
          },
          {
            name: 'WorkorderNotifications',
            path: '/workorder/notifications',
            component: () => import('#/views/workorder/Notification.vue'),
            meta: {
              icon: 'lucide:bell',
              order: 5,
              title: '通知配置',
            },
          },
        ],
      },
      // 旧路径重定向
      {
        path: '/instance',
        redirect: '/workorder/center',
        meta: { hideInMenu: true },
      },
      {
        path: '/form_management',
        redirect: '/workorder/forms',
        meta: { hideInMenu: true },
      },
      {
        path: '/form_design',
        redirect: '/workorder/forms/design',
        meta: { hideInMenu: true },
      },
      {
        path: '/process',
        redirect: '/workorder/processes',
        meta: { hideInMenu: true },
      },
      {
        path: '/process_design',
        redirect: '/workorder/processes/design',
        meta: { hideInMenu: true },
      },
      {
        path: '/category',
        redirect: '/workorder/category',
        meta: { hideInMenu: true },
      },
      {
        path: '/template',
        redirect: '/workorder/templates',
        meta: { hideInMenu: true },
      },
      {
        path: '/notification',
        redirect: '/workorder/notifications',
        meta: { hideInMenu: true },
      },
    ],
  },
];

export default routes;

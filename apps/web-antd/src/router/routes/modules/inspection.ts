import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:clipboard-check',
      order: 22,
      title: '智能巡检',
    },
    name: 'Inspection',
    path: '/inspection',
    redirect: '/inspection/run',
    children: [
      {
        component: () => import('#/views/inspection/InspectionRun.vue'),
        meta: {
          icon: 'lucide:play-circle',
          title: '执行巡检',
        },
        name: 'InspectionRun',
        path: '/inspection/run',
      },
      {
        component: () => import('#/views/inspection/InspectionHistory.vue'),
        meta: {
          icon: 'lucide:history',
          title: '巡检历史',
        },
        name: 'InspectionHistory',
        path: '/inspection/history',
      },
      {
        component: () => import('#/views/inspection/InspectionReport.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:file-text',
          title: '巡检报告',
        },
        name: 'InspectionReport',
        path: '/inspection/report/:reportId',
      },
    ],
  },
];

export default routes;

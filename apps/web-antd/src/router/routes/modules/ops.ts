import type { RouteRecordRaw } from 'vue-router';
import { RouterView } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { AuthorityAdmin, AuthorityOps } from '#/constants/roles';

/**
 * 运营菜单按业务发生时间线排序：
 * 工作台 → 获客触达 → 客户档案 → 试用签约 → 算力交付 → 结算回款 → 复盘支撑
 */
const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: AuthorityOps,
      icon: 'lucide:briefcase',
      order: 0,
      title: '运营管理',
    },
    name: 'Ops',
    path: '/ops',
    redirect: '/ops/workbench',
    children: [
      {
        name: 'OpsWorkbenchGroup',
        path: '/ops/home',
        component: RouterView,
        meta: {
          icon: 'lucide:layout-dashboard',
          order: 0,
          title: '工作台',
        },
        redirect: '/ops/workbench',
        children: [
          {
            name: 'OpsWorkbench',
            path: '/ops/workbench',
            component: () => import('#/views/ops/Workbench.vue'),
            meta: {
              icon: 'lucide:layout-dashboard',
              order: 1,
              title: '每日简报',
            },
          },
        ],
      },
      {
        name: 'OpsLeadGroup',
        path: '/ops/leads',
        component: RouterView,
        meta: {
          icon: 'lucide:handshake',
          order: 1,
          title: '1.获客触达',
        },
        redirect: '/ops/exhibitions',
        children: [
          {
            name: 'OpsExhibitions',
            path: '/ops/exhibitions',
            component: () => import('#/views/ops/Exhibition.vue'),
            meta: {
              icon: 'lucide:building-2',
              order: 1,
              title: '展厅接待',
            },
          },
          {
            name: 'OpsVisits',
            path: '/ops/visits',
            component: () => import('#/views/ops/Visit.vue'),
            meta: {
              icon: 'lucide:map-pin',
              order: 2,
              title: '外访交流',
            },
          },
        ],
      },
      {
        name: 'OpsCustomerGroup',
        path: '/ops/crm',
        component: RouterView,
        meta: {
          icon: 'lucide:users',
          order: 2,
          title: '2.客户档案',
        },
        redirect: '/ops/customers',
        children: [
          {
            name: 'OpsCustomers',
            path: '/ops/customers',
            component: () => import('#/views/ops/Customer.vue'),
            meta: {
              icon: 'lucide:users',
              order: 1,
              title: '客户中心',
            },
          },
          {
            name: 'OpsCustomerDetail',
            path: '/ops/customers/detail/:id',
            component: () => import('#/views/ops/CustomerDetail.vue'),
            meta: {
              hideInMenu: true,
              icon: 'lucide:user',
              title: '客户详情',
            },
          },
        ],
      },
      {
        name: 'OpsDealGroup',
        path: '/ops/deal',
        component: RouterView,
        meta: {
          icon: 'lucide:file-signature',
          order: 3,
          title: '3.试用签约',
        },
        redirect: '/ops/trials',
        children: [
          {
            name: 'OpsTrials',
            path: '/ops/trials',
            component: () => import('#/views/ops/Trial.vue'),
            meta: {
              icon: 'lucide:flask-conical',
              order: 1,
              title: '试用管理',
            },
          },
          {
            name: 'OpsContracts',
            path: '/ops/contracts',
            component: () => import('#/views/ops/Contract.vue'),
            meta: {
              icon: 'lucide:file-signature',
              order: 2,
              title: '合同与开通',
            },
          },
        ],
      },
      {
        name: 'OpsComputeGroup',
        path: '/ops/compute',
        component: RouterView,
        meta: {
          icon: 'lucide:server',
          order: 4,
          title: '4.算力交付',
        },
        redirect: '/ops/compute/assets',
        children: [
          {
            name: 'OpsComputeAssets',
            path: '/ops/compute/assets',
            component: () => import('#/views/ops/ComputeAsset.vue'),
            meta: {
              icon: 'lucide:server',
              order: 1,
              title: '算力资产',
            },
          },
          {
            name: 'OpsComputeAllocations',
            path: '/ops/compute/allocations',
            component: () => import('#/views/ops/ComputeAllocation.vue'),
            meta: {
              icon: 'lucide:layers',
              order: 2,
              title: '生命周期台账',
            },
          },
          {
            name: 'OpsComputeDashboard',
            path: '/ops/compute/dashboard',
            component: () => import('#/views/ops/ComputeDashboard.vue'),
            meta: {
              icon: 'lucide:gauge',
              order: 3,
              title: '容量看板',
            },
          },
        ],
      },
      {
        name: 'OpsFinanceGroup',
        path: '/ops/finance',
        component: RouterView,
        meta: {
          icon: 'lucide:wallet',
          order: 5,
          title: '5.结算回款',
        },
        redirect: '/ops/settlements',
        children: [
          {
            name: 'OpsSettlements',
            path: '/ops/settlements',
            component: () => import('#/views/ops/Settlement.vue'),
            meta: {
              icon: 'lucide:wallet',
              order: 1,
              title: '结算对账',
            },
          },
        ],
      },
      {
        name: 'OpsSupportGroup',
        path: '/ops/support',
        component: RouterView,
        meta: {
          icon: 'lucide:refresh-cw',
          order: 6,
          title: '6.复盘支撑',
        },
        redirect: '/ops/surveys',
        children: [
          {
            name: 'OpsSurveys',
            path: '/ops/surveys',
            component: () => import('#/views/ops/Survey.vue'),
            meta: {
              icon: 'lucide:clipboard-list',
              order: 1,
              title: '客户问卷',
            },
          },
          {
            name: 'OpsReminders',
            path: '/ops/reminders',
            component: () => import('#/views/ops/Reminder.vue'),
            meta: {
              icon: 'lucide:bell-ring',
              order: 2,
              title: '提醒中心',
            },
          },
          {
            name: 'OpsManagerReport',
            path: '/ops/manager-report',
            component: () => import('#/views/ops/ManagerReport.vue'),
            meta: {
              authority: AuthorityAdmin,
              icon: 'lucide:file-bar-chart',
              keepAlive: true,
              order: 3,
              title: '管理者周报',
            },
          },
        ],
      },
    ],
  },
];

export default routes;

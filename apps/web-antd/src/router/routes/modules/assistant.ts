import type { RouteRecordRaw } from 'vue-router';
import { RouterView } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { AuthorityCommon } from '#/constants/roles';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: AuthorityCommon,
      icon: 'lucide:bot',
      order: 0,
      title: '智能助手',
    },
    name: 'Assistant',
    path: '/assistant',
    redirect: '/assistant/query',
    children: [
      {
        name: 'AssistantQuery',
        path: '/assistant/query',
        component: () => import('#/views/assistant/AssistantQuery.vue'),
        meta: {
          icon: 'lucide:message-square',
          title: '智能问答',
        },
      },
      {
        name: 'AssistantSession',
        path: '/assistant/session',
        component: () => import('#/views/assistant/AssistantSession.vue'),
        meta: {
          icon: 'lucide:users',
          title: '会话管理',
        },
      },
      {
        name: 'AssistantKnowledge',
        path: '/assistant/knowledge',
        component: () => import('#/views/assistant/AssistantKnowledge.vue'),
        meta: {
          icon: 'lucide:book',
          title: '知识库管理',
        },
      },
    ],
  },
];

export default routes;

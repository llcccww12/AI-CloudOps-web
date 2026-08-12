<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { storeToRefs, useAccessStore, useUserStore } from '@vben/stores';

import { Button, Drawer, Empty, Modal, Space, Tag } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import AI from '#/views/ai/ai.vue';

const NOTICE_STORAGE_KEY = 'cacops.header.notifications';

const router = useRouter();

function loadStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistNotifications(list: NotificationItem[]) {
  try {
    localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode errors
  }
}

// 不再内置演示通知；清空后刷新也不会再出现假数据
const notifications = ref<NotificationItem[]>(loadStoredNotifications());

watch(
  notifications,
  (list) => {
    persistNotifications(list);
  },
  { deep: true },
);

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const detailVisible = ref(false);
const listVisible = ref(false);
const currentNotice = ref<NotificationItem | null>(null);

const menus = computed(() => []);

const { loginLoading } = storeToRefs(authStore);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
  listVisible.value = false;
  detailVisible.value = false;
  currentNotice.value = null;
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

function markNoticeRead(item: NotificationItem) {
  const target = notifications.value.find(
    (n) =>
      (item.id != null && n.id === item.id) ||
      (n.title === item.title && n.date === item.date),
  );
  if (target) {
    target.isRead = true;
  }
}

function handleNoticeRead(item: NotificationItem) {
  markNoticeRead(item);
  currentNotice.value = { ...item, isRead: true };
  detailVisible.value = true;
}

function handleViewAll() {
  listVisible.value = true;
}

function handleOpenFromList(item: NotificationItem) {
  markNoticeRead(item);
  currentNotice.value = { ...item, isRead: true };
  listVisible.value = false;
  detailVisible.value = true;
}

function handleNoticeAction() {
  const link = currentNotice.value?.link;
  if (!link) return;
  detailVisible.value = false;
  listVisible.value = false;
  if (router.currentRoute.value.path !== link) {
    router.push(link);
  }
}
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="ann.vben@gmail.com"
        tag-text="Pro"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
        @read="handleNoticeRead"
        @view-all="handleViewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
        :loading="loginLoading"
        password-placeholder="123456"
        username-placeholder="vben"
        @submit="authStore.authLogin"
      />
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
  <AI />

  <Drawer
    v-model:open="listVisible"
    title="全部通知"
    placement="right"
    :width="420"
  >
    <Empty v-if="notifications.length === 0" description="暂无通知" />
    <div v-else class="notice-list">
      <div
        v-for="item in notifications"
        :key="item.id ?? `${item.title}-${item.date}`"
        class="notice-list-item"
        @click="handleOpenFromList(item)"
      >
        <img :src="item.avatar" class="notice-avatar" alt="" />
        <div class="notice-content">
          <div class="notice-title-row">
            <span class="notice-title">{{ item.title }}</span>
            <Tag :color="item.isRead ? 'default' : 'processing'">
              {{ item.isRead ? '已读' : '未读' }}
            </Tag>
          </div>
          <p class="notice-message">{{ item.message }}</p>
          <p class="notice-date">{{ item.date }}</p>
        </div>
      </div>
    </div>
  </Drawer>

  <Modal
    v-model:open="detailVisible"
    :title="currentNotice?.title || '通知详情'"
    :width="520"
  >
    <div v-if="currentNotice" class="notice-detail">
      <div class="notice-detail-meta">
        <img :src="currentNotice.avatar" class="notice-avatar" alt="" />
        <div>
          <div class="notice-title">{{ currentNotice.title }}</div>
          <div class="notice-date">{{ currentNotice.date }}</div>
        </div>
      </div>
      <p class="notice-detail-body">{{ currentNotice.message }}</p>
    </div>
    <template #footer>
      <Space>
        <Button @click="detailVisible = false">关闭</Button>
        <Button
          v-if="currentNotice?.link"
          type="primary"
          @click="handleNoticeAction"
        >
          {{ currentNotice?.actionText || '查看详情' }}
        </Button>
      </Space>
    </template>
  </Modal>
</template>

<style scoped>
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-list-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notice-list-item:hover {
  background: #fafafa;
}

.notice-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notice-title {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.notice-message {
  margin: 6px 0 0;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  line-height: 1.5;
}

.notice-date {
  margin: 6px 0 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.notice-detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.notice-detail-body {
  margin: 0;
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 8px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);
  white-space: pre-wrap;
}
</style>

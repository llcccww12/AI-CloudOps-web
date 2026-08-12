interface NotificationItem {
  avatar: string;
  date: string;
  id?: string | number;
  isRead?: boolean;
  message: string;
  title: string;
  /** 详情跳转路径 */
  link?: string;
  /** 操作按钮文案 */
  actionText?: string;
}

export type { NotificationItem };

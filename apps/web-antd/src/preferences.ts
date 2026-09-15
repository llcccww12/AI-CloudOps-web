import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    // accessMode: 'backend',
    accessMode: 'frontend',
    enableRefreshToken: true,
    name: import.meta.env.VITE_APP_TITLE,
    // 运营台账等页面需要全宽，避免宽屏右侧大块留白
    contentCompact: 'wide',
  },
  copyright: {
    enable: false,
    companyName: '',
    companySiteLink: '',
    date: '',
  },
  logo: {
    enable: true,
    source: '',
  },
  theme: {
    mode: 'light',
  },
  tabbar: {
    // 确保页面缓存功能启用，避免切换页面时重新加载
    keepAlive: true,
  },
});

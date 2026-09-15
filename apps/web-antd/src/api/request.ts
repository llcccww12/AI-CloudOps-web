/**
 * 该文件可自行根据业务逻辑进行调整
 */
import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL, aiopsURL: configuredAiopsURL } = useAppConfig(
  import.meta.env,
  import.meta.env.PROD,
);

function resolveAiopsURL(aiopsURL: string) {
  if (import.meta.env.PROD) {
    return aiopsURL;
  }

  try {
    const parsed = new URL(aiopsURL);
    if (
      ['127.0.0.1', 'localhost'].includes(parsed.hostname) &&
      parsed.pathname.startsWith('/api/v1')
    ) {
      return '/api/v1';
    }
  } catch {
    return aiopsURL;
  }

  return aiopsURL;
}

const aiopsURL = resolveAiopsURL(configuredAiopsURL);

function createRequestClient(baseURL: string) {
  const client = new RequestClient({
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired.');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();

    // 清除 accessToken
    accessStore.setAccessToken(null);

    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      // 执行登出，但不调用远程 API 避免循环认证问题
      await authStore.logout(true, false); 
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken(): Promise<string> {
    const accessStore = useAccessStore();

    // 检查 refreshToken 是否存在
    const refreshToken = accessStore.refreshToken;
    if (!refreshToken) {
      console.error('Refresh token is missing or null.');
      throw new Error('Refresh token is missing or null.'); // 抛出异常，确保不会返回 null
    }

    try {
      // 调用 refreshTokenApi，确保传入 refreshToken
      const resp = await refreshTokenApi({ refreshToken });
      const newToken = (resp as any).data.data;
      // 检查 newToken 是否为 undefined 或 null
      if (!newToken) {
        console.error('New token is null or undefined.');
        throw new Error('New token is null or undefined.');
      }
      // 更新 accessToken
      accessStore.setAccessToken(newToken);

      // 返回新的 token
      return newToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      const currentToken = accessStore.accessToken;
      config.headers.Authorization = formatToken(currentToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      // FormData 必须由浏览器自动带 boundary；清掉默认 application/json
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        const headers = config.headers as any;
        if (headers) {
          if (typeof headers.delete === 'function') {
            headers.delete('Content-Type');
            headers.delete('content-type');
          }
          if (typeof headers.set === 'function') {
            // axios：false 表示不设 Content-Type，交给浏览器补 boundary
            headers.set('Content-Type', false);
          } else {
            delete headers['Content-Type'];
            delete headers['content-type'];
          }
        }
      }
      return config;
    },
  });

  // response数据解构
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { data: responseData, status, config } = response;

      // 如果是blob响应（文件下载），直接返回blob数据
      if (config?.responseType === 'blob' && responseData instanceof Blob) {
        return responseData;
      }

      // 处理常规JSON响应
      if (
        responseData == null ||
        typeof responseData !== 'object' ||
        Array.isArray(responseData)
      ) {
        throw new Error(
          `Error ${status}: 接口返回非 JSON（常见原因：后端未重启或路由 404）`,
        );
      }
      const { code, data, message: msg } = responseData as {
        code?: number;
        data?: unknown;
        message?: string;
      };
      if (typeof code !== 'number') {
        throw new Error(
          `Error ${status}: 接口返回缺少 code 字段（常见原因：后端未重启或路由 404）`,
        );
      }
      if (status >= 200 && status < 400 && code === 0) {
        return data;
      }
      throw new Error(`Error ${status}: ${msg || '请求失败'}`);
    },
  });

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const cfg = (error as any)?.config || (error as any)?.response?.config;
      if (
        cfg?.headers?.['X-Suppress-Error'] === '1' ||
        cfg?.headers?.['x-suppress-error'] === '1'
      ) {
        return;
      }
      const respData = (error as any)?.response?.data;
      const apiMessage = String(respData?.message || '').trim();
      const apiDetail =
        typeof respData?.data === 'string' ? String(respData.data).trim() : '';
      if (apiMessage && apiMessage !== 'undefined' && apiMessage !== 'null') {
        // 绑定失败时优先展示后端 message（已含详情）
        message.error(apiMessage);
        return;
      }
      if (apiDetail) {
        message.error(apiDetail);
        return;
      }
      const raw = String((error as any)?.message || '');
      const matched = raw.match(/^Error \d+:\s*(.+)$/);
      const backendMsg = matched?.[1]?.trim();
      if (backendMsg && backendMsg !== 'undefined' && backendMsg !== 'null') {
        message.error(backendMsg);
        return;
      }
      message.error(msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL);
export const requestClientAIOps = createRequestClient(aiopsURL);

export const baseRequestClient = new RequestClient({ baseURL: apiURL });

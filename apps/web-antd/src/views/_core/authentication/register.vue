<script lang="ts" setup>
import type { LoginAndRegisterParams } from '@vben/common-ui';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationRegister } from '@vben/common-ui';
import { LOGIN_PATH } from '@vben/constants';

import { message } from 'ant-design-vue';

import { registerApi } from '#/api/core/system/user';

defineOptions({ name: 'Register' });

const router = useRouter();
const loading = ref(false);

async function handleSubmit(value: LoginAndRegisterParams) {
  if (!value.username || !value.password) {
    message.error('请填写用户名和密码');
    return;
  }
  if (!value.realName?.trim()) {
    message.error('请填写真实姓名');
    return;
  }
  if (!value.mobile || !/^1\d{10}$/.test(value.mobile)) {
    message.error('请填写正确的11位手机号');
    return;
  }
  if (value.confirmPassword && value.password !== value.confirmPassword) {
    message.error('两次输入的密码不一致');
    return;
  }
  if (value.password.length < 6) {
    message.error('密码至少需要6位');
    return;
  }

  loading.value = true;
  try {
    await registerApi({
      username: value.username.trim(),
      password: value.password,
      real_name: value.realName.trim(),
      mobile: value.mobile.trim(),
      account_type: 1,
      enable: 1,
      home_path: '/',
    });
    message.success('注册成功，请登录');
    await router.push(LOGIN_PATH);
  } catch (error: any) {
    message.error(error?.message || '注册失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthenticationRegister
    :loading="loading"
    :login-path="LOGIN_PATH"
    @submit="handleSubmit"
  />
</template>

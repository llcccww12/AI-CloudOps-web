import { computed, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';

import {
  getClusterDetailApi,
  getClustersListApi,
  type K8sCluster,
} from '#/api/core/k8s/k8s_cluster';
import {
  getNamespacesListApi,
  type K8sNamespace,
} from '#/api/core/k8s/k8s_namespace';

export function useRcaClusterNamespace() {
  const clusters = ref<K8sCluster[]>([]);
  const namespaces = ref<K8sNamespace[]>([]);
  const clustersLoading = ref(false);
  const namespacesLoading = ref(false);
  const clusterId = ref<number | undefined>(undefined);
  const namespace = ref<string | undefined>(undefined);
  const kubeConfigContent = ref('');
  let namespaceRequestId = 0;

  const selectedCluster = computed(() =>
    clusters.value.find((item) => item.id === clusterId.value),
  );

  const fetchClusters = async () => {
    try {
      clustersLoading.value = true;
      const res = await getClustersListApi({ page: 1, size: 50 });
      clusters.value = res?.items || [];
      if (!clusterId.value && clusters.value.length > 0 && clusters.value[0]?.id) {
        clusterId.value = clusters.value[0].id;
      }
    } catch {
      message.error('获取集群列表失败，请确认已在 cluster 管理中接入集群');
    } finally {
      clustersLoading.value = false;
    }
  };

  const fetchNamespaces = async (id: number) => {
    const requestId = ++namespaceRequestId;
    try {
      namespacesLoading.value = true;
      namespace.value = undefined;
      namespaces.value = [];
      const res = await getNamespacesListApi(id, {
        cluster_id: id,
        page: 1,
        size: 100,
      });
      if (requestId !== namespaceRequestId) {
        return;
      }
      namespaces.value = res?.items || [];
      const names = namespaces.value.map((item) => item.name);
      if (names.includes('default')) {
        namespace.value = 'default';
      } else if (names[0]) {
        namespace.value = names[0];
      }
    } catch {
      if (requestId !== namespaceRequestId) {
        return;
      }
      namespaces.value = [];
      message.error('获取命名空间失败，请确认该集群可连接');
    } finally {
      if (requestId === namespaceRequestId) {
        namespacesLoading.value = false;
      }
    }
  };

  const prefetchKubeConfig = async (id: number) => {
    kubeConfigContent.value = '';
    try {
      const detail = await getClusterDetailApi(id);
      if (clusterId.value !== id) {
        return;
      }
      kubeConfigContent.value = detail?.kube_config_content?.trim() || '';
    } catch {
      if (clusterId.value === id) {
        kubeConfigContent.value = '';
      }
    }
  };

  const getSelectedKubeConfig = async (): Promise<string> => {
    if (!clusterId.value) {
      throw new Error('请先选择集群');
    }
    if (kubeConfigContent.value) {
      return kubeConfigContent.value;
    }
    const detail = await getClusterDetailApi(clusterId.value);
    const content = detail?.kube_config_content?.trim();
    if (!content) {
      throw new Error('该集群没有 KubeConfig，请先在 cluster 管理中完善配置');
    }
    kubeConfigContent.value = content;
    return content;
  };

  watch(clusterId, (id) => {
    kubeConfigContent.value = '';
    if (id) {
      void fetchNamespaces(id);
      void prefetchKubeConfig(id);
    } else {
      namespaces.value = [];
      namespace.value = undefined;
    }
  });

  onMounted(() => {
    void fetchClusters();
  });

  return {
    clusters,
    namespaces,
    clustersLoading,
    namespacesLoading,
    clusterId,
    namespace,
    selectedCluster,
    fetchClusters,
    getSelectedKubeConfig,
  };
}

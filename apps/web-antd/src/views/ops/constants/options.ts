/** 运营管理表单枚举选项，减少自由文本输入 */

export const OpsBillingModeOptions = [
  { label: '按量计费', value: 'usage' },
  { label: '包月', value: 'monthly' },
  { label: '包年', value: 'yearly' },
  { label: '一次性', value: 'one_time' },
  { label: '混合计费', value: 'hybrid' },
];

export const OpsBillingCycleOptions = [
  { label: '按天', value: 'daily' },
  { label: '按周', value: 'weekly' },
  { label: '按月', value: 'monthly' },
  { label: '按季', value: 'quarterly' },
  { label: '按年', value: 'yearly' },
];

export const OpsPaymentTermOptions = [
  { label: '即期（0天）', value: 0 },
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
  { label: '45天', value: 45 },
  { label: '60天', value: 60 },
  { label: '90天', value: 90 },
];

export const OpsProductTypeOptions = [
  { label: 'GPU 算力', value: 'gpu' },
  { label: 'CPU 算力', value: 'cpu' },
  { label: '推理服务', value: 'inference' },
  { label: '训练集群', value: 'training' },
  { label: '存储带宽', value: 'storage' },
  { label: '混合产品', value: 'hybrid' },
  { label: '其他', value: 'other' },
];

export const OpsPaymentMethodOptions = [
  { label: '对公转账', value: 'bank_transfer' },
  { label: '分期付款', value: 'installment' },
  { label: '预付费', value: 'prepaid' },
  { label: '后付费', value: 'postpaid' },
  { label: '混合', value: 'hybrid' },
];

export const OpsProductTypeLabel: Record<string, string> = Object.fromEntries(
  OpsProductTypeOptions.map((i) => [i.value, i.label]),
);
export const OpsPaymentMethodLabel: Record<string, string> = Object.fromEntries(
  OpsPaymentMethodOptions.map((i) => [i.value, i.label]),
);

export const OpsDemandTypeOptions = [
  { label: '算力租赁', value: '算力租赁' },
  { label: '模型训练', value: '模型训练' },
  { label: '推理服务', value: '推理服务' },
  { label: '数据存储', value: '数据存储' },
  { label: '私有化部署', value: '私有化部署' },
  { label: '解决方案', value: '解决方案' },
  { label: '其他', value: '其他' },
];

export const OpsResourceScaleOptions = [
  { label: '试用小规模（≤8卡）', value: 'small' },
  { label: '中等规模（8-32卡）', value: 'medium' },
  { label: '大规模（32-128卡）', value: 'large' },
  { label: '超大规模（>128卡）', value: 'xlarge' },
  { label: '按需定制', value: 'custom' },
];

export const OpsConvertIntentOptions = [
  { label: '强意向转正式', value: 'strong' },
  { label: '观望中', value: 'watch' },
  { label: '暂不转化', value: 'reject' },
  { label: '续试用', value: 'extend_trial' },
  { label: '未评估', value: 'unknown' },
];

export const OpsOpenMethodOptions = [
  { label: '测试开通', value: 'trial' },
  { label: '正式开通', value: 'formal' },
  { label: '扩容开通', value: 'expand' },
];

export const OpsRegionOptions = [
  { label: '华东', value: '华东' },
  { label: '华南', value: '华南' },
  { label: '华北', value: '华北' },
  { label: '华中', value: '华中' },
  { label: '西南', value: '西南' },
  { label: '西北', value: '西北' },
  { label: '东北', value: '东北' },
  { label: '其他', value: '其他' },
];

export const OpsComputeAssetStatusOptions = [
  { label: '可用', value: 'available' },
  { label: '维保', value: 'maintenance' },
  { label: '故障', value: 'fault' },
  { label: '下架', value: 'retired' },
];

export const OpsComputeLeaseModeOptions = [
  { label: '全机租赁', value: 'full' },
  { label: '按卡池化租赁', value: 'gpu_pool' },
  { label: '临时测试', value: 'temp_test' },
];

export const OpsComputeLifeStatusOptions = [
  { label: '待开通', value: 'pending_open' },
  { label: '在用', value: 'in_use' },
  { label: '到期待处理', value: 'pending_release' },
  { label: '已释放', value: 'released' },
];

export const OpsComputeBizPhaseOptions = [
  { label: '测试', value: 'trial' },
  { label: '正式', value: 'formal' },
  { label: '续签', value: 'renew' },
];

export const OpsComputeGPUModelOptions = [
  { label: 'H100', value: 'H100' },
  { label: '智凯 V100', value: '智凯 V100' },
];

export const OpsIndustryOptions = [
  { label: '互联网', value: '互联网' },
  { label: '金融', value: '金融' },
  { label: '政务', value: '政务' },
  { label: '教育科研', value: '教育科研' },
  { label: '制造', value: '制造' },
  { label: '医疗健康', value: '医疗健康' },
  { label: '能源', value: '能源' },
  { label: '传媒娱乐', value: '传媒娱乐' },
  { label: '其他', value: '其他' },
];

export const OpsCustomerSourceOptions = [
  { label: '手工录入', value: 'manual' },
  { label: '展厅接待', value: 'exhibition' },
  { label: '外访交流', value: 'visit' },
  { label: '生态伙伴', value: 'partner' },
  { label: '官网咨询', value: 'website' },
  { label: '活动线索', value: 'event' },
  { label: '转介绍', value: 'referral' },
];

export const OpsBudgetRangeOptions = [
  { label: '10万以下', value: '<10万' },
  { label: '10-50万', value: '10-50万' },
  { label: '50-100万', value: '50-100万' },
  { label: '100-500万', value: '100-500万' },
  { label: '500万以上', value: '>500万' },
  { label: '待评估', value: '待评估' },
];

export const OpsContactTitleOptions = [
  { label: '总经理/CEO', value: '总经理/CEO' },
  { label: 'CTO/技术负责人', value: 'CTO/技术负责人' },
  { label: '采购负责人', value: '采购负责人' },
  { label: '项目经理', value: '项目经理' },
  { label: '工程师', value: '工程师' },
  { label: '其他', value: '其他' },
];

export const OpsExhibitionPurposeOptions = [
  { label: '产品参观', value: '产品参观' },
  { label: '商务洽谈', value: '商务洽谈' },
  { label: '技术交流', value: '技术交流' },
  { label: '方案演示', value: '方案演示' },
  { label: '合作签约', value: '合作签约' },
  { label: '其他', value: '其他' },
];

export const OpsCompanyLevelOptions = [
  { label: '省级', value: '省级' },
  { label: '市级', value: '市级' },
  { label: '区县级', value: '区县级' },
  { label: '央企', value: '央企' },
  { label: '国企', value: '国企' },
  { label: '民企', value: '民企' },
  { label: '高校', value: '高校' },
  { label: '其他', value: '其他' },
];

export const OpsExhibitionIntentOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
];

export const OpsExhibitionSourceOptions = [
  { label: '内部录入', value: 'staff' },
  { label: '公开登记', value: 'public' },
];

export const OpsVisitStatusOptions = [
  { label: '待约', value: 'pending' },
  { label: '已约', value: 'booked' },
  { label: '已访', value: 'visited' },
  { label: '已转客户', value: 'converted' },
];

export const OpsVisitLocationTypeOptions = [
  { label: '上门', value: 'door' },
  { label: '来访', value: 'showroom' },
  { label: '线上', value: 'online' },
];

export const OpsVisitDecisionRoleOptions = [
  { label: '决策者', value: '决策者' },
  { label: '影响者', value: '影响者' },
  { label: '使用者', value: '使用者' },
  { label: '采购接口人', value: '采购接口人' },
  { label: '其他', value: '其他' },
];

export const OpsInvoiceTypeOptions = [
  { label: '增值税专用发票', value: '专票' },
  { label: '增值税普通发票', value: '普票' },
  { label: '电子专票', value: '电子专票' },
  { label: '电子普票', value: '电子普票' },
];

export const OpsClosedReasonOptions = [
  { label: '已签约交付', value: '已签约交付' },
  { label: '客户放弃', value: '客户放弃' },
  { label: '竞品赢单', value: '竞品赢单' },
  { label: '预算不足', value: '预算不足' },
  { label: '需求变更', value: '需求变更' },
  { label: '长期无跟进', value: '长期无跟进' },
  { label: '其他', value: '其他' },
];

export const OpsPaymentTermLabel: Record<number, string> = Object.fromEntries(
  OpsPaymentTermOptions.map((o) => [o.value, o.label]),
);

export const OpsBillingModeLabel: Record<string, string> = Object.fromEntries(
  OpsBillingModeOptions.map((o) => [o.value, o.label]),
);

export const OpsBillingCycleLabel: Record<string, string> = Object.fromEntries(
  OpsBillingCycleOptions.map((o) => [o.value, o.label]),
);

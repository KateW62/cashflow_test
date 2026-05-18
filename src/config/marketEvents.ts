export interface MarketEvent {
  id: string;
  name: string;
  description: string;
  type: 'stock_surge' | 'stock_crash' | 'real_estate_boom' | 'inflation' | 'opportunity' | 'price_jump' | 'government_buyout' | 'global_macro' | 'specific_buyer';
  allowSelling?: boolean;
  inflationEffect?: boolean;
  globalMacro?: {
    impact: 'mortgage' | 'expenses' | 'tax';
    changeRate: number;
  };
  effect?: {
    assetName?: string;
    assetCategory?: string;
    assetTags?: string[];
    positiveTags?: string[];
    negativeTags?: string[];
    priceMultiplier?: number;
    incomeMultiplier?: number;
    negativeIncomeMultiplier?: number;
    durationTurns?: number;
    fixedPrice?: number;
    targetTag?: string;
    fixedBuyout?: number;
    offerPrice?: number;
    targetName?: string;
    autoSettle?: boolean;
    purchaseDiscount?: number;
    oneTimeCost?: number;
    operationBoost?: number;
    loanInterestModifier?: number;
  };
}

export const marketEvents: MarketEvent[] = [
  // --- 股票类事件：使用固定价波动 ---
  {
    id: 'stock_surge_myjt',
    name: '医药巨头 (MYJT) 利好',
    description: 'MYJT 新药通过临床试验，股价飙升至 $40！',
    type: 'stock_surge',
    allowSelling: true,
    effect: {
      assetName: 'MYJT',
      assetCategory: 'Stock',
      fixedPrice: 40,
    },
  },
  {
    id: 'stock_crash_myjt',
    name: 'MYJT 遭调查',
    description: 'MYJT 陷入法律纠纷，股价跌至 $5。',
    type: 'stock_crash',
    allowSelling: true,
    effect: {
      assetName: 'MYJT',
      assetCategory: 'Stock',
      fixedPrice: 5,
    },
  },
  {
    id: 'stock_surge_ok4u',
    name: 'OK4U 业绩超预期',
    description: 'OK4U 财报显示利润翻倍，股价跳涨至 $50！',
    type: 'stock_surge',
    allowSelling: true,
    effect: {
      assetName: 'OK4U',
      assetCategory: 'Stock',
      fixedPrice: 50,
    },
  },
  {
    id: 'stock_surge_myt4u',
    name: 'MYT4U 新产品爆发',
    description: 'MYT4U 发布的企业工具订阅量暴增，股价上涨至 $30！',
    type: 'stock_surge',
    allowSelling: true,
    effect: {
      assetName: 'MYT4U',
      assetCategory: 'Stock',
      fixedPrice: 30,
    },
  },
  {
    id: 'stock_crash_myt4u',
    name: 'MYT4U 增长放缓',
    description: 'MYT4U 用户增长不及预期，市场重新定价，股价跌至 $4。',
    type: 'stock_crash',
    allowSelling: true,
    effect: {
      assetName: 'MYT4U',
      assetCategory: 'Stock',
      fixedPrice: 4,
    },
  },

  // --- 房地产类事件：固定单价收购 ---
  {
    id: 'apartment_buyer_50k',
    name: '公寓买家出现',
    description: '有买家愿意以每单元 $50,000 的价格收购所有公寓！',
    type: 'real_estate_boom',
    allowSelling: true,
    effect: {
      assetCategory: 'Real Estate',
      assetTags: ['Rental', 'Apartment'],
      fixedPrice: 50000,
    },
  },
  {
    id: 'house_buyer_premium',
    name: '住宅市场过热',
    description: '住房需求激增，所有住宅类房产现在可以以原价 1.5 倍售出！',
    type: 'real_estate_boom',
    allowSelling: true,
    effect: {
      assetCategory: 'Real Estate',
      assetTags: ['House'],
      priceMultiplier: 1.5,
    },
  },

  // --- 强制性/特殊事件 ---
  {
    id: 'urban_renewal_growth',
    name: '旧城改造：强制拆迁',
    description: '政府启动旧城改造！持有“待拆迁”标签的房产将以 $30,000 强制补偿并移除。',
    type: 'government_buyout',
    allowSelling: true,
    effect: {
      assetTags: ['Growth', 'OldHouse'],
      fixedBuyout: 30000,
      autoSettle: true, // 逻辑层需配合自动移除资产并加钱
    },
  },
  {
    id: 'inflation_crisis',
    name: '通货膨胀加剧',
    description: '生活成本上升！所有非贷款类支出增加 20%。',
    type: 'inflation',
    allowSelling: false,
    globalMacro: {
      impact: 'expenses',
      changeRate: 1.2,
    },
  },
  {
    id: 'rate_hike_macro',
    name: '美联储加息',
    description: '银行大幅加息！所有房贷支出增加 30%。',
    type: 'global_macro',
    allowSelling: false,
    globalMacro: {
      impact: 'mortgage',
      changeRate: 1.3,
    },
  },

  // --- 市场机会 ---
  {
    id: 'market_recovery_general',
    name: '经济复苏',
    description: '市场情绪转向乐观，这通常是寻找新机会的好时机。',
    type: 'opportunity',
    allowSelling: false,
  },
  {
    id: 'community_spending_rebound',
    name: '社区消费回暖',
    description: '居民线下消费回暖，社区服务、早餐和宠物消费都明显变好。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['local_service', 'food', 'pet'],
      incomeMultiplier: 1.2,
      durationTurns: 3,
    },
  },
  {
    id: 'ecommerce_promo_season',
    name: '电商大促季',
    description: '平台大促带来流量红利，电商、内容和线上业务迎来短期增长。',
    type: 'specific_buyer',
    allowSelling: true,
    effect: {
      assetTags: ['ecommerce', 'creator', 'online'],
      incomeMultiplier: 1.3,
      priceMultiplier: 1.3,
      durationTurns: 3,
    },
  },
  {
    id: 'ai_tools_adoption',
    name: 'AI 工具普及',
    description: 'AI 工具开始成为企业标配，AI、数字产品和 B2B 培训业务效率提升。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['ai', 'digital_product', 'b2b'],
      incomeMultiplier: 1.25,
      durationTurns: 3,
      operationBoost: 1.25,
    },
  },
  {
    id: 'travel_peak_season',
    name: '旅游旺季',
    description: '假期和城市活动带动出行需求，民宿与旅行相关资产收益走高。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['travel', 'homestay'],
      incomeMultiplier: 1.35,
      durationTurns: 3,
    },
  },
  {
    id: 'pet_consumption_growth',
    name: '宠物消费增长',
    description: '宠物服务需求快速增长，相关门店现金流和估值同步提升。',
    type: 'specific_buyer',
    allowSelling: true,
    effect: {
      assetTags: ['pet'],
      incomeMultiplier: 1.25,
      priceMultiplier: 1.2,
      durationTurns: 3,
    },
  },
  {
    id: 'automation_equipment_discount',
    name: '自动化设备降价',
    description: '自动化设备采购成本下降，新买入自动化类资产的首付压力降低。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['automation', 'vending', 'laundry'],
      purchaseDiscount: 0.15,
      durationTurns: 3,
    },
  },
  {
    id: 'labor_cost_rise',
    name: '人力成本上涨',
    description: '服务业人工成本上升，依赖人工的业务利润被压缩。',
    type: 'inflation',
    allowSelling: false,
    effect: {
      assetTags: ['service', 'food', 'pet', 'fitness'],
      incomeMultiplier: 0.85,
      durationTurns: 3,
    },
  },
  {
    id: 'logistics_cost_rise',
    name: '物流费用上涨',
    description: '城市配送和仓储成本上涨，电商与外卖业务利润下降。',
    type: 'inflation',
    allowSelling: false,
    effect: {
      assetTags: ['ecommerce', 'delivery', 'logistics'],
      incomeMultiplier: 0.8,
      durationTurns: 3,
    },
  },
  {
    id: 'platform_commission_hike',
    name: '平台抽佣提高',
    description: '平台提高抽佣比例，外卖、内容和平台型业务现金流承压。',
    type: 'inflation',
    allowSelling: false,
    effect: {
      assetTags: ['delivery', 'creator', 'platform'],
      incomeMultiplier: 0.75,
      durationTurns: 3,
    },
  },
  {
    id: 'rent_price_rise',
    name: '房租上涨',
    description: '商铺租金上涨，线下门店和本地服务业务利润下降。',
    type: 'global_macro',
    allowSelling: false,
    globalMacro: {
      impact: 'expenses',
      changeRate: 1.08,
    },
    effect: {
      assetTags: ['local_service', 'coffee', 'fitness', 'laundry'],
      incomeMultiplier: 0.85,
      durationTurns: 3,
    },
  },
  {
    id: 'policy_compliance_check',
    name: '政策检查',
    description: '教育、民宿等监管行业迎来合规检查，未准备好的资产会承压。',
    type: 'inflation',
    allowSelling: false,
    effect: {
      assetTags: ['education', 'homestay', 'regulated'],
      incomeMultiplier: 0.8,
      oneTimeCost: 1200,
      durationTurns: 3,
    },
  },
  {
    id: 'equipment_maintenance_wave',
    name: '设备维护潮',
    description: '自动化设备进入集中维护期，无人零售和洗衣房需要额外维护。',
    type: 'inflation',
    allowSelling: false,
    effect: {
      assetTags: ['automation', 'vending', 'laundry'],
      incomeMultiplier: 0.85,
      oneTimeCost: 900,
      durationTurns: 3,
    },
  },
  {
    id: 'brand_acquirer_appears',
    name: '品牌收购方出现',
    description: '区域品牌收购方正在寻找可复制的咖啡、内容和 AI 业务。',
    type: 'specific_buyer',
    allowSelling: true,
    effect: {
      assetTags: ['coffee', 'chain', 'creator', 'ai'],
      priceMultiplier: 1.5,
    },
  },
  {
    id: 'local_store_buyer',
    name: '社区店铺买家',
    description: '本地买家愿意收购稳定经营的社区门店和服务工作室。',
    type: 'specific_buyer',
    allowSelling: true,
    effect: {
      assetTags: ['local_service', 'pet', 'fitness'],
      priceMultiplier: 1.25,
    },
  },
  {
    id: 'consumer_downshift',
    name: '消费降级',
    description: '消费者更重视性价比，二手、低成本业务受益，高客单门店承压。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['resale', 'low_cost', 'luxury', 'coffee'],
      positiveTags: ['resale', 'low_cost'],
      negativeTags: ['luxury', 'coffee'],
      incomeMultiplier: 1.2,
      negativeIncomeMultiplier: 0.85,
      durationTurns: 3,
    },
  },
  {
    id: 'bank_credit_easing',
    name: '银行信贷宽松',
    description: '银行放宽小微企业贷款条件，下一次购买生意更容易融资。',
    type: 'opportunity',
    allowSelling: false,
    effect: {
      assetTags: ['business'],
      loanInterestModifier: 0.85,
      durationTurns: 3,
    },
  }
];

export const getRandomMarketEvent = (): MarketEvent => {
  const randomIndex = Math.floor(Math.random() * marketEvents.length);
  return marketEvents[randomIndex];
};

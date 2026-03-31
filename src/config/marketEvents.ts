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
    priceMultiplier?: number;
    fixedPrice?: number;
    targetTag?: string;
    fixedBuyout?: number;
    offerPrice?: number;
    targetName?: string;
    autoSettle?: boolean;
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
  }
];

export const getRandomMarketEvent = (): MarketEvent => {
  const randomIndex = Math.floor(Math.random() * marketEvents.length);
  return marketEvents[randomIndex];
};
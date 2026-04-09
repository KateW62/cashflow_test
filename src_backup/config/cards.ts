export interface SmallDealCard {
  id: number;
  type: 'SmallDeal';
  subtype: 'Income' | 'Growth' | 'Speculative' | 'Stable';
  category: 'stock' | 'realestate' | 'cd' | 'business' | 'collectibles';
  tags: string[];
  name: string;
  description: string;
  totalCost: number;
  downPayment: number;
  monthlyIncome: number;
  stockData?: {
    sharePrice: number;
    shares: number;
    priceRange: { min: number; max: number };
  };
}

export interface BigDealCard {
  id: number;
  type: 'BigDeal';
  subtype: 'Income' | 'Growth' | 'Speculative' | 'Stable';
  category: 'realestate' | 'business' | 'land';
  tags: string[];
  name: string;
  description: string;
  totalCost: number;
  downPayment: number;
  monthlyIncome: number;
}

export interface DoodadCard {
  id: number;
  type: 'Doodad';
  name: string;
  description: string;
  cost: number;
}

export const smallDealCards: SmallDealCard[] = [
  {
    id: 1,
    type: 'SmallDeal',
    subtype: 'Income',
    category: 'realestate',
    tags: ['apartment', 'realestate', '公寓', '房产'],
    name: '两室一厅公寓',
    description: '一套位置不错的两室一厅公寓出租机会',
    totalCost: 5000,
    downPayment: 2000,
    monthlyIncome: 200,
  },
  {
    id: 2,
    type: 'SmallDeal',
    subtype: 'Speculative',
    category: 'stock',
    tags: ['Stock', 'stock', 'MYT4U', '股票'],
    name: '科技股 MYT4U',
    description: '一家新兴科技公司的股票',
    totalCost: 1000,
    downPayment: 1000,
    monthlyIncome: 50,
    stockData: {
      sharePrice: 10,
      shares: 100,
      priceRange: { min: 5, max: 30 },
    },
  },
  {
    id: 3,
    type: 'SmallDeal',
    subtype: 'Stable',
    category: 'cd',
    tags: ['cd', 'bank', '存单'],
    name: '银行存单',
    description: '5年期定期存单，稳定收益',
    totalCost: 3000,
    downPayment: 3000,
    monthlyIncome: 100,
  },
  {
    id: 4,
    type: 'SmallDeal',
    subtype: 'Income',
    category: 'business',
    tags: ['business', 'vending', '企业'],
    name: '自动售货机',
    description: '办公楼内的自动售货机经营权',
    totalCost: 3000,
    downPayment: 1500,
    monthlyIncome: 150,
  },
  {
    id: 5,
    type: 'SmallDeal',
    subtype: 'Speculative',
    category: 'stock',
    tags: ['Stock', 'stock', 'OK4U', '股票'],
    name: '零售股 OK4U',
    description: '稳定的零售连锁店股票',
    totalCost: 800,
    downPayment: 800,
    monthlyIncome: 40,
    stockData: {
      sharePrice: 8,
      shares: 100,
      priceRange: { min: 5, max: 20 },
    },
  },
  {
    id: 6,
    type: 'SmallDeal',
    subtype: 'Income',
    category: 'realestate',
    tags: ['realestate', 'parking', '房产', '停车场'],
    name: '小型停车场',
    description: '市中心附近的小型停车场投资',
    totalCost: 4800,
    downPayment: 2400,
    monthlyIncome: 240,
  },
  {
    id: 101,
    type: 'SmallDeal',
    subtype: 'Speculative',
    category: 'stock',
    tags: ['Stock', 'stock', 'MYJT', '医药股', '股票'],
    name: '医药巨头股票 (MYJT)',
    description: '股价波动大，无月收益，等待新药获批暴涨。',
    totalCost: 10,
    downPayment: 10,
    monthlyIncome: 0,
  },
  {
    id: 102,
    type: 'SmallDeal',
    subtype: 'Growth',
    category: 'realestate',
    tags: ['realestate', 'Growth', '待拆迁', '旧房', '房产'],
    name: '城郊待拆迁旧房',
    description: '虽有维护费支出，但拆迁潜力大。',
    totalCost: 15000,
    downPayment: 3000,
    monthlyIncome: -50,
  },
  {
    id: 103,
    type: 'SmallDeal',
    subtype: 'Income',
    category: 'business',
    tags: ['business', '洗衣房', '自动化'],
    name: '无人洗衣房',
    description: '稳定的自动化现金流收入。',
    totalCost: 20000,
    downPayment: 5000,
    monthlyIncome: 600,
  },
  {
    id: 104,
    type: 'SmallDeal',
    subtype: 'Speculative',
    category: 'collectibles',
    tags: ['Collectibles', 'collectibles', '收藏品', '限量'],
    name: '限量版收藏品',
    description: '占用现金，等待特定买家出现。',
    totalCost: 1000,
    downPayment: 1000,
    monthlyIncome: 0,
  },
];

export const bigDealCards: BigDealCard[] = [
  {
    id: 1,
    type: 'BigDeal',
    subtype: 'Income',
    category: 'realestate',
    tags: ['apartment', 'realestate', '公寓', '房产'],
    name: '8户公寓楼',
    description: '优质地段的8户公寓楼，租金稳定',
    totalCost: 50000,
    downPayment: 10000,
    monthlyIncome: 1200,
  },
  {
    id: 2,
    type: 'BigDeal',
    subtype: 'Income',
    category: 'business',
    tags: ['business', 'mall', '企业', '商业'],
    name: '购物中心',
    description: '繁华商圈的购物中心投资',
    totalCost: 100000,
    downPayment: 20000,
    monthlyIncome: 3500,
  },
  {
    id: 3,
    type: 'BigDeal',
    subtype: 'Growth',
    category: 'land',
    tags: ['land', '土地'],
    name: '20英亩土地',
    description: '郊区开发用地，长期投资',
    totalCost: 80000,
    downPayment: 16000,
    monthlyIncome: 1500,
  },
  {
    id: 4,
    type: 'BigDeal',
    subtype: 'Income',
    category: 'realestate',
    tags: ['realestate', 'townhouse', '房产', '别墅'],
    name: '12户联排别墅',
    description: '高端社区的联排别墅项目',
    totalCost: 120000,
    downPayment: 24000,
    monthlyIncome: 4800,
  },
  {
    id: 5,
    type: 'BigDeal',
    subtype: 'Income',
    category: 'business',
    tags: ['business', 'company', '企业', '公司'],
    name: '大型公司收购',
    description: '收购一家成熟的制造业公司',
    totalCost: 150000,
    downPayment: 30000,
    monthlyIncome: 6000,
  },
  {
    id: 6,
    type: 'BigDeal',
    subtype: 'Income',
    category: 'realestate',
    tags: ['realestate', 'office', '房产', '写字楼'],
    name: '写字楼投资',
    description: 'CBD核心区写字楼整层投资',
    totalCost: 200000,
    downPayment: 40000,
    monthlyIncome: 8000,
  },
];

export const doodadCards: DoodadCard[] = [
  {
    id: 1,
    type: 'Doodad',
    name: '购买新手机',
    description: '最新款手机上市，你决定换一部',
    cost: 800,
  },
  {
    id: 2,
    type: 'Doodad',
    name: '家庭聚餐',
    description: '亲朋好友聚会，你请客',
    cost: 500,
  },
  {
    id: 3,
    type: 'Doodad',
    name: '名牌包包',
    description: '看中了一个心仪的名牌包',
    cost: 1200,
  },
  {
    id: 4,
    type: 'Doodad',
    name: '周末旅游',
    description: '计划了一次短途旅行',
    cost: 600,
  },
  {
    id: 5,
    type: 'Doodad',
    name: '汽车维修',
    description: '爱车需要进行大保养',
    cost: 900,
  },
  {
    id: 6,
    type: 'Doodad',
    name: '高尔夫会员',
    description: '购买高尔夫俱乐部年费会员',
    cost: 1500,
  },
];

export const getRandomSmallDealCard = (): SmallDealCard => {
  const randomIndex = Math.floor(Math.random() * smallDealCards.length);
  return smallDealCards[randomIndex];
};

export const getRandomBigDealCard = (): BigDealCard => {
  const randomIndex = Math.floor(Math.random() * bigDealCards.length);
  return bigDealCards[randomIndex];
};

export const getRandomDoodadCard = (): DoodadCard => {
  const randomIndex = Math.floor(Math.random() * doodadCards.length);
  return doodadCards[randomIndex];
};

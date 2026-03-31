import { Profession } from './professions'; // 确保你有这个类型定义文件
import { SmallDealCard, BigDealCard, DoodadCard } from './cards';

// 1. 职业基础配置（月度原始数据，由 initialState 统一转换周薪）
export const professions: Record<string, any> = {
  doctor: {
    name: '医生',
    cash: 400,
    salary: 13200,
    tax: 3420,
    mortgage: 4500,
    studentLoan: 0,
    otherExpenses: 1580,
    childExpense: 640,
  },
  lawyer: {
    name: '律师',
    cash: 400,
    salary: 7500,
    tax: 1830,
    mortgage: 1100,
    studentLoan: 0,
    otherExpenses: 1000,
    childExpense: 380,
  },
  pilot: {
    name: '飞行员',
    cash: 500,
    salary: 9500,
    tax: 2350,
    mortgage: 1330,
    studentLoan: 0,
    otherExpenses: 1200,
    childExpense: 480,
  },
  manager: {
    name: '经理',
    cash: 400,
    salary: 4600,
    tax: 910,
    mortgage: 1400,
    studentLoan: 0,
    otherExpenses: 620,
    childExpense: 240,
  },
  nurse: {
    name: '护士',
    cash: 480,
    salary: 3100,
    tax: 600,
    mortgage: 480,
    studentLoan: 0,
    otherExpenses: 400,
    childExpense: 170,
  },
  janitor: {
    name: '门卫',
    cash: 560,
    salary: 1600,
    tax: 280,
    mortgage: 400,
    studentLoan: 0,
    otherExpenses: 270,
    childExpense: 70,
  },
};

// 2. 机会卡配置（小生意）
export const opportunityCards: any[] = [
  {
    id: 's1',
    type: 'SmallDeal',
    name: '两室一厅公寓',
    description: '一套位置不错的两室一厅公寓出租机会',
    totalCost: 5000,
    downPayment: 2000,
    monthlyIncome: 210, // 注意：逻辑层会处理除以 3 的转化
    category: 'Real Estate',
    tags: ['Rental']
  },
  {
    id: 's2',
    type: 'SmallDeal',
    name: '医药巨头股票 (MYJT)',
    description: '大型制药公司，目前处于低位',
    totalCost: 0,
    downPayment: 0,
    monthlyIncome: 0,
    category: 'Stock',
    tags: ['Stock', 'MYJT'],
    stockData: { symbol: 'MYJT', sharePrice: 10 }
  },
  {
    id: 's3',
    type: 'SmallDeal',
    name: '自动售货机',
    description: '办公楼内的自动售货机经营权',
    totalCost: 3000,
    downPayment: 1500,
    monthlyIncome: 150,
    category: 'Business',
    tags: ['Vending']
  }
];

// 3. 额外支出卡配置（Doodad）
export const doodadCards: any[] = [
  { id: 'd1', type: 'Doodad', name: '购买新手机', cost: 800 },
  { id: 'd2', type: 'Doodad', name: '家庭聚餐', cost: 500 },
  { id: 'd3', type: 'Doodad', name: '周末旅游', cost: 600 },
];

// 4. 棋盘格构造（确保与 GameState 的 SpaceType 一致）
export const createRatRaceBoard = () => {
  const boardConfig = [
    'Payday', 'Opportunity', 'Doodad', 'Opportunity', 'Market', 'Opportunity',
    'Charity', 'Opportunity', 'Payday', 'Opportunity', 'Doodad', 'Opportunity',
    'Baby', 'Opportunity', 'Market', 'Opportunity', 'Payday', 'Opportunity',
    'Doodad', 'Opportunity', 'Downsized', 'Opportunity', 'Market', 'Doodad'
  ];
  return boardConfig.map((type, index) => ({ id: index, type: type as any }));
};

// 5. 辅助工具函数（仅保留纯函数，不包含状态修改）
export const getRandomProfession = () => {
  const keys = Object.keys(professions);
  return professions[keys[Math.floor(Math.random() * keys.length)]];
};

export const getRandomOpportunityCard = () => {
  return opportunityCards[Math.floor(Math.random() * opportunityCards.length)];
};

export const getRandomDoodadCard = () => {
  return doodadCards[Math.floor(Math.random() * doodadCards.length)];
};

// 6. 视觉配置
export const getSpaceColor = (spaceType: string) => {
  switch (spaceType) {
    case 'Payday': return 'bg-green-500';
    case 'Opportunity': return 'bg-blue-500';
    case 'Doodad': return 'bg-red-500';
    case 'Market': return 'bg-yellow-500';
    case 'Downsized': return 'bg-gray-800';
    case 'Charity': return 'bg-pink-500';
    case 'Baby': return 'bg-purple-500';
    case 'BigDeal': return 'bg-orange-500';
    default: return 'bg-gray-200';
  }
};

export const getSpaceLabel = (spaceType: string) => {
  const labels: Record<string, string> = {
    'Payday': '发薪',
    'Opportunity': '机会',
    'Doodad': '支出',
    'Market': '市场',
    'Downsized': '失业',
    'Charity': '慈善',
    'Baby': '孩子',
    'BigDeal': '大买卖'
  };
  return labels[spaceType] || '';
};
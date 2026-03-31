export interface Dream {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'travel' | 'charity' | 'business' | 'luxury';
}

export const dreams: Dream[] = [
  {
    id: 'world_cruise',
    name: '环球游轮旅行',
    description: '乘坐豪华游轮环游世界',
    cost: 50000,
    category: 'travel',
  },
  {
    id: 'charity_foundation',
    name: '建立慈善基金会',
    description: '创建自己的慈善基金会，帮助他人',
    cost: 100000,
    category: 'charity',
  },
  {
    id: 'private_island',
    name: '购买私人岛屿',
    description: '拥有一座属于自己的私人岛屿',
    cost: 200000,
    category: 'luxury',
  },
  {
    id: 'space_tourism',
    name: '太空旅行',
    description: '成为太空游客，体验失重',
    cost: 150000,
    category: 'travel',
  },
  {
    id: 'sports_team',
    name: '购买职业球队',
    description: '成为职业运动队的老板',
    cost: 300000,
    category: 'business',
  },
  {
    id: 'art_collection',
    name: '世界级艺术收藏',
    description: '收藏世界名画和艺术品',
    cost: 80000,
    category: 'luxury',
  },
];

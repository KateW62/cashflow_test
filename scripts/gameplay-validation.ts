import { smallDealCards, doodadCards } from '../src/config/cards';
import { dreams } from '../src/config/dreams';
import { marketEvents } from '../src/config/marketEvents';
import { professions } from '../src/config/professions';
import {
  buyOpportunity,
  calculateFinancials,
  getOpportunityDownPayment,
  handleDownsized,
  handleMarketEvent,
  initialState,
  payDoodad,
  rollDice,
  selectOperationAction,
  takeLoan,
} from '../src/logic/gameLogic';
import { selectPacedMarketEvent } from '../src/logic/gamePacing';
import type { GameState, MarketEvent } from '../src/logic/gameTypes';

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}。预期 ${String(expected)}，实际 ${String(actual)}`);
  }
};

const createRichState = (): GameState => ({
  ...initialState(professions.engineer, dreams[0]),
  cash: 50_000,
});

const findSmallDeal = (name: string) => {
  const card = smallDealCards.find(item => item.name === name);
  assert(card, `找不到生意卡：${name}`);
  return card!;
};

const findMarket = (id: string): MarketEvent => {
  const event = marketEvents.find(item => item.id === id);
  assert(event, `找不到市场卡：${id}`);
  return event!;
};

const runNegotiationScenario = () => {
  const card = findSmallDeal('社区早餐档');
  const state = selectOperationAction(createRichState(), 'down_payment_negotiation');

  assertEqual(state.cash, 49_600, '谈判首付应立即扣除动作成本');
  assertEqual(getOpportunityDownPayment(state, card), 1_800, '谈判首付应让下一次非股票资产首付降低 10%');

  const bought = buyOpportunity(state, card);
  assertEqual(bought.cash, 47_800, '购买时应按谈判后的首付扣款');
  assertEqual(bought.assets.length, 1, '购买后应新增资产');
  assertEqual(bought.assets[0].weeklyIncome, 75, '月现金流应转换为周现金流');
  assert(!bought.operationEffects.some(effect => effect.type === 'down_payment_negotiation'), '谈判首付效果应在购买后消耗');
};

const runFrugalScenario = () => {
  const state = selectOperationAction(createRichState(), 'frugal_management');
  const doodad = { ...doodadCards[0], cost: 1_000 };
  const paid = payDoodad(state, doodad);

  assertEqual(paid.cash, 49_300, '节流管理应把 $1000 支出降为 $700');
  assert(!paid.operationEffects.some(effect => effect.type === 'frugal_management'), '节流管理效果应在支出后消耗');
};

const runInsuranceScenario = () => {
  const insured = selectOperationAction({ ...createRichState(), cash: 10_000 }, 'insurance');
  const downsized = handleDownsized(insured);

  assertEqual(insured.cash, 9_200, '买保险应立即扣除 $800');
  assertEqual(downsized.cash, 8_556, '保险应把失业 10% 现金损失降低 30%');
  assert(!downsized.operationEffects.some(effect => effect.type === 'insurance'), '保险效果应在失业后消耗');
};

const runMarketCashflowScenario = () => {
  const card = findSmallDeal('社区早餐档');
  const bought = buyOpportunity(createRichState(), card);
  const eventState = {
    ...bought,
    currentEvent: findMarket('community_spending_rebound'),
  };
  const handled = handleMarketEvent(eventState);
  const financials = calculateFinancials(handled);

  assert(handled.operationEffects.some(effect =>
    effect.type === 'market_cashflow' &&
    effect.cashflowMultiplier === 1.2 &&
    effect.remainingTurns === 3
  ), '社区消费回暖应生成 3 回合现金流提升效果');
  assertEqual(financials.passiveIncome, 90, '市场利好应让早餐档周被动收入从 $75 提升到 $90');
};

const runMarketDiscountScenario = () => {
  const card = findSmallDeal('无人售卖柜');
  const state = {
    ...createRichState(),
    currentEvent: findMarket('automation_equipment_discount'),
  };
  const handled = handleMarketEvent(state);

  assertEqual(getOpportunityDownPayment(handled, card), 2_550, '自动化设备降价应让匹配资产首付降低 15%');
};

const runLoanTermsScenario = () => {
  const state = {
    ...createRichState(),
    currentEvent: findMarket('bank_credit_easing'),
  };
  const handled = handleMarketEvent(state);
  const borrowed = takeLoan(handled, 5_000);

  assert(handled.operationEffects.some(effect =>
    effect.type === 'market_loan_terms' &&
    effect.amountModifier === 0.85
  ), '银行信贷宽松应生成贷款利息优惠效果');
  assertEqual(borrowed.loans[0].weeklyInterest, 106.25, '信贷宽松后 $5000 贷款周利息应从 $125 降到 $106.25');
  assert(!borrowed.operationEffects.some(effect => effect.type === 'market_loan_terms'), '贷款利息优惠应在下一次贷款后消耗');
};

const runRollExpiryScenario = () => {
  const state = selectOperationAction(createRichState(), 'find_opportunity');
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const rolled = rollDice(state);
    assert(!rolled.operationEffects.some(effect => effect.type === 'find_opportunity'), '找机会应在下一次掷骰后过期');
  } finally {
    Math.random = originalRandom;
  }
};

const runMyt4uMarketScenario = () => {
  const card = findSmallDeal('科技股 MYT4U');
  const state = buyOpportunity(createRichState(), card);
  const myt4uEvents = marketEvents.filter(event =>
    event.effect?.assetName === 'MYT4U' ||
    event.effect?.assetTags?.includes('MYT4U')
  );

  assert(myt4uEvents.some(event => event.type === 'stock_surge'), 'MYT4U 应有上涨市场卡');
  assert(myt4uEvents.some(event => event.type === 'stock_crash'), 'MYT4U 应有下跌市场卡');

  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    const selected = selectPacedMarketEvent(state, myt4uEvents);
    assert(selected.effect?.assetName === 'MYT4U', '持有 MYT4U 时，MYT4U 市场卡应可被市场选择器选中');
  } finally {
    Math.random = originalRandom;
  }
};

const scenarios = [
  ['谈判首付', runNegotiationScenario],
  ['节流管理', runFrugalScenario],
  ['保险失业', runInsuranceScenario],
  ['市场现金流', runMarketCashflowScenario],
  ['市场首付折扣', runMarketDiscountScenario],
  ['信贷宽松贷款', runLoanTermsScenario],
  ['掷骰后过期', runRollExpiryScenario],
  ['MYT4U 市场卡', runMyt4uMarketScenario],
] as const;

for (const [name, runScenario] of scenarios) {
  runScenario();
  console.log(`✓ ${name}`);
}

console.log(`经营系统验证完成：${scenarios.length} 个场景通过`);

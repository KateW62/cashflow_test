export interface Profession {
  id: string;
  name: string;
  cash: number;
  salary: number;
  tax: number;
  mortgage: number;
  studentLoan: number;
  otherExpenses: number;
  childExpense: number;
}

export const professions: Record<string, Profession> = {
  lawyer: {
    id: 'lawyer',
    name: '律师',
    cash: 400,
    salary: 7500,
    tax: 1830,
    mortgage: 1100,
    studentLoan: 390,
    otherExpenses: 2100,
    childExpense: 380,
  },
  doctor: {
    id: 'doctor',
    name: '医生',
    cash: 400,
    salary: 13200,
    tax: 3420,
    mortgage: 1900,
    studentLoan: 750,
    otherExpenses: 3580,
    childExpense: 640,
  },
  engineer: {
    id: 'engineer',
    name: '工程师',
    cash: 400,
    salary: 4900,
    tax: 1050,
    mortgage: 700,
    studentLoan: 140,
    otherExpenses: 1320,
    childExpense: 250,
  },
  teacher: {
    id: 'teacher',
    name: '老师',
    cash: 400,
    salary: 3300,
    tax: 630,
    mortgage: 500,
    studentLoan: 100,
    otherExpenses: 960,
    childExpense: 180,
  },
  secretary: {
    id: 'secretary',
    name: '秘书',
    cash: 710,
    salary: 2500,
    tax: 460,
    mortgage: 400,
    studentLoan: 0,
    otherExpenses: 760,
    childExpense: 140,
  },
  driver: {
    id: 'driver',
    name: '司机',
    cash: 750,
    salary: 2500,
    tax: 460,
    mortgage: 400,
    studentLoan: 0,
    otherExpenses: 760,
    childExpense: 140,
  },
  pilot: {
    id: 'pilot',
    name: '飞行员',
    cash: 400,
    salary: 9500,
    tax: 2350,
    mortgage: 1330,
    studentLoan: 0,
    otherExpenses: 2350,
    childExpense: 480,
  },
  nurse: {
    id: 'nurse',
    name: '护士',
    cash: 400,
    salary: 3100,
    tax: 600,
    mortgage: 400,
    studentLoan: 60,
    otherExpenses: 710,
    childExpense: 170,
  },
};

export const getRandomProfession = (): Profession => {
  const professionKeys = Object.keys(professions);
  const randomKey = professionKeys[Math.floor(Math.random() * professionKeys.length)];
  return professions[randomKey];
};

export const getTotalExpenses = (profession: Profession, children: number = 0, inflationMultiplier: number = 1.0): number => {
  if (!profession) return 0;
  const baseOtherExpenses = profession.otherExpenses || 0;
  const inflatedOtherExpenses = Math.floor(baseOtherExpenses * inflationMultiplier);
  return (profession.tax || 0) + (profession.mortgage || 0) + (profession.studentLoan || 0) + inflatedOtherExpenses + (children * (profession.childExpense || 0));
};

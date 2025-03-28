import { SpecialCardType } from '@/types/game';

export const surpriseCards: SpecialCardType[] = [
  {
    id: 'surprise-1',
    type: 'suprise',
    title: 'Advance to Go',
    description: 'Move forward to the Go space and collect $200',
    effect: {
      type: 'move',
      value: 0, // Go directly to position 0
      target: 'self',
      description: 'Move to Go and collect $200'
    }
  },
  {
    id: 'surprise-2',
    type: 'suprise',
    title: 'Go to Jail',
    description: 'Go directly to Jail. Do not pass Go, do not collect $200',
    effect: {
      type: 'jail',
      value: 1,
      target: 'self',
      description: 'Go directly to Jail'
    }
  },
  {
    id: 'surprise-3',
    type: 'suprise',
    title: 'Move Back 3 Spaces',
    description: 'Move back 3 spaces',
    effect: {
      type: 'move',
      value: -3,
      target: 'self',
      description: 'Move back 3 spaces'
    }
  },
  {
    id: 'surprise-4',
    type: 'suprise',
    title: 'Speeding Fine',
    description: 'Pay a speeding fine of $15',
    effect: {
      type: 'money',
      value: -15,
      target: 'self',
      description: 'Pay $15 fine'
    }
  },
  {
    id: 'surprise-5',
    type: 'suprise',
    title: 'Advance to Santiago',
    description: 'Advance to Santiago de los Caballeros',
    effect: {
      type: 'move',
      value: 1, // Position 1
      target: 'self',
      description: 'Move to Santiago'
    }
  },
  {
    id: 'surprise-6',
    type: 'suprise',
    title: 'Bank Dividend',
    description: 'Bank pays you dividend of $50',
    effect: {
      type: 'money',
      value: 50,
      target: 'self',
      description: 'Collect $50 dividend'
    }
  },
  {
    id: 'surprise-7',
    type: 'suprise',
    title: 'Go Back to Start',
    description: 'Go back to the starting point',
    effect: {
      type: 'move',
      value: 0,
      target: 'self',
      description: 'Return to Start'
    }
  },
  {
    id: 'surprise-8',
    type: 'suprise',
    title: 'General Repairs',
    description: 'Pay $25 per house and $100 per hotel you own',
    effect: {
      type: 'money',
      value: -25, // Will need to calculate based on properties
      target: 'self',
      description: 'Pay for property repairs'
    }
  },
  {
    id: 'surprise-9',
    type: 'suprise',
    title: 'Advance to Nearest Railroad',
    description: 'Advance to the nearest Railroad and pay double rent',
    effect: {
      type: 'move',
      value: 5, // First railroad position
      target: 'self',
      description: 'Move to nearest Railroad'
    }
  },
  {
    id: 'surprise-10',
    type: 'suprise',
    title: 'Building Loan Matures',
    description: 'Your building loan matures. Collect $150',
    effect: {
      type: 'money',
      value: 150,
      target: 'self',
      description: 'Collect $150'
    }
  }
];

export const boxCards: SpecialCardType[] = [
  {
    id: 'box-1',
    type: 'box',
    title: 'Bank Error',
    description: 'Bank error in your favor. Collect $200',
    effect: {
      type: 'money',
      value: 200,
      target: 'self',
      description: 'Collect $200'
    }
  },
  {
    id: 'box-2',
    type: 'box',
    title: 'Doctor\'s Fee',
    description: 'Pay doctor\'s fee of $50',
    effect: {
      type: 'money',
      value: -50,
      target: 'self',
      description: 'Pay $50'
    }
  },
  {
    id: 'box-3',
    type: 'box',
    title: 'Get Out of Jail Free',
    description: 'Get out of Jail Free. This card may be kept until needed',
    effect: {
      type: 'get_out_of_jail',
      value: 1,
      target: 'self',
      description: 'Get out of Jail Free card'
    }
  },
  {
    id: 'box-4',
    type: 'box',
    title: 'Grand Opera Night',
    description: 'You have won a crossword competition. Collect $100',
    effect: {
      type: 'money',
      value: 100,
      target: 'self',
      description: 'Collect $100'
    }
  },
  {
    id: 'box-5',
    type: 'box',
    title: 'Holiday Fund Matures',
    description: 'Your holiday fund matures. Collect $100',
    effect: {
      type: 'money',
      value: 100,
      target: 'self',
      description: 'Collect $100'
    }
  },
  {
    id: 'box-6',
    type: 'box',
    title: 'Income Tax Refund',
    description: 'Income tax refund. Collect $20',
    effect: {
      type: 'money',
      value: 20,
      target: 'self',
      description: 'Collect $20 refund'
    }
  },
  {
    id: 'box-7',
    type: 'box',
    title: 'Life Insurance Matures',
    description: 'Your life insurance matures. Collect $100',
    effect: {
      type: 'money',
      value: 100,
      target: 'self',
      description: 'Collect $100'
    }
  },
  {
    id: 'box-8',
    type: 'box',
    title: 'Pay Hospital',
    description: 'Pay hospital fees of $100',
    effect: {
      type: 'money',
      value: -100,
      target: 'self',
      description: 'Pay $100 hospital fees'
    }
  },
  {
    id: 'box-9',
    type: 'box',
    title: 'Pay School Fees',
    description: 'Pay school fees of $50',
    effect: {
      type: 'money',
      value: -50,
      target: 'self',
      description: 'Pay $50 school fees'
    }
  },
  {
    id: 'box-10',
    type: 'box',
    title: 'Receive Consultancy Fee',
    description: 'You have received a consultancy fee of $25',
    effect: {
      type: 'money',
      value: 25,
      target: 'self',
      description: 'Collect $25 fee'
    }
  }
];

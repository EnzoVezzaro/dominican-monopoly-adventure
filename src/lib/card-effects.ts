import { SpecialCardType, GameState, Player, Property } from '@/types/game';

export type CardEffectAction = {
  type: 'move' | 'money' | 'jail' | 'get_out_of_jail';
  playerId: string;
  value?: number;
  target?: 'self' | 'all' | 'others';
} & (
  { type: 'move' } | 
  { type: 'money' } | 
  { type: 'jail' } | 
  { type: 'get_out_of_jail' }
);

export const handleCardEffect = (
  card: SpecialCardType,
  currentPlayer: Player,
  onCardEffect: (effect: CardEffectAction) => void
) => {
  let newPosition: number;
  console.log('picked card: ', card);
  
  switch(card.effect.type) {
    case 'move':
      // For move effects, pass the value and target directly
      onCardEffect({ 
        type: 'move', 
        playerId: currentPlayer.id,
        value: card.effect.value,
        target: card.effect.target || 'self'
      });
      break;
      
    case 'money':
      onCardEffect({ 
        type: 'money', 
        playerId: currentPlayer.id, 
        value: card.effect.value,
        target: card.effect.target || 'self' 
      });
      break;
      
    case 'jail':
      onCardEffect({ 
        type: 'jail', 
        playerId: currentPlayer.id, 
        value: card.effect.value, // Jail effect uses 1 for jailed, 0 for unjailed
        target: card.effect.target || 'self' 
      });
      break;
      
    case 'get_out_of_jail':
      onCardEffect({ 
        type: 'get_out_of_jail', 
        playerId: currentPlayer.id,
        target: card.effect.target || 'self'
      });
      break;
  }
};

export const drawCard = (
  gameState: GameState,
  property: Property
): SpecialCardType | null => {
  if (property.type !== 'surprise' && property.type !== 'box') {
    return null;
  }

  const cardStack = property.type === 'surprise' 
    ? gameState.cardStacks.surprise 
    : gameState.cardStacks.box;
  
  return cardStack.length > 0 ? cardStack[0] : null;
};

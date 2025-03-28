import { SpecialCardType, GameState, Player, Property } from '@/types/game';

export type CardEffectAction = {
  type: 'move' | 'money' | 'jail' | 'get_out_of_jail';
  playerId: string;
  position?: number;
  amount?: number;
  jailed?: boolean;
  fromPlayerId?: string;
  toPlayerId?: string;
} & (
  { type: 'move' } | 
  { type: 'money' } | 
  { type: 'jail' } | 
  { type: 'get_out_of_jail', fromPlayerId: string, toPlayerId: string }
);

export const handleCardEffect = (
  card: SpecialCardType,
  currentPlayer: Player,
  onCardEffect: (effect: CardEffectAction) => void
) => {
  let newPosition: number;
  switch(card.effect.type) {
    case 'move':
      // Calculate new position
      newPosition = currentPlayer.position;
      if (card.effect.value === 0) {
        newPosition = 0; // Go to Start
      } else {
        newPosition = (newPosition + card.effect.value) % 40;
        if (newPosition < 0) newPosition += 40;
      }
      onCardEffect({ type: 'move', playerId: currentPlayer.id, position: newPosition });
      break;
      
    case 'money':
      onCardEffect({ 
        type: 'money', 
        playerId: currentPlayer.id, 
        amount: card.effect.value 
      });
      break;
      
    case 'jail':
      onCardEffect({ 
        type: 'jail', 
        playerId: currentPlayer.id, 
        jailed: card.effect.value === 1 
      });
      break;
      
    case 'get_out_of_jail':
      onCardEffect({ 
        type: 'get_out_of_jail', 
        playerId: currentPlayer.id,
        fromPlayerId: card.effect.fromPlayerId || currentPlayer.id,
        toPlayerId: card.effect.toPlayerId || currentPlayer.id
      });
      break;
  }
};

export const drawCard = (
  gameState: GameState,
  property: Property
): SpecialCardType | null => {
  if (property.type !== 'suprise' && property.type !== 'box') {
    return null;
  }

  const cardStack = property.type === 'suprise' 
    ? gameState.cardStacks.suprise 
    : gameState.cardStacks.box;
  
  return cardStack.length > 0 ? cardStack[0] : null;
};

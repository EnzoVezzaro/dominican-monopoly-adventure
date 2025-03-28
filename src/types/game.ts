export type PlayerType = 'human' | 'bot';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  position: number;
  money: number;
  properties: string[];
  avatar: string;
  color: string;
  isJailed: boolean;
}

export type PropertyType = "property" | "utility" | "railroad" | "suprise" | "box";

export type CardEffect = {
  type: 'move' | 'money' | 'jail' | 'get_out_of_jail';
  value: number;
  target?: 'self' | 'all' | 'others';
  description: string;
  fromPlayerId?: string;
  toPlayerId?: string;
} & (
  { type: 'move' | 'money' | 'jail' } |
  { type: 'get_out_of_jail', fromPlayerId: string, toPlayerId: string }
);

export interface SpecialCardType {
  id: string;
  type: 'suprise' | 'box';
  title: string;
  description: string;
  effect: CardEffect;
}

export interface Property {
  id: string;
  name: string;
  price: number;
  rent: number[];
  color: string;
  owner?: string;
  houses: number;
  position: number;
  mortgaged: boolean;
  type: PropertyType;
  drawnCard?: SpecialCardType;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayer: number;
  properties: Property[];
  dice: number[];
  gameStarted: boolean;
  gameOver: boolean;
  winner?: string;
  maxPlayers: number;
  isCreator: boolean;
  hasDiceRolled: boolean;
  cardStacks: {
    suprise: SpecialCardType[];
    box: SpecialCardType[];
  };
}

export interface Connection {
  id: string;
  name: string;
}

export interface GameEvent {
  type: string;
  payload: any;
}

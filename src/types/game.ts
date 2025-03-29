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

export type PropertyType = "property" | "utility" | "railroad" | "surprise" | "box";

export type CardEffectAction = {
  type: 'move' | 'money' | 'jail' | 'get_out_of_jail';
  playerId: string;
  position?: number;
  amount?: number;
  jailed?: boolean;
};

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
  type: 'surprise' | 'box';
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
    surprise: SpecialCardType[];
    box: SpecialCardType[];
  };
}

export interface Connection {
  id: string;
  name: string;
}

export interface NotificationState {
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type GameEventPayload = 
  | { type: 'join-game'; name: string }
  | { type: 'game-state'; state: GameState }
  | { type: 'start-game' }
  | { type: 'peer-disconnected'; peerId: string }
  | { type: 'notify-users'; state: NotificationState };

export interface GameEvent<T extends GameEventPayload = GameEventPayload> {
  type: T['type'];
  payload: Omit<T, 'type'>;
}

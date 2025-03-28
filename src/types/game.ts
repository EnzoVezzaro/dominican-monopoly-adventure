
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
}

export interface Connection {
  id: string;
  name: string;
}

export interface GameEvent {
  type: string;
  payload: any;
}

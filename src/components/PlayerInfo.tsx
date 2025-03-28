
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CircleDollarSign, Home } from 'lucide-react';
import { Player } from '@/types/game';

interface PlayerInfoProps {
  player: Player;
  isCurrentTurn: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isCurrentTurn }) => {
  return (
    <Card className={`w-60 overflow-hidden shadow-md transition-all ${isCurrentTurn ? 'border-2 border-game-primary' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: player.color }}
          ></div>
          <div className="font-medium truncate flex-1">{player.name}</div>
          <div className="flex items-center text-sm">
            <CircleDollarSign size={14} className="text-game-primary mr-1" />
            {player.money}
          </div>
        </div>
        
        {player.properties.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1 flex items-center">
              <Home size={12} className="mr-1" />
              Properties
            </div>
            <div className="flex flex-wrap gap-1">
              {player.properties.map((propertyId) => (
                <div 
                  key={propertyId}
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ 
                    backgroundColor: propertyId.includes('railroad') 
                      ? '#000' 
                      : propertyId.includes('utility')
                      ? '#aaa'
                      : propertyId.split('-')[0] === 'property' 
                      ? `${player.color}` 
                      : '#ccc'
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}
        
        {player.type === 'bot' && (
          <div className="mt-1 text-xs text-muted-foreground">AI Bot</div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerInfo;

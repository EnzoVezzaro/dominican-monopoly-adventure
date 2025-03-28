
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CircleDollarSign, Home, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Player, Property } from '@/types/game';
import PropertyActionCard from './PropertyActionCard';
import { getPropertyColor } from '@/lib/colors';

interface PlayerInfoProps {
  player: Player;
  isCurrentTurn: boolean;
  properties: Property[];
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isCurrentTurn, properties }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  return (
    <>
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
              {player.properties.map((propertyId) => {
                const property = properties.find(p => p.id === propertyId);
                return (
                  <Tooltip key={propertyId} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300 cursor-pointer hover:opacity-80"
                        style={{ 
                          backgroundColor: getPropertyColor(property)
                        }}
                        onClick={() => property && setSelectedProperty(property)}
                      ></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{property?.name || propertyId}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
        
        {player.type === 'bot' && (
          <div className="mt-1 text-xs text-muted-foreground">AI Bot</div>
        )}
      </CardContent>
      </Card>

      {selectedProperty && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
          <button 
            onClick={() => setSelectedProperty(null)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
          <PropertyActionCard 
            property={selectedProperty}
            playerMoney={player.money}
            onBuy={() => {}}
            onPass={() => setSelectedProperty(null)}
            open={true}
            showActions={false}
            closeButton={true}
          />
        </div>
      </div>
      )}
    </>
  );
};

export default PlayerInfo;

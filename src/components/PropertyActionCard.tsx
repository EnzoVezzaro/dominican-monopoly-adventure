import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property, PropertyType, SpecialCardType } from '@/types/game';
import { X, CircleDollarSign, Home, Gift, Box } from 'lucide-react';
import { getPropertyColor } from '@/lib/colors';
import { boxCards, surpriseCards } from '@/data/special-cards';

interface PropertyActionCardProps {
  property: Property;
  playerMoney: number;
  onBuy: () => void;
  onPass: () => void;
  onAcceptCard?: () => void;
  open: boolean;
  showActions?: boolean;
  closeButton?: boolean;
  isCardView?: boolean;
}

const renderPropertyDetails = (property: Property) => {
  if (!property.rent || property.rent.length === 0) {
    return <p>Rent details not available.</p>;
  }

  const rentLevels = [
    "Rent",
    "Rent with 1 House",
    "Rent with 2 Houses",
    "Rent with 3 Houses",
    "Rent with 4 Houses",
    "Rent with Hotel",
  ];

  return (
    <div className="space-y-1 text-sm">
      {property.rent.map((rentValue, index) => (
        <div
          key={index}
          className={`flex justify-between ${
            index === property.houses ? 'font-bold text-blue-600' : ''
          }`}
        >
          <span>{rentLevels[index] || `Level ${index}`}</span>
          <span>${rentValue}</span>
        </div>
      ))}
    </div>
  );
};

const renderCard = (card: SpecialCardType) => {
  console.log('show card: ', card);
  return (
    <div className="text-center py-4">
      {card.type === 'surprise' ? (
        <Gift size={48} className="mx-auto mb-4 text-purple-600" />
      ) : (
        <Box size={48} className="mx-auto mb-4 text-yellow-500" />
      )}
      <h3 className="text-xl font-bold mb-2">{card.title}</h3>
      <p className="text-gray-600 mb-4">{card.description}</p>
      <div className="bg-gray-100 p-3 rounded-lg">
        <p className="font-semibold">{card.effect.description}</p>
      </div>
    </div>
  )
};

const PropertyActionCard: React.FC<PropertyActionCardProps> = ({
  property,
  playerMoney,
  onBuy,
  onPass,
  onAcceptCard,
  open,
  showActions = true,
  closeButton = false,
  isCardView = false
}) => {
  const canAfford = playerMoney >= (property.price || 0);
  const isSpecialCard = property.type === 'surprise' || property.type === 'box';
  const showCardActions = isCardView && property.drawnCard;
  let specialCardInfo;
  if (isSpecialCard){
    specialCardInfo = (property.type === 'surprise' ? surpriseCards : boxCards).filter((card)=>card.id === property.id)[0];
    if (!specialCardInfo){
      console.log('card not found for property: ', property);
    }
    
  }

  console.log('isvie: ', property, showActions, isCardView);

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onPass()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {showCardActions 
              ? specialCardInfo.title
              : property.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {showCardActions
              ? `You drew a card from ${property.name}`
              : showActions 
                ? isSpecialCard 
                  ? `You landed on ${specialCardInfo.title}`
                  : `You landed on ${property.name}. You can choose to buy it or pass.`
                : `Viewing ${property.name} details`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Card className="border-none shadow-none">
          {!isSpecialCard && !showCardActions && (
            <CardHeader className="p-0 mb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{property.name}</CardTitle>
                <div
                  className="w-6 h-6 rounded-sm border border-gray-400"
                  style={{ backgroundColor: getPropertyColor(property) }}
                ></div>
              </div>
            </CardHeader>
          )}
          
          {
            isCardView &&
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 m-2 text-gray-500 hover:text-gray-800"
              onClick={onPass}
            >
              <X size={20} />
            </Button>
          }

          <CardContent className="p-0 space-y-3">
            {isSpecialCard ? (
              renderCard(specialCardInfo)
            ) : (
              <>
                <div className="flex items-center justify-between text-lg border-b pb-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <CircleDollarSign size={18} /> Price:
                  </span>
                  <span>${property.price}</span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold mb-1">Rent Details:</h4>
                  {renderPropertyDetails(property)}
                </div>

                {!canAfford && showActions && (
                  <p className="text-red-600 font-semibold pt-2">You cannot afford this property.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {isSpecialCard && showActions ? (
          <AlertDialogFooter>
            <Button
              onClick={onAcceptCard}
              className="w-full bg-game-primary hover:bg-game-primary/90"
              size="lg"
            >
              Accept Card Effect
            </Button>
          </AlertDialogFooter>
        ) : showActions && !isSpecialCard && (
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={onPass}>Pass</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => canAfford && onBuy()}
                disabled={!canAfford}
                className="bg-game-secondary hover:bg-game-secondary/90"
              >
                <Home size={16} className="mr-2" /> Buy Property
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PropertyActionCard;

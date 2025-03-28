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
import { Property } from '@/types/game';
import { X, CircleDollarSign, Home } from 'lucide-react';
import { getPropertyColor } from '@/lib/colors';

interface PropertyActionCardProps {
  property: Property;
  playerMoney: number;
  onBuy: () => void;
  onPass: () => void;
  open: boolean;
  showActions?: boolean;
  closeButton?: boolean;
}

const PropertyActionCard: React.FC<PropertyActionCardProps> = ({
  property,
  playerMoney,
  onBuy,
  onPass,
  open,
  showActions = true,
  closeButton = false
}) => {
  const canAfford = playerMoney >= (property.price || 0);

  const renderRentDetails = () => {
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

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onPass()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{property.name}</AlertDialogTitle>
          <AlertDialogDescription>
            {showActions 
              ? `You landed on ${property.name}. You can choose to buy it or pass.`
              : `Viewing ${property.name} details`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Card className="border-none shadow-none">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{property.name}</CardTitle>
              <div
                className="w-6 h-6 rounded-sm border border-gray-400"
                style={{ backgroundColor: getPropertyColor(property) }}
              ></div>
            </div>
          </CardHeader>
          {/* Close button in the top-right corner */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 m-2 text-gray-500 hover:text-gray-800"
            onClick={onPass} // Make sure to pass an onClose function
          >
            <X size={20} />
          </Button>
          <CardContent className="p-0 space-y-3">
            <div className="flex items-center justify-between text-lg border-b pb-2">
              <span className="flex items-center gap-1 font-semibold">
                <CircleDollarSign size={18} /> Price:
              </span>
              <span>${property.price}</span>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold mb-1">Rent Details:</h4>
              {renderRentDetails()}
            </div>

            {!canAfford && showActions && (
              <p className="text-red-600 font-semibold pt-2">You cannot afford this property.</p>
            )}
          </CardContent>
        </Card>

        {showActions && (
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

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
import { CircleDollarSign, Home, Hotel } from 'lucide-react';

interface PropertyActionCardProps {
  property: Property;
  playerMoney: number;
  onBuy: () => void;
  onPass: () => void;
  open: boolean; // Controlled externally
}

const PropertyActionCard: React.FC<PropertyActionCardProps> = ({
  property,
  playerMoney,
  onBuy,
  onPass,
  open
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
              index === property.houses ? 'font-bold text-blue-600' : '' // Highlight current rent level
            }`}
          >
            <span>{rentLevels[index] || `Level ${index}`}</span>
            <span>${rentValue}</span>
          </div>
        ))}
        {/* Add logic for utility/railroad rent multipliers if needed */}
      </div>
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onPass()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Property Action: {property.name}</AlertDialogTitle>
          <AlertDialogDescription>
            You landed on {property.name}. You can choose to buy it or pass.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Card className="border-none shadow-none">
          <CardHeader className="p-0 mb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{property.name}</CardTitle>
              <div
                className="w-6 h-6 rounded-sm border border-gray-400"
                style={{ backgroundColor: property.color }}
              ></div>
            </div>
          </CardHeader>
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

            {!canAfford && (
              <p className="text-red-600 font-semibold pt-2">You cannot afford this property.</p>
            )}
          </CardContent>
        </Card>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={onPass}>Pass</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={() => {
                if (canAfford) {
                  onBuy();
                }
              }}
              disabled={!canAfford}
              className="bg-game-secondary hover:bg-game-secondary/90"
            >
              <Home size={16} className="mr-2" /> Buy Property
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PropertyActionCard;

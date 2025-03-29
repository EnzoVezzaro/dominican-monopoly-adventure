import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Palmtree, Users, Link } from 'lucide-react'; // Removed CarFront
import { Character, characters } from '@/data/characters';
import CharacterPreview from './CharacterPreview'; // Added import
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface GameCreationProps {
  onCreateGame: (playerName: string, character: Character, maxPlayers: number) => void;
}

const GameCreation: React.FC<GameCreationProps> = ({ onCreateGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [character, setCharacter] = useState<Character>(characters[0]);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSnap, setCurrentSnap] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrentSnap(api.selectedScrollSnap());

    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      setCurrentSnap(selectedIndex);
      setCharacter(characters[selectedIndex]);
    };

    api.on("select", handleSelect);

    // Cleanup listener on component unmount
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name to create a game");
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 10) {
      toast.error("Number of players must be between 2 and 10");
      return;
    }

    // Character is already updated by the carousel's effect
    onCreateGame(playerName, character, maxPlayers);
  };

  return (
    <div className="min-h-screen flex items-center justify-center tropical-bg">
      <Card className="w-full max-w-md shadow-lg border-2 border-game-primary">
        <CardHeader className="dominican-gradient text-white rounded-t-lg">
          <div className="flex items-center mb-2">
            <Palmtree className="mr-2" size={28} />
            <CardTitle className="text-2xl font-bold">Dominican Monopoly</CardTitle>
          </div>
          <CardDescription className="text-white opacity-90">
            Create a new multiplayer game session
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Player Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="border-game-primary/30"
              />
            </div>

            {/* Character Selection Carousel */}
            <div className="space-y-2">
              <Label>Select Character</Label>
              <Carousel setApi={setApi} opts={{ loop: true, align: "center" }} className="w-full max-w-xs mx-auto">
                <CarouselContent>
                  {characters.map((char, index) => (
                    <CarouselItem key={index} className="basis-1/3"> {/* Adjust basis for how many items show */}
                      <div className="p-1">
                        {/* Card now wraps the preview and provides border indication */}
                        <Card className={`border-2 ${index === currentSnap ? 'border-game-primary' : 'border-transparent'} overflow-hidden`}>
                          <CardContent className="p-0 aspect-square h-24 w-full"> {/* Adjust height/width as needed */}
                            <CharacterPreview modelPath={`/assets/3d/Players/${char.model}`} />
                          </CardContent>
                        </Card>
                        {/* Keep name below the preview */}
                        <p className="text-xs font-semibold text-center mt-1">{char.name}</p>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="ml-[-30px]" />
                <CarouselNext className="mr-[-30px]" />
              </Carousel>
              {/* Removed the separate "Selected: ..." text as the border indicates selection */}
            </div>

            {/* Number of Players Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="players">Number of Players</Label>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users size={14} className="mr-1" />
                  <span>{maxPlayers} players</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                  className="border-game-primary/30"
                >
                  -
                </Button>
                <Input
                  id="players"
                  type="range"
                  min={2}
                  max={10}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="h-4" // Keep slider thin
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxPlayers(Math.min(10, maxPlayers + 1))}
                  className="border-game-primary/30"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full bg-game-primary hover:bg-game-primary/90"
            onClick={handleCreateGame}
          >
            Create New Game
          </Button>
          <div className="text-xs text-center text-muted-foreground pt-2">
            <div className="flex items-center justify-center">
              <Link size={12} className="mr-1" />
              After creating, you'll get a link to share with friends
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GameCreation;

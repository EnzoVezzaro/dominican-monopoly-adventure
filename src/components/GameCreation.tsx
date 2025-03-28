import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PalmTree, Users, Link } from 'lucide-react';

interface GameCreationProps {
  onCreateGame: (playerName: string, maxPlayers: number) => void;
}

const GameCreation: React.FC<GameCreationProps> = ({ onCreateGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const { toast } = useToast();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to create a game",
        variant: "destructive"
      });
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 10) {
      toast({
        title: "Invalid player count",
        description: "Number of players must be between 2 and 10",
        variant: "destructive"
      });
      return;
    }

    onCreateGame(playerName, maxPlayers);
  };

  return (
    <div className="min-h-screen flex items-center justify-center tropical-bg">
      <Card className="w-full max-w-md shadow-lg border-2 border-game-primary">
        <CardHeader className="dominican-gradient text-white rounded-t-lg">
          <div className="flex items-center mb-2">
            <PalmTree className="mr-2" size={28} />
            <CardTitle className="text-2xl font-bold">Dominican Monopoly</CardTitle>
          </div>
          <CardDescription className="text-white opacity-90">
            Create a new multiplayer game session
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
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
                  className="h-4"
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

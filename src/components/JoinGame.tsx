
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LogIn, Users } from 'lucide-react';

interface JoinGameProps {
  gameId: string;
  onJoinGame: (playerName: string, gameId: string) => void;
}

const JoinGame: React.FC<JoinGameProps> = ({ gameId, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('');
  const { toast } = useToast();

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to join the game",
        variant: "destructive"
      });
      return;
    }

    onJoinGame(playerName, gameId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center tropical-bg">
      <Card className="w-full max-w-md shadow-lg border-2 border-game-primary">
        <CardHeader className="dominican-gradient text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Join Game</CardTitle>
          <CardDescription className="text-white opacity-90">
            Enter your name to join the Dominican Monopoly game
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
              <Label htmlFor="gameId">Game ID</Label>
              <Input
                id="gameId"
                value={gameId}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">This is the game you're joining</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full bg-game-primary hover:bg-game-primary/90 flex items-center gap-2" 
            onClick={handleJoinGame}
          >
            <LogIn size={18} />
            Join Game
          </Button>
          <div className="text-xs text-center text-muted-foreground">
            <div className="flex items-center justify-center">
              <Users size={12} className="mr-1" />
              You'll join the waiting room until the game starts
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinGame;

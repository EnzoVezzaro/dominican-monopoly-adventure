
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clipboard, CopyCheck, Users, Play, Bot } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Connection } from '@/types/game';

interface WaitingRoomProps {
  gameId: string;
  connections: Connection[];
  playerName: string;
  maxPlayers: number;
  isCreator: boolean;
  onStartGame: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({
  gameId,
  connections,
  playerName,
  maxPlayers,
  isCreator,
  onStartGame
}) => {
  const [copied, setCopied] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const { toast } = useToast();

  const gameUrl = `${window.location.origin}?game=${gameId}`;
  const humanPlayerCount = connections.length + 1; // +1 for the current player
  const progress = (humanPlayerCount / maxPlayers) * 100;
  
  const copyGameLink = () => {
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share it with your friends to join the game",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    if (humanPlayerCount < 2) {
      setShowInfoDialog(true);
      return;
    }
    onStartGame();
  };

  const botsNeeded = Math.max(0, maxPlayers - humanPlayerCount);

  return (
    <div className="min-h-screen flex items-center justify-center tropical-bg">
      <Card className="w-full max-w-md shadow-lg border-2 border-game-primary">
        <CardHeader className="dominican-gradient text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold">Waiting Room</CardTitle>
          <CardDescription className="text-white opacity-90">
            {isCreator 
              ? "Share the link with your friends to join" 
              : "Waiting for the game creator to start"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2" size={20} />
              <span className="font-semibold">{humanPlayerCount} of {maxPlayers} Players</span>
            </div>
            <Badge variant="outline" className="bg-game-secondary/20">
              You: {playerName}
            </Badge>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Game Link</div>
              <div className="flex">
                <div className="bg-muted p-2 border rounded-l-md truncate flex-1 text-xs sm:text-sm">
                  {gameUrl}
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  className="rounded-l-none bg-game-primary hover:bg-game-primary/90"
                  onClick={copyGameLink}
                >
                  {copied ? <CopyCheck size={18} /> : <Clipboard size={18} />}
                </Button>
              </div>
            </div>
            
            <div className="border rounded-md p-3 space-y-2">
              <h3 className="text-sm font-medium">Players Joined</h3>
              
              <div className="space-y-1.5">
                <div className="flex items-center text-sm py-1 px-2 bg-game-primary/10 rounded">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="font-medium">{playerName} (You)</span>
                  <Badge variant="outline" className="ml-auto text-xs">Host</Badge>
                </div>
                
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center text-sm py-1 px-2 bg-game-secondary/10 rounded">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                    <span>{connection.name || 'Player'}</span>
                  </div>
                ))}
                
                {botsNeeded > 0 && (
                  <div className="flex items-center text-sm py-1 px-2 bg-muted rounded">
                    <Bot size={14} className="mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {botsNeeded} {botsNeeded === 1 ? 'bot' : 'bots'} will be added
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2 pb-6">
          {isCreator ? (
            <Button 
              className="w-full bg-game-primary hover:bg-game-primary/90 flex items-center gap-2" 
              onClick={handleStartGame}
            >
              <Play size={18} />
              Start Game
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Waiting for the game creator to start the game...
            </div>
          )}
        </CardFooter>
      </Card>
      
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start with bots?</DialogTitle>
            <DialogDescription>
              You're the only player in the waiting room. If you start now, {maxPlayers - 1} bots will be added to the game.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfoDialog(false)}>
              Wait for players
            </Button>
            <Button onClick={() => {
              setShowInfoDialog(false);
              onStartGame();
            }}>
              Start with bots
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitingRoom;

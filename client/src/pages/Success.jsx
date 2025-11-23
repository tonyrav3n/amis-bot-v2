import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function Success() {
  // Extract URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tradeId = urlParams.get('tradeId');
  const discordUserId = urlParams.get('discordUserId');
  const walletAddress = urlParams.get('walletAddress');

  const truncatedAddress = walletAddress
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    : 'Unknown';

  return (
    <div className="flex justify-center items-center min-h-screen bg-brand-bg">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="font-bold text-green-600">
            ✅ Wallet Connected Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Trade ID:</p>
            <p className="text-sm font-mono">{tradeId || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Wallet Address:</p>
            <p className="text-sm font-mono break-all">{truncatedAddress}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Discord User ID:</p>
            <p className="text-sm font-mono">{discordUserId || 'Unknown'}</p>
          </div>

          <div className="pt-4">
            <p className="text-sm text-gray-600">
              Your wallet has been successfully connected to this trade. You can
              now return to Discord to complete the transaction.
            </p>
          </div>

          <Button
            onClick={() => window.close()}
            className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
          >
            Close Window
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Success;

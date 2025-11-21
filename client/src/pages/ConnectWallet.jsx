import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ConnectWallet() {
  const [wallet, setWallet] = useState(null);

  // Extract URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tradeId = urlParams.get('tradeId');
  const buyerId = urlParams.get('buyerId');
  const sellerId = urlParams.get('sellerId');

  const handleConnect = () => {
    // Mock wallet connection - replace with actual web3 logic
    const mockWallet = '0x1234567890abcdef';
    setWallet(mockWallet);
    // Send wallet to frontend (e.g., via callback or state management)
    console.log('Wallet connected:', mockWallet);
    // You can replace console.log with actual sending logic, like dispatching to a store or calling a prop function
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-brand-bg">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="font-bold text-brand-dark">
            Connect Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Trade ID:</p>
            <p className="text-sm">{tradeId || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Buyer ID:</p>
            <p className="text-sm">{buyerId || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Seller ID:</p>
            <p className="text-sm">{sellerId || 'Not provided'}</p>
          </div>
          {!wallet ? (
            <Button
              onClick={handleConnect}
              className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Connect Wallet
            </Button>
          ) : (
            <div>
              <p className="text-sm font-medium">Connected Wallet:</p>
              <p className="text-sm break-all">{wallet}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectWallet;

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// 1. Import the necessary hooks from Reown
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

function ConnectWallet() {
  // 2. Get the 'open' function to trigger the modal
  const { open } = useAppKit();

  // 3. Get the current account status (isConnected) and address
  const { address, isConnected } = useAppKitAccount();

  // Extract URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tradeId = urlParams.get('tradeId');
  const userType = urlParams.get('userType');

  // State for trade data
  const [tradeData, setTradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callbackSent, setCallbackSent] = useState(false);

  // Fetch trade data from API
  useEffect(() => {
    if (!tradeId) {
      setError('No trade ID provided');
      setLoading(false);
      return;
    }

    const fetchTradeData = async () => {
      try {
        const response = await fetch(
          `http://localhost:3001/api/trade/${tradeId}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch trade data');
        }
        const data = await response.json();
        setTradeData(data);
      } catch (err) {
        console.error('Error fetching trade data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTradeData();
  }, [tradeId]);

  // Send wallet connection callback to backend
  useEffect(() => {
    if (isConnected && address && tradeData && !callbackSent) {
      const sendCallback = async () => {
        try {
          // Determine which Discord user ID to use based on userType
          const discordUserId =
            userType === 'buyer' ? tradeData.buyerId : tradeData.sellerId;

          console.log('Sending wallet callback:', {
            tradeId,
            discordUserId,
            walletAddress: address,
            userType,
          });

          const response = await fetch(
            'http://localhost:3001/api/wallet/callback',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tradeId,
                discordUserId,
                walletAddress: address,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || 'Failed to send wallet callback',
            );
          }

          const result = await response.json();
          console.log('Wallet callback successful:', result);
          setCallbackSent(true);

          // Redirect to success page using the URL from response
          window.location.href = result.redirect;
        } catch (err) {
          console.error('Error sending wallet callback:', err);
          setError(`Failed to connect wallet: ${err.message}`);
        }
      };

      sendCallback();
    }
  }, [isConnected, address, tradeData, callbackSent, tradeId, userType]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-brand-bg">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="font-bold text-brand-dark">
            Connect Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm">Loading trade data...</p>
          ) : error ? (
            <p className="text-sm text-red-500">Error: {error}</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium">Trade ID:</p>
                <p className="text-sm">{tradeId || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Your Role:</p>
                <p className="text-sm">
                  {userType
                    ? userType.charAt(0).toUpperCase() + userType.slice(1)
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Buyer:</p>
                <p className="text-sm">
                  {tradeData?.buyerDisplay || 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Seller:</p>
                <p className="text-sm">
                  {tradeData?.sellerDisplay || 'Not provided'}
                </p>
              </div>
            </>
          )}

          {/* 4. Use 'isConnected' instead of '!wallet' */}
          {!isConnected ? (
            <Button
              /* 5. Call open() to trigger the Reown modal */
              onClick={() => open()}
              className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Connect Wallet
            </Button>
          ) : (
            <div>
              <p className="text-sm font-medium">Connected Wallet:</p>
              {/* 6. Display the real address */}
              <p className="text-sm break-all">{address}</p>

              {/* Optional: Add a button to view account/disconnect */}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => open({ view: 'Account' })}
              >
                Manage Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectWallet;

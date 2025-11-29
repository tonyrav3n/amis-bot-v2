import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// 1. Import the necessary hooks from Reown
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

function truncateWalletAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ConnectWallet() {
  // 2. Get the 'open' function to trigger the modal
  const { open } = useAppKit();

  // 3. Get the current account status (isConnected) and address
  const { address, isConnected } = useAppKitAccount();

  // Extract URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  // 2. Decode the token to get tradeId and userType
  const decodedData = useMemo(() => {
    if (!token) return null;
    return parseJwt(token);
  }, [token]);

  const tradeId = decodedData?.tradeId;
  const userType = decodedData?.userType;

  // State for trade data
  const [tradeData, setTradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callbackSent, setCallbackSent] = useState(false);

  const prevAddressRef = useRef(null);

  const fetchTradeData = useCallback(
    async (showLoading = false) => {
      if (!tradeId) {
        return null;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `http://localhost:3001/api/trade/${tradeId}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch trade data');
        }
        const data = await response.json();
        setTradeData(data);
        setError(null);
        return data;
      } catch (err) {
        console.error('Error fetching trade data:', err);
        setError(err.message);
        return null;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [tradeId],
  );

  // Fetch trade data from API
  useEffect(() => {
    if (!tradeId) {
      setError('No trade ID provided');
      setLoading(false);
      return;
    }

    fetchTradeData(true);
  }, [tradeId, fetchTradeData]);

  const partyConfirmed = useMemo(() => {
    if (!tradeData || !userType) {
      return false;
    }

    return userType === 'buyer'
      ? !!tradeData.buyerConfirmed
      : !!tradeData.sellerConfirmed;
  }, [tradeData, userType]);

  useEffect(() => {
    if (!tradeId || partyConfirmed) {
      return undefined;
    }

    const interval = setInterval(() => {
      fetchTradeData();
    }, 7000);

    return () => clearInterval(interval);
  }, [tradeId, partyConfirmed, fetchTradeData]);

  // Send wallet connection callback to backend
  useEffect(() => {
    if (isConnected && address && tradeData && !callbackSent && !partyConfirmed) {
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

          // Inside your useEffect, before the fetch call:

          console.log('DEBUG VALUES:', {
            userType: userType,
            tradeDataBuyerId: tradeData?.buyerId,
            tradeDataSellerId: tradeData?.sellerId,
            computedDiscordUserId: discordUserId,
          });

          if (!discordUserId) {
            console.error('STOPPING: discordUserId is missing!');
            return; // Stop execution so we don't spam the API
          }

          const response = await fetch(
            'http://localhost:3001/api/wallet/callback',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token,
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
        } catch (err) {
          console.error('Error sending wallet callback:', err);
          setError(`Failed to connect wallet: ${err.message}`);
        }
      };

      sendCallback();
    }
  }, [
    isConnected,
    address,
    tradeData,
    callbackSent,
    tradeId,
    userType,
    partyConfirmed,
  ]);

  // Reset callbackSent on wallet switch
  useEffect(() => {
    if (partyConfirmed) {
      prevAddressRef.current = address;
      return;
    }

    if (prevAddressRef.current && prevAddressRef.current !== address) {
      console.log('🔄 Wallet switched:', {
        old: prevAddressRef.current,
        new: address,
      });
      setCallbackSent(false); // ✅ Allow re-send
    }
    prevAddressRef.current = address;
  }, [address, partyConfirmed]);

  const handleOpenWalletModal = useCallback(() => {
    if (partyConfirmed) {
      return;
    }

    open();
  }, [open, partyConfirmed]);

  const handleManageWallet = useCallback(() => {
    if (partyConfirmed) {
      return;
    }

    open({ view: 'Account' });
  }, [open, partyConfirmed]);

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

          {!isConnected ? (
            <div className="space-y-2">
              <Button
                onClick={handleOpenWalletModal}
                className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                disabled={partyConfirmed}
              >
                {partyConfirmed ? 'Wallet confirmed' : 'Connect Wallet'}
              </Button>
              {partyConfirmed && (
                <p className="text-xs text-muted-foreground">
                  Your wallet has already been confirmed in Discord. Changes are
                  locked to keep the trade secure.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">Connected Wallet:</p>
              <p className="text-sm break-all">
                {truncateWalletAddress(address)}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleManageWallet}
                disabled={partyConfirmed}
              >
                {partyConfirmed ? 'Wallet locked' : 'Manage Wallet'}
              </Button>
              {partyConfirmed && (
                <p className="mt-2 text-xs text-green-600">
                  ✓ Wallet confirmed. Contact a moderator if you need to make a
                  change.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectWallet;

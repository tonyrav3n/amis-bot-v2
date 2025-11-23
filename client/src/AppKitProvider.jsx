import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { base, baseSepolia, mainnet } from '@reown/appkit/networks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

// 1. Setup queryClient
const queryClient = new QueryClient();

// 2. Get projectId from https://dashboard.reown.com
const projectId = import.meta.env.VITE_PROJECT_ID;

// 3. Create a metadata object - optional
const metadata = {
  name: 'My Vite App',
  description: 'My Website description',
  url: 'https://mywebsite.com',
  icons: ['https://avatars.mywebsite.com/'],
};

// 4. Set the networks
const networks = [mainnet, base, baseSepolia];

// 5. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 6. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true,
  },
});

// 7. Create the Provider component
export function AppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

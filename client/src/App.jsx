import ConnectWallet from './pages/ConnectWallet';
import Success from './pages/Success';

function App() {
  // Simple routing based on URL path
  const path = window.location.pathname;

  if (path === '/success') {
    return <Success />;
  }

  // Default to connect wallet page
  return <ConnectWallet />;
}

export default App;

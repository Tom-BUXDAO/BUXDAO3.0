import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Import your components
import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import CollabCollections from './components/CollabCollections';
import CelebUpgrades from './components/CelebUpgrades';
import Merch from './pages/Merch';
import Roadmap from './pages/Roadmap';
import Bux from './pages/Bux';
import HolderVerification from './components/HolderVerification';
import { UserProvider } from './contexts/UserContext';

// Import your styles
import './index.css';

const App = () => {
  // You can also provide a custom RPC endpoint
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Initialize wallet adapters with configuration
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <UserProvider>
            <Router>
              <div className="min-h-screen bg-black text-white">
                <Header />
                <Routes>
                  <Route path="/" element={
                    <>
                      <Hero />
                      <Collection />
                      <CollabCollections />
                      <CelebUpgrades />
                    </>
                  } />
                  <Route path="/merch" element={<Merch />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/bux" element={<Bux />} />
                  <Route path="/verify" element={<HolderVerification />} />
                </Routes>
              </div>
            </Router>
          </UserProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App; 
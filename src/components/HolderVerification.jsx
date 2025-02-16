import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { DiscordIcon } from './Icons';
import { ArrowRightOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { WalletModalButton } from './WalletModalButton';
import { toast } from 'react-hot-toast';

// Helper function to generate random state
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const HolderVerification = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { discordUser, setDiscordUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const location = useLocation();
  const navigate = useNavigate();

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://buxdao.com' 
    : 'http://localhost:3001';

  // Handle Discord OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setError('Failed to connect with Discord. Please try again.');
        return;
      }

      if (code) {
        setLoading(true);
        try {
          window.location.href = `${API_BASE}/api/auth/discord/callback?code=${code}&state=${state}`;
        } catch (err) {
          setError('Failed to authenticate with Discord. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, [location]);

  // Update verification status when discord user changes
  useEffect(() => {
    if (discordUser?.wallet_address) {
      setVerificationStatus('verified');
    }
  }, [discordUser]);

  const handleDiscordLogin = () => {
    try {
      const state = crypto.getRandomValues(new Uint8Array(16))
        .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
      
      document.cookie = `discord_state=${state}; path=/; max-age=300; secure; samesite=lax`;
      window.location.href = `/api/auth/discord?state=${state}`;
    } catch (error) {
      setError('Failed to start Discord authentication');
    }
  };

  const handleConnectWallet = async () => {
    if (!connected) {
      setVisible(true);
    }
  };

  // Handle wallet verification when connected
  useEffect(() => {
    const verifyWallet = async () => {
      if (!connected || !publicKey || !discordUser || verificationStatus === 'verified') {
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/auth/wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            wallet_address: publicKey.toString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to verify wallet');
        }

        const data = await response.json();
        if (data.success) {
          toast.success('Wallet verified successfully!');
          setVerificationStatus('verified');
          if (setDiscordUser && data.discord_user) {
            setDiscordUser(data.discord_user);
          }
        }
      } catch (error) {
        console.error('Wallet verification error:', error);
        toast.error('Failed to verify wallet. Please try again.');
        setVerificationStatus('failed');
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    verifyWallet();
  }, [connected, publicKey, discordUser, verificationStatus]);

  const handleClose = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto p-6 bg-gray-900 rounded-xl shadow-xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Holder Verification</h2>

        {/* Discord Connection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            Step 1: Connect Discord
            {discordUser && <span className="text-green-400">✓</span>}
          </h3>
          {discordUser ? (
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-4">
                {discordUser.avatar && (
                  <img 
                    src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                    alt={discordUser.discord_username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-white font-medium">{discordUser.discord_username}</p>
                  <p className="text-green-400 text-sm">Connected</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>{loading ? 'Connecting...' : 'Login with Discord'}</span>
            </button>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            Step 2: Connect Wallet
            {connected && <span className="text-green-400">✓</span>}
          </h3>
          {connected ? (
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
              <div>
                <p className="text-white font-medium">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
                <p className="text-green-400 text-sm">Connected</p>
              </div>
              <button
                onClick={disconnect}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={!discordUser}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!discordUser ? 'Connect Discord First' : 'Connect Wallet'}
            </button>
          )}
        </div>

        {/* Verification Status */}
        {error && (
          <p className="mt-4 text-sm">
            {verificationStatus === 'verified' ? (
              <span className="text-green-400">
                Successfully verified. You can view your full server role list in profile.
              </span>
            ) : (
              <span className="text-red-500">{error}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};

export default HolderVerification; 
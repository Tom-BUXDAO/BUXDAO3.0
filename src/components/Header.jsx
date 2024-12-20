import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-black/80 backdrop-blur-sm z-50">
      <nav className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0 -ml-2 sm:ml-0">
            <Logo />
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a href="#home" className="text-gray-300 hover:text-white transition-colors">
                Home
              </a>
              <a href="#collections" className="text-gray-300 hover:text-white transition-colors">
                Collections
              </a>
              <a href="#bux" className="text-gray-300 hover:text-white transition-colors">
                $BUX
              </a>
              <a href="#collabs" className="text-gray-300 hover:text-white transition-colors">
                A.I. Collabs
              </a>
              <a href="#soon" className="text-gray-300 hover:text-white transition-colors">
                Coming Soon
              </a>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <a href="#home" className="text-gray-300 hover:text-white transition-colors">
                Home
              </a>
              <a href="#collections" className="text-gray-300 hover:text-white transition-colors">
                Collections
              </a>
              <a href="#bux" className="text-gray-300 hover:text-white transition-colors">
                $BUX
              </a>
              <a href="#collabs" className="text-gray-300 hover:text-white transition-colors">
                A.I. Collabs
              </a>
              <a href="#soon" className="text-gray-300 hover:text-white transition-colors">
                Coming Soon
              </a>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header; 
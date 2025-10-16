'use client';
import { FC, useContext, useState, useRef, useEffect } from 'react';
import { HiroWalletContext } from '../HiroWalletProvider';
import { Network } from '@/lib/network';
import { ChevronDown } from 'lucide-react';

export const NetworkSelector: FC = () => {
  const { network, setNetwork } = useContext(HiroWalletContext);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const networks = [
    {
      name: 'Stacks Testnet',
      value: 'testnet' as Network,
      endpoint: 'api.testnet.hiro.so',
      status: 'online',
    },
    {
      name: 'Devnet',
      value: 'devnet' as Network,
      endpoint: 'localhost',
      status: 'offline',
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!network) return null;

  const handleNetworkChange = (newNetwork: Network) => {
    setNetwork(newNetwork);
    setIsOpen(false);
  };

  const getNetworkColor = (status: string) => {
    return status === 'online' ? 'bg-green-500' : 'bg-red-500';
  };

  const getDisplayName = () => {
    return network.charAt(0).toUpperCase() + network.slice(1);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 font-medium text-sm transition-all flex items-center gap-2"
      >
        <span className={`w-2 h-2 ${network === 'testnet' ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></span>
        {getDisplayName()}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-black/95 border border-orange-500/30 rounded-xl p-2 shadow-2xl backdrop-blur-xl z-50">
          {networks.map((net) => (
            <button
              key={net.value}
              onClick={() => handleNetworkChange(net.value)}
              className={`w-full text-left px-4 py-3 hover:bg-orange-500/10 rounded-lg transition-all ${
                network === net.value ? 'bg-orange-500/20' : ''
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="font-medium text-white">{net.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{net.endpoint}</span>
                  {net.status === 'offline' && (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-md border border-red-500/30">
                      Offline
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

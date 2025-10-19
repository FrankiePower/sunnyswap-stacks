'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { request } from '@stacks/connect';
import { bufferCV, principalCV } from '@stacks/transactions';

interface ClaimButtonProps {
  orderSecret: string; // 0x-prefixed hex string
  resolverAddress: string; // Stacks address of resolver who created HTLC
  onSuccess?: (txid: string) => void;
  onError?: (error: Error) => void;
}

export function ClaimButton({ orderSecret, resolverAddress, onSuccess, onError }: ClaimButtonProps) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    try {
      setClaiming(true);

      // Convert secret from 0x-prefixed hex to Buffer
      const secretBuffer = Buffer.from(orderSecret.slice(2), 'hex');

      console.log('🎯 Claiming STX with secret...');
      console.log('Secret:', orderSecret.substring(0, 20) + '...');
      console.log('Resolver:', resolverAddress);
      console.log('💡 Check your Hiro Wallet to approve the transaction!');

      // Use the modern request API instead of deprecated openContractCall
      const result = await request('stx_callContract', {
        contract: 'ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc',
        functionName: 'swap',
        functionArgs: [
          principalCV(resolverAddress),
          bufferCV(secretBuffer),
        ],
        network: 'testnet',
        postConditionMode: 'allow', // Explicitly set to allow mode for as-contract transfers
        postConditions: [],
      });

      if (!result.txid) {
        throw new Error('No transaction ID returned from wallet');
      }

      console.log('✅ Claim transaction submitted:', result.txid);
      console.log('🎉 SECRET REVEALED ON-CHAIN!');
      console.log('View on explorer:', `https://explorer.hiro.so/txid/${result.txid}?chain=testnet`);

      if (onSuccess) {
        onSuccess(result.txid);
      }
      setClaiming(false);

    } catch (error) {
      console.error('❌ Claim error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to claim: ${errorMessage}\n\nPlease ensure Hiro Wallet is installed and connected.`);
      if (onError) {
        onError(error as Error);
      }
      setClaiming(false);
    }
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={claiming}
      className="w-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
    >
      {claiming ? '🔄 Check Hiro Wallet to Approve...' : '🎁 Claim My STX'}
    </Button>
  );
}

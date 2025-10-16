'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { openContractCall } from '@stacks/connect';
import { bufferCV, principalCV, PostConditionMode, AnchorMode } from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

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

      await openContractCall({
        network: STACKS_TESTNET,
        anchorMode: AnchorMode.Any,
        contractAddress: 'ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF',
        contractName: 'stx-htlc',
        functionName: 'swap',
        functionArgs: [
          principalCV(resolverAddress),
          bufferCV(secretBuffer),
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data: any) => {
          console.log('✅ Claim transaction submitted:', data.txId);
          console.log('🎉 SECRET REVEALED ON-CHAIN!');
          console.log('View on explorer:', `https://explorer.hiro.so/txid/${data.txId}?chain=testnet`);

          if (onSuccess) {
            onSuccess(data.txId);
          }
          setClaiming(false);
        },
        onCancel: () => {
          console.log('❌ Claim cancelled by user');
          setClaiming(false);
        },
      });

    } catch (error) {
      console.error('❌ Claim error:', error);
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
      {claiming ? '🔄 Claiming STX...' : '🎁 Claim My STX'}
    </Button>
  );
}

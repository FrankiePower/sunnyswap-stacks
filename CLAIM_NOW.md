# 🎁 CLAIM YOUR STX NOW!

## Current Swap Status

✅ **EVM Escrow Deployed**
- Address: `0x95F1e518BF6BDF8Fb95886A250E57efA7A0cA6d2`
- Amount: 0.001 ETH locked
- Transaction: https://sepolia.etherscan.io/tx/0xf2adb6a2ca4dec72d207cd3e564f42c2db4891cc310fa4dc712052a5e6e971bf

✅ **Stacks HTLC Deployed**
- Contract: `ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc`
- Amount: 1000 microSTX locked
- Transaction: https://explorer.hiro.so/txid/7fa728aabcf7881313fe02ddcc02eda00f2533ffdec5a3ecb20432c58ecbc117?chain=testnet
- Expiration: Block 3605193

🔐 **Secret:** `0x61a9653658f0455292e5b05711c88d934cf2df0888e0e6022a38ac03d6cff990`
🔒 **Hashlock:** `0x99f35543f012db632ccf2245f879fe2c9afe6404ef1ff9ff6a7a69f82c0e5acc`

---

## Option 1: Claim via Hiro Wallet (RECOMMENDED)

### Step 1: Install Hiro Wallet
If you don't have it: https://wallet.hiro.so/wallet/install-web

### Step 2: Import the Maker Address
The maker address is: `ST22TT32HJR42GEX1T2AEM3MQRYZAAAJXZVV6PBGB`

You need the private key for this address, OR use a test address you control.

### Step 3: Use the ClaimButton Component
Add this to your UI where the swap success modal is:

```tsx
import { ClaimButton } from '@/components/sunnyswap/ClaimButton';

// Inside the success modal:
{currentOrder && (
  <ClaimButton
    orderSecret={currentOrder.secret}
    resolverAddress="ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF"
    onSuccess={(txid) => {
      console.log('Claimed! Txid:', txid);
      alert(`SUCCESS! Secret revealed on-chain: ${txid}`);
    }}
    onError={(error) => {
      console.error('Claim failed:', error);
      alert(`Error: ${error.message}`);
    }}
  />
)}
```

---

## Option 2: Claim via API (Quick Test)

If you have the maker's private key:

```bash
curl -X POST http://localhost:3000/api/claim/stacks \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF",
    "preimage": "0x61a9653658f0455292e5b05711c88d934cf2df0888e0e6022a38ac03d6cff990",
    "makerPrivateKey": "YOUR_MAKER_STACKS_PRIVATE_KEY"
  }'
```

---

## Option 3: Direct Contract Call (Advanced)

```typescript
import { openContractCall } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { bufferCV, principalCV, PostConditionMode } from '@stacks/transactions';

const secret = '0x61a9653658f0455292e5b05711c88d934cf2df0888e0e6022a38ac03d6cff990';
const secretBuffer = Buffer.from(secret.slice(2), 'hex');

await openContractCall({
  network: new StacksTestnet(),
  contractAddress: 'ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF',
  contractName: 'stx-htlc',
  functionName: 'swap',
  functionArgs: [
    principalCV('ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF'), // sender (resolver)
    bufferCV(secretBuffer), // preimage (secret)
  ],
  postConditionMode: PostConditionMode.Allow,
  onFinish: (data) => {
    console.log('Success!', data.txId);
    // The secret is now revealed on-chain!
  },
});
```

---

## What Happens After Claiming?

1. ✅ **You get 1000 microSTX** - Transaction completes
2. 🔓 **Secret is revealed on Stacks blockchain** - Anyone can see it
3. 🤖 **Resolver extracts the secret** - From your transaction
4. 💰 **Resolver claims 0.001 ETH** - Uses secret to unlock EVM escrow

---

## Next: Implement Auto-Claim for Resolver

After the maker claims, we need to:

1. **Monitor Stacks blockchain** for the `swap-completed` event
2. **Extract the revealed secret** from the transaction
3. **Call EVM escrow's claim function** with the secret
4. **Profit!** Resolver gets their ETH back

This can be a simple polling script or a webhook listener.

---

## Time Estimate

- ⏱️ **Implementing claim UI**: 30 mins
- ⏱️ **Testing claim**: 15 mins
- ⏱️ **Implementing resolver auto-claim**: 45 mins
- ⏱️ **End-to-end testing**: 30 mins

**Total: ~2 hours** to complete the full atomic swap!

🚀 **You're 90% done!** Just need to wire up the claiming logic!

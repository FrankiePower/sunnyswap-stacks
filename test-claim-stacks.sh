#!/bin/bash

echo "======================================================================"
echo "Testing Stacks Claim (Maker reveals secret)"
echo "======================================================================"
echo ""
echo "Swap Details:"
echo "- Sender (Resolver): ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF"
echo "- Recipient (Maker): ST22TT32HJR42GEX1T2AEM3MQRYZAAAJXZVV6PBGB"
echo "- Secret: 0x61a9653658f0455292e5b05711c88d934cf2df0888e0e6022a38ac03d6cff990"
echo "- Amount: 1000 microSTX"
echo ""
echo "======================================================================"
echo ""

# You'll need to provide the maker's private key
# For testing, you can use a devnet wallet private key
echo "⚠️  You need to provide the maker's Stacks private key!"
echo ""
echo "For the maker address ST22TT32HJR42GEX1T2AEM3MQRYZAAAJXZVV6PBGB,"
echo "you need to either:"
echo "1. Have the actual private key for this address"
echo "2. Use a test wallet you control"
echo ""
echo "Example call:"
echo ""
echo 'curl -X POST http://localhost:3000/api/claim/stacks \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{
    "sender": "ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF",
    "preimage": "0x61a9653658f0455292e5b05711c88d934cf2df0888e0e6022a38ac03d6cff990",
    "makerPrivateKey": "YOUR_MAKER_PRIVATE_KEY_HERE"
  }'"'"''
echo ""
echo "======================================================================"

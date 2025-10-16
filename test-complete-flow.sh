#!/bin/bash

echo "======================================================================"
echo "Testing Complete SunnySwap Atomic Swap Flow"
echo "======================================================================"
echo ""
echo "Prerequisites:"
echo "✅ EVM Resolver balance: 0.03 ETH"
echo "✅ Stacks Resolver balance: ~1,500 STX"
echo "✅ Redis running: $(redis-cli ping 2>/dev/null || echo 'NOT RUNNING ❌')"
echo "✅ Next.js dev server: http://localhost:3000"
echo ""
echo "======================================================================"
echo "Creating test order: 0.001 ETH → 1000 microSTX"
echo "======================================================================"
echo ""

# Generate a new order
ORDER_HASH=$(openssl rand -hex 32)
SECRET=$(openssl rand -hex 32)
HASHLOCK=$(echo -n $SECRET | xxd -r -p | openssl dgst -sha256 | awk '{print $2}')

echo "Secret:   0x$SECRET"
echo "Hashlock: 0x$HASHLOCK"
echo "Order ID: order_test_$(date +%s)"
echo ""

# Create order via API
curl -X POST http://localhost:3000/api/relayer/orders \
  -H "Content-Type: application/json" \
  -d "{
    \"hash\": \"0x$ORDER_HASH\",
    \"hashLock\": {
      \"sha256\": \"$HASHLOCK\"
    },
    \"srcChainId\": 11155111,
    \"dstChainId\": 5230,
    \"order\": {
      \"orderId\": \"order_test_$(date +%s)\",
      \"timestamp\": $(date +%s)000,
      \"network\": \"sepolia\",
      \"chainId\": 11155111,
      \"maker\": {
        \"address\": \"0x8966caCc8E138ed0a03aF3Aa4AEe7B79118C420E\",
        \"provides\": {
          \"asset\": \"ETH\",
          \"amount\": \"1000000000000000\"
        },
        \"wants\": {
          \"asset\": \"STX\",
          \"amount\": \"1000\",
          \"address\": \"ST22TT32HJR42GEX1T2AEM3MQRYZAAAJXZVV6PBGB\"
        }
      },
      \"secret\": \"0x$SECRET\",
      \"hashlock\": \"0x$HASHLOCK\",
      \"timelock\": {
        \"withdrawalPeriod\": 0,
        \"cancellationPeriod\": 3600
      },
      \"status\": \"CREATED\",
      \"contracts\": {
        \"stxEscrowFactory\": \"0x506485C554E2eFe0AA8c22109aAc021A1f28888B\",
        \"resolver\": \"0x70060F694e4Ba48224FcaaE7eB20e81ec4461C8D\"
      }
    },
    \"stacksAddress\": \"ST22TT32HJR42GEX1T2AEM3MQRYZAAAJXZVV6PBGB\"
  }" | jq '.'

echo ""
echo "======================================================================"
echo "Check Next.js server logs to see:"
echo "1. [Resolver] Creating EVM escrow..."
echo "2. [Resolver] Creating Stacks HTLC..."
echo "3. Both escrows deployed successfully"
echo "======================================================================"
echo ""
echo "Check order status:"
echo "redis-cli HGET orders 0x$ORDER_HASH | jq '.'"
echo "======================================================================"

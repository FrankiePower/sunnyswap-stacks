// app/api/resolver/claim/[hash]/route.ts
import { NextResponse } from "next/server";
import { extractSecretFromStacksTx, claimEvmEscrow } from "@/lib/evm-claim";
import redis, { connectRedis } from "@/lib/redis";

const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;

/**
 * Resolver auto-claim endpoint
 * Monitors Stacks transaction, extracts secret, claims EVM escrow
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;

    console.log(`[Resolver Claim] Processing order: ${hash}`);

    // Fetch order from Redis
    await connectRedis();
    const orderData = await redis.hGet("orders", hash);

    if (!orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = JSON.parse(orderData);

    if (!order.dstEscrowTxid) {
      return NextResponse.json(
        { error: "Stacks HTLC not yet deployed" },
        { status: 400 }
      );
    }

    if (order.status === 'claimed' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Already claimed',
        evmClaimHash: order.evmClaimHash,
      });
    }

    console.log('[Resolver Claim] Extracting secret from Stacks tx:', order.dstEscrowTxid);

    // Extract secret from Stacks transaction
    const secret = await extractSecretFromStacksTx(order.dstEscrowTxid);

    console.log('[Resolver Claim] Secret extracted!');

    if (!resolverPrivateKey || !sepoliaRpcUrl) {
      throw new Error('Resolver configuration missing');
    }

    // Claim EVM escrow
    console.log('[Resolver Claim] Claiming EVM escrow...');

    const result = await claimEvmEscrow({
      escrowAddress: order.srcEscrowAddress,
      secret,
      resolverPrivateKey,
      rpcUrl: sepoliaRpcUrl,
    });

    console.log('[Resolver Claim] EVM claim successful:', result.txHash);

    // Update order status
    order.evmClaimHash = result.txHash;
    order.status = 'completed';
    order.completedAt = Date.now();

    await redis.hSet("orders", hash, JSON.stringify(order));

    return NextResponse.json({
      success: true,
      secret,
      evmClaimHash: result.txHash,
      message: 'Atomic swap completed!',
    });

  } catch (err) {
    console.error("[Resolver Claim] Error:", err);
    return NextResponse.json({
      error: "Claim failed",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

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
  req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    const body = await req.json().catch(() => ({}));
    const claimTxid = body.claimTxid; // User's claim transaction ID

    console.log(`[Resolver Claim] Processing order: ${hash}`);
    console.log(`[Resolver Claim] Claim txid:`, claimTxid);

    // Fetch order from Redis
    await connectRedis();
    const orderData = await redis.hGet("orders", hash);

    if (!orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Handle both string and object formats
    const order = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;

    console.log('[Resolver Claim] Order data from Redis:', JSON.stringify(order, null, 2));
    console.log('[Resolver Claim] srcEscrowAddress:', order.srcEscrowAddress);
    console.log('[Resolver Claim] Order keys:', Object.keys(order));

    if (order.status === 'claimed' || order.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Already claimed',
        evmClaimHash: order.evmClaimHash,
      });
    }

    if (!claimTxid) {
      return NextResponse.json(
        { error: "Claim transaction ID required" },
        { status: 400 }
      );
    }

    console.log('[Resolver Claim] Extracting secret from user claim tx:', claimTxid);

    // Extract secret from the USER's claim transaction
    const secret = await extractSecretFromStacksTx(claimTxid);

    console.log('[Resolver Claim] Secret extracted!');

    if (!resolverPrivateKey || !sepoliaRpcUrl) {
      throw new Error('Resolver configuration missing');
    }

    // Claim EVM escrow
    console.log('[Resolver Claim] Claiming EVM escrow...');

    if (!order.srcImmutables) {
      return NextResponse.json(
        { error: "Escrow immutables not found" },
        { status: 400 }
      );
    }

    const result = await claimEvmEscrow({
      escrowAddress: order.srcEscrowAddress,
      secret,
      immutables: order.srcImmutables,
      deployTxHash: order.srcDeployHash,
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

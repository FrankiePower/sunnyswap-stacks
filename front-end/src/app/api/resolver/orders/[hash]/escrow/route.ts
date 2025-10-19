// app/api/resolver/orders/[hash]/escrow/route.ts
import { NextResponse } from "next/server";
import { registerSwapIntent, calculateExpirationHeight } from "@/lib/stacks-resolver";

const stacksResolverPrivateKey = process.env.STACKS_RESOLVER_PRIVATE_KEY;

export async function POST(
  _req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    console.log(`[Resolver] Processing order: ${hash}`);

    // Fetch order from relayer
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/relayer/orders/${hash}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Order not found in relayer" },
        { status: 404 }
      );
    }

    const {
      hashLock,
      srcChainId,
      dstChainId,
      order,
      stacksAddress,
      srcEscrowAddress,
      srcDeployHash,
      srcImmutables,
    } = await response.json();

    console.log("[Resolver] Order details:", { srcChainId, dstChainId });
    console.log("[Resolver] User's escrow:", srcEscrowAddress);
    console.log("[Resolver] Deploy tx:", srcDeployHash);

    // For MVP: Only handle EVM → STX swaps
    // User has already locked their ETH in the source escrow
    // Resolver only needs to create the Stacks HTLC
    if (srcChainId === 11155111) { // Sepolia
      console.log("[Resolver] User has locked ETH in escrow:", srcEscrowAddress);
      console.log("[Resolver] User's immutables:", srcImmutables);

      // Verify we have the required information
      if (!srcEscrowAddress || !srcImmutables) {
        throw new Error("Missing source escrow information from user");
      }

      // Create Stacks HTLC (resolver locks STX)
      console.log("[Resolver] Creating Stacks HTLC...");

      if (!stacksResolverPrivateKey) {
        console.error("[Resolver] Missing STACKS_RESOLVER_PRIVATE_KEY");
        return NextResponse.json({
          error: "Stacks resolver not configured",
          details: "STACKS_RESOLVER_PRIVATE_KEY not set"
        }, { status: 500 });
      }

      try {
        // Calculate expiration height (24 hours = 144 blocks at ~10 min/block)
        const expirationHeight = await calculateExpirationHeight(86400); // 24 hours

        // Register swap intent on Stacks
        const stacksResult = await registerSwapIntent({
          hash: hashLock.sha256.startsWith('0x') ? hashLock.sha256 : '0x' + hashLock.sha256,
          expirationHeight,
          amount: Number(order.maker.wants.amount), // Amount in microSTX
          recipient: stacksAddress,
          privateKey: stacksResolverPrivateKey,
        });

        console.log("[Resolver] Stacks HTLC registered:", stacksResult.txid);

        // Update order with Stacks info
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/relayer/orders/${hash}/escrow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dstEscrowTxid: stacksResult.txid,
            dstExpirationHeight: expirationHeight,
            status: "escrows_deployed"
          }),
        });

        console.log("[Resolver] Stacks HTLC created successfully!");
        console.log("[Resolver] User locked EVM escrow, Resolver locked Stacks HTLC");

        return NextResponse.json({
          success: true,
          srcEscrowAddress, // User's escrow
          srcTxHash: srcDeployHash, // User's deploy tx
          dstTxid: stacksResult.txid, // Resolver's Stacks HTLC
          dstExpirationHeight: expirationHeight,
        });

      } catch (stacksError) {
        console.error("[Resolver] Stacks HTLC creation failed:", stacksError);

        // Update status to indicate failure
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/relayer/orders/${hash}/escrow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "dst_failed",
            dstError: stacksError instanceof Error ? stacksError.message : String(stacksError)
          }),
        });

        return NextResponse.json({
          success: false,
          error: "Stacks HTLC creation failed",
          details: stacksError instanceof Error ? stacksError.message : String(stacksError)
        }, { status: 500 });
      }
    }

    // TODO: Handle STX → EVM swaps (create EVM escrow as destination)
    // This would create EVM escrow after Stacks HTLC

    return NextResponse.json({ error: "Unsupported chain pair" }, { status: 400 });

  } catch (err) {
    console.error("[Resolver] Error:", err);
    return NextResponse.json({
      error: "Resolver failed",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

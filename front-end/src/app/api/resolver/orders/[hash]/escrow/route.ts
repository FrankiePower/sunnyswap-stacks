// app/api/resolver/orders/[hash]/escrow/route.ts
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, ABIS } from "@/contracts";
import { registerSwapIntent, calculateExpirationHeight } from "@/lib/stacks-resolver";

const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
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
    } = await response.json();

    console.log("[Resolver] Order details:", { srcChainId, dstChainId });

    // For MVP: Only handle EVM → STX swaps
    // Resolver creates EVM escrow on behalf of user
    if (srcChainId === 11155111) { // Sepolia
      console.log("[Resolver] Creating EVM source escrow...");

      if (!resolverPrivateKey || !sepoliaRpcUrl) {
        throw new Error("Missing resolver configuration");
      }

      const provider = new ethers.JsonRpcProvider(sepoliaRpcUrl);
      const resolverWallet = new ethers.Wallet(resolverPrivateKey, provider);

      // @ts-ignore
      const factoryAddress = CONTRACT_ADDRESSES[srcChainId].stxEscrowFactory;
      const factory = new ethers.Contract(
        factoryAddress,
        ABIS.stxEscrowFactory,
        resolverWallet
      );

      // Construct immutables from order
      const now = Math.floor(Date.now() / 1000);
      const SAFETY_DEPOSIT = ethers.parseEther("0.001");
      const ESCROW_AMOUNT = BigInt(order.maker.provides.amount);
      const CREATION_FEE = await factory.creationFee();
      const TOTAL_REQUIRED = ESCROW_AMOUNT + SAFETY_DEPOSIT + CREATION_FEE;

      // Pack timelocks
      const dstWithdrawal = order.timelock.withdrawalPeriod;
      const dstPublicWithdrawal = order.timelock.withdrawalPeriod * 2;
      const dstCancellation = order.timelock.cancellationPeriod;

      // @ts-ignore - BigInt literals
      const timelocks = (BigInt(now) << BigInt(224)) |
                       (BigInt(dstCancellation) << BigInt(64)) |
                       (BigInt(dstPublicWithdrawal) << BigInt(32)) |
                       BigInt(dstWithdrawal);

      const immutables = {
        orderHash: ethers.keccak256(ethers.toUtf8Bytes(hash)),
        hashlock: '0x' + hashLock.sha256,
        maker: BigInt(order.maker.address),
        taker: BigInt(resolverWallet.address), // Resolver is taker
        token: BigInt(ethers.ZeroAddress), // ETH
        amount: ESCROW_AMOUNT,
        safetyDeposit: SAFETY_DEPOSIT,
        timelocks: timelocks
      };

      console.log("[Resolver] Creating source escrow with immutables:", immutables);

      // Create source escrow
      const tx = await factory.createSrcEscrow(immutables, {
        value: TOTAL_REQUIRED
      });

      console.log("[Resolver] Transaction submitted:", tx.hash);
      const receipt = await tx.wait();
      console.log("[Resolver] Transaction confirmed in block:", receipt.blockNumber);

      // Calculate escrow address
      const escrowAddress = await factory.addressOfEscrowSrc(immutables);
      console.log("[Resolver] Source escrow address:", escrowAddress);

      // Update order in Redis
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/relayer/orders/${hash}/escrow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          srcEscrowAddress: escrowAddress,
          srcDeployHash: tx.hash,
          srcImmutables: {
            ...immutables,
            maker: immutables.maker.toString(),
            taker: immutables.taker.toString(),
            token: immutables.token.toString(),
            amount: immutables.amount.toString(),
            safetyDeposit: immutables.safetyDeposit.toString(),
            timelocks: immutables.timelocks.toString()
          },
          status: "src_escrow_deployed"
        }),
      });

      console.log("[Resolver] Successfully deployed source escrow");

      // Now create Stacks HTLC (destination escrow)
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

        console.log("[Resolver] Both escrows deployed successfully");

        return NextResponse.json({
          success: true,
          srcEscrowAddress: escrowAddress,
          srcTxHash: tx.hash,
          dstTxid: stacksResult.txid,
          dstExpirationHeight: expirationHeight,
        });

      } catch (stacksError) {
        console.error("[Resolver] Stacks HTLC creation failed:", stacksError);

        // Update status to indicate partial success
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/relayer/orders/${hash}/escrow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "src_escrow_deployed_dst_failed",
            dstError: stacksError instanceof Error ? stacksError.message : String(stacksError)
          }),
        });

        return NextResponse.json({
          success: false,
          srcEscrowAddress: escrowAddress,
          srcTxHash: tx.hash,
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

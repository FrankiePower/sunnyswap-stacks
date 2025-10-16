// POST /api/resolver/orders/[hash]/withdraw
// User shares secret, resolver withdraws funds from both escrows

import { NextResponse } from "next/server";
import {
  JsonRpcProvider,
  Wallet as EthersWallet,
  Contract,
} from "ethers";
import { config } from "@/lib/config";
import redis, { connectRedis } from "@/lib/redis";

import ResolverArtifact from "@/lib/abis/Resolver.json";

const ResolverABI = ResolverArtifact.abi;
const evmPrivateKey = process.env.EVM_PRIVATE_KEY || "0x";

export async function POST(
  req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    const { secret } = await req.json();

    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: "Missing secret" }, { status: 400 });
    }

    console.log(`🔓 Processing withdrawal for order ${hash} with secret`);

    // Fetch order from Redis
    await connectRedis();
    const orderData = await redis.hGet("orders", hash);

    if (!orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = JSON.parse(orderData);

    if (order.status !== "escrows_deployed") {
      return NextResponse.json(
        { error: `Invalid order status: ${order.status}` },
        { status: 400 }
      );
    }

    const {
      srcChainId,
      dstChainId,
      srcEscrowAddress,
      dstEscrowAddress,
      hashLock,
      maker,
      srcToken,
      dstToken,
      srcAmount,
      dstAmount,
      safetyDeposit,
      timelocks,
    } = order;

    let srcWithdrawHash = "";
    let dstWithdrawHash = "";

    // === Withdraw from Destination Escrow (Resolver gets dst tokens) ===
    console.log(`\n💰 Withdrawing from destination escrow...`);

    if (config[dstChainId].type === "evm") {
      const dstProvider = new JsonRpcProvider(
        config[dstChainId].rpc,
        dstChainId
      );
      const dstResolverWallet = new EthersWallet(evmPrivateKey, dstProvider);
      const dstResolverContract = new Contract(
        config[dstChainId].resolver!,
        ResolverABI,
        dstResolverWallet
      );

      const dstImmutables = {
        orderHash: hash,
        hashlock: hashLock,
        maker,
        taker: dstResolverWallet.address,
        token: dstToken,
        amount: BigInt(dstAmount),
        safetyDeposit: BigInt(safetyDeposit || 0),
        timelocks: BigInt(timelocks),
      };

      const tx = await dstResolverContract.withdraw(
        dstEscrowAddress,
        secret,
        dstImmutables
      );

      const receipt = await tx.wait();
      dstWithdrawHash = receipt.hash;

      console.log(`✅ Withdrew from destination escrow`);
      console.log(`   Tx: ${dstWithdrawHash}`);
    }

    // === Withdraw from Source Escrow (User gets src tokens refund if needed) ===
    console.log(`\n💰 Withdrawing from source escrow...`);

    if (config[srcChainId].type === "evm") {
      const srcProvider = new JsonRpcProvider(
        config[srcChainId].rpc,
        srcChainId
      );
      const srcResolverWallet = new EthersWallet(evmPrivateKey, srcProvider);
      const srcResolverContract = new Contract(
        config[srcChainId].resolver!,
        ResolverABI,
        srcResolverWallet
      );

      const srcImmutables = {
        orderHash: hash,
        hashlock: hashLock,
        maker,
        taker: srcResolverWallet.address,
        token: srcToken,
        amount: BigInt(srcAmount),
        safetyDeposit: BigInt(safetyDeposit || 0),
        timelocks: BigInt(timelocks),
      };

      const tx = await srcResolverContract.withdraw(
        srcEscrowAddress,
        secret,
        srcImmutables
      );

      const receipt = await tx.wait();
      srcWithdrawHash = receipt.hash;

      console.log(`✅ Withdrew from source escrow`);
      console.log(`   Tx: ${srcWithdrawHash}`);
    }

    // === Update order status in Redis ===
    const updatedOrder = {
      ...order,
      status: "completed",
      secret,
      srcWithdrawHash,
      dstWithdrawHash,
      completedAt: new Date().toISOString(),
    };

    await redis.hSet("orders", hash, JSON.stringify(updatedOrder));

    console.log(`\n✅ Swap completed for order ${hash}\n`);

    return NextResponse.json({
      success: true,
      srcWithdrawHash,
      dstWithdrawHash,
    });
  } catch (err) {
    console.error("Withdrawal error:", err);

    // Update order status to failed
    try {
      await connectRedis();
      const orderData = await redis.hGet("orders", (await context.params).hash);
      if (orderData) {
        const order = JSON.parse(orderData);
        order.status = "withdrawal_failed";
        order.error = err instanceof Error ? err.message : String(err);
        await redis.hSet(
          "orders",
          (await context.params).hash,
          JSON.stringify(order)
        );
      }
    } catch (updateErr) {
      console.error("Failed to update order status:", updateErr);
    }

    return NextResponse.json(
      { error: "Withdrawal failed" },
      { status: 500 }
    );
  }
}

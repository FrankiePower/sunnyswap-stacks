// POST /api/resolver/orders/[hash]/escrow
// Resolver bot deploys source and destination escrows

import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet as EthersWallet, parseEther, Contract } from "ethers";
import { config } from "@/lib/config";
import redis, { connectRedis } from "@/lib/redis";

// Import contract ABIs
import ResolverArtifact from "@/lib/abis/Resolver.json";

const ResolverABI = ResolverArtifact.abi;

const evmPrivateKey = process.env.EVM_PRIVATE_KEY || "0x";

export async function POST(
  _req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;

    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    console.log(`🔄 Processing escrow deployment for order ${hash}`);

    // Fetch order from Redis
    await connectRedis();
    const orderData = await redis.hGet("orders", hash);

    if (!orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = JSON.parse(orderData);
    const {
      hashLock,
      srcChainId,
      dstChainId,
      maker,
      taker,
      srcToken,
      dstToken,
      srcAmount,
      dstAmount,
      safetyDeposit,
      timelocks,
    } = order;

    let srcEscrowAddress: string = "";
    let dstEscrowAddress: string = "";
    let srcDeployHash: string = "";
    let dstDeployHash: string = "";
    let srcDeployedAt: number = 0;
    let dstDeployedAt: number = 0;

    // === Deploy Source Escrow ===
    console.log(`\n📍 Deploying source escrow on chain ${srcChainId}...`);

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

      // Build immutables struct for source escrow
      const srcImmutables = {
        orderHash: hash,
        hashlock: hashLock,
        maker,
        taker: taker || srcResolverWallet.address,
        token: srcToken,
        amount: BigInt(srcAmount),
        safetyDeposit: BigInt(safetyDeposit || 0),
        timelocks: BigInt(timelocks),
      };

      // Calculate required ETH (amount + safety deposit + creation fee)
      const creationFee = parseEther("0.0001"); // TODO: fetch from factory
      const totalValue =
        BigInt(srcAmount) + BigInt(safetyDeposit || 0) + creationFee;

      console.log(`💰 Deploying with ${totalValue} wei...`);

      const tx = await srcResolverContract.deploySrc(srcImmutables, {
        value: totalValue,
      });

      const receipt = await tx.wait();
      srcDeployHash = receipt.hash;
      srcDeployedAt = Math.floor(Date.now() / 1000);

      // Calculate escrow address (we'll need to implement this)
      srcEscrowAddress = "0x..."; // TODO: calculate from factory

      console.log(`✅ Source escrow deployed at ${srcEscrowAddress}`);
      console.log(`   Tx: ${srcDeployHash}`);
    } else if (config[srcChainId].type === "stacks") {
      console.log(`📜 Deploying Stacks source escrow...`);
      // TODO: Implement Stacks escrow deployment
      srcEscrowAddress = "ST...";
      srcDeployHash = "0x...";
      srcDeployedAt = Math.floor(Date.now() / 1000);
    }

    // === Deploy Destination Escrow ===
    console.log(`\n📍 Deploying destination escrow on chain ${dstChainId}...`);

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

      const creationFee = parseEther("0.0001");
      const totalValue =
        BigInt(dstAmount) + BigInt(safetyDeposit || 0) + creationFee;

      console.log(`💰 Deploying with ${totalValue} wei...`);

      const tx = await dstResolverContract.deployDst(dstImmutables, {
        value: totalValue,
      });

      const receipt = await tx.wait();
      dstDeployHash = receipt.hash;
      dstDeployedAt = Math.floor(Date.now() / 1000);

      dstEscrowAddress = "0x..."; // TODO: calculate from factory

      console.log(`✅ Destination escrow deployed at ${dstEscrowAddress}`);
      console.log(`   Tx: ${dstDeployHash}`);
    } else if (config[dstChainId].type === "stacks") {
      console.log(`📜 Deploying Stacks destination escrow...`);
      // TODO: Implement Stacks escrow deployment
      dstEscrowAddress = "ST...";
      dstDeployHash = "0x...";
      dstDeployedAt = Math.floor(Date.now() / 1000);
    }

    // === Update order status in Redis ===
    const updatedOrder = {
      ...order,
      status: "escrows_deployed",
      srcEscrowAddress,
      dstEscrowAddress,
      srcDeployHash,
      dstDeployHash,
      srcDeployedAt,
      dstDeployedAt,
      updatedAt: new Date().toISOString(),
    };

    await redis.hSet("orders", hash, JSON.stringify(updatedOrder));

    console.log(`\n✅ Escrows deployed successfully for order ${hash}\n`);

    return NextResponse.json({
      success: true,
      srcEscrowAddress,
      dstEscrowAddress,
      srcDeployHash,
      dstDeployHash,
    });
  } catch (err) {
    console.error("Resolver error:", err);

    // Update order status to failed
    try {
      await connectRedis();
      const orderData = await redis.hGet("orders", (await context.params).hash);
      if (orderData) {
        const order = JSON.parse(orderData);
        order.status = "deployment_failed";
        order.error = err instanceof Error ? err.message : String(err);
        await redis.hSet("orders", (await context.params).hash, JSON.stringify(order));
      }
    } catch (updateErr) {
      console.error("Failed to update order status:", updateErr);
    }

    return NextResponse.json(
      { error: "Escrow deployment failed" },
      { status: 500 }
    );
  }
}

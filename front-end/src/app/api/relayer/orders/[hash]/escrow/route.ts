// app/api/relayer/orders/[hash]/escrow/route.ts
import { NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";
import redis from "@/lib/redis";

export async function POST(
  req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    const {
      srcEscrowAddress,
      dstEscrowAddress,
      srcImmutables,
      dstImmutables,
      srcDeployHash,
      dstDeployHash,
      dstEscrowTxid,
      dstExpirationHeight,
      htlcScript,
      status,
    } = await req.json();

    await connectRedis();

    const data = await redis.hGet("orders", hash);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Handle both string and object formats from Redis
    const order = typeof data === 'string' ? JSON.parse(data) : data;

    console.log('[Escrow Update] Received srcEscrowAddress:', srcEscrowAddress);
    console.log('[Escrow Update] Order before update:', JSON.stringify(order, null, 2));

    // Only update fields that are provided (prevent overwriting with undefined)
    if (srcEscrowAddress !== undefined) order.srcEscrowAddress = srcEscrowAddress;
    if (dstEscrowAddress !== undefined) order.dstEscrowAddress = dstEscrowAddress;
    if (srcImmutables !== undefined) order.srcImmutables = srcImmutables;
    if (dstImmutables !== undefined) order.dstImmutables = dstImmutables;
    if (srcDeployHash !== undefined) order.srcDeployHash = srcDeployHash;
    if (dstDeployHash !== undefined) order.dstDeployHash = dstDeployHash;
    if (dstEscrowTxid !== undefined) order.dstEscrowTxid = dstEscrowTxid;
    if (dstExpirationHeight !== undefined) order.dstExpirationHeight = dstExpirationHeight;
    if (htlcScript !== undefined) order.htlcScript = htlcScript;
    if (status !== undefined) order.status = status;

    console.log('[Escrow Update] Order after update:', JSON.stringify(order, null, 2));
    console.log('[Escrow Update] Saving to Redis with hash:', hash);

    await redis.hSet("orders", hash, JSON.stringify(order));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating escrow:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

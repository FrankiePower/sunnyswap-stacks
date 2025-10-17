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
      htlcScript,
    } = await req.json();

    await connectRedis();

    const data = await redis.hGet("orders", hash);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Handle both string and object formats from Redis
    const order = typeof data === 'string' ? JSON.parse(data) : data;
    order.srcEscrowAddress = srcEscrowAddress;
    order.dstEscrowAddress = dstEscrowAddress;
    order.srcImmutables = srcImmutables;
    order.dstImmutables = dstImmutables;
    order.srcDeployHash = srcDeployHash;
    order.dstDeployHash = dstDeployHash;
    order.htlcScript = htlcScript;
    order.status = "escrows_deployed";

    await redis.hSet("orders", hash, JSON.stringify(order));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating escrow:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

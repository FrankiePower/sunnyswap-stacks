// app/api/relayer/orders/[hash]/status/route.ts
import { NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";
import redis from "@/lib/redis";

export async function GET(
  _req: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    await connectRedis();

    const data = await redis.hGet("orders", hash);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Handle both string and object formats from Redis
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const {
      status,
      srcDeployHash,
      dstDeployHash,
      srcWithdrawHash,
      dstWithdrawHash,
      srcEscrowAddress,
      dstEscrowAddress,
    } = parsed;

    console.log(`[Status API] Order ${hash}:`, {
      status,
      hasSrcEscrowAddress: !!srcEscrowAddress,
      hasSrcDeployHash: !!srcDeployHash,
      srcEscrowAddress: srcEscrowAddress || 'undefined',
      srcDeployHash: srcDeployHash || 'undefined',
    });

    return NextResponse.json({
      hash,
      status,
      srcDeployHash,
      dstDeployHash,
      srcWithdrawHash,
      dstWithdrawHash,
      srcEscrowAddress,
      dstEscrowAddress,
    });
  } catch (err) {
    console.error("Error fetching order status:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/relayer/orders/[hash]/status
// Check order status (for frontend polling)

import { NextResponse } from "next/server";
import redis, { connectRedis } from "@/lib/redis";

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
    const orderData = await redis.hGet("orders", hash);

    if (!orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = JSON.parse(orderData);

    // Return relevant status information for frontend
    return NextResponse.json({
      hash,
      status: order.status,
      srcEscrowAddress: order.srcEscrowAddress,
      dstEscrowAddress: order.dstEscrowAddress,
      srcDeployHash: order.srcDeployHash,
      dstDeployHash: order.dstDeployHash,
      srcWithdrawHash: order.srcWithdrawHash,
      dstWithdrawHash: order.dstWithdrawHash,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      completedAt: order.completedAt,
      error: order.error,
    });
  } catch (err) {
    console.error("Status check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

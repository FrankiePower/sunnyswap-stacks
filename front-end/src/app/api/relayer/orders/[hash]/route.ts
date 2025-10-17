// app/api/relayer/orders/[hash]/route.ts
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
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Error fetching order:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

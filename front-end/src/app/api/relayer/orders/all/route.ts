// app/api/relayer/orders/all/route.ts
import { NextResponse } from "next/server";
import redis, { connectRedis } from "@/lib/redis";

export async function GET() {
  try {
    await connectRedis();
    const allOrders = await redis.hGetAll("orders");

    return NextResponse.json(allOrders);
  } catch (err) {
    console.error("Error fetching all orders:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

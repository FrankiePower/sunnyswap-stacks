// app/api/relayer/orders/route.ts
import { NextResponse } from "next/server";
import redis, { connectRedis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const {
      hash,
      hashLock,
      srcChainId,
      dstChainId,
      order,
      extension,
      signature,
      stacksAddress,
      srcEscrowAddress,
      srcDeployHash,
      srcImmutables,
    } = await req.json();

    if (
      !hash ||
      !hashLock ||
      !srcChainId ||
      !dstChainId ||
      !order
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const payload = {
      hashLock,
      srcChainId,
      dstChainId,
      order,
      extension,
      signature,
      stacksAddress,
      srcEscrowAddress,
      srcDeployHash,
      srcImmutables,
      status: "order_created",
      createdAt: Date.now(),
    };

    await connectRedis();
    await redis.hSet("orders", hash, JSON.stringify(payload));

    // Trigger resolver to process order
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/resolver/orders/${hash}/escrow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(err => console.error("Failed to trigger resolver:", err));

    return NextResponse.json({ success: true, hash });
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

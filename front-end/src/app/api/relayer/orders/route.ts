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
    const resolverUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/resolver/orders/${hash}/escrow`;
    console.log(`[Relayer] Triggering resolver at: ${resolverUrl}`);

    fetch(resolverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(res => {
        if (!res.ok) {
          console.error(`[Relayer] Resolver returned status ${res.status}`);
        } else {
          console.log(`[Relayer] Resolver triggered successfully`);
        }
      })
      .catch(err => console.error("[Relayer] Failed to trigger resolver:", err));

    return NextResponse.json({ success: true, hash });
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

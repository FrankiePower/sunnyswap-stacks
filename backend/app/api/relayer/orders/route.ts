// POST /api/relayer/orders
// User submits a new atomic swap order

import { NextResponse } from "next/server";
import redis, { connectRedis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const {
      hash,
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
      signature,
      stacksUserAddress, // For STX swaps
    } = await req.json();

    // Validate required fields
    if (
      !hash ||
      !hashLock ||
      !srcChainId ||
      !dstChainId ||
      !maker ||
      !srcToken ||
      !dstToken ||
      !srcAmount ||
      !dstAmount ||
      !timelocks
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If Stacks is involved, require stacksUserAddress
    if ((srcChainId === 99998 || dstChainId === 99998) && !stacksUserAddress) {
      return NextResponse.json(
        { error: "Missing stacksUserAddress for Stacks swap" },
        { status: 400 }
      );
    }

    const payload = {
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
      signature,
      stacksUserAddress,
      status: "order_created",
      createdAt: new Date().toISOString(),
    };

    // Store order in Redis
    await connectRedis();
    await redis.hSet("orders", hash, JSON.stringify(payload));

    console.log(`✅ Order ${hash} created and stored in Redis`);

    // Trigger resolver to deploy escrows (async)
    fetch(`${process.env.APP_URL}/api/resolver/orders/${hash}/escrow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => console.error("Failed to trigger resolver:", err));

    return NextResponse.json({ success: true, hash });
  } catch (err) {
    console.error("Redis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

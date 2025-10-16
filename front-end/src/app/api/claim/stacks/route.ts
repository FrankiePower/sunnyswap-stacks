// app/api/claim/stacks/route.ts
import { NextResponse } from "next/server";
import { claimStacksSwap } from "@/lib/stacks-resolver";

export async function POST(req: Request) {
  try {
    const { sender, preimage, makerPrivateKey } = await req.json();

    if (!sender || !preimage || !makerPrivateKey) {
      return NextResponse.json(
        { error: "Missing required fields: sender, preimage, makerPrivateKey" },
        { status: 400 }
      );
    }

    console.log('[API] Claiming Stacks swap for maker...');

    const result = await claimStacksSwap({
      sender, // Resolver's Stacks address
      preimage, // The secret!
      privateKey: makerPrivateKey,
    });

    console.log('[API] Stacks claim successful:', result.txid);

    return NextResponse.json({
      success: true,
      txid: result.txid,
      message: 'Secret revealed! Resolver can now claim EVM escrow.',
    });

  } catch (err) {
    console.error("[API] Stacks claim error:", err);
    return NextResponse.json({
      error: "Claim failed",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

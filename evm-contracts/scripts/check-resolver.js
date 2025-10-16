const { ethers } = require("hardhat");

async function main() {
  const resolverPrivateKey = process.env.RESOLVER_PRIVATE_KEY;

  if (!resolverPrivateKey) {
    console.log("❌ RESOLVER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(resolverPrivateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log("===========================================");
  console.log("Resolver Wallet Check");
  console.log("===========================================");
  console.log("Address:", wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network:", (await provider.getNetwork()).name);
  console.log("Chain ID:", (await provider.getNetwork()).chainId);

  if (balance < ethers.parseEther("0.01")) {
    console.log("\n⚠️  WARNING: Low balance! Need at least 0.01 ETH for escrow creation");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com");
  } else {
    console.log("\n✅ Sufficient balance for testing");
  }
}

main().catch(console.error);

import { describe, it, before } from "node:test";
import assert from "node:assert";
import { randomBytes as cryptoRandomBytes } from "node:crypto";
import hre from "hardhat";
import { parseEther, formatEther, keccak256, toHex } from "viem";

/**
 * Integration Test: Full Atomic Swap Flow
 *
 * Tests the complete flow of creating and executing atomic swaps
 * between EVM and Stacks using the Resolver and Factory contracts
 */

const CREATION_FEE = parseEther("0.0001");
const SWAP_AMOUNT = parseEther("0.1");
const SAFETY_DEPOSIT = parseEther("0.01");

// Helper functions matching SDK
function generateSecret(): `0x${string}` {
  return toHex(cryptoRandomBytes(32));
}

function generateHashlock(secret: `0x${string}`): `0x${string}` {
  return keccak256(secret);
}

function generateOrderHash(
  srcChainId: number,
  dstChainId: number,
  maker: string,
  amount: bigint,
  timestamp: number
): `0x${string}` {
  const data = toHex(
    `${srcChainId}-${dstChainId}-${maker}-${amount.toString()}-${timestamp}`
  );
  return keccak256(data);
}

function addressToUint256(address: string): bigint {
  return BigInt(address);
}

function encodeTimelocks(params: {
  withdrawalPeriod: number;
  cancellationPeriod: number;
}): bigint {
  return (BigInt(params.withdrawalPeriod) << 128n) | BigInt(params.cancellationPeriod);
}

// Global test fixtures
let publicClient: any;
let owner: any;
let user: any;
let resolverBot: any;
let mockToken: any;
let factory: any;
let resolver: any;

describe("SunnySwap Integration Tests", () => {
  before(async () => {
    publicClient = await hre.viem.getPublicClient();
    [owner, user, resolverBot] = await hre.viem.getWalletClients();

    console.log("\nDeploying contracts...");
    console.log("Owner:", owner.account.address);
    console.log("User:", user.account.address);
    console.log("Resolver Bot:", resolverBot.account.address);

    // Deploy MockERC20
    mockToken = await hre.viem.deployContract("MockERC20", [
      "Test Token",
      "TEST"
    ]);
    console.log("MockERC20 deployed:", mockToken.address);

    // Deploy STXEscrowFactory
    factory = await hre.viem.deployContract("STXEscrowFactory", [
      mockToken.address,
      owner.account.address,
      86400n, // 24 hours rescue delay src
      86400n, // 24 hours rescue delay dst
      CREATION_FEE,
      owner.account.address, // treasury
      {
        minConfirmations: 1n,
        dustThreshold: 1000000n,
        maxAmount: 1000000000000n
      }
    ]);
    console.log("STXEscrowFactory deployed:", factory.address);

    // Deploy Resolver
    resolver = await hre.viem.deployContract("Resolver", [
      factory.address,
      resolverBot.account.address
    ]);
    console.log("Resolver deployed:", resolver.address);

    // Fund resolver bot with ETH
    await owner.sendTransaction({
      to: resolverBot.account.address,
      value: parseEther("10")
    });

    console.log("Setup complete!\n");
  });

  describe("Order Creation and Escrow Deployment", () => {
    it("should create a valid swap order", () => {
      const secret = generateSecret();
      const hashlock = generateHashlock(secret);

      console.log("Secret:", secret);
      console.log("Hashlock:", hashlock);

      assert.strictEqual(secret.length, 66); // 0x + 64 hex chars
      assert.strictEqual(hashlock.length, 66);
    });

    it("should deploy source escrow via Resolver", async () => {

      const secret = generateSecret();
      const hashlock = generateHashlock(secret);
      const timestamp = Math.floor(Date.now() / 1000);

      const orderHash = generateOrderHash(
        11155111, // Sepolia
        99998,    // Stacks Testnet
        user.account.address,
        SWAP_AMOUNT,
        timestamp
      );

      const timelocks = encodeTimelocks({
        withdrawalPeriod: 3600,   // 1 hour
        cancellationPeriod: 7200  // 2 hours
      });

      const immutables = {
        orderHash,
        hashlock,
        maker: addressToUint256(user.account.address),
        taker: addressToUint256(resolverBot.account.address),
        token: addressToUint256("0x0000000000000000000000000000000000000000"), // ETH
        amount: SWAP_AMOUNT,
        safetyDeposit: SAFETY_DEPOSIT,
        timelocks
      };

      const totalValue = SWAP_AMOUNT + SAFETY_DEPOSIT + CREATION_FEE;

      // Deploy source escrow via resolver
      const hash = await resolverBot.writeContract({
        address: resolver.address,
        abi: resolver.abi,
        functionName: "deploySrc",
        args: [immutables],
        value: totalValue
      });

      console.log("Source escrow deployed!");
      console.log("Transaction hash:", hash);

      // Check that escrow was created
      const escrowAddress = await factory.read.addressOfEscrowSrc([immutables]);
      console.log("Escrow address:", escrowAddress);

      assert.notStrictEqual(escrowAddress, "0x0000000000000000000000000000000000000000");
    });

    it("should deploy destination escrow via Resolver", async () => {
      const secret = generateSecret();
      const hashlock = generateHashlock(secret);
      const timestamp = Math.floor(Date.now() / 1000);

      const orderHash = generateOrderHash(
        99998,    // Stacks Testnet
        11155111, // Sepolia
        user.account.address,
        SWAP_AMOUNT,
        timestamp
      );

      const timelocks = encodeTimelocks({
        withdrawalPeriod: 3600,
        cancellationPeriod: 7200
      });

      const immutables = {
        orderHash,
        hashlock,
        maker: addressToUint256(user.account.address),
        taker: addressToUint256(resolverBot.account.address),
        token: addressToUint256("0x0000000000000000000000000000000000000000"),
        amount: SWAP_AMOUNT,
        safetyDeposit: SAFETY_DEPOSIT,
        timelocks
      };

      const totalValue = SWAP_AMOUNT + SAFETY_DEPOSIT + CREATION_FEE;

      // Deploy destination escrow via resolver
      const hash = await resolverBot.writeContract({
        address: resolver.address,
        abi: resolver.abi,
        functionName: "deployDst",
        args: [immutables],
        value: totalValue
      });

      console.log("Destination escrow deployed!");
      console.log("Transaction hash:", hash);

      // Check that escrow was created
      const escrowAddress = await factory.read.addressOfEscrowDst([immutables]);
      console.log("Escrow address:", escrowAddress);

      assert.notStrictEqual(escrowAddress, "0x0000000000000000000000000000000000000000");
    });
  });

  describe("Factory Configuration", () => {
    it("should return correct creation fee", async () => {
      const fee = await factory.read.creationFee();
      assert.strictEqual(fee, CREATION_FEE);
      console.log("Creation fee:", formatEther(fee), "ETH");
    });

    it("should return correct Stacks config", async () => {
      const config = await factory.read.stacksConfig();

      assert.strictEqual(config[0], 1n); // minConfirmations
      assert.strictEqual(config[1], 1000000n); // dustThreshold
      assert.strictEqual(config[2], 1000000000000n); // maxAmount

      console.log("Stacks config:", {
        minConfirmations: config[0].toString(),
        dustThreshold: config[1].toString() + " microSTX",
        maxAmount: config[2].toString() + " microSTX"
      });
    });

    it("should return implementation addresses", async () => {
      const srcImpl = await factory.read.srcImpl();
      const dstImpl = await factory.read.dstImpl();

      assert.notStrictEqual(srcImpl, "0x0000000000000000000000000000000000000000");
      assert.notStrictEqual(dstImpl, "0x0000000000000000000000000000000000000000");

      console.log("Source implementation:", srcImpl);
      console.log("Destination implementation:", dstImpl);
    });
  });

  describe("Resolver Ownership", () => {
    it("should have correct owner", async () => {
      const ownerAddress = await resolver.read.owner();
      assert.strictEqual(ownerAddress, resolverBot.account.address);
    });

    it("should allow owner to withdraw ETH", async () => {
      // Send some ETH to resolver
      await owner.sendTransaction({
        to: resolver.address,
        value: parseEther("1")
      });

      const balanceBefore = await publicClient.getBalance({
        address: resolverBot.account.address
      });

      // Withdraw as owner
      await resolverBot.writeContract({
        address: resolver.address,
        abi: resolver.abi,
        functionName: "withdrawETH",
        args: [resolverBot.account.address, parseEther("0.5")]
      });

      const balanceAfter = await publicClient.getBalance({
        address: resolverBot.account.address
      });

      assert(balanceAfter > balanceBefore);
      console.log("Withdrew 0.5 ETH successfully");
    });

    it("should not allow non-owner to deploy escrows", async () => {
      const immutables = {
        orderHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        hashlock: "0x0000000000000000000000000000000000000000000000000000000000000000",
        maker: addressToUint256(user.account.address),
        taker: addressToUint256(resolverBot.account.address),
        token: addressToUint256("0x0000000000000000000000000000000000000000"),
        amount: SWAP_AMOUNT,
        safetyDeposit: SAFETY_DEPOSIT,
        timelocks: 0n
      };

      await assert.rejects(
        user.writeContract({
          address: resolver.address,
          abi: resolver.abi,
          functionName: "deploySrc",
          args: [immutables],
          value: parseEther("1")
        }),
        /OwnableUnauthorizedAccount/
      );
    });
  });
});

import * as fs from "fs";
import * as path from "path";
import ethers from "ethers";

interface DeploymentConfig {
  accessTokenAddress?: string;
  owner?: string;
  rescueDelaySrc: number;
  rescueDelayDst: number;
  creationFee: string; // in ETH
  treasury?: string;
  stacksConfig: {
    minConfirmations: number;
    dustThreshold: number; // in microSTX
    maxAmount: number; // in microSTX
  };
}

interface DeploymentResult {
  network: string;
  chainId: number;
  contracts: {
    accessToken: string;
    stxEscrowFactory: string;
    stxEscrowSrcImplementation: string;
    stxEscrowDstImplementation: string;
  };
  config: DeploymentConfig;
  deployedAt: string;
  gasUsed: {
    accessToken: string;
    stxEscrowFactory: string;
    total: string;
  };
}

async function main() {
  console.log("🚀 Deploying STX Atomic Swap System");
  console.log("===================================");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`📡 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Load deployment configuration
  const config = loadDeploymentConfig();
  console.log(`⚙️  Configuration loaded`);

  let totalGasUsed = 0n;
  const gasUsed: any = {};

  // Deploy Access Token (if not provided)
  let accessTokenAddress = config.accessTokenAddress;
  if (!accessTokenAddress) {
    console.log("\n📝 Deploying Access Token...");
    const AccessToken = await ethers.getContractFactory("MockERC20");
    const accessToken = await AccessToken.deploy("Access Token", "ACCESS");
    await accessToken.waitForDeployment();

    const deployTx = accessToken.deploymentTransaction();
    const receipt = await deployTx?.wait();
    gasUsed.accessToken = receipt?.gasUsed?.toString() || "0";
    totalGasUsed += receipt?.gasUsed || 0n;

    accessTokenAddress = await accessToken.getAddress();
    console.log(`✅ Access Token deployed: ${accessTokenAddress}`);
  } else {
    console.log(`🔗 Using existing Access Token: ${accessTokenAddress}`);
    gasUsed.accessToken = "0";
  }

  // Deploy STX Escrow Factory
  console.log("\n🏭 Deploying STX Escrow Factory...");
  const STXEscrowFactory = await ethers.getContractFactory("STXEscrowFactory");

  const stacksConfigStruct = {
    minConfirmations: config.stacksConfig.minConfirmations,
    dustThreshold: config.stacksConfig.dustThreshold,
    maxAmount: config.stacksConfig.maxAmount
  };

  console.log("Constructor args:", {
    accessToken: accessTokenAddress,
    owner: config.owner || deployer.address,
    rescueDelaySrc: config.rescueDelaySrc,
    rescueDelayDst: config.rescueDelayDst,
    creationFee: config.creationFee,
    treasury: config.treasury || deployer.address,
    stacksConfig: stacksConfigStruct
  });

  const stxEscrowFactory = await STXEscrowFactory.deploy(
    accessTokenAddress,
    config.owner || deployer.address,
    config.rescueDelaySrc,
    config.rescueDelayDst,
    ethers.parseEther(config.creationFee),
    config.treasury || deployer.address,
    stacksConfigStruct
  );
  await stxEscrowFactory.waitForDeployment();

  const factoryDeployTx = stxEscrowFactory.deploymentTransaction();
  const factoryReceipt = await factoryDeployTx?.wait();
  gasUsed.stxEscrowFactory = factoryReceipt?.gasUsed?.toString() || "0";
  totalGasUsed += factoryReceipt?.gasUsed || 0n;

  const factoryAddress = await stxEscrowFactory.getAddress();
  console.log(`✅ STX Escrow Factory deployed: ${factoryAddress}`);

  // Get implementation addresses
  const srcImplementation = await stxEscrowFactory.STX_ESCROW_SRC_IMPLEMENTATION();
  const dstImplementation = await stxEscrowFactory.STX_ESCROW_DST_IMPLEMENTATION();

  console.log(`📋 Source Implementation: ${srcImplementation}`);
  console.log(`📋 Destination Implementation: ${dstImplementation}`);

  // Prepare deployment result
  gasUsed.total = totalGasUsed.toString();

  const deploymentResult: DeploymentResult = {
    network: network.name,
    chainId: Number(network.chainId),
    contracts: {
      accessToken: accessTokenAddress,
      stxEscrowFactory: factoryAddress,
      stxEscrowSrcImplementation: srcImplementation,
      stxEscrowDstImplementation: dstImplementation
    },
    config,
    deployedAt: new Date().toISOString(),
    gasUsed
  };

  // Save deployment info
  await saveDeploymentInfo(deploymentResult);

  // Display summary
  console.log("\n🎉 Deployment Complete!");
  console.log("========================");
  console.log(`🏭 STX Escrow Factory: ${factoryAddress}`);
  console.log(`🔑 Access Token: ${accessTokenAddress}`);
  console.log(`⛽ Total Gas Used: ${ethers.formatUnits(totalGasUsed, "gwei")} Gwei`);
  console.log(`💸 Creation Fee: ${config.creationFee} ETH`);
  console.log(`🏦 Treasury: ${config.treasury || deployer.address}`);

  console.log("\n🔗 Stacks Configuration:");
  console.log(`   Min Confirmations: ${config.stacksConfig.minConfirmations}`);
  console.log(`   Dust Threshold: ${config.stacksConfig.dustThreshold} microSTX`);
  console.log(`   Max Amount: ${config.stacksConfig.maxAmount} microSTX`);

  console.log("\n📁 Files saved:");
  console.log(`   deployments/stx-${network.name}-${network.chainId}.json`);
}

function loadDeploymentConfig(): DeploymentConfig {
  const configPath = path.join(__dirname, "../deploy-config-stx.json");

  let config: DeploymentConfig;

  if (fs.existsSync(configPath)) {
    console.log(`📋 Loading config from: ${configPath}`);
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    console.log(`📋 Using default configuration`);
    config = {
      rescueDelaySrc: 7 * 24 * 3600, // 7 days
      rescueDelayDst: 7 * 24 * 3600, // 7 days
      creationFee: "0.001", // 0.001 ETH
      stacksConfig: {
        minConfirmations: 1,
        dustThreshold: 1000000, // 1 STX in microSTX (dust limit)
        maxAmount: 1000000000000 // 1 million STX in microSTX
      }
    };

    // Save default config for future use
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Default config saved to: ${configPath}`);
  }

  return config;
}

async function saveDeploymentInfo(result: DeploymentResult): Promise<void> {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save detailed deployment info
  const detailedPath = path.join(deploymentsDir, `stx-${result.network}-${result.chainId}.json`);
  fs.writeFileSync(detailedPath, JSON.stringify(result, null, 2));

  // Save simple addresses file
  const addressesPath = path.join(deploymentsDir, `addresses-${result.network}.json`);
  const addresses = {
    network: result.network,
    chainId: result.chainId,
    ...result.contracts,
    deployedAt: result.deployedAt
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log(`💾 Deployment info saved to: ${detailedPath}`);
  console.log(`💾 Addresses saved to: ${addressesPath}`);
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

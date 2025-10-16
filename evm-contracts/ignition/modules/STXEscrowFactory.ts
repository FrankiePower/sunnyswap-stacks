import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

/**
 * Ignition module for deploying STXEscrowFactory and related contracts
 *
 * This module deploys:
 * 1. Mock ERC20 token for testing (ACCESS_TOKEN)
 * 2. STXEscrowFactory with default configuration
 *
 * Configuration:
 * - rescueDelaySrc: 24 hours (86400 seconds)
 * - rescueDelayDst: 24 hours (86400 seconds)
 * - creationFee: 0.0001 ETH
 * - stacksConfig: Default Stacks network parameters
 */
export default buildModule("STXEscrowFactoryModule", (m) => {
  // Configuration parameters
  const rescueDelaySrc = 86400; // 24 hours in seconds
  const rescueDelayDst = 86400; // 24 hours in seconds
  const creationFee = parseEther("0.0001"); // 0.0001 ETH

  // Owner will be the deployer by default
  const owner = m.getAccount(0);

  // Deploy mock ERC20 token for access control
  // In production, this would be a real token (e.g., governance token)
  const accessToken = m.contract("MockERC20", ["Access Token", "ACCESS"]);

  // Stacks configuration
  // These values match Stacks blockchain parameters
  const stacksConfig = {
    minConfirmations: 1n,                  // Minimum Stacks confirmations
    dustThreshold: 1000000n,               // 1 STX in microSTX (1 STX = 1,000,000 microSTX)
    maxAmount: 1000000000000n              // 1 million STX in microSTX
  };

  // Deploy STXEscrowFactory
  const factory = m.contract("STXEscrowFactory", [
    accessToken,                           // IERC20 accessToken
    owner,                                 // address owner
    rescueDelaySrc,                        // uint32 rescueDelaySrc
    rescueDelayDst,                        // uint32 rescueDelayDst
    creationFee,                           // uint256 _creationFee
    owner,                                 // address _treasury (same as owner for now)
    stacksConfig                           // StacksConfig _stacksConfig
  ]);

  // Return deployed contracts for access in tests/scripts
  return {
    factory,
    accessToken,
    owner
  };
});

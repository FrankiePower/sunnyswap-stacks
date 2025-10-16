import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import STXEscrowFactoryModule from "./STXEscrowFactory";

/**
 * Ignition module for deploying the Resolver contract
 *
 * This module deploys the Resolver contract which acts as the automated
 * market maker (AMM) for SunnySwap cross-chain swaps.
 *
 * The Resolver is owned by the resolver bot and used to:
 * - Deploy counter-escrows
 * - Claim tokens when secrets are revealed
 * - Refund tokens on timeouts
 */
export default buildModule("ResolverModule", (m) => {
  // Deploy STXEscrowFactory first (or reuse existing deployment)
  const { factory } = m.useModule(STXEscrowFactoryModule);

  // Owner will be the deployer (resolver bot operator)
  const owner = m.getAccount(0);

  // Deploy Resolver contract
  const resolver = m.contract("Resolver", [
    factory,      // address factoryAddress
    owner         // address initialOwner
  ]);

  // Return deployed contracts for access in tests/scripts
  return {
    resolver,
    factory,
    owner
  };
});

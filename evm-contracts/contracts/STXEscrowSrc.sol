// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AddressLib, Address } from "./libraries/AddressLib.sol";
import { Timelocks, TimelocksLib } from "./libraries/TimelocksLib.sol";

import { IBaseEscrow } from "./interfaces/IBaseEscrow.sol";
import { BaseEscrow } from "./BaseEscrow.sol";
import { Escrow } from "./Escrow.sol";

/**
 * @title STX Source Escrow for EVM→Stacks atomic swaps
 * @notice Escrow contract for EVM→STX swaps - holds ERC20/ETH, releases when taker provides secret
 * @dev Used when EVM tokens are the source and Stacks is the destination
 * @custom:security-contact security@sunnyswap.io
 */
contract STXEscrowSrc is Escrow {
    using SafeERC20 for IERC20;
    using AddressLib for Address;
    using TimelocksLib for Timelocks;

    /// @notice Stacks address where funds should be sent
    mapping(bytes32 => string) public stacksAddresses;
    
    /// @notice Stacks transaction hash for verification (optional)
    mapping(bytes32 => string) public stacksTxHashes;

    event StacksAddressRecorded(bytes32 indexed hashlock, string stxAddress);
    event StacksTxHashRecorded(bytes32 indexed hashlock, string stxTxHash);

    constructor(uint32 rescueDelay, IERC20 accessToken) BaseEscrow(rescueDelay, accessToken) {}

    // Allow contract to receive ETH
    receive() external payable {}

    /**
     * @notice Private withdrawal by taker using secret
     * @dev Taker reveals secret to claim EVM tokens after providing Stacks to maker
     * @param secret The secret that matches the hashlock
     * @param immutables The escrow immutables
     */
    function withdraw(bytes32 secret, Immutables calldata immutables)
        external
        override
        onlyValidImmutables(immutables)
        onlyValidSecret(secret, immutables)
        onlyAfter(immutables.timelocks.get(TimelocksLib.Stage.DstWithdrawal))
        onlyBefore(immutables.timelocks.get(TimelocksLib.Stage.DstCancellation))
    {
        // Allow both maker and taker to withdraw in private period
        if (msg.sender != immutables.maker.get() && msg.sender != immutables.taker.get()) {
            revert InvalidCaller();
        }

        _withdraw(secret, immutables);
    }

    /**
     * @notice Public withdrawal by anyone with access token
     * @dev Anyone with access token can trigger withdrawal in public period
     * @param secret The secret that matches the hashlock
     * @param immutables The escrow immutables
     */
    function publicWithdraw(bytes32 secret, Immutables calldata immutables)
        external
        onlyAccessTokenHolder()
        onlyValidImmutables(immutables)
        onlyValidSecret(secret, immutables)
        onlyAfter(immutables.timelocks.get(TimelocksLib.Stage.DstPublicWithdrawal))
        onlyBefore(immutables.timelocks.get(TimelocksLib.Stage.DstCancellation))
    {
        _withdraw(secret, immutables);
    }

    /**
     * @notice Cancels escrow and returns funds to maker
     * @dev Can only be called after cancellation period starts
     * @param immutables The escrow immutables
     */
    function cancel(Immutables calldata immutables)
        external
        override
        onlyMaker(immutables)
        onlyValidImmutables(immutables)
        onlyAfter(immutables.timelocks.get(TimelocksLib.Stage.DstCancellation))
    {
        // Return tokens to maker
        _uniTransfer(immutables.token.get(), immutables.maker.get(), immutables.amount);
        // Return safety deposit to maker
        _ethTransfer(immutables.maker.get(), immutables.safetyDeposit);
        
        emit EscrowCancelled();
    }

    /**
     * @notice Records Stacks address for the swap
     * @dev Links Stacks address to escrow for verification
     * @param hashlock The escrow hashlock
     * @param stxAddress The Stacks address where funds should be sent
     * @param immutables The escrow immutables
     */
    function recordStacksAddress(
        bytes32 hashlock,
        string calldata stxAddress,
        Immutables calldata immutables
    )
        external
        onlyValidImmutables(immutables)
    {
        // Only maker can record Stacks address
        if (msg.sender != immutables.maker.get()) {
            revert InvalidCaller();
        }

        stacksAddresses[hashlock] = stxAddress;
        emit StacksAddressRecorded(hashlock, stxAddress);
    }

    /**
     * @notice Records Stacks transaction hash for verification
     * @dev Optional function to link Stacks transaction to escrow
     * @param hashlock The escrow hashlock
     * @param stxTxHash The Stacks transaction hash
     * @param immutables The escrow immutables
     */
    function recordStacksTx(
        bytes32 hashlock,
        string calldata stxTxHash,
        Immutables calldata immutables
    )
        external
        onlyValidImmutables(immutables)
    {
        // Only taker can record Stacks tx (proof of payment)
        if (msg.sender != immutables.taker.get()) {
            revert InvalidCaller();
        }

        stacksTxHashes[hashlock] = stxTxHash;
        emit StacksTxHashRecorded(hashlock, stxTxHash);
    }

    /**
     * @notice Gets recorded Stacks address
     * @param hashlock The escrow hashlock
     * @return The Stacks address
     */
    function getStacksAddress(bytes32 hashlock) external view returns (string memory) {
        return stacksAddresses[hashlock];
    }

    /**
     * @notice Gets recorded Stacks transaction hash
     * @param hashlock The escrow hashlock
     * @return The Stacks transaction hash
     */
    function getStacksTxHash(bytes32 hashlock) external view returns (string memory) {
        return stacksTxHashes[hashlock];
    }

    /**
     * @dev Internal withdrawal logic
     * @param secret The secret that unlocks the escrow
     * @param immutables The escrow immutables
     */
    function _withdraw(bytes32 secret, Immutables calldata immutables) internal {
        // Transfer tokens to taker
        _uniTransfer(immutables.token.get(), immutables.taker.get(), immutables.amount);
        
        // Return safety deposit to maker
        _ethTransfer(immutables.maker.get(), immutables.safetyDeposit);
        
        emit EscrowWithdrawal(secret);
    }
} 
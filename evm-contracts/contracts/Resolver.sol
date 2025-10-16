// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IEscrowFactory} from "./interfaces/IEscrowFactory.sol";
import {ISTXEscrowFactory} from "./interfaces/ISTXEscrowFactory.sol";
import {IBaseEscrow} from "./interfaces/IBaseEscrow.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {TimelocksLib, Timelocks} from "./libraries/TimelocksLib.sol";
import {ImmutablesLib} from "./libraries/ImmutablesLib.sol";
import {Address} from "./libraries/AddressLib.sol";

/**
 * @title Resolver contract for SunnySwap cross-chain swaps
 * @notice This contract acts as the automated market maker for STX ↔ EVM swaps
 * @dev The resolver bot owns this contract and uses it to:
 *      - Deploy counter-escrows
 *      - Claim tokens when secrets are revealed
 *      - Refund tokens on timeouts
 *
 * @custom:security-contact your@email.com
 */
contract Resolver is Ownable {
    using ImmutablesLib for IBaseEscrow.Immutables;
    using TimelocksLib for Timelocks;

    error InvalidLength();
    error LengthMismatch();
    error InsufficientValue();

    ISTXEscrowFactory private immutable _FACTORY;

    /**
     * @notice Emitted when a source escrow is deployed by the resolver
     * @param escrow Address of the deployed escrow
     * @param orderHash Unique identifier for the swap order
     * @param hashlock SHA256 hash of the secret
     */
    event SrcEscrowDeployed(
        address indexed escrow,
        bytes32 indexed orderHash,
        bytes32 hashlock
    );

    /**
     * @notice Emitted when a destination escrow is deployed by the resolver
     * @param escrow Address of the deployed escrow
     * @param orderHash Unique identifier for the swap order
     * @param hashlock SHA256 hash of the secret
     */
    event DstEscrowDeployed(
        address indexed escrow,
        bytes32 indexed orderHash,
        bytes32 hashlock
    );

    /**
     * @notice Emitted when resolver withdraws from an escrow
     * @param escrow Address of the escrow
     * @param secret The revealed preimage
     */
    event ResolverWithdraw(address indexed escrow, bytes32 secret);

    /**
     * @notice Emitted when resolver cancels an escrow
     * @param escrow Address of the escrow
     */
    event ResolverCancel(address indexed escrow);

    /**
     * @notice Creates a new Resolver contract
     * @param factoryAddress Address of the STXEscrowFactory
     * @param initialOwner Address that will own this contract (resolver bot)
     */
    constructor(address factoryAddress, address initialOwner) Ownable(initialOwner) {
        _FACTORY = ISTXEscrowFactory(factoryAddress);
    }

    /**
     * @notice Allows contract to receive ETH
     */
    receive() external payable {} // solhint-disable-line no-empty-blocks

    /**
     * @notice Deploy a source escrow (EVM → STX direction)
     * @dev Called by resolver bot when user initiates EVM → STX swap
     * @param immutables The escrow immutable parameters
     * @return escrow Address of the deployed escrow
     */
    function deploySrc(
        IBaseEscrow.Immutables calldata immutables
    ) external payable onlyOwner returns (address escrow) {
        // Note: Caller must ensure msg.value covers amount + safety deposit + creation fee
        // The factory will validate the fee payment

        // Set deployedAt timestamp
        IBaseEscrow.Immutables memory immutablesMem = immutables;
        immutablesMem.timelocks = TimelocksLib.setDeployedAt(immutables.timelocks, block.timestamp);

        // Calculate escrow address before deployment
        escrow = _FACTORY.addressOfEscrowSrc(immutablesMem);

        // Create the source escrow
        _FACTORY.createSrcEscrow{value: msg.value}(immutablesMem);

        emit SrcEscrowDeployed(escrow, immutables.orderHash, immutables.hashlock);
    }

    /**
     * @notice Deploy a destination escrow (STX → EVM direction)
     * @dev Called by resolver bot after detecting STX-side lock
     * @param dstImmutables The destination escrow immutable parameters
     * @return escrow Address of the deployed escrow
     */
    function deployDst(
        IBaseEscrow.Immutables calldata dstImmutables
    ) external payable onlyOwner returns (address escrow) {
        // Calculate escrow address before deployment
        escrow = _FACTORY.addressOfEscrowDst(dstImmutables);

        // Create the destination escrow
        _FACTORY.createDstEscrow{value: msg.value}(dstImmutables);

        emit DstEscrowDeployed(escrow, dstImmutables.orderHash, dstImmutables.hashlock);
    }

    /**
     * @notice Withdraw tokens from an escrow using the secret
     * @dev Called by resolver bot after secret is revealed
     * @param escrow Address of the escrow to withdraw from
     * @param secret The revealed preimage (must hash to hashlock)
     * @param immutables The escrow immutable parameters (for validation)
     */
    function withdraw(
        IEscrow escrow,
        bytes32 secret,
        IBaseEscrow.Immutables calldata immutables
    ) external onlyOwner {
        escrow.withdraw(secret, immutables);
        emit ResolverWithdraw(address(escrow), secret);
    }

    /**
     * @notice Cancel an escrow and refund tokens
     * @dev Called by resolver bot after timeout expires
     * @param escrow Address of the escrow to cancel
     * @param immutables The escrow immutable parameters (for validation)
     */
    function cancel(
        IEscrow escrow,
        IBaseEscrow.Immutables calldata immutables
    ) external onlyOwner {
        escrow.cancel(immutables);
        emit ResolverCancel(address(escrow));
    }

    /**
     * @notice Execute arbitrary calls (for advanced operations)
     * @dev Allows owner to call any contract with any data
     * @param targets Array of contract addresses to call
     * @param arguments Array of calldata for each target
     */
    function arbitraryCalls(
        address[] calldata targets,
        bytes[] calldata arguments
    ) external onlyOwner {
        uint256 length = targets.length;
        if (targets.length != arguments.length) revert LengthMismatch();

        for (uint256 i = 0; i < length; ++i) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, bytes memory returnData) = targets[i].call(arguments[i]);
            if (!success) {
                // Forward revert reason
                if (returnData.length > 0) {
                    assembly {
                        let returnDataSize := mload(returnData)
                        revert(add(32, returnData), returnDataSize)
                    }
                } else {
                    revert("Arbitrary call failed");
                }
            }
        }
    }

    /**
     * @notice Withdraw ETH from the contract
     * @dev Allows owner to withdraw any accumulated ETH
     * @param to Address to send ETH to
     * @param amount Amount of ETH to withdraw
     */
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @notice Get the factory address
     * @return Address of the STXEscrowFactory
     */
    function getFactory() external view returns (address) {
        return address(_FACTORY);
    }
}

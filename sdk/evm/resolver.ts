import { Interface, TransactionRequest } from 'ethers'

/**
 * Resolver SDK for SunnySwap
 *
 * Simplified version without 1inch Limit Order Protocol dependency
 * Works directly with STXEscrowFactory
 */

export interface Immutables {
    orderHash: string
    hashlock: string
    maker: string
    taker: string
    token: string
    amount: bigint
    safetyDeposit: bigint
    timelocks: bigint
}

export class Resolver {
    private readonly iface: Interface

    constructor(
        public readonly address: string,
        abi: any[]
    ) {
        this.iface = new Interface(abi)
    }

    /**
     * Deploy a source escrow (EVM → STX direction)
     * @param immutables Escrow parameters
     * @param value ETH value to send (amount + safetyDeposit + creationFee)
     */
    public deploySrc(
        immutables: Immutables,
        value: bigint
    ): TransactionRequest {
        return {
            to: this.address,
            data: this.iface.encodeFunctionData('deploySrc', [immutables]),
            value: value
        }
    }

    /**
     * Deploy a destination escrow (STX → EVM direction)
     * @param immutables Escrow parameters
     * @param value ETH value to send (amount + safetyDeposit + creationFee)
     */
    public deployDst(
        immutables: Immutables,
        value: bigint
    ): TransactionRequest {
        return {
            to: this.address,
            data: this.iface.encodeFunctionData('deployDst', [immutables]),
            value: value
        }
    }

    /**
     * Withdraw from an escrow using the secret
     * @param escrowAddress Address of the escrow contract
     * @param secret The preimage (32 bytes)
     * @param immutables Escrow parameters for validation
     */
    public withdraw(
        escrowAddress: string,
        secret: string,
        immutables: Immutables
    ): TransactionRequest {
        return {
            to: this.address,
            data: this.iface.encodeFunctionData('withdraw', [
                escrowAddress,
                secret,
                immutables
            ])
        }
    }

    /**
     * Cancel an escrow and refund tokens
     * @param escrowAddress Address of the escrow contract
     * @param immutables Escrow parameters for validation
     */
    public cancel(
        escrowAddress: string,
        immutables: Immutables
    ): TransactionRequest {
        return {
            to: this.address,
            data: this.iface.encodeFunctionData('cancel', [
                escrowAddress,
                immutables
            ])
        }
    }

    /**
     * Execute arbitrary calls (admin function)
     * @param targets Array of target addresses
     * @param calldata Array of calldata for each target
     */
    public arbitraryCalls(
        targets: string[],
        calldata: string[]
    ): TransactionRequest {
        return {
            to: this.address,
            data: this.iface.encodeFunctionData('arbitraryCalls', [
                targets,
                calldata
            ])
        }
    }
}

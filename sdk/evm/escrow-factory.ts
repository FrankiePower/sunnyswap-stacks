import { id, Interface, JsonRpcProvider } from 'ethers'

/**
 * STXEscrowFactory SDK for SunnySwap
 */

export interface StacksConfig {
    minConfirmations: bigint
    dustThreshold: bigint
    maxAmount: bigint
}

export class EscrowFactory {
    private iface: Interface

    constructor(
        private readonly provider: JsonRpcProvider,
        private readonly address: string,
        abi: any[]
    ) {
        this.iface = new Interface(abi)
    }

    /**
     * Get the source escrow implementation address
     */
    public async getSourceImpl(): Promise<string> {
        const result = await this.provider.call({
            to: this.address,
            data: id('STX_ESCROW_SRC_IMPLEMENTATION()').slice(0, 10)
        })
        return '0x' + result.slice(-40)
    }

    /**
     * Get the destination escrow implementation address
     */
    public async getDestinationImpl(): Promise<string> {
        const result = await this.provider.call({
            to: this.address,
            data: id('STX_ESCROW_DST_IMPLEMENTATION()').slice(0, 10)
        })
        return '0x' + result.slice(-40)
    }

    /**
     * Get the creation fee
     */
    public async getCreationFee(): Promise<bigint> {
        const result = await this.provider.call({
            to: this.address,
            data: id('creationFee()').slice(0, 10)
        })
        return BigInt(result)
    }

    /**
     * Get the Stacks configuration
     */
    public async getStacksConfig(): Promise<StacksConfig> {
        const result = await this.provider.call({
            to: this.address,
            data: id('stacksConfig()').slice(0, 10)
        })

        // Decode the tuple (uint256, uint256, uint256)
        const minConfirmations = BigInt('0x' + result.slice(2, 66))
        const dustThreshold = BigInt('0x' + result.slice(66, 130))
        const maxAmount = BigInt('0x' + result.slice(130, 194))

        return {
            minConfirmations,
            dustThreshold,
            maxAmount
        }
    }

    /**
     * Get SrcEscrowCreated event from a block
     * @param blockNumber The block number to search
     * @param retries Number of retry attempts
     * @param delayMs Delay between retries in milliseconds
     */
    public async getSrcDeployEvent(
        blockNumber: number,
        retries = 10,
        delayMs = 5000
    ): Promise<{
        escrow: string
        hashlock: string
        maker: string
        creator: string
    }> {
        const event = this.iface.getEvent('SrcEscrowCreated')!

        for (let i = 0; i < retries; i++) {
            try {
                const logs = await this.provider.getLogs({
                    fromBlock: blockNumber,
                    toBlock: blockNumber,
                    address: this.address,
                    topics: [event.topicHash]
                })

                if (logs.length === 0) throw new Error('No logs found')

                const [data] = logs.map((l) => this.iface.decodeEventLog(event, l.data, l.topics))

                return {
                    escrow: data.escrow,
                    hashlock: data.hashlock,
                    maker: data.maker,
                    creator: data.creator
                }
            } catch (err) {
                console.warn(`Attempt ${i + 1}/${retries} to getSrcDeployEvent failed:`, err)
                if (i < retries - 1) {
                    await new Promise((res) => setTimeout(res, delayMs))
                } else {
                    throw new Error(`getSrcDeployEvent failed after ${retries} attempts: ${err}`)
                }
            }
        }

        throw new Error('Unexpected retry logic flow')
    }

    /**
     * Get DstEscrowCreated event from a block
     * @param blockNumber The block number to search
     * @param retries Number of retry attempts
     * @param delayMs Delay between retries in milliseconds
     */
    public async getDstDeployEvent(
        blockNumber: number,
        retries = 10,
        delayMs = 5000
    ): Promise<{
        escrow: string
        hashlock: string
        taker: string
        creator: string
    }> {
        const event = this.iface.getEvent('DstEscrowCreated')!

        for (let i = 0; i < retries; i++) {
            try {
                const logs = await this.provider.getLogs({
                    fromBlock: blockNumber,
                    toBlock: blockNumber,
                    address: this.address,
                    topics: [event.topicHash]
                })

                if (logs.length === 0) throw new Error('No logs found')

                const [data] = logs.map((l) => this.iface.decodeEventLog(event, l.data, l.topics))

                return {
                    escrow: data.escrow,
                    hashlock: data.hashlock,
                    taker: data.taker,
                    creator: data.creator
                }
            } catch (err) {
                console.warn(`Attempt ${i + 1}/${retries} attempts to getDstDeployEvent failed:`, err)
                if (i < retries - 1) {
                    await new Promise((res) => setTimeout(res, delayMs))
                } else {
                    throw new Error(`getDstDeployEvent failed after ${retries} attempts: ${err}`)
                }
            }
        }

        throw new Error('Unexpected retry logic flow')
    }
}

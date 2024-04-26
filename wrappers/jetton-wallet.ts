import { TupleBuilder, Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, ADNLAddress } from '@ton/core';

export type walletConfig = {
    owner_address: Address;
    jetton_master_address: Address;
};

export function walletConfigToCell(config: walletConfig): Cell {
    return beginCell()
        .storeUint(0, 4)
        .storeCoins(0)
        .storeAddress(config.owner_address)
        .storeAddress(config.jetton_master_address)
    .endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
};

export class Wallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Wallet(address);
    }

    static createFromConfig(config: walletConfig, code: Cell, workchain = 0) {
        const data = walletConfigToCell(config);
        const init = { code, data };
        return new Wallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    
    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async getJettonData(provider: ContractProvider): Promise<[bigint, Address, Address, Cell]> {
        const { stack } = await provider.get('get_wallet_data', [])
        return [
            stack.readBigNumber(),  // balance
            stack.readAddress(),    // owner_address
            stack.readAddress(),    // jetton_master
            stack.readCell()        // wallet_code
        ]
    }

    async getStatus(provider: ContractProvider) {
        const result = await provider.get('get_status', []);
        return result.stack.readNumber();
    }

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState()
        return state.balance
    }
}

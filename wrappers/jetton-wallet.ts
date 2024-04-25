import { TupleBuilder, Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type walletConfig = {
    total_supply: bigint;
    admin_address: Address;
    next_admin_address: Address;
    jetton_wallet_code: Cell;
    metadata_url: Cell;
};

export function walletConfigToCell(config: walletConfig): Cell {
    return beginCell()
        .storeCoins(config.total_supply)
        .storeAddress(config.admin_address)
        .storeAddress(config.next_admin_address)
        .storeRef(config.jetton_wallet_code)
        .storeRef(config.metadata_url)
    .endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
};

export class Wallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new wallet(address);
    }

    static createFromConfig(config: walletConfig, code: Cell, workchain = 0) {
        const data = walletConfigToCell(config);
        const init = { code, data };
        return new wallet(contractAddress(workchain, init), init);
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

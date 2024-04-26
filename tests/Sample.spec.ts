import { Blockchain, SandboxContract, TreasuryContract ,   printTransactionFees,
    prettyLogTransactions,} from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { Minter } from '../wrappers/jetton-minter';
import { Wallet } from '../wrappers/jetton-wallet';

import '@ton/test-utils';
import { compile } from '@ton/blueprint';


import { buildOnchainMetadata } from "../scripts/jetton-helpers";
const jettonParams = {
    name: "test USDT",
    description: "This is description for test USDT",
    symbol: "testUSDT",
    image: "https://i.ibb.co/J3rk47X/USDT-ocean.webp"
};
let jetton_content_metadata = buildOnchainMetadata(jettonParams);

describe('Sample', () => {
    let code: Cell;

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let treasury: SandboxContract<TreasuryContract>;
    let minter: SandboxContract<Minter>;
    let jettonWallet_deployer: SandboxContract<Wallet>;

    beforeAll(async () => {
        code = await compile('jetton-minter');
    });


    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        treasury = await blockchain.treasury('treasury');
        minter = blockchain.openContract(
            Minter.createFromConfig(
                {
                    total_supply: 0n,
                    admin_address: deployer.address!!,
                    next_admin_address: treasury.address!!,
                    jetton_wallet_code:  await compile("jetton-wallet"),
                    metadata_url: jetton_content_metadata
                },
                code
            )
        );

        jettonWallet_deployer = blockchain.openContract(
            Wallet.createFromConfig(
                { owner_address: deployer.address, jetton_master_address: minter.address },
                await compile("jetton-wallet")
            )
        );

        let master_msg = beginCell()
                            .storeUint(395134233, 32) // opCode: TokenTransferInternal / 0x178d4519
                            .storeUint(0, 32) // query_id
                            .storeCoins(toNano('1000000')) // jetton_amount
                            .storeAddress(minter.address) // from_address
                            .storeAddress(deployer.address) // response_address
                            .storeCoins(0) // forward_ton_amount
                            .storeUint(0, 1) // whether forward_payload or not
                        .endCell();

        const deployResult = await minter.sendMint(deployer.getSender(), { // 0x642b7d07
            value: toNano('20'),
            queryID: 10,
            toAddress: treasury.address,
            tonAmount: toNano('0.4'),
            master_msg: master_msg
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: minter.address,
            deploy: true,
            success: true,
        });

        printTransactionFees(deployResult.transactions);
        prettyLogTransactions(deployResult.transactions);
    
    });


    it('should deploy', async () => {
        console.log("Deployer Address: " + deployer.address);
        console.log("Minter Address: " + minter.address);


        let balanceDeployer = await jettonWallet_deployer.getBalance();
        console.log("Balance: " + balanceDeployer);
    });

    // it('should increase counter', async () => {
    //     const increaseTimes = 3;
    //     for (let i = 0; i < increaseTimes; i++) {
    //         console.log(`increase ${i + 1}/${increaseTimes}`);

    //         const increaser = await blockchain.treasury('increaser' + i);

    //         const counterBefore = await sample.getCounter();

    //         console.log('counter before increasing', counterBefore);

    //         const increaseBy = Math.floor(Math.random() * 100);

    //         console.log('increasing by', increaseBy);

    //         const increaseResult = await sample.sendIncrease(increaser.getSender(), {
    //             increaseBy,
    //             value: toNano('0.05'),
    //         });

    //         expect(increaseResult.transactions).toHaveTransaction({
    //             from: increaser.address,
    //             to: sample.address,
    //             success: true,
    //         });

    //         const counterAfter = await sample.getCounter();

    //         console.log('counter after increasing', counterAfter);

    //         expect(counterAfter).toBe(counterBefore + increaseBy);
    //     }
    // });
});

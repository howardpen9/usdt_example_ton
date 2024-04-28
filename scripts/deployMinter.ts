import { Address, beginCell, toNano } from '@ton/core';
import { Minter } from '../wrappers/jetton-minter';
import { Wallet } from '../wrappers/jetton-wallet';
import { compile, NetworkProvider } from '@ton/blueprint';

import { buildOnchainMetadata } from "./jetton-helpers";

export async function run(provider: NetworkProvider) {

    let nextAdminAddress = Address.parse("EQD8TJ8xEWB1SpnRE4d89YO3jl0W0EiBnNS4IBaHaUmdfizE");
    // let toAddress = Address.parse("EQD8TJ8xEWB1SpnRE4d89YO3jl0W0EiBnNS4IBaHaUmdfizE");

    const jettonParams = {
        name: "test USDT",
        description: "This is description for test USDT",
        symbol: "testUSDT",
        image: "https://i.ibb.co/J3rk47X/USDT-ocean.webp"
    };

    // Create content Cell
    let jetton_content_metadata = buildOnchainMetadata(jettonParams);

    const minter = provider.open(
        Minter.createFromConfig(
            {
                total_supply: 0n,
                admin_address: provider.sender().address!!,
                next_admin_address: nextAdminAddress,
                jetton_wallet_code: await compile("jetton-wallet"),
                metadata_url: jetton_content_metadata,
            },
            await compile('jetton-minter')
        )
    );

    let master_msg = beginCell()
            .storeUint(395134233, 32)           // opCode: TokenTransferInternal
            .storeUint(3333, 64)                // query_id
            .storeCoins(toNano('1000000'))      // jetton_amount
            .storeAddress(nextAdminAddress)     // from_address
            .storeAddress(null)                 // response_address
            .storeCoins(0)                      // forward_ton_amount
            .storeUint(0, 1)                    // whether forward_payload or not
        .endCell();


    // await minter.sendDeploy(provider.sender(), toNano('0.05'));
    await minter.sendMint(provider.sender(), {
        value: toNano('1.5'),
        queryID: 10,
        toAddress: provider.sender().address!!, // the address that receive the new minting JettonToken
        tonAmount: toNano('0.4'),
        master_msg: master_msg
    } )


    await provider.waitForDeploy(minter.address);
    let dd = await minter.getJettonData();
    console.log('ID:: US', dd);
}

import { toNano } from '@ton/core';
import { Sample } from '../wrappers/Sample';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const sample = provider.open(
        Sample.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Sample')
        )
    );

    await sample.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(sample.address);

    console.log('ID', await sample.getID());
}

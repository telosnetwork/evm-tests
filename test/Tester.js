require("dotenv").config();

const { expect } = require("chai");
const hre = require("hardhat");

describe("Token contract", function () {
    let testerInstance;
    beforeEach(async () => {
        const Reverter = await hre.ethers.getContractFactory("Reverter");
        const reverter = await Reverter.deploy();
        console.log(`Deployed Reverter to ${reverter.address}`);

        const Tester = await hre.ethers.getContractFactory("Tester");
        testerInstance = await Tester.deploy(reverter.address);
        console.log(`Deployed Tester to ${testerInstance.address}`);
    })
    describe(":: Test", function () {
        it("Should revert call and have status in internal transaction", async function () {
            let reverted = false;
            let trxResponse;
            let trxHash;
            // TODO: The sendRawTransaction response (or at least the `.testCallRevert` function below) on Telos EVM will throw an exception, the response from sepolia will not, we need to figure out why and behave like Ethereum
            try {
                trxResponse = await testerInstance.testCallRevert({gasLimit: 80000});
                trxHash = trxResponse.hash
            } catch (e) {
                // console.dir(e)
                reverted = true;
                trxHash = e.data.txHash
            }
            // console.log(`Trxhash: ${trxHash}`)

            expect(reverted, "Transaction should have reverted");

            const traceTransactionResponse = await hre.ethers.provider.send('trace_transaction', [trxHash]);
            // console.dir(traceTransactionResponse);
            expect(traceTransactionResponse.length)
                .to.equal(2, "Should have 2 traces, one for the root trx and one for the reverted internal call");

            // TODO: check the revert message if included in ethereum response, otherwise just compare the call output which should decode to the revert message
            //  basically just compare trace_transaction JSON RPC response from Telos EVM to an ethereum archive node response

            // TODO: put correct value here for status
            expect(traceTransactionResponse[1].status)
                .to.equal("0x0", "Second trace should represent the revert with status === 0")

        });

        it("Should transfer value via internal function", async function() {
            const valueToSend = hre.ethers.utils.parseEther("0.000001");
            const trxResponse = await testerInstance.testValueTransfer({value: valueToSend});
            const traceTransactionResponse = await hre.ethers.provider.send('trace_transaction', [trxResponse.hash]);
            console.log(`Test transaction hash: ${trxResponse.hash}`)
            console.dir(traceTransactionResponse);
            expect(traceTransactionResponse.length)
                .to.equal(2, "Should have 2 traces, one for the root trx and one for the internal value transfer");
            // TODO: assert value transfer in 2nd trace with correct value/from/to
            const transferCallAction = traceTransactionResponse[1].action;
            expect(transferCallAction.from).to.equal(testerInstance.address, "call transfer should be from contractAddress");
            expect(transferCallAction.to).to.equal(trxResponse.from, "call transfer should be to sender");
            expect(transferCallAction.value).to.equal(valueToSend.toHexString(), "call transfer value should be same as the value sent to contract");
        })
    });
});

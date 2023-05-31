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
        xit("Should revert call and have status in internal transaction", async function () {
            let reverted = false;
            let trxResponse;
            try {
                trxResponse = await testerInstance.testCallRevert();
            } catch (e) {
                reverted = true;
            }

            // TODO: check the revert message if possible, compare JSON RPC response from Telos EVM to an ethereum archive node response
            expect(reverted, "Transaction should have reverted");

            const traceTransactionResponse = await hre.ethers.provider.send('trace_transaction', [trxResponse.hash]);
            expect(traceTransactionResponse.length)
                .to.equal(2, "Should have 2 traces, one for the root trx and one for the reverted internal call");

            // TODO: put correct value here for status
            expect(traceTransactionResponse[2].status)
                .to.equal("0x0", "Second trace should represent the revert with status === 0")

        });

        it("Should transfer value via internal function", async function() {
            const oneTlos = hre.ethers.utils.parseEther("1.0");
            const trxResponse = await testerInstance.testValueTransfer({value: oneTlos});
            const traceTransactionResponse = await hre.ethers.provider.send('trace_transaction', [trxResponse.hash]);
            expect(traceTransactionResponse.length)
                .to.equal(2, "Should have 2 traces, one for the root trx and one for the internal value transfer");
            // TODO: assert value transfer in 2nd trace with correct value/from/to
            const transferCallAction = traceTransactionResponse[1].action;
            expect(transferCallAction.from).to.equal(testerInstance.address, "call transfer should be from contractAddress");
            expect(transferCallAction.to).to.equal(trxResponse.from, "call transfer should be to sender");
            expect(transferCallAction.value).to.equal('0xde0b6b3a7640000', "call transfer value should be 1 TLOS in hex");
        })
    });
});

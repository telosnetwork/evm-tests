require("dotenv").config();

const { expect } = require("chai");
const hre = require("hardhat");

describe("Websocket testing", function () {
    let emitterInstance;
    before(async () => {
      if(typeof hre.network.config.wsUrl === 'undefined' || hre.network.config.wsUrl === null){
         throw Error('Websocket not configured. Define the wsUrl properties in hardhat.config.js to enable websocket tests.');
      }
    })
    beforeEach(async () => {
        const Emitter = await hre.ethers.getContractFactory("Emitter");
        emitterInstance = await Emitter.deploy();
        console.log(`Deployed Emitter to ${emitterInstance.address}`);
    })
    describe(":: Test", function () {
        it("Should get 2 logs from websocket subscription", async function () {
            const wsProvider = new hre.ethers.providers.WebSocketProvider(hre.network.config.wsUrl);
            const wsContract = emitterInstance.connect(wsProvider);

            let lastBlockNumber = 0;
            await new Promise(resolve => {
                wsProvider.on('block', (blockNumber) => {
                    console.log("Got block number from subscription: " + blockNumber);
                    if (lastBlockNumber !== 0) {
                        resolve();
                        wsProvider.off('block');
                    }

                    lastBlockNumber = blockNumber;
                })
            })
            expect(lastBlockNumber).not.to.equal(0, "Block number should be updated via newHeads subscription");
            let blockNumberAfterUnsubscribe = lastBlockNumber;

            let firstEventValue;
            let secondEventValue;
            wsContract.on(wsContract.filters.First(null), (value, event) => {
                expect(event.logIndex).to.equal(0, "First event should have logIndex of 0");
                firstEventValue = parseInt(event.data, 16);
            })

            wsContract.on(wsContract.filters.Second(null), (value, event) => {
                expect(event.logIndex).to.equal(1, "Second event should have logIndex of 1");
                secondEventValue = parseInt(event.data, 16);
            })

            await emitterInstance.emitTwoEvents()
            console.log("Sent transaction, waiting for events");
            await new Promise(resolve => setTimeout(resolve, 2000));

            expect(blockNumberAfterUnsubscribe).to.equal(lastBlockNumber, "Block number should not be updated after newHeads unsubscribe");

            expect(firstEventValue).to.equal(1, "First event should be called and have a value of 1");
            expect(secondEventValue).to.equal(2, "Second event should be called and have a value of 2");
        })
    })
})
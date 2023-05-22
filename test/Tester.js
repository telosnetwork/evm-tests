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
        it("Should have an internal transfer and then should revert", async function () {
            await testerInstance.test();
            expect(true);
        });
    });
});

require("dotenv").config();

const { BigNumber } = require("ethers");
const { expect } = require("chai");
const hre = require("hardhat");
const network = { ...hre.network };

const REVERT_SELECTOR = '0x08c379a0';
const ETH_TESTNET_ID = parseInt(process.env.ETH_TESTNET_ID) || null;
const ETH_TESTNET_NAME = process.env.ETH_TESTNET_NAME || null;
const TELOS_TESTNET_ID = 41;
const MIN_BALANCE = BigNumber.from('50000000000000000');
const TIMEOUT = 10000;

const DiffTester = class {
    static instances = [];
    static telosTesterInstance;
    static telosAccount;
    static telosAccountEmpty;
    static ethTesterInstance;
    static ethAccount;
    static ethAccountEmpty;
    static eth;

    static async deployTo(chain){
        if(!this.instances[chain]){
            this.instances[chain] = {};
        } else if(this.instances[chain]['Tester']){
            return this.instances[chain]['Tester'];
        }
        console.log(`    Deploying contracts to ${hre.network.name} (#${chain})...`);

        await this.timeout(chain);

        if(!this.instances[chain]['Reverter']){
            const Reverter = await hre.ethers.getContractFactory("Reverter");
            this.instances[chain]['Reverter'] = await Reverter.deploy();
            console.log(`    Deployed Reverter to ${this.instances[chain]['Reverter'].address}`);
        }

        await this.timeout(chain);

        if(this.instances[chain]['Reverter']) {
            const Tester = await hre.ethers.getContractFactory("Tester");
            this.instances[chain]['Tester'] = await Tester.deploy(this.instances[chain]['Reverter'].address);
            console.log(`    Deployed Tester to ${this.instances[chain]['Tester'].address}`);
            return this.instances[chain]['Tester'];
        }
    }
    static async checkBalance(account, network){
        const balance = await account.getBalance();
        if(balance.lt(MIN_BALANCE)){
            console.log(`\n\n    /!\\ Account balance is low on ${network}: ${balance}. Send some base network currency to ${account.address} to run the tests.`);
            return false;
        }
        return true;
    }
    static check(test, msg){
        if(!test){
            throw Error(msg);
        }
    }
    static async getTraces(tester, hash) {
        
        let traceTransactionResponse = await tester.provider.send('trace_transaction', [hash]);
        if(traceTransactionResponse === null){
            await DiffTester.timeout(true);
            await DiffTester.timeout(true);
            traceTransactionResponse = await tester.provider.send('trace_transaction', [hash]);
        }

        return traceTransactionResponse;
    }
    static async run(category, test){
        await hre.changeNetwork(ETH_TESTNET_NAME);
        if(!this.eth){
            throw Error("ETH testnet network not defined");
        }
        let resultsEth;
        try {
            await this.timeout(ETH_TESTNET_NAME);
            resultsEth = await this.tests[category][test](this.ethTesterInstance, ETH_TESTNET_NAME);
        } catch (e) {
            throw Error(ETH_TESTNET_NAME + ": " + e);
        }
        if(resultsEth){
            await hre.changeNetwork(network.name);
            try {
                await this.timeout(true);
                const resultsTelos = await this.tests[category][test](this.telosTesterInstance, network.name);
                if(resultsTelos !== resultsEth){
                    console.log("================ Diff ================");
                    console.log("Sepolia:");
                    console.log(resultsEth);
                    console.log("Telos:");
                    console.log(resultsTelos);
                    this.check(false, `${ETH_TESTNET_NAME} and ${network.name} networks should have the same response.`);
                }
            } catch (e) {
                throw Error(network.name + ": " + e);
            }
        }
        await hre.changeNetwork(network.name);
        return;
    };
    static tests = {
        'storage' : {
            'storageAtSuccess': async function(tester){
                try {   
                    return JSON.stringify(await tester.provider.getStorageAt(address, slot));
                } catch (e) {
                    console.log("Could not call getStorageAt:", e);
                }
                return false;
            }
        },
        'gas' : {
            'estimationSuccess': async function(tester, chain){
                const valueToSend = hre.ethers.utils.parseEther("0.0000000001");
                const trxResponse = await tester.estimateGas.testValueTransfer({value: valueToSend});
                DiffTester.check((trxResponse.value != '0'), 'Gas estimation should return a value');
                const signer = (chain === ETH_TESTNET_NAME) ? DiffTester.ethAccountEmpty : DiffTester.telosAccountEmpty;
                const trxResponseEmpty = await tester.connect(signer).estimateGas.testValueTransfer({value: valueToSend});
                DiffTester.check((trxResponseEmpty.value  != '0'), 'Gas estimation should return a value even if account has no balance');
                return JSON.stringify({success: true}); // Can't compare results themselves as gas price varies from network to network
            },
            'estimationMaxValue': async function(tester, chain){
                const signer = (chain === ETH_TESTNET_NAME) ? DiffTester.ethAccount : DiffTester.telosAccount;
                let balance = await tester.provider.eth_getBalance(signer.address);
                try {
                    const trxResponse = await tester.connect(signer).estimateGas.testValueTransfer({value: balance});
                    DiffTester.check((trxResponse.value  != '0'), 'Gas estimation should return a value even if account has no balance');
                    return JSON.stringify({success: true, response: trxResponse }); 
                } catch(e){ 
                    return JSON.stringify({success: false, error: e.message});
                }
            },
            'estimationRevert': async function(tester, chain) {
                let reverted = false;
                let response;
                try {
                    response = await tester.estimateGas.testCallRevert();
                } catch (e) {
                    reverted = (e.reason === 'execution reverted: This is a very big problem!');
                    response = e;
                }
                console.log(chain);
                console.log(response);
                DiffTester.check(reverted, 'Should have been reverted with correct revert message');
                return JSON.stringify(response);
            },
            'estimationFeeRevert': async function(tester, chain) {
                let reverted = false;
                let response;
                // Need account with 0 balance
                try {
                    const valueToSend = hre.ethers.utils.parseEther("0.0000000001");
                    const signer = (chain === ETH_TESTNET_NAME) ? DiffTester.ethAccountEmpty : DiffTester.telosAccountEmpty;
                    response = await tester.connect(signer).estimateGas.testValueTransfer({value: valueToSend, gasPrice: 505});
                    DiffTester.check(false, 'Should have been reverted due to lack of funds');
                } catch (e) {
                    reverted = true;
                    response = e;
                    DiffTester.check(e.message.startsWith('insufficient funds for intrinsic transaction cost'), 'Wrong error message received')
                }
                return JSON.stringify(response);
            },
        },
        'factories' : {
            'deploymentSuccess': async function(tester, chain){
                let trxResponse;
                try {
                    trxResponse = await tester. create(1);
                    await DiffTester.timeout(chain);
                } catch (e) {
                    DiffTester.check(false, e.message);
                }

                const traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);
                DiffTester.check(traceTransactionResponse.length > 0, "Could not get traces");
                DiffTester.check(traceTransactionResponse.length === 2, "Must have exactly 2 traces");
                // Last trace is a create call with code & address in results
                DiffTester.check(traceTransactionResponse[1]?.type === 'create', 'last trace type is not \'create\'');
                DiffTester.check(traceTransactionResponse[1]?.results?.address, 'No address passed in last trace results');
                DiffTester.check(traceTransactionResponse[1]?.results?.code, 'No code passed in last trace results');

                // Test predicted create2 address matches
                const reverter = await ethers.getContractFactory('Reverter');
                const { data: initCode } = reverter.getDeployTransaction();
                const initCodeHash = ethers.utils.keccak256(initCode);
                const salt = hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['uint256'], [1]));
                const address = hre.ethers.utils.getCreate2Address(tester.address, salt, initCodeHash);
                const existingAddress = await tester.reverter();
                DiffTester.check(address === traceTransactionResponse[1]?.results?.address && address === existingAddress, 'The predicted address does not match the new reverter address');

                return JSON.stringify(traceTransactionResponse);
        },
        'deploymentFailure': async function(tester, chain){
            let error;
            try {
                // Test that deploying with same salt as previous test ^ fails
                await DiffTester.timeout(chain);
                const trxResponseA = await tester.create(1);
                await DiffTester.timeout(chain);
                await DiffTester.timeout(chain);
                const trxResponse = await tester.create(1);
                console.log(trxResponse);
                DiffTester.check(false, 'Deployment did not fail... ');
            } catch (e) {
                error = e.message;
            }
            // TODO: this should fail on Sepolia with a different error, tEVM needs to match
            console.log(error);
            DiffTester.check(error === 'Invalid Transaction: Sender balance too low to pay for gas', 'Error message is not correct: ' + error);
            return JSON.stringify(error);
        },
    },
        'transfers' : {
            'proxiedInternalValueTransfer': async function(tester, chain){
                const valueToSend = hre.ethers.utils.parseEther("0.000001");
                let trxResponse
                try {
                    trxResponse = await tester.testProxiedValueTransfer({value: valueToSend});
                    await DiffTester.timeout(chain);
                    await DiffTester.timeout(chain);
                } catch (e) {
                    DiffTester.check(false, e.message);
                }

                const traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);

                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, "Could not get traces");
                console.log(chain);
                console.log(traceTransactionResponse);
                DiffTester.check(traceTransactionResponse[0].subtraces === 1, "Should have 1 subtrace on the root trx");
                DiffTester.check(traceTransactionResponse[1].subtraces === 1, "Should have 1 subtrace on the first sub trx");
                DiffTester.check(traceTransactionResponse.length === 3, "Should have 3 traces, one for the root trx and one for each internal value transfers");

                const reverter = await tester.reverter();

                // Second trace
                const transferCallAction = traceTransactionResponse[1].action;
                DiffTester.check(transferCallAction.from === tester.address.toLowerCase(), "call transfer should be from contract address " + tester.address.toLowerCase() + " and not " + transferCallAction.from);
                DiffTester.check(transferCallAction.to === reverter.toLowerCase(), "call transfer should be to reverter " + reverter.toLowerCase() + " and not " + transferCallAction.to);
                DiffTester.check(transferCallAction.value === valueToSend.toHexString(), "call transfer value should be same as the value sent to contract");

                // Third trace
                const transferCallActionNext = traceTransactionResponse[2].action;
                DiffTester.check(transferCallActionNext.from === reverter.toLowerCase(), "call transfer should be from reverter " + reverter.toLowerCase() + " and not " + transferCallActionNext.from);
                DiffTester.check(transferCallActionNext.to === trxResponse.from.toLowerCase(), "call transfer should be to initial sender  " + trxResponse.from.toLowerCase() + " and not " + transferCallActionNext.to);
                DiffTester.check(transferCallActionNext.value === valueToSend.toHexString(), "call transfer value should be same as the value sent to contract");

                return JSON.stringify({
                    traces: traceTransactionResponse,
                    transaction: trxResponse
                });
            },
            'internalValueTransfer': async function(tester, chain){
                const valueToSend = hre.ethers.utils.parseEther("0.000001");
                let trxResponse;
                try {
                    trxResponse = await tester.testValueTransfer({value: valueToSend});
                    await DiffTester.timeout(chain);
                } catch (e) {
                    DiffTester.check(false, e.message);
                }

                const traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);

                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, "Could not get traces for " + trxResponse.hash);
                DiffTester.check(traceTransactionResponse[0].subtraces === 1, "Should have 1 subtrace on the root trx");
                DiffTester.check(traceTransactionResponse.length === 2, "Should have 2 traces, one for the root trx and one for the internal value transfer");

                // Second trace
                const transferCallAction = traceTransactionResponse[1].action;
                DiffTester.check(transferCallAction.from === tester.address.toLowerCase(), "call transfer should be from contract address: " + tester.address.toLowerCase() + " and not " + transferCallAction.from);
                DiffTester.check(transferCallAction.to === trxResponse.from.toLowerCase(), "call transfer should be to sender " + trxResponse.from.toLowerCase() + " and not " + transferCallAction.to);
                DiffTester.check(transferCallAction.value === valueToSend.toHexString(), "call transfer value should be same as the value sent to contract");

                return JSON.stringify({
                    valid: true,
                    type0: traceTransactionResponse[0].type,
                    type1: traceTransactionResponse[1].type,
                });
            },
        },
        'traces' : {
            'nonRevertTraceFailure': async function(tester, chain){
                let trxResponse;
                let trxHash;
                let reverted = false;
                try {
                    trxResponse = await tester.testCallNonRevert({gasLimit: 80000});
                    trxHash = trxResponse.hash
                } catch (e) {
                    console.dir(e);
                    reverted = true;
                    trxHash = e.data.txHash
                }
                DiffTester.check(!reverted, 'Transaction should not have been reverted...');
                await DiffTester.timeout(chain);
                await DiffTester.timeout(chain);
                const traceTransactionResponse = await DiffTester.getTraces(tester, trxHash);
                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, "Could not get traces for " + trxHash);
                DiffTester.check(traceTransactionResponse[1].error === 'Reverted', 'Error message should be \'Reverted\' and not \'' + traceTransactionResponse[0].error + '\'...');
                return JSON.stringify({reverted: reverted})
            },
            'revertTraceFailure': async function(tester, chain){
                let reverted = false;
                let trxResponse;
                let trxHash;
                try {
                    trxResponse = await tester.testCallRevert({gasLimit: 80000});
                    trxHash = trxResponse.hash
                } catch (e) {
                    reverted = true;
                    trxHash = e.data.txHash;
                }
                DiffTester.check(!reverted, "Transaction should not have been reverted");

                await DiffTester.timeout(chain);
                const traceTransactionResponse = await DiffTester.getTraces(tester, trxHash);
                console.log(chain);
                console.log(traceTransactionResponse);

                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, "Could not get traces for " + trxHash);
                DiffTester.check(traceTransactionResponse?.length === 2, "Should have 2 traces, one for the root trx and one for the reverted internal call");

                DiffTester.check(traceTransactionResponse[0]?.error === "One of the actions in this transaction was REVERTed.", "First trace should have an error");
                DiffTester.check(traceTransactionResponse[0]?.result?.output?.substr(0, 10) === REVERT_SELECTOR, "First trace should have REVERT")

                return JSON.stringify({
                    transaction: trxHash,
                    traces: traceTransactionResponse
                });
            }
        }
    };
    static async timeout(chain){
        console.log(chain + ' TO')
        if(chain && chain !== 'tevmc' && parseInt(chain) !== TELOS_TESTNET_ID){
            console.log(chain + ' timeout for ' + TIMEOUT + 'ms')
            await new Promise(resolve => setTimeout(resolve, TIMEOUT));
        }
            return;
    }
}

describe("RPC Responses", async function () {
    beforeEach(async () => {
        await hre.changeNetwork(network.name);
    })
    before(async () => {
        if(ETH_TESTNET_ID === null || ETH_TESTNET_NAME === null){
            throw Error('No ETH Testnet network specified. Please define ETH_TESTNET_ID & ETH_TESTNET_NAME in the .env file to run the tests.')
        }
        const signers = await ethers.getSigners();
        console.log(`\n`);
        let check = await DiffTester.checkBalance(signers[0], network.name);
        if(check){
            DiffTester.telosAccount = signers[0];
            DiffTester.telosAccountEmpty = signers[1];
            DiffTester.telosTesterInstance = await DiffTester.deployTo(TELOS_TESTNET_ID);
            try {
                await hre.changeNetwork(ETH_TESTNET_NAME);
                if(hre.network.name === ETH_TESTNET_NAME){
                    const ethSigners = await ethers.getSigners();
                    check = await DiffTester.checkBalance(ethSigners[0], ETH_TESTNET_NAME);
                    if(check){
                        DiffTester.ethAccount = ethSigners[0];
                        DiffTester.ethAccountEmpty = ethSigners[1];
                        DiffTester.eth = true;
                        DiffTester.ethTesterInstance = await DiffTester.deployTo(ETH_TESTNET_ID);
                    }
                }
            } catch (e) {
                console.error(`Could not load ${ETH_TESTNET_NAME}:`, e);
            }
            await hre.changeNetwork(network.name);
        } else {
            throw 'Balance too low on ' + network.name;
        }
        console.log(`\n`);
    })
    describe(":: Gas Estimation", async function () {
        it("Should estimate gas succesfully", async function() {
            return await DiffTester.run('gas', 'estimationSuccess');
        });
        it("Should not let user estimate gas if not enough left for gas", async function() {
            return await DiffTester.run('gas', 'estimationMaxValue');
        });
        it("Should fail to estimate gas if the contract reverts", async function() {
            return await DiffTester.run('gas', 'estimationRevert');
        });
        it("Should fail to estimate gas if a fee parameter is passed but account does not have funds", async function() {
            return await DiffTester.run('gas', 'estimationFeeRevert');
        });
    });

    describe(":: Transfers", async function () {
        it("Should transfer value using one internal transaction", async function() {
            return await DiffTester.run('transfers', 'internalValueTransfer');
        })
        it("Should transfer value using two internal transactions with a proxy", async function() {
            return await DiffTester.run('transfers', 'proxiedInternalValueTransfer');
        })
    });

    describe(":: Traces", async function () {
        it("Should not revert call on non revert traces failures", async function () {
            return await DiffTester.run('traces', 'nonRevertTraceFailure');
        });
        it("Should reflect revert in a trace", async function () {
            return await DiffTester.run('traces', 'revertTraceFailure');
        });
    });
    describe(":: Factories", async function () {
        it("Should deploy contract successfully from factory", async function() {
            return await DiffTester.run('factories', 'deploymentSuccess');
        });
        it("Should revert call if factory contract deployment fails", async function() {
            return await DiffTester.run('factories', 'deploymentFailure');
        });
    });
});

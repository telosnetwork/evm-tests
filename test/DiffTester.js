require("dotenv").config();

const { ethers, upgrades } = require("hardhat");
const network = { ...hre.network };
const REVERT_SELECTOR = '0x08c379a0';
const ETH_TESTNET_ID = parseInt(process.env.ETH_TESTNET_ID) || null;
const ETH_TESTNET_NAME = process.env.ETH_TESTNET_NAME || null;
const TELOS_TESTNET_ID = 41;
const MIN_BALANCE = BigInt('100000000000000000');
const TIMEOUT = 10000;

const DiffTester = class {
    static instances = [];
    static activeTests = [];
    static telosTesterInstance;
    static telosAccount;
    static telosAccountEmpty;
    static ethTesterInstance;
    static ethAccount;
    static ethAccountEmpty;
    static eth = true;
    static debug = false;

    static async deployTo(chain, signer){
        if(!this.instances[chain]){
            this.instances[chain] = {};
        } else if(this.instances[chain]['Tester']){
            return this.instances[chain]['Tester'];
        }
        console.log(`    Deploying contracts to ${hre.network.name} (#${chain})...`);

        await this.timeout(chain);
        if(!this.instances[chain]['StoreTester'] && (this.isActive('storageMissing') || this.isActive('storageSuccess'))){
            const StoreTester = await ethers.getContractFactory("StoreTester");
            const deploymentTransaction = await StoreTester.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
            const receipt = await deploymentResponse.wait();
            this.instances[chain]['StoreTester'] = await ethers.getContractAt('StoreTester', receipt.contractAddress, signer);
            console.log('    Deployed StoreTester to', receipt.contractAddress);
        }
        if(!this.instances[chain]['Multisender'] && this.isActive('multisend')){
            const Multisender = await ethers.getContractFactory("Multisender");
            const deploymentTransaction = await Multisender.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
            const receipt = await deploymentResponse.wait();
            this.instances[chain]['Multisender'] = await ethers.getContractAt('Multisender', receipt.contractAddress, signer);
            console.log('    Deployed Multisender to', receipt.contractAddress);
        }
        if(!this.instances[chain]['Emitter']  && (this.isActive('getLogsSimpleFilter') || this.isActive('getLogsAdvancedFilter'))){
            const Emitter = await ethers.getContractFactory("Emitter");
            const deploymentTransaction = await Emitter.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
            const receipt = await deploymentResponse.wait();
            this.instances[chain]['Emitter'] = await ethers.getContractAt('Emitter', receipt.contractAddress, signer);
            console.log('    Deployed Emitter to', receipt.contractAddress);
        }
        if(!this.instances[chain]['Reverter']){
            const Reverter = await ethers.getContractFactory("Reverter");
            const deploymentTransaction = await Reverter.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
                const receipt = await deploymentResponse.wait();
            this.instances[chain]['Reverter'] = await ethers.getContractAt('Reverter', receipt.contractAddress, signer);
            console.log(`    Deployed Reverter to ${receipt.contractAddress}`);
        }

        /* TODO: Add more basic checks
        if(!this.instances[chain]['NFT'] && (this.activeTests.includes('mint') || this.activeTests.length === 0)){
            const NFT = await ethers.getContractFactory("NFT");
            const deploymentTransaction = await NFT.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
            const receipt = await deploymentResponse.wait();
            this.instances[chain]['NFT'] = await ethers.getContractAt('NFT', receipt.contractAddress, signer);
            console.log(`    Deployed NFT to ${receipt.contractAddress}`);
        }
        */
        await this.timeout(chain, 'Waiting on contract deployment');

        if(this.instances[chain]['Reverter']) {
            const Tester = await ethers.getContractFactory("Tester");
            const deploymentTransaction = await Tester.getDeployTransaction();
            const deploymentResponse = await signer.sendTransaction(deploymentTransaction);
            const receipt = await deploymentResponse.wait();
            this.instances[chain]['Tester'] = await ethers.getContractAt('Tester', receipt.contractAddress, signer);
            await this.timeout(chain, 'Waiting on contract deployment');
            console.log(`    Deployed Tester to ${receipt.contractAddress}`);
            await this.instances[chain]['Tester'].setReverter(this.instances[chain]['Reverter'].target);
            console.log(`    Configured Tester`);
            if(this.isActive('callSuccess') || this.isActive('createProxied')){
                const ProxiedTester = await ethers.getContractFactory("Tester")
                try {
                    this.instances[chain]['ProxiedTester'] = await upgrades.deployProxy(ProxiedTester, [this.instances[chain]['Reverter'].target], { initializer:'setReverter' });
                    await this.instances[chain]['ProxiedTester'].waitForDeployment();
                } catch {
                    this.instances[chain]['ProxiedTester'] = await upgrades.deployProxy(ProxiedTester, [this.instances[chain]['Reverter'].target], { initializer:'setReverter' });
                await this.instances[chain]['ProxiedTester'].waitForDeployment();
                }
                console.log(`    Deployed Proxied Tester to ${this.instances[chain]['ProxiedTester'].target}`);
            }
            return this.instances[chain]['Tester'];
        }
    }
    static async checkBalance(account, network){
        const balance = await account.provider.getBalance(account.address);
        if(balance < MIN_BALANCE){
            console.log(`\n\n    /!\\ Account balance is low on ${network}: ${balance}. Send some base network currency to ${account.address} to run the tests.`);
            return false;
        }
        console.log(`\n    Balance found on ${network} for ${account.address}:`);
        console.log(`    ${balance} \n`);
        return true;
    }
    static isActive(test){
        return (activeTests.length === 0 || activeTests.includes(test)) 
    }
    static check(test, msg){
        if(!test){
            throw Error(msg);
        }
    }
    static async getTraces(tester, hash) {
        let traceTransactionResponse = await tester.runner.provider.send('trace_transaction', [hash]);
        if(traceTransactionResponse === null){
            // Wait 1 ETH block (20s)
            await DiffTester.timeout(true, 'Waiting on traces');
            await DiffTester.timeout(true, 'Waiting on traces');
            traceTransactionResponse = await tester.runner.provider.send('trace_transaction', [hash]);
        }

        return traceTransactionResponse;
    }
    static async run(category, test){
        if(this.activeTests.length === 0 || this.activeTests.includes(test)){
            await hre.changeNetwork(ETH_TESTNET_NAME);
            let resultsEth;
                    if(this.eth){
                try {
                    await this.timeout(true);
                    resultsEth = await this.tests[category][test](this.ethTesterInstance, ETH_TESTNET_ID);
                } catch (e) {
                    throw Error(ETH_TESTNET_NAME + ": " + e);
                }
            }
            await hre.changeNetwork(network.name);
            try {
                await this.timeout(true);
                const resultsTelos = await this.tests[category][test](this.telosTesterInstance, TELOS_TESTNET_ID);
                if(resultsEth && resultsTelos !== resultsEth){
                    let diffMsg = `${ETH_TESTNET_NAME} and ${network.name} networks should have the same response.\n`;
                    diffMsg += "    ================ Diff ================\n";
                    diffMsg += "    " + ETH_TESTNET_NAME + ":\n";
                    diffMsg += "    " + resultsEth + "\n";
                    diffMsg += "    tEVM:\n";
                    diffMsg += "    " + resultsTelos + ":\n";
                    this.check(false, diffMsg);

                }
            } catch (e) {
                throw Error(network.name + ": " + e);
            }
            await hre.changeNetwork(network.name);
        }
        return true;
    };
    static tests = {
        'storage' : {
            'storageMissing': async function(tester, chain){
                try {   
                    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
                    const storeTesterInstance = DiffTester.instances[chain]['StoreTester'];
                    const value = await provider.getStorage(storeTesterInstance.target, 44); // Target missing storage
                    DiffTester.check(value === '0x0000000000000000000000000000000000000000000000000000000000000000', 'Value for missing storage should be 0x0000000000000000000000000000000000000000000000000000000000000000, not : ' + value);
                    return JSON.stringify({ 'value': value });
                } catch (e) {
                    DiffTester.check(false, "Could not retreive storage: " + e.message);
                }
                return false;
            },
            'storageSuccess': async function(tester, chain){
                try {   
                    const provider = new ethers.JsonRpcProvider(hre.network.config.url);
                    const storeTesterInstance = DiffTester.instances[chain]['StoreTester'];
                    const storeMe = parseInt(await storeTesterInstance.storeMe());
                    const value = parseInt(await provider.getStorage(storeTesterInstance.target, 0), 16); // Target existing storage
                    DiffTester.check(value === storeMe, `Value for storage should be ${storeMe}, not : ${value}`);
                    return JSON.stringify({ 'value': value });
                } catch (e) {
                    DiffTester.check(false, "Could not retreive storage: " + e.message);
                }
                return false;
            },
            'getLogsAdvancedFilter': async function(tester, chain){
                const emitterInstance = DiffTester.instances[chain]['Emitter'];
                await emitterInstance.emitThirdEvent(tester.target);
                await emitterInstance.emitThirdEvent('0x0000000000000000000000000000000000000000');
                await DiffTester.timeout(true, 'Waiting on event');
                await DiffTester.timeout(true, 'Waiting on event');
                const currentBlock = await tester.runner.provider.getBlockNumber();
                const eventSignature = 'Third(address,address,uint256)';
                const eventTopic = ethers.id(eventSignature);
                const orTopics = [ethers.zeroPadValue(tester.target.toLowerCase(), 32), '0x0000000000000000000000000000000000000000000000000000000000000000'];
                const response = await tester.runner.provider.getLogs({
                    address: emitterInstance.target,
                    topics: [eventTopic, orTopics],
                    fromBlock: (chain === ETH_TESTNET_ID) ? currentBlock - 20 : currentBlock - 200, 
                    toBlock: currentBlock + 10
                });
                DiffTester.check((response && response.length > 0), 'Could not get event');
                DiffTester.check((response[0].topics.includes(eventTopic)), 'Wrong topic signature for log 1');
                DiffTester.check((response[1].topics.includes(eventTopic)), 'Wrong topic signature for log 2');
                DiffTester.check((orTopics.includes(response[0].topics[1])), 'Wrong topic 2 for log 1');
                DiffTester.check((orTopics.includes(response[1].topics[1])), 'Wrong topic 2 for log 2');
                DiffTester.check((response[0].data === '0x0000000000000000000000000000000000000000000000000000000000000003'), `Wrong data: ${response[0].data}`);
                return JSON.stringify({ success: true });
            },
            'getLogsSimpleFilter': async function(tester, chain){
                const emitterInstance = DiffTester.instances[chain]['Emitter'];
                const emitResponse  = await emitterInstance.emitTwoEvents();
                DiffTester.check(emitResponse.data === '0x7216c333', 'Data returned by Emitter is not correct');
                await DiffTester.timeout(true, 'Waiting on event');
                await DiffTester.timeout(true, 'Waiting on event');
                const currentBlock = await tester.runner.provider.getBlockNumber();
                const eventSignature = 'First(uint256)';
                const eventTopic = ethers.id(eventSignature);
                const response = await tester.runner.provider.getLogs({
                    address: emitterInstance.target,
                    topics: [eventTopic],
                    fromBlock: (chain === ETH_TESTNET_ID) ? currentBlock - 20 : currentBlock - 200, 
                    toBlock: currentBlock + 10
                });
                DiffTester.check((response && response.length > 0), 'Could not get event');
                DiffTester.check((response[0].topics.includes(eventTopic)), 'Wrong topic signature');
                DiffTester.check((response[0].data === '0x0000000000000000000000000000000000000000000000000000000000000001'), `Wrong data: ${response[0].data}`);
                return JSON.stringify({ success: true, topics: response[0].topics, data: response[0].data });
            }
        },
        'gas' : {
            'estimationSuccess': async function(tester, chain){
                const trxResponse = await tester.testGasLeft.estimateGas();
                DiffTester.check((trxResponse > 0), 'Gas estimation for view call should return a value');
                const valueToSend = hre.ethers.parseEther("0.0000000001");
                const trxResponse2 = await tester.testValueTransfer.estimateGas({value: valueToSend});
                DiffTester.check((trxResponse2 > 0), 'Gas estimation for internal transfer should return a value');
                const trxResponse3 = await tester.create.estimateGas(1);
                DiffTester.check((trxResponse3 > 0), 'Gas estimation for internal create should return a value');
                return JSON.stringify({ success: true }); 
            },
            'estimationOverValue': async function(tester, chain){
                const signer = (chain === ETH_TESTNET_NAME) ? DiffTester.ethAccount : DiffTester.telosAccount;
                let balance = await tester.runner.provider.getBalance(signer.address);
                try {
                    const trxResponse = await tester.connect(signer).testValueTransfer.estimateGas({ value: balance + BigInt(1000000000000000000) });
                    DiffTester.check((trxResponse > 0), `Gas estimation should return a value even if value is greater than balance, response: ${trxResponse}`);
                    return JSON.stringify({ success: true, response: trxResponse.toString() });  
                } catch(e){ 
                    if(DiffTester.debug){
                        console.log(e);
                    }
                    DiffTester.check(false, 'Gas estimation should return a value even if value is greater than balance, error instead: ' + e.message);
                }
            },
            'estimationMaxValue': async function(tester, chain){
                const signers = await ethers.getSigners();
                let balance = await tester.runner.provider.getBalance(signers[0].address);
                try {
                    const trxResponse = await tester.connect(signers[0]).testValueTransfer.estimateGas({ value: balance });
                    DiffTester.check((trxResponse > 0), `Gas estimation should return a value even if value leaves no gas fee, response: ${trxResponse}`);
                    return JSON.stringify({ success: true }); 
                } catch(e){ 
                    DiffTester.check(false, 'Gas estimation should return a value even if value leaves no gas fee, error instead: ' + e.message);
                }
            },
            'estimationRevert': async function(tester, chain) {
                try {
                    let response = await tester.testCallRevert.estimateGas();
                } catch (e) {
                    return JSON.stringify({ 'success': true, 'reason': e.message });
                }
                DiffTester.check(false, 'Should have been reverted');
            },
            'estimationFeeRevert': async function(tester, chain) {
                let reverted = false;
                let response;
                const signers = await hre.ethers.getSigners();
                let balance = await tester.runner.provider.getBalance(signers[1]);
                const valueToSend = hre.ethers.parseEther("11111111111111111111111111111");
                if(balance >= valueToSend){
                    console.log("/!\\ Balance is too high: " + balance);
                }
                // Account with balance < valueToSend
                try {
                    response = await tester.connect(signers[1]).testValueTransfer.estimateGas({value: valueToSend, gasPrice: 505});
                } catch (e) {
                    reverted = true;
                    response = e;
                    DiffTester.check((
                            e.message.startsWith('The sender address has a zero balance') ||
                            e.message.startsWith('insufficient funds for gas * price + value')
                        ), 
                        'Wrong error message received: ' + e.message
                    );
                    return JSON.stringify({'success': true, 'error': e.message});
                }
                DiffTester.check(false, 'Should have been reverted due to lack of funds');
                return JSON.stringify({'success': false});  
            },
        },
        'proxies' : {
            'callSuccess': async function(){
                try {
                    await DiffTester.instances[ProxiedTester].testGasLeft();
                } catch (e) {
                    DiffTester.check(false, e.message);
                    return;
                }
            },
            createProxied: async function(tester, chain){
                let trxResponse;
                try {
                    trxResponse = await DiffTester.instances[chain]['ProxiedTester'].create(1);
                } catch (e){
                    DiffTester.check(false, e.message);
                    return;
                }
                const signers = await ethers.getSigners();
                DiffTester.check(trxResponse.from === signers[0].address, "From must be sender");
                try {
                    let traces = await DiffTester.getTraces(tester, trxResponse.hash);
                    let Ownable = await ethers.getContractFactory("OwnableContract");
                    let ownable = Ownable.attach(traces[2].result?.address);
                    let owner = await ownable.owner();
                    DiffTester.check(traces !== null, "Trace response must not be undefined");
                    DiffTester.check(traces?.length === 3, "Call must have 3 traces");
                    DiffTester.check(traces[0].subtraces === 1, "Initial trace should have 1 subtraces");
                    DiffTester.check(traces[1].subtraces === 1, "Second trafce should have 1 subtrace");
                    DiffTester.check(owner === DiffTester.instances[chain]['ProxiedTester'].target, "Owner address should be " + DiffTester.instances[chain]['ProxiedTester'].target + " but is " + owner);
                    return JSON.stringify({
                        success: true
                    })
                } catch(e){
                    DiffTester.check(false, e.message);
                    return JSON.stringify({
                        success: false
                    })
                }
            },
            'multisend': async function(tester, chain){
                let trxResponse;
                const recipients = [
                    "0xD7757239331D99d1073084576eFd2195f84Aef3C",
                    "0x27E82Ba6AfEbf3Eee3A8E1613C2Af5987929a546",
                    "0xC8c30Fa803833dD1Fd6DBCDd91Ed0b301EFf87cF",
                    "0x7D52422D3A5fE9bC92D3aE8167097eE09F1b347d",
                    "0xe7209d65c5BB05Ddf799b20fF0EC09E691FC3f11",
                    "0x9a469d1e668425907548228EA525A661FF3BFa2B",
                    "0x927cDC804626f815b4f266ecE3592e22a4f8a2E9",
                    "0x79Dc2F9f35495150ff4353ae8a8BC9112E887034",
                    "0x2eE7a6Bc161796c27B7F972B0Cb7bD91bD4D5d66",
                ];
                const balance = "6000000000000";
                const valuePerRecipient = BigInt(balance);
                const valueToSend = (valuePerRecipient * BigInt(4)) + BigInt(1000000000000000000);
                const ethSigners = await ethers.getSigners();
                try {
                    if(DiffTester.debug){
                        let bal = await ethSigners[1].provider.getBalance(ethSigners[1].address);
                        console.log("       Chain #" + chain + ": balance before transfer is " + bal);
                    }
                    await ethSigners[0].sendTransaction({
                        to: ethSigners[1].address,
                        value: valueToSend,
                    });
                    if(DiffTester.debug){
                        let bal = await ethSigners[1].provider.getBalance(ethSigners[1].address);
                        console.log("       Chain #" + chain + ": balance after transfer is " + bal);
                    }
                } catch(e){ 
                    DiffTester.check(false, 'Failed sending ETH: ' + e.message);
                }
                try {
                    trxResponse = await DiffTester.instances[chain]['Multisender'].connect(ethSigners[1]).validateEther([
                        { "recipient": recipients[0], balance: balance },
                        { "recipient": recipients[1], balance: balance },
                        { "recipient": recipients[2], balance: balance },
                        { "recipient": recipients[3], balance: balance }
                    ], {value: valueToSend});
                    if(DiffTester.debug){
                        let bal = await ethSigners[1].provider.getBalance(ethSigners[1].address);
                        console.log("       Chain #" + chain + ": balance after call is " + bal);
                    }
                } catch(e){ 
                    if(DiffTester.debug){
                        console.log(e);
                    }
                    return JSON.stringify({success: false, error: e.message});
                }
                if(DiffTester.debug){
                    console.log(trxResponse);
                }
                return JSON.stringify({success: true});
            },
        },
        'factories' : {
            'create': async function(tester, chain){
                let trxResponse;
                try {
                    trxResponse = await tester.create(2);
                    await DiffTester.timeout(chain);
                } catch (e) {
                    DiffTester.check(false, e.message);
                    return;
                }

                let traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);

                let attempts = 0;
                while(traceTransactionResponse === null && attempts < 11){
                    await DiffTester.timeout(true);
                    traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);
                    attempts++;
                }
                DiffTester.check(traceTransactionResponse !== null, "Transaction trace response cannot be null");
                DiffTester.check(traceTransactionResponse.length === 2, "Must have exactly 2 traces");
                DiffTester.check(traceTransactionResponse[0]?.error === false || typeof traceTransactionResponse[0]?.error === 'undefined', "Must not have an error, got: " + traceTransactionResponse[0]?.error);
                // Last trace is a create call with code & address in results
                DiffTester.check(traceTransactionResponse[0]?.subtraces === 1, 'initial trace should have one subtrace, not ' + traceTransactionResponse[0]?.subtraces);
                DiffTester.check(traceTransactionResponse[1]?.type === 'create', 'last trace type is not \'create\'');

                // Test predicted create2 address matches
                const ownable = await ethers.getContractFactory('OwnableContract');
                const { data: initCode } = await ownable.getDeployTransaction();
                const initCodeHash = ethers.keccak256(initCode);
                const salt = hre.ethers.keccak256(hre.ethers.solidityPacked(['uint256'], [2]));
                const address = hre.ethers.getCreate2Address(tester.target, salt, initCodeHash);
                const existingAddress = await tester.ownable();
                DiffTester.check(address === existingAddress, 'predicted address does not match the new reverter address');

                return JSON.stringify({
                    success: true,
                    code: traceTransactionResponse[1].result.code,
                    init: traceTransactionResponse[1].init,
                    address: (traceTransactionResponse[1].result.address?.length > 0),
                    output1: (traceTransactionResponse[0].result.output?.length > 0),
                    output2: (traceTransactionResponse[1].result.output?.length > 0)
                });
            },
            'createCollision': async function(tester, chain){
                let error;
                try {
                    // Test that deploying with same salt as previous test ^ fails
                    const trxResponse = await tester.createDouble(1);
                    await DiffTester.timeout(chain);
                    let traces = await DiffTester.getTraces(tester, trxResponse.hash);
                    DiffTester.check(traces[0].subtraces === 2, 'Should have 2 subtraces, has: ' + traces[0].subtraces);
                    DiffTester.check(traces[1].result?.code?.length > 0, 'Code is missing');
                    DiffTester.check(traces[2].action.init?.length > 0, 'Init is not correct: ' + traces[2].action.init);
                    DiffTester.check(typeof traces[2].result?.code === 'undefined', 'Third trace should not have code set');
                    DiffTester.check(traces[2].error === 'CreateCollision', 'Error message is not correct: ' + traces[2].error);
                    return JSON.stringify({
                        succes: true,
                        errorA: traces[1].error,
                        errorB: traces[2].error
                    });
                } catch (e) {
                    DiffTester.check(false, "Should not have failed but did: " + e.message)
                    error = e.message;
                    return JSON.stringify({
                        succes: false,
                        error: error
                    });
                }
            },
        },
        'sendTransaction' : {
            'sendTransactionValue': async function(tester, chain){
                const signers = await ethers.getSigners();
                try {
                    const transactionHash = await signers[0].sendTransaction({
                        to: signers[1].address,
                        value: hre.ethers.parseEther("0.000001"),
                    })
                } catch(e){
                    DiffTester.check(false, "Failed with error: " + e)
                }
            },
            'sendTransactionNoValue': async function(tester, chain){
                const signers = await ethers.getSigners();
                try {
                    const transactionHash = await signers[0].sendTransaction({
                        to: signers[1].address,
                    })
                } catch(e){
                    DiffTester.check(false, "Failed with error: " + e)
                }
            },
            'sendTransactionNoTo': async function(tester, chain){
                const signers = await ethers.getSigners();
                try {
                    const transactionHash = await signers[0].sendTransaction({
                        value: hre.ethers.parseEther("0.000001"),
                    })
                } catch(e){
                    DiffTester.check(false, "Failed with error: " + e)
                }
            }
        },
        'transfers' : {
            'proxiedInternalValueTransfer': async function(tester, chain){
                const valueToSend = hre.ethers.parseEther("0.0000001");
                let trxResponse
                try {
                    trxResponse = await tester.testProxiedValueTransfer({value: valueToSend});
                } catch (e) {
                    DiffTester.check(false, e.message);
                }

                await DiffTester.timeout(chain);

                const traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);
                
                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, "Could not get traces");
                DiffTester.check(traceTransactionResponse.length === 3, `Should have 3 traces, one for the root trx and one for each internal value transfers, has ${traceTransactionResponse.length}`);
                DiffTester.check(parseInt(traceTransactionResponse[0].subtraces) === 1, `Should have 1 subtrace on the root trx, has ${traceTransactionResponse[0].subtraces}`);
                DiffTester.check(parseInt(traceTransactionResponse[1].subtraces) === 1, `Should have 1 subtrace on the first sub trx, has ${traceTransactionResponse[1].subtraces}`);

                const reverter = await tester.reverter();
                // Second trace
                const transferCallAction = traceTransactionResponse[1].action;
                DiffTester.check(transferCallAction.from === tester.target.toLowerCase(), "call transfer should be from contract address " + tester.target.toLowerCase() + " and not " + transferCallAction.from);
                DiffTester.check(transferCallAction.to === reverter.toLowerCase(), "call transfer should be to reverter " + reverter.toLowerCase() + " and not " + transferCallAction.to);
                DiffTester.check(parseInt(transferCallAction.value, 16) === parseInt(valueToSend), `call transfer value should be same as the value sent to contract: ${valueToSend} and not ${parseInt(transferCallAction.value, 16)}`);

                return JSON.stringify({
                    success: true,
                    traces: traceTransactionResponse.length,
                    type0: traceTransactionResponse[0].type,
                    type1: traceTransactionResponse[1].type,
                    callType: traceTransactionResponse[0].action.callType,
                    callType2: traceTransactionResponse[1].action.callType,
                    value: traceTransactionResponse[0].action.value,
                    value2: traceTransactionResponse[1].action.value
                });
            },
            'internalValueTransfer': async function(tester, chain){
                const valueToSend = hre.ethers.parseEther("0.0000001");
                let trxResponse;
                try {
                    trxResponse = await tester.testValueTransfer({value: valueToSend});
                } catch (e) {
                    DiffTester.check(false, e.message);
                }

                await DiffTester.timeout(chain);

                const traceTransactionResponse = await DiffTester.getTraces(tester, trxResponse.hash);
                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, `Could not get traces for ${trxResponse.hash}`);
                DiffTester.check(traceTransactionResponse.length === 2, "Should have 2 traces, one for the root trx and one for the internal value transfer, found " + traceTransactionResponse.length);
                DiffTester.check(traceTransactionResponse[0].subtraces === 1, "Should have 1 subtrace on the root trx, has: " + traceTransactionResponse[0].subtraces);
                DiffTester.check(parseInt(traceTransactionResponse[1].subtraces) === 0, `Should have 0 subtrace on the first sub trx, has ${traceTransactionResponse[1].subtraces}`);


                // Second trace
                const transferCallAction = traceTransactionResponse[1].action;
                DiffTester.check(transferCallAction.from === tester.target.toLowerCase(), `Call transfer should be from contract address: ${tester.target.toLowerCase()} and not ${transferCallAction.from}`);
                DiffTester.check(transferCallAction.to === trxResponse.from.toLowerCase(), `Call transfer should be to sender ${trxResponse.from.toLowerCase()} and not ${transferCallAction.to}`);
                DiffTester.check(parseInt(transferCallAction.value, 16) === parseInt(valueToSend), `Call transfer value should be same as the value sent to contract: ${valueToSend} and not ${parseInt(transferCallAction.value, 16)}`);

                return JSON.stringify({
                    success: true,
                    traces: traceTransactionResponse.length,
                    type0: traceTransactionResponse[0].type,
                    type1: traceTransactionResponse[1].type,
                    callType: traceTransactionResponse[0].action.callType,
                    callType2: traceTransactionResponse[1].action.callType,
                    value: traceTransactionResponse[0].action.value,
                    value2: traceTransactionResponse[1].action.value
                });
            },
        },
        'mint' : {
            'mint': async function(tester, chain){
                // Deploy NFT Contract first
                // Test mint
            },
        },
        'code' : {
            'emptyCode': async function(tester, chain){
                const response = await tester.runner.provider.getCode("0xe7209d65c5BB05Ddf799b20fF0EC09E691FC3f11");
                DiffTester.check(response === "0x", "Response should be 0x, got: " + response);
            },
        },
        'errors' : {
            'panic': async function(tester, chain){
                try {
                    await tester.panic({gasLimit: 80000});
                    DiffTester.check(false, "Should have been reverted");
                } catch (e) {
                    return JSON.stringify({
                        success: true,
                        message: (e.message.length > 0)
                    });
                }
                return JSON.stringify({
                    success: false,
                });
            },
            'revertNoReason': async function(tester, chain){
                let reverter = DiffTester.instances[chain]['Reverter'];
                try {
                    await reverter.revertNoReason();
                    DiffTester.check(false, "Should have been reverted");
                } catch (e) {
                    return JSON.stringify({
                        success: false
                    });
                }
                return JSON.stringify({
                    success: true
                });
            },
        },
        'traces' : {
            'nonRevertTrace': async function(tester, chain){
                let trxResponse;
                let trxHash;
                let reverted = false;
                try {
                    trxResponse = await tester.testCallNonRevert({gasLimit: 80000});
                    trxHash = trxResponse.hash
                } catch (e) {
                    reverted = true;
                    trxHash = e.data.txHash
                }
                DiffTester.check(!reverted, 'Transaction should not have been reverted...');
                await DiffTester.timeout(chain);
                await DiffTester.timeout(chain);
                const traceTransactionResponse = await DiffTester.getTraces(tester, trxHash);
                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 1, "Could not get traces for " + trxHash);
                DiffTester.check(traceTransactionResponse[1].error, `No error found in second trace`);
                DiffTester.check(['Reverted', 'One of the actions in this transaction was REVERTed.'].includes(traceTransactionResponse[1].error), `Wrong error message: '${traceTransactionResponse[1].error}'`);
                return JSON.stringify({reverted: reverted, error: traceTransactionResponse[1].error})
            },
            'nonRevertTrace2': async function(tester, chain){
                let trxResponse;
                let trxHash;
                let reverted = false;
                try {
                    trxResponse = await tester.testCallNonRevert2();
                    trxHash = trxResponse.hash;
                } catch (e) {
                    reverted = true;    
                    trxHash = e.data.txHash
                }
                DiffTester.check(!reverted, 'Transaction should not have been reverted...');
                await DiffTester.timeout(chain);
                await DiffTester.timeout(chain);
                const traceTransactionResponse = await DiffTester.getTraces(tester, trxHash);
                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 2, "Could not get traces for " + trxHash);
                DiffTester.check(traceTransactionResponse[2].error, `No error found in third trace`);
                DiffTester.check(['Reverted', 'One of the actions in this transaction was REVERTed.'].includes(traceTransactionResponse[2].error), `Wrong error message: '${traceTransactionResponse[2].error}'`);
                return JSON.stringify({reverted: reverted, error: traceTransactionResponse[2].error})
            },
            'revertTrace': async function(tester, chain){
                let reverted = false;
                try {
                    await tester.testCallRevert({gasLimit: 80000});
                } catch (e) {
                    return JSON.stringify({
                        error: e.message.includes('Failed')
                    });
                }
                DiffTester.check(reverted, "Should have been reverted");
            },
            'revertTrace2': async function(tester, chain){
                let trxResponse;
                let trxHash;
                try {
                    trxResponse = await tester.testCallRevert2({gasLimit: 80000});
                    trxHash = trxResponse.hash
                } catch (e) {
                    trxHash = e.data.txHash;
                    if(DiffTester.debug){
                        console.log("       Chain #" + chain + ": error thrown by RPC \n      " + e.message);
                    }
                }

                await DiffTester.timeout(chain);
                const traceTransactionResponse = await DiffTester.getTraces(tester, trxHash);

                DiffTester.check(traceTransactionResponse !== null && traceTransactionResponse.length > 0, `Could not get traces for ${trxHash}`);
                DiffTester.check(traceTransactionResponse?.length === 2, "Should have 2 traces, one for the root trx and one for the reverted internal call");

                DiffTester.check(['Reverted', 'One of the actions in this transaction was REVERTed.'].includes(traceTransactionResponse[0].error) !== false, `First trace error message is wrong: '${traceTransactionResponse[0].error}'`);
                DiffTester.check(traceTransactionResponse[0]?.result?.output?.substr(0, 10) === REVERT_SELECTOR, "First trace should have REVERT")

                return JSON.stringify({
                    success: true,
                    trace_output: traceTransactionResponse[0].result?.output,
                    trace_error: (traceTransactionResponse[0].error) ? true : false,
                    trace2_output: traceTransactionResponse[1].result?.output,
                    trace2_error: (traceTransactionResponse[1].error) ? true : false,
                });
            },
        }
    };
    static async timeout(chain, reason){
        if(chain && chain !== 'tevmc' && parseInt(chain) !== TELOS_TESTNET_ID){
            reason = (reason && reason.length > 0) ? ': ' + reason : '';
            if(DiffTester.debug){
                console.log('     Chain #' + chain + ': timeout for ' + TIMEOUT + 'ms' + reason)
            }
            await new Promise(resolve => setTimeout(resolve, TIMEOUT));
        }
            return;
    }
}
/*
describe("RPC Responses", async function () {
    it("Should not fail", async function() {
        //return await DiffTester.run('storage', 'storageAtSuccess');
        const Multisender = await ethers.getContractFactory("Tester");
        const multisender = Multisender.attach("0x491791611aea5531e5be9d9abecb428939bd26e3");
        const response = await multisender.runner.provider.getCode("0x5CD5Bb3EC13CE31771b63632Ddc2EB36E300b96C");
        const recipients = [
            "0xD7757239331D99d1073084576eFd2195f84Aef3C",
            "0x27E82Ba6AfEbf3Eee3A8E1613C2Af5987929a546",
            "0xC8c30Fa803833dD1Fd6DBCDd91Ed0b301EFf87cF",
            "0x7D52422D3A5fE9bC92D3aE8167097eE09F1b347d",
            "0xe7209d65c5BB05Ddf799b20fF0EC09E691FC3f11",
            "0x9a469d1e668425907548228EA525A661FF3BFa2B",
            "0x927cDC804626f815b4f266ecE3592e22a4f8a2E9",
            "0x79Dc2F9f35495150ff4353ae8a8BC9112E887034",
            "0x2eE7a6Bc161796c27B7F972B0Cb7bD91bD4D5d66",
        ]
        const balance = "56000000000000";
        const valuePerRecipient = BigInt(56000000000000);
        const valueToSend = (valuePerRecipient * BigInt(1)) + BigInt(1000000);
        let trxResponse;
        console.log(ethers);
        try {
            trxResponse = await multisender.validateEther( [{
                recipient: recipients[0], balance: balance}, 
                {recipient: recipients[1], balance: balance}, 
                {recipient: recipients[2], balance: balance}, 
                {recipient: recipients[3], balance: balance},
                {recipient: recipients[4], balance: balance}
            ], {value: valueToSend});

        } catch(e){
            DiffTester.check(false, e.message);
        }
    });
});
*/
describe("RPC Responses", async function () {
    beforeEach(async () => {
        await hre.changeNetwork(network.name);
    })
    before(async () => {
        DiffTester.debug = process.env.DEBUG || false;
        DiffTester.activeTests = process.env.TESTS?.split(',') || [];
        if(ETH_TESTNET_ID === null || ETH_TESTNET_NAME === null){
            throw Error('No ETH Testnet network specified. Please define ETH_TESTNET_ID & ETH_TESTNET_NAME in the .env file to run the tests.')
        }
        const signers = await ethers.getSigners();
        let check = await DiffTester.checkBalance(signers[0], network.name);
        if(check){
            DiffTester.telosAccount = signers[0];
            DiffTester.telosAccountEmpty = signers[1];
            DiffTester.telosTesterInstance = await DiffTester.deployTo(TELOS_TESTNET_ID, signers[0]);
            try {
                await hre.changeNetwork(ETH_TESTNET_NAME);
                if(hre.network.name === ETH_TESTNET_NAME){
                    const ethSigners = await ethers.getSigners();
                    check = await DiffTester.checkBalance(ethSigners[0], ETH_TESTNET_NAME);
                    if(check){
                        DiffTester.ethAccount = ethSigners[0];
                        DiffTester.ethAccountEmpty = ethSigners[1];
                        DiffTester.eth = true;
                        DiffTester.ethTesterInstance = await DiffTester.deployTo(ETH_TESTNET_ID, ethSigners[0]);
                    }
                }
            } catch (e) {
                console.error(`Could not load ${ETH_TESTNET_NAME}:`, e);
            }
            await hre.changeNetwork(network.name);
        } else {
            throw `Balance too low on ${network.name}`;
        }
        console.log(`\n`);
    })
    describe(":: Storage", async function () {
        if(DiffTester.isActive('storageSuccess')){
            it("Should return correct value from storage", async function() {
                return await DiffTester.run('storage', 'storageSuccess');
            });
        }
        if(DiffTester.isActive('storageMissing')){
            it("Should return correct value from missing storage", async function() {
                return await DiffTester.run('storage', 'storageMissing');
            });
        }
        if(DiffTester.isActive('getLogsSimpleFilter')){
            it("Should correctly filter logs using a simple filter", async function() {
                return await DiffTester.run('storage', 'getLogsSimpleFilter');
            });
        }
        if(DiffTester.isActive('getLogsAdvancedFilter')){
            it("Should correctly filter logs using an advanced filter", async function() {
                return await DiffTester.run('storage', 'getLogsAdvancedFilter');
            });
        }
        if(DiffTester.isActive('emptyCode')){
            it("Should correctly return 0x if address has no code", async function() {
                return await DiffTester.run('code', 'emptyCode');
            });
        }
    });
    describe(":: Gas Estimation", async function () {
        if(DiffTester.isActive('estimationSuccess')){
            it("Should estimate gas succesfully", async function() {
                return await DiffTester.run('gas', 'estimationSuccess');
            });
        }
        if(DiffTester.isActive('estimationMaxValue')){
            it("Should let user estimate gas even if value does not leave enough for gas on transaction (Tangem)", async function() {
                return await DiffTester.run('gas', 'estimationMaxValue');
            });
        }
        if(DiffTester.isActive('estimationOverValue')){
            it("Should let user estimate gas even if value is greater than balance", async function() {
            return await DiffTester.run('gas', 'estimationOverValue');
            });
        }
        if(DiffTester.isActive('estimationRevert')){
            it("Should fail to estimate gas if the contract reverts", async function() {
                return await DiffTester.run('gas', 'estimationRevert');
            });
        }
        if(DiffTester.isActive('estimationFeeRevert')){
            it("Should fail to estimate gas if a fee parameter is passed but account does not have funds", async function() {
                return await DiffTester.run('gas', 'estimationFeeRevert');
            });
        }
    });

    describe(":: Transfers", async function () {
        if(DiffTester.isActive('internalValueTransfer')){
            it("Should transfer value using one internal transaction", async function() {
                return await DiffTester.run('transfers', 'internalValueTransfer');
            })
        }
        if(DiffTester.isActive('proxiedInternalValueTransfer')){
            it("Should transfer value using two internal transactions with a proxy", async function() {
                return await DiffTester.run('transfers', 'proxiedInternalValueTransfer');
            })
        }
    });

    describe(":: Errors", async function () {
        if(DiffTester.isActive('panic')){
            it("Should throw a provider error on panic", async function () {
                return await DiffTester.run('errors', 'panic');
            });
        }
        if(DiffTester.isActive('revertNoReason')){
            it("Should throw a provider error on a no reason revert", async function () {
                return await DiffTester.run('errors', 'revertNoReason');
            });
        }
    });

    describe(":: Traces", async function () {
        if(DiffTester.isActive('nonRevertTrace2')){
            it("Should reflect an internal revert in 1 traces out of 2", async function () {
                return await DiffTester.run('traces', 'nonRevertTrace2');
            });
        }
        if(DiffTester.isActive('nonRevertTrace')){
            it("Should reflect an internal revert in 1 trace out of 1", async function () {
                return await DiffTester.run('traces', 'nonRevertTrace');
            });
        }
        if(DiffTester.isActive('revertTrace')){
            it("Should reflect revert in call on a trace", async function () {
                return await DiffTester.run('traces', 'revertTrace');
            });
        }
        if(DiffTester.isActive('revertTrace2')){
            it("Should reflect revert in call AND internal transaction on a trace", async function () {
                return await DiffTester.run('traces', 'revertTrace2');
            });
        }
    });
    describe(":: sendTransaction", async function () {
        if(DiffTester.isActive('sendTransactionValue')){
            it("Should not fail if proper parameters are passed", async function() {
                return await DiffTester.run('sendTransaction', 'sendTransactionValue');
            });
        }
        if(DiffTester.isActive('sendTransactionNoValue')){
            it("Should not fail if no value is passed", async function() {
                return await DiffTester.run('sendTransaction', 'sendTransactionNoValue');
            });
        }
        if(DiffTester.isActive('sendTransactionNoTo')){
            it("Should not fail if no recipient is passed", async function() {
                return await DiffTester.run('sendTransaction', 'sendTransactionNoTo');
            });
        }
    });
    describe(":: Factories", async function () {
        if(DiffTester.isActive('multisend')){
            it("Should be able to call a contract function through proxy (Multisend)", async function() {
                return await DiffTester.run('proxies', 'multisend');
            });
        }
        if(DiffTester.isActive('create')){
            it("Should deploy contract successfully from factory", async function() {
                return await DiffTester.run('factories', 'create');
            });
        }
        if(DiffTester.isActive('createProxied')){
            it("Should deploy contract successfully from proxied factory", async function() {
                return await DiffTester.run('proxies', 'createProxied');
            });
        }
        if(DiffTester.isActive('createCollision')){
            it("Should error if factory contract creations collides", async function() {
                return await DiffTester.run('factories', 'createCollision');
            });
        }
    });
}); 

require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require('hardhat-deploy');
require("hardhat-change-network");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.17",
      },
      {
        version: "0.7.0",
      },
      {
        version: "0.8.19",
      },
      {
        version: "0.8.4",
      },
      {
        version: "0.4.18",
      },
    ],
  },
  custom: {
    tests: process.env.TESTS || [],
  },
  mocha: {
    timeout: 300000000
  },
  namedAccounts: {
    deployer: 'privatekey://0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084'
  },
  networks: {
    hardhat: {
      accounts: [{
        privateKey: '0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084',
        balance: '10000000000000000000000'
      }],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: ['0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084', 'ee2351ec4614e2eb95ebea649da1bc6b906f780fbb2e8f8b1004326072f2397d'],
    },
    testnet: {
      url: "https://testnet.telos.net/evm",
      accounts: ['0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084', 'ee2351ec4614e2eb95ebea649da1bc6b906f780fbb2e8f8b1004326072f2397d'],
    },
    localerigon: {
      url: "http://127.0.0.1:8545",
      wsUrl: "ws://127.0.0.1:8545",
      accounts: ["0x26e86e45f6fc45ec6e2ecd128cec80fa1d1505e5507dcd2ae58c3130a7a97b48", 'ee2351ec4614e2eb95ebea649da1bc6b906f780fbb2e8f8b1004326072f2397d']
    },
    tevmc: {
      url: "http://127.0.0.1:7000/evm",
      wsUrl: "ws://127.0.0.1:7000/evm",
      accounts: ['0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084', 'ee2351ec4614e2eb95ebea649da1bc6b906f780fbb2e8f8b1004326072f2397d', 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'],
    },
    rETH:   {
      url: "https://erigon.kainosbp.com/v3",
      accounts: ['ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'ee2351ec4614e2eb95ebea649da1bc6b906f780fbb2e8f8b1004326072f2397d','0x87ef69a835f8cd0c44ab99b7609a20b2ca7f1c8470af4f0e5b44db927d542084'],
    }
  },
};

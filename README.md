# EVM Tests for Telos EVM

This template requires [NodeJS & NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed on your machine and a [wallet address on the Telos EVM Testnet Network](https://www.telos.net/developers/getting-started-on-testnet).

Commands used below work on recent Linux or Windows versions but have not been verified for Mac

## REQUIREMENTS

- A running rETH node
- A running tEVM node (see OPTIONAL for running it from repo)

## INSTALL

- Install the repository on your machine
- Enter the directory of the project on your machine and install its dependencies by running `npm install`
- Modify the `hardhat-change-network` package src/index.ts, replace '' with '' (TODO: update that package ourselves)
- Edit hardhat.config.json: point the networks to your local endpoints and add your private keys

```
    tEVM: {
      url: "http://127.0.0.1:7000/evm",
      wsUrl: "ws://127.0.0.1:7000/evm",
      accounts: ['MY_PRIVATE_TEST_KEY_1', 'MY_PRIVATE_TEST_KEY_2', 'MY_PRIVATE_TEST_KEY_3'],
    },
    rETH:   {
      url: "http://127.0.0.1:8000/evm",
      accounts: ['MY_PRIVATE_TEST_KEY_1', 'MY_PRIVATE_TEST_KEY_2', 'MY_PRIVATE_TEST_KEY_3'],
    }
```

## TEST

- Use `npx hardhat test --network tEVM` to build and launch all the tests
- Use `TESTS=estimationFeeRevert,multisend,revertTrace2 npx hardhat test --network tEVM` to build and launch specific tests
- Use `DEBUG=true TESTS=estimationFeeRevert,multisend,revertTrace2 npx hardhat test --network tEVM` to build and launch specific tests with more logging

## OPTIONAL: Run a local evm node & autodeploy contracts

### REQUIREMENTS

- Docker
- Python 3.9+ (probably works with 3.7+ but haven't tested in a while)
- Linux (for now)

### INSTALL

```
# from repo root:

# create virtualenv and activate
python3 -m venv venv
source venv/bin/activate

# install requirements
pip install -r tevmc/requirements.txt

# run deploy script, will wait for user input for teardown
pytest tevmc/test_deploy.py

```
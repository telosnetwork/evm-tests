# EVM Tests for Telos EVM

## REQUIREMENTS

This template requires [NodeJS & NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed on your machine and a [wallet address on the Telos EVM Testnet Network](https://www.telos.net/developers/getting-started-on-testnet).

Commands used below work on recent Linux or Windows versions but have not been verified for Mac

## INSTALL
- Install the repository on your machine
- Enter the directory of the project on your machine and install its dependencies by running `npm install`

## TEST
- Use `npx hardhat test` to build and launch the tests


## OPTIONAL:
### Run local evm node & autodeploy contract at tevmc/contracts/eosio.evm

Requirements:

- Docker
- Python 3.9+ (probably works with 3.7+ but haven't tested in a while)
- Linux (for now)

Quickstart:

```
# from repo root:

# create virtualenv and activate
python3 -m venv venv
source venv/bin/activate

# install requirements
pip install -r tevmc/requirements.txt

# run deploy script, will wait for user input for teardown
# check out the file at tevmc/test_deploy.py for more info
pytest tevmc/test_deploy.py

# on another terminal run js evm tests
npx hardhat test --network tevmc

```

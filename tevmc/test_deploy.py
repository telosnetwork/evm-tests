#!/usr/bin/env python3

def test_deploy(tevm_node):

    # deploy contract from host directory
    # put the contract you want to use for the test at:
    # tevmc/contracts/eosio.evm
    tevm_node.cleos.deploy_contract_from_host(
        'eosio.evm',
        'tevmc/contracts/eosio.evm',

        # options

        # normally this call would auto create a staked
        # account for the contract, but its auto created
        # on startup for most sys accounts
        create_account=False,

        # this call also does a hash check against mainnet
        # and throws if it doesn't, usefull for CI runs,
        # but we are deploying a custom contract in this case
        verify_hash=False
    )

    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

#!/usr/bin/env python3


def test_upgrade_from_legacy(tevm_node_random):
    tevmc = tevm_node_random

    contract_path = '/opt/eosio/bin/contracts/eosio.evm/upgradable'

    info = tevmc.cleos.deploy_contract(
        'eosio.evm', contract_path,
        privileged=True,
        create_account=False,
        verify_hash=False
    )

    breakpoint()

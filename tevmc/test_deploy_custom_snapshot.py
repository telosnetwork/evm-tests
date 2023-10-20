#!/usr/bin/env python3

import pytest


MINIMAL = ['nodeos']
# RPC = MINIMAL + ['redis', 'elastic', 'indexer', 'rpc']
# FULL = RPC + ['kibana', 'logrotator']

@pytest.mark.randomize(False)
@pytest.mark.services(*MINIMAL)
@pytest.mark.node_dir('tevmc/node')
@pytest.mark.from_snapshot_file(200_000_000,"/path/to/snapshot/custom-snapshot.bin")  # start from custom snapshot
@pytest.mark.custom_subst_wasm('tevmc/contracts/eosio.evm/eosio.evm.wasm')  # use this wasm for subst
def test_deploy_custom_snapshot(tevmc_mainnet):
    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

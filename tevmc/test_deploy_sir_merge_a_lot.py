#!/usr/bin/env python3

import pytest


@pytest.mark.randomize(False)
@pytest.mark.services('nodeos')
@pytest.mark.node_dir('tevmc/node')
@pytest.mark.from_snapshot(205_000_000)  # start from snapshot closest to this block
@pytest.mark.custom_subst_wasm('tevmc/contracts/sir_merge_a_lot/eosio.evm.wasm')  # use this wasm for subst
def test_deploy_sir_merge_a_lot(tevmc_mainnet):
    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

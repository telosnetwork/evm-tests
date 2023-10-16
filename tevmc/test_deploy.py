#!/usr/bin/env python3

import pytest

MINIMAL = ['nodeos']
RPC = MINIMAL + ['redis', 'elastic', 'indexer', 'rpc']

@pytest.mark.randomize(False)
@pytest.mark.services(*RPC)
def test_deploy(tevmc_local):
    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

#!/usr/bin/env python3

import json
import logging

import pytest


MINIMAL = ['nodeos']
RPC = MINIMAL + ['redis', 'elastic', 'indexer', 'rpc']

@pytest.mark.services(*RPC)
def test_deploy(tevmc_local):
    logging.info(json.dumps(tevmc_local.config, indent=4))

    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

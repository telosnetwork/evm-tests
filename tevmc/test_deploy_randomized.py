#!/usr/bin/env python3

import json
import logging


def test_deploy_randomized(tevm_node_random):
    tevm_node = tevm_node_random

    # dump randomized node info
    logging.info(
        json.dumps(tevm_node.config, indent=4))

    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

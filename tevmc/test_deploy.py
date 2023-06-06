#!/usr/bin/env python3

import json
import logging


def test_deploy(tevm_node):

    # dump randomized node info
    logging.info(
        json.dumps(tevm_node.config, indent=4))

    # block on python debugger
    # use exit() or Ctrl+D to teardown
    breakpoint()

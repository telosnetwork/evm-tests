#!/usr/bin/env python3

import os
import sys

import pytest
import docker
import logging
import requests

from contextlib import contextmanager

from tevmc import TEVMController
from tevmc.config import (
    local, testnet, mainnet,
    build_docker_manifest,
    randomize_conf_ports,
    randomize_conf_creds,
    add_virtual_networking
)
from tevmc.cmdline.init import touch_node_dir
from tevmc.cmdline.build import perform_docker_build
from tevmc.cmdline.clean import clean
from tevmc.cmdline.cli import get_docker_client


TEST_SERVICES = ['redis', 'elastic', 'kibana', 'nodeos', 'indexer', 'rpc']


@contextmanager
def bootstrap_test_stack(
    tmp_path_factory, config,
    randomize=False, services=TEST_SERVICES,
    **kwargs
):
    if randomize:
        config = randomize_conf_ports(config)
        config = randomize_conf_creds(config)

    if sys.platform == 'darwin':
        config = add_virtual_networking(config)

    client = get_docker_client()

    chain_name = config['telos-evm-rpc']['elastic_prefix']

    tmp_path = tmp_path_factory.getbasetemp() / chain_name
    manifest = build_docker_manifest(config)

    tmp_path.mkdir(parents=True, exist_ok=True)
    touch_node_dir(tmp_path, config, 'tevmc.json')
    perform_docker_build(
        tmp_path, config, logging)

    containers = None

    try:
        with TEVMController(
            config,
            root_pwd=tmp_path,
            services=services,
            **kwargs
        ) as _tevmc:
            yield _tevmc
            containers = _tevmc.containers

    except BaseException:
        if containers:
            pid = os.getpid()

            client = get_docker_client(timeout=10)

            for val in containers:
                while True:
                    try:
                        container = client.containers.get(val)
                        container.stop()

                    except docker.errors.APIError as err:
                        if 'already in progress' in str(err):
                            time.sleep(0.1)
                            continue

                    except requests.exceptions.ReadTimeout:
                        print('timeout!')

                    except docker.errors.NotFound:
                        print(f'{val} not found!')

                    break
        raise


@pytest.fixture(scope='module')
def tevm_node(tmp_path_factory):
    with bootstrap_test_stack(
        tmp_path_factory, local.default_config) as tevmc:
        yield tevmc

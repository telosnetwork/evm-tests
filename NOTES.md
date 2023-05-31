### Testing on sepolia
Example transactions from both Tester methods are below, you can click "more" on the right, select parity trace and then select raw to see the data below.

- A test transaction [here](https://sepolia.etherscan.io/tx/0x6161086f43a8b5cc386fb499c40f759ed1b8cb8397d29448331bd09af72d9fe0) for internal transaction sending value
- trace_transaction:
```json
[
  {
    "action": {
      "from": "0xc51fe232a0153f1f44572369cefe7b90f2ba08a5",
      "callType": "call",
      "gas": "0xe638",
      "input": "0x15431614",
      "to": "0x033592b389b8faa85aef73ee8315c604f2790f79",
      "value": "0x0"
    },
    "blockHash": "0xdaf5724e1354b700a3ae3c7dd57b80ccf48899c4f651b7fc32c67c41daac2340",
    "blockNumber": 3598661,
    "error": "Reverted",
    "result": {
      "gasUsed": "0x159c",
      "output": "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001b5468697320697320612076657279206269672070726f626c656d210000000000"
    },
    "subtraces": 1,
    "traceAddress": [],
    "transactionHash": "0x6161086f43a8b5cc386fb499c40f759ed1b8cb8397d29448331bd09af72d9fe0",
    "transactionPosition": 0,
    "type": "call"
  },
  {
    "action": {
      "from": "0x033592b389b8faa85aef73ee8315c604f2790f79",
      "callType": "call",
      "gas": "0xcf31",
      "input": "0x185c38a4",
      "to": "0x808aa0cb309b5402cbdde2e863ff8e80d4473562",
      "value": "0x0"
    },
    "blockHash": "0xdaf5724e1354b700a3ae3c7dd57b80ccf48899c4f651b7fc32c67c41daac2340",
    "blockNumber": 3598661,
    "error": "Reverted",
    "result": {
      "gasUsed": "0x1ac",
      "output": "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001b5468697320697320612076657279206269672070726f626c656d210000000000"
    },
    "subtraces": 0,
    "traceAddress": [
      0
    ],
    "transactionHash": "0x6161086f43a8b5cc386fb499c40f759ed1b8cb8397d29448331bd09af72d9fe0",
    "transactionPosition": 0,
    "type": "call"
  }
]
```

- A test transaction [here](https://sepolia.etherscan.io/tx/0x9449825fe007d5d4461feaaa823782beb966892a002a8fc31d41b38cf1aab17e) for internal transaction sending value
- trace_transaction:
```json
[
  {
    "action": {
      "from": "0xc51fe232a0153f1f44572369cefe7b90f2ba08a5",
      "callType": "call",
      "gas": "0x243d",
      "input": "0x2b12f459",
      "to": "0x324f12912b24487e46b2b8d3e1bd21cdae4025f4",
      "value": "0xe8d4a51000"
    },
    "blockHash": "0x209aa3e86484c894242914816c8b8ade9f3567f214c8ceb307fab65779c3bd00",
    "blockNumber": 3598466,
    "result": {
      "gasUsed": "0x1b6e",
      "output": "0x"
    },
    "subtraces": 1,
    "traceAddress": [],
    "transactionHash": "0x9449825fe007d5d4461feaaa823782beb966892a002a8fc31d41b38cf1aab17e",
    "transactionPosition": 15,
    "type": "call"
  },
  {
    "action": {
      "from": "0x324f12912b24487e46b2b8d3e1bd21cdae4025f4",
      "callType": "call",
      "gas": "0x8fc",
      "input": "0x",
      "to": "0xc51fe232a0153f1f44572369cefe7b90f2ba08a5",
      "value": "0xe8d4a51000"
    },
    "blockHash": "0x209aa3e86484c894242914816c8b8ade9f3567f214c8ceb307fab65779c3bd00",
    "blockNumber": 3598466,
    "result": {
      "gasUsed": "0x0",
      "output": "0x"
    },
    "subtraces": 0,
    "traceAddress": [
      0
    ],
    "transactionHash": "0x9449825fe007d5d4461feaaa823782beb966892a002a8fc31d41b38cf1aab17e",
    "transactionPosition": 15,
    "type": "call"
  }
]
```
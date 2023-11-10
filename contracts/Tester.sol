// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Reverter.sol";
import "./OwnableContract.sol";

contract Tester {
    uint32 public storeMe;
    uint32 public storeMe2;
    Reverter public reverter;
    OwnableContract public ownable;

    function setReverter(Reverter _reverter) external {
        reverter = _reverter;
        storeMe = 11;
        storeMe2 = 14;
    }

    receive() external payable {}

    function testGasLeftProxy() public  {
        (bool success, bytes memory returndata) = address(reverter).call(abi.encodeWithSignature('testGasLeft()'));
    }

    function testGasLeft() public returns (uint gasLeft)  {
        gasLeft = gasleft();
    }

    function testCallNonRevert2() public {
        (bool success2, bytes memory returndata2) = address(reverter).call(abi.encodeWithSignature('testGasLeft()'));
        (bool success, bytes memory returndata) = address(reverter).call(abi.encodeWithSignature('revertWithMessage()'));
    }

    function testCallNonRevert() public {
        (bool success, bytes memory returndata) = address(reverter).call(abi.encodeWithSignature('revertWithMessage()'));
    }

    function testCallRevert() public pure {
        revert('Failed');     
    }

    function testCallRevert2() public {
        (bool success, bytes memory returndata) = address(reverter).call(abi.encodeWithSignature('revertWithMessage()'));
        require(success, 'Failed');     
    }

    function testProxiedValueTransfer() public payable {
        Reverter(reverter).testValueTransfer{ value: msg.value }(payable(msg.sender));
    }

    function testUserValueTransfer() public payable {
        // First send the TLOS back to sender to test internal value transactions
        payable(msg.sender).transfer(msg.value);
    }

    function testValueTransfer() public payable {
        // First send the TLOS back to sender to test internal value transactions
        payable(msg.sender).transfer(msg.value);
    }

    function createDouble(uint rand) public returns (address newReverter) {
        bytes memory bytecode = type(Reverter).creationCode;
        address newReverter2;
        bytes32 salt = keccak256(abi.encode(rand));
        assembly {
            newReverter := create2(0, add(bytecode, 32), mload(bytecode), salt)
            newReverter2 := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        reverter = Reverter(newReverter);
    }

    function create(uint rand) public returns (address newContract) {
        bytes memory bytecode = type(OwnableContract).creationCode;
        bytes32 salt = keccak256(abi.encode(rand));
        assembly {
            newContract := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        ownable = OwnableContract(newContract);
    }
}
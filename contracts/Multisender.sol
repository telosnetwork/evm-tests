// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

library SafeMath {
  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  /**
  * @dev Substracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

contract Multisender {
    using SafeMath for uint256;
    struct Recipient {
        address payable recipient;
        uint256 balance;
    }

    mapping(bytes32 => uint256) internal uintStorage;
    
    constructor() public  {
        uintStorage[keccak256("fee")] = 5 ether;
    }

    function fee() public view returns (uint256) {
        return uintStorage[keccak256("fee")];
    }


    function validateEther(Recipient[] calldata _recipients) external payable returns (uint gasLeft, Recipient[] memory badAddresses)  {
        badAddresses = new Recipient[](_recipients.length);

        uint256 contractBalanceBefore = address(this).balance.sub(msg.value);
        uint256 total = msg.value;
        uint256 contractFee = fee();
        total = total.sub(contractFee);

        for (uint256 i = 0; i < _recipients.length; i++) {
            bool success = _recipients[i].recipient.send(_recipients[i].balance);

            if (!success) {
                badAddresses[i] = _recipients[i];
            } else {
                total = total.sub(_recipients[i].balance);
            }
        }

        uint256 contractBalanceAfter = address(this).balance;
        // assert. Just for sure
        require(
            contractBalanceAfter >= contractBalanceBefore.add(contractFee),
            "do not try to take the contract money"
        );
        gasLeft = gasleft();
    }
}
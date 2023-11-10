pragma solidity ^0.8.0;

contract Emitter {

    event First(uint value);
    event Second(uint value);
    event Third(address indexed  _contract, address indexed  _sender, uint  _value);

    function emitThirdEvent(address _contract) public {
        emit Third(_contract, msg.sender, 3);
    }

    function emitTwoEvents() public {
        emit First(1);
        emit Second(2);
    }
}

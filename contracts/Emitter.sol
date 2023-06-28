pragma solidity ^0.8.0;

contract Emitter {

    event First(uint value);
    event Second(uint value);

    function emitTwoEvents() public {
        emit First(1);
        emit Second(2);
    }
}

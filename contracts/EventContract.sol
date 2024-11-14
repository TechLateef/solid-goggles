// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EventContract {
    struct User {
        string userName;
        bool checkedIn;
        address walletAddress;
    }

    struct Event {
        string eventName;
        uint expectedUsers;
        uint tokenRequired;
        uint endTime;
        uint totalAmount;
        address[] userAddresses;
        mapping(address => bool) checkedInUsers;
        mapping(address => User) reservations;
        address eventCreator;
    }

    IERC20 public token;  // ERC-20 token used for payments
    mapping(uint => Event) public events;
    uint public eventCount;

    event EventCreated(uint eventId, string eventName, address indexed creator, uint endTime);
    event SitReserved(string userName, uint eventId);
    event UserCheckedIn(uint eventId, address userAddress);
    event RefundsProcessed(uint eventId);

    // Constructor to initialize the ERC-20 token address
    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }

    // Create a new event with token requirements and an end time
    function createEvent(string memory _eventName, uint _expectedUsers, uint _tokenRequired, uint _endTime) external returns (bool) {
        require(_endTime > block.timestamp, "End time must be in the future");

        eventCount++;
        Event storage newEvent = events[eventCount];

        newEvent.eventName = _eventName;
        newEvent.expectedUsers = _expectedUsers;
        newEvent.tokenRequired = _tokenRequired;
        newEvent.endTime = _endTime;
        newEvent.eventCreator = msg.sender;

        emit EventCreated(eventCount, _eventName, msg.sender, _endTime);
        return true;
    }

    // Reserve a space with tokens
    function reserveSpace(uint _eventId, string memory _userName) external returns (bool) {
        Event storage eventDetails = events[_eventId];
        require(token.allowance(msg.sender, address(this)) >= eventDetails.tokenRequired, "Token allowance too low");
        require(eventDetails.reservations[msg.sender].walletAddress == address(0), "User already reserved a seat");

        // Transfer tokens from user to the contract
        token.transferFrom(msg.sender, address(this), eventDetails.tokenRequired);

        // Record reservation details
        User storage user = eventDetails.reservations[msg.sender];
        user.userName = _userName;
        user.walletAddress = msg.sender;
        user.checkedIn = false;

        eventDetails.userAddresses.push(msg.sender);
        eventDetails.totalAmount += eventDetails.tokenRequired;

        emit SitReserved(_userName, _eventId);
        return true;
    }

    // Organizer checks in a user and issues a token refund
    function checkIn(uint _eventId, address _userAddress) external returns (bool) {
        Event storage eventDetails = events[_eventId];

        require(_eventId <= eventCount, "Event does not exist");
        require(msg.sender == eventDetails.eventCreator, "Only the event organizer can check in users");
        require(eventDetails.reservations[_userAddress].walletAddress != address(0), "User has not reserved a seat");
        require(!eventDetails.reservations[_userAddress].checkedIn, "User already checked in");

        eventDetails.reservations[_userAddress].checkedIn = true;
        eventDetails.checkedInUsers[_userAddress] = true;

        // Refund tokens to the user upon check-in
        token.transfer(_userAddress, eventDetails.tokenRequired);
        eventDetails.totalAmount -= eventDetails.tokenRequired;

        emit UserCheckedIn(_eventId, _userAddress);
        return true;
    }

    // Organizer claims unclaimed funds after event ends
    function claimRefund(uint _eventId) external returns (bool) {
        Event storage eventDetails = events[_eventId];

        require(_eventId <= eventCount, "Event does not exist");
        require(msg.sender == eventDetails.eventCreator, "Only the event creator can claim funds");
        require(block.timestamp > eventDetails.endTime, "Cannot claim funds before event ends");

        uint refundAmount = eventDetails.totalAmount;

        // Transfer remaining tokens to the event creator
        token.transfer(eventDetails.eventCreator, refundAmount);
        eventDetails.totalAmount = 0;

        emit RefundsProcessed(_eventId);
        return true;
    }
}

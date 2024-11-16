import { expect } from 'chai'
import { ethers } from 'hardhat'
import { EventContract, MyToken } from '../typechain-types';


describe("EventContract", function () {
  let token: MyToken;
  let eventContract: EventContract;
  let owner: any, eventCreator: any, user1: any, user2: any, user3: any, eventId: number, eventName: string, eventDate: number, seatLimit: number, tokenRequired: bigint;

  const tokenName = "EventToken";
  const tokenSymbol = "ETK";
  const tokenDecimal = 18;
  const initialSupply = ethers.parseUnits("1000000", tokenDecimal);//1,000,000

  this.beforeEach(async function () {
    [owner, eventCreator, user1, user2, user3] = await ethers.getSigners();

    // Deploy the token contract
    const TokenFactory = await ethers.getContractFactory("MyToken");
    token = await TokenFactory.deploy(tokenName, tokenSymbol, tokenDecimal, initialSupply);
    await token.waitForDeployment();

    // Deploy the event contract
    const EventFactory = await ethers.getContractFactory("EventContract");
    eventContract = await EventFactory.deploy(token.getAddress());
    await eventContract.waitForDeployment();

    // Create an event
    eventName = "Blockchain Conference";
    tokenRequired = ethers.parseUnits("50", 18);
    seatLimit = 100;
    eventDate = Math.floor(Date.now() / 1000) + 3000; //1 hour from now

    await eventContract.connect(owner).createEvent(eventName, seatLimit, tokenRequired, eventDate);

    // Transfer some tokens to user1 and user2
    await token.transfer(user1.address, ethers.parseUnits("100", tokenDecimal)); // 100 tokens
    await token.transfer(user2.address, ethers.parseUnits("100", tokenDecimal)); // 100 tokens
    eventId = 1;

  });



  it("Should allow event creator to create event", async function () {



    const eventDetails = await eventContract.events(eventId);
    // console.log("eventname",eventDetails.eventName)
    expect(eventDetails.eventName).to.equal(eventName);
    expect(eventDetails.endTime).to.equal(eventDate);
    expect(eventDetails.expectedUsers).to.equal(seatLimit);
    expect(eventDetails.tokenRequired).to.equal(tokenRequired);
    expect(eventDetails.eventCreator).to.equal(owner);

  })


  it("Should allow event creators to claim no-show tokens after the event ends", async function () {
    const eventEnd = Math.floor(Date.now() / 1000) + 10; // Ends in 10 seconds
    console.log("Event end time:", eventEnd);

    await eventContract.connect(eventCreator).createEvent(eventName, seatLimit, tokenRequired, eventEnd);

    // User reserves but doesn't check in
    await token.connect(user1).approve(eventContract.getAddress(), tokenRequired);
    await eventContract.connect(user1).reserveSpace(2, "mk");

    // Simulate time passing until after the event ends
    const currentBlockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
    const timeToAdvance = eventEnd - currentBlockTimestamp + 1; // Ensure it's after the event ends
    await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
    await ethers.provider.send("evm_mine", []);


    // Event creator claims refund
    const contractBalanceBefore = await token.balanceOf(eventContract.getAddress());
    await eventContract.connect(eventCreator).claimRefund(2);
    const contractBalanceAfter = await token.balanceOf(eventContract.getAddress());

    expect(contractBalanceBefore).to.equal(tokenRequired);
    expect(contractBalanceAfter).to.equal(0);

    const creatorBalance = await token.balanceOf(eventCreator.address);
    expect(creatorBalance).to.equal(tokenRequired);
  });


  it("Should allow user to reserve a seat and check in", async function () {

    // User approves the EventContract to spend tokens
    await token.connect(user1).approve(eventContract.getAddress(), tokenRequired);


    // User reserves a seat
    const reserveTx = await eventContract
      .connect(user1)
      .reserveSpace(eventId, "MK"); // Event ID is 1
    await reserveTx.wait();



    // Organizer checks in the user
    const checkInTx = await eventContract.connect(owner).checkIn(eventId, user1.address);
    await checkInTx.wait();


    // Fetch the user data to verify
    const isChecedIn = await eventContract.isUserCheckedIn(1, user1.address);
    expect(isChecedIn).to.be.true;
  });

  it("Should allow event creator to checkIn user", async function () {

    await token.connect(user1).approve(eventContract.getAddress(), tokenRequired);

    await eventContract.connect(user1).reserveSpace(eventId, "MK"); // Event ID is 1

    await eventContract.connect(owner).checkIn(eventId,user1.address);

    const reservation = await eventContract.isUserCheckedIn(eventId,user1.address)
    expect(reservation).to.be.true;

    const userBalance = await token.balanceOf(user1.address);
    expect(userBalance).to.equal(ethers.parseUnits("100", tokenDecimal)); 


  })


  it("Should not allow reserving a seat without sufficient token", async function () {
    // Confirm user has 0 tokens
    const userBalance = await token.balanceOf(user3.address);
    expect(userBalance).to.equal(0);

    // Approve the event contract for the required tokens
    await token.connect(user3).approve(eventContract.getAddress(), tokenRequired);

    // Expect the transaction to revert with the custom error
    await expect(
      eventContract.connect(user3).reserveSpace(eventId, "mk")
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
      .withArgs(user3.address, 0, tokenRequired); // Check arguments
  });



  it("Should not allow event Creator to claim fund before event end", async function () {

    await expect(eventContract.connect(owner).claimRefund(eventId)).to.be.rejectedWith("Cannot claim funds before event ends");

  })


  it("should not allow any one other than event creator to claim fund", async function () {
    await expect(eventContract.connect(user1).claimRefund(eventId)).to.be.revertedWith("Only the event creator can claim funds")
  })



})
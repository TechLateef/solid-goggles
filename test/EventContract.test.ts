import {expect} from 'chai'
import { ethers } from 'hardhat'
import { EventContract, MyToken } from '../typechain-types';


describe("EventContract", function() {
  let token: MyToken;
  let eventContract: EventContract;
  let owner: any, eventCreator: any, user1: any, user2: any;

const tokenName = "EventToken";
const tokenSymbol = "ETK";
const tokenDecimal = 18;
const initialSupply = ethers.parseUnits("1000000",tokenDecimal);//1,000,000

this.beforeEach(async function () {
  [owner, eventCreator,user1,user2] = await ethers.getSigners();

  // Deploy the token contract
  const TokenFactory = await ethers.getContractFactory("MyToken");
  token = await TokenFactory.deploy(tokenName,tokenSymbol,tokenDecimal,initialSupply);
  await token.waitForDeployment();

 // Deploy the event contract
 const EventFactory = await ethers.getContractFactory("EventContract");
 eventContract = await EventFactory.deploy(token.getAddress());
 await eventContract.waitForDeployment();

 // Transfer some tokens to user1 and user2
 await token.transfer(user1.address, ethers.parseUnits("100", tokenDecimal)); // 100 tokens
 await token.transfer(user2.address, ethers.parseUnits("100", tokenDecimal)); // 100 tokens
});


it("Should allow event creator to create event", async function () {
  const eventName = "Blockchain Conference";
  const eventDate = Math.floor(Date.now() /1000) + 3000; //1 hour from now
  const maxParticipant = 10;
  const tokenRequired = ethers.parseUnits("10",tokenDecimal); //10 token

  await eventContract.connect(eventCreator).createEvent(eventName,maxParticipant,tokenRequired,eventDate);

  const eventDetails = await eventContract.events(1);
  // console.log("eventname",eventDetails.eventName)
  expect(eventDetails.eventName).to.equal(eventName);
  expect(eventDetails.endTime).to.equal(eventDate);
  expect(eventDetails.expectedUsers).to.equal(maxParticipant);
  expect(eventDetails.tokenRequired).to.equal(tokenRequired);
  expect(eventDetails.eventCreator).to.equal(eventCreator);
  
})

it("Should allow user to reserve a seat and check in", async function () {
  const [organizer, user] = await ethers.getSigners(); // Get signers for the test
  const eventName = "Blockchain Conference";
  const expectedUsers = 100;
  const eventDate = Math.floor(Date.now() /1000) + 3000; //1 hour from now
  const tokenRequired = ethers.parseEther("0.1");

  // Organizer creates the event
  const createTx = await eventContract.connect(organizer).createEvent(eventName,expectedUsers,tokenRequired,eventDate);
  await createTx.wait();

    // Mint tokens for the user
  await token.connect(organizer).mint(user.address, ethers.parseUnits("100", 18)); // Mint 100 tokens for the user

  // User approves the EventContract to spend tokens
  await token.connect(user).approve(eventContract.getAddress(), tokenRequired);

  
  // User reserves a seat
  const reserveTx = await eventContract
    .connect(user)
    .reserveSpace(1, "MK"); // Event ID is 1
  await reserveTx.wait();



  // Organizer checks in the user
  const checkInTx = await eventContract.connect(organizer).checkIn(1, user.address);
  await checkInTx.wait();
  

  // Fetch the user data to verify
  const isChecedIn = await eventContract.isUserCheckedIn(1,user.address);
  expect(isChecedIn).to.be.true;
});

// it("Should not allow reserving a seat without sufficient token", async function() {
//   const [ user] = await ethers.getSigners(); // Get signers for the test

//   const eventName = "Blockchain Bootcamp";
//   const eventDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
//   const maxParticipants = 3;
//   const tokenRequired = ethers.parseUnits("150", tokenDecimal); // 150 tokens

//   await eventContract.connect(eventCreator).createEvent(eventName, eventDate, maxParticipants, tokenRequired);

// //Attempt to reserve a seat without enough token
// await token.connect(user).approve(eventCreator.getAddress(),tokenRequired);
// const reserveTx = await eventContract.connect(user).reserveSpace(1,"mk")
//   await reserveTx.wait()

//  expect(eventCreator.connect(user).reserveSpace(1, "mk").to.revertWith("ERC20: transfer amount exceeds balance"))
// })

})
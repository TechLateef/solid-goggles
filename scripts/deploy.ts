import * as hre from "hardhat";

async function main() {

    console.log("Deploying Token contract");
    const [deployer] = await hre.ethers.getSigners();
    const name = "MyToken";
    const symbol = "MTK";
    const initialSupply = hre.ethers.parseUnits("1000", 18); // 1000 tokens
    const initialOwner = deployer.address;
    const Token = await hre.ethers.getContractFactory("MyToken");

    const token = await Token.deploy(name, symbol, initialSupply, initialOwner);
    await token.waitForDeployment()

    console.log(`Token deployed to: ${token.getAddress()}`)


    // Deploy the Event Contract
    console.log("Deploying Event contract....");
    const EventContract = await hre.ethers.getContractFactory("EventContract");
    const eventContract = await EventContract.deploy(token.getAddress());
    await eventContract.waitForDeployment()

    console.log(`Event contract deployed to: ${eventContract.getAddress()}`)

}
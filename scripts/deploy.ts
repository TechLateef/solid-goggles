import * as hre from "hardhat";

async function main() {
  try {
    console.log("Deploying Token contract");

    const [deployer] = await hre.ethers.getSigners();
    const name = "MyToken";
    const symbol = "MTK";
    const initialSupply = hre.ethers.parseUnits("1000000", 18); // 1000 tokens with 18 decimals
    // const initialOwner = deployer.address;

    const Token = await hre.ethers.getContractFactory("MyToken");
    const token = await Token.deploy(name, symbol, 18,initialSupply);
    await token.waitForDeployment();

    console.log(`Token deployed to: ${token.target}`);

    // Deploy the Event Contract
    console.log("Deploying Event contract...");
    const EventContract = await hre.ethers.getContractFactory("EventContract");
    const eventContract = await EventContract.deploy(token.target);
    await eventContract.waitForDeployment();

    console.log(`Event contract deployed to: ${eventContract.target}`);

  } catch (error) {
    console.error("Error deploying contracts:", error);
  }
}

main().catch((error) => {
  console.error("Main function error:", error);
  process.exitCode = 1;
});

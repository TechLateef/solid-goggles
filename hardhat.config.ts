import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"

const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY
const config: HardhatUserConfig = {
  solidity: "0.8.27",
  networks:{
    sepolia:{
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [SEPOLIA_PRIVATE_KEY!],
     
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  sourcify: {
    enabled: true
  }
    
};

export default config;

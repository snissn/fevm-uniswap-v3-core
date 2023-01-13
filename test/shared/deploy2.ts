import { ContractFactory, Overrides } from "ethers";
import { ethers } from "hardhat";

export async function deploy2(factory:ContractFactory) {
    const feeData = await ethers.provider.getFeeData();
    return factory.deploy({
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(2), 
      maxFeePerGas: feeData. maxFeePerGas?.mul(2), 
      type: 2,
    })
  }

  export async function type2(): Promise<Overrides> {
    const feeData = await ethers.provider.getFeeData();
    return {
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.mul(2), 
      maxFeePerGas: feeData. maxFeePerGas?.mul(2), 
      type: 2,
    }
  }
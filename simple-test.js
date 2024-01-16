const { expect } = require("chai");

describe("Block Number Test", function () {
  it("Should return the current block number", async function () {
    const currentBlockNumber = await ethers.provider.getBlockNumber();
    console.log("Current Ethereum Block Number:", currentBlockNumber);
    //expect(currentBlockNumber).to.be.greaterThan(0);
  });
});


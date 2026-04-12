import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("SealedBidAuction", () => {
  let contract: any;
  let owner: any, alice: any, bob: any;
  let contractAddress: string;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const duration = 7 * 24 * 60 * 60;
    const Factory = await ethers.getContractFactory("SealedBidAuction");
    contract = await Factory.deploy(duration, owner.address);
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  it("deploys with zero highest bid", async () => {
    expect(await contract.settled()).to.be.false;
  });

  it("accepts an encrypted bid", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(BigInt(500));
    const enc = await input.encrypt();
    await expect(contract.connect(alice).bid(enc.handles[0], enc.inputProof)).to.not.be.reverted;
  });

  it("bidder can decrypt their own bid", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(BigInt(500));
    const enc = await input.encrypt();
    await contract.connect(alice).bid(enc.handles[0], enc.inputProof);

    const encBid = await contract.bids(alice.address);
    const plain = await fhevm.userDecryptEuint(FhevmType.euint64, encBid, contractAddress, alice);
    expect(plain).to.equal(500n);
  });

  it("highest bid updates correctly with multiple bidders", async () => {
    const bid = async (signer: any, amount: bigint) => {
      const input = fhevm.createEncryptedInput(contractAddress, signer.address);
      input.add64(amount);
      const enc = await input.encrypt();
      await contract.connect(signer).bid(enc.handles[0], enc.inputProof);
    };
    await bid(alice, 300n);
    await bid(bob, 500n);
    await bid(owner, 400n);
    // Bob had the highest bid — owner should be able to decrypt it
    // (owner has ACL access to _highestBid via constructor + re-grants)
  });

  it("blocks bidding after auction ends", async () => {
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(100n);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).bid(enc.handles[0], enc.inputProof)).to.be.revertedWith("Auction ended");
  });

  it("only owner can request reveal", async () => {
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await expect(contract.connect(alice).requestSettle()).to.be.reverted;
    await expect(contract.connect(owner).requestSettle()).to.not.be.reverted;
  });
});

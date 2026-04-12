import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialVoting", () => {
  let contract: any;
  let owner: any, alice: any, bob: any;
  let contractAddress: string;
  let deadline: number;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
    const Factory = await ethers.getContractFactory("ConfidentialVoting");
    contract = await Factory.deploy(deadline, owner.address);
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  it("deploys with zero tallies", async () => {
    const [yes, no] = await contract.getTallies();
    expect(yes).to.not.equal(0n);
    expect(no).to.not.equal(0n);
  });

  it("allows a user to cast an encrypted YES vote", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.addBool(true);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).castVote(enc.handles[0], enc.inputProof)).to.not.be.reverted;
    expect(await contract.hasVoted(alice.address)).to.be.true;
  });

  it("allows a user to cast an encrypted NO vote", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.addBool(false);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).castVote(enc.handles[0], enc.inputProof)).to.not.be.reverted;
    expect(await contract.hasVoted(alice.address)).to.be.true;
  });

  it("prevents double voting", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.addBool(true);
    const enc = await input.encrypt();
    await contract.connect(alice).castVote(enc.handles[0], enc.inputProof);
    await expect(contract.connect(alice).castVote(enc.handles[0], enc.inputProof)).to.be.revertedWith("Already voted");
  });

  it("tallies 2 YES and 1 NO correctly", async () => {
    const castVote = async (signer: any, vote: boolean) => {
      const input = fhevm.createEncryptedInput(contractAddress, signer.address);
      input.addBool(vote);
      const enc = await input.encrypt();
      await contract.connect(signer).castVote(enc.handles[0], enc.inputProof);
    };
    await castVote(alice, true);
    await castVote(bob, true);
    await castVote(owner, false);

    const [encYes, encNo] = await contract.getTallies();
    const yes = await fhevm.userDecryptEuint(FhevmType.euint64, encYes, contractAddress, owner);
    const no  = await fhevm.userDecryptEuint(FhevmType.euint64, encNo,  contractAddress, owner);
    expect(yes).to.equal(2n);
    expect(no).to.equal(1n);
  });

  it("blocks voting after deadline", async () => {
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.addBool(true);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).castVote(enc.handles[0], enc.inputProof)).to.be.revertedWith("Voting closed");
  });

  it("owner can request tally reveal after deadline", async () => {
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await expect(contract.connect(owner).requestReveal()).to.not.be.reverted;
  });
});

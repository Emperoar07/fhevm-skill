import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ConfidentialVoting } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ConfidentialVotingSepolia", function () {
  let signers: Signers;
  let contract: ConfidentialVoting;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const deployment = await deployments.get("ConfidentialVoting");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("ConfidentialVoting", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags ConfidentialVoting'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      owner: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("cast YES vote and verify hasVoted flag", async function () {
    steps = 4;
    this.timeout(5 * 60000);

    progress(`Encrypting YES vote for alice=${signers.alice.address}...`);
    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    input.addBool(true);
    const enc = await input.encrypt();

    progress(`Casting encrypted YES vote on-chain...`);
    const tx = await contract.connect(signers.alice).castVote(enc.handles[0], enc.inputProof);
    await tx.wait();

    progress(`Checking hasVoted flag for alice...`);
    const voted = await contract.hasVoted(signers.alice.address);
    expect(voted).to.be.true;

    progress(`Done — alice hasVoted = ${voted}`);
  });

  it("two YES votes and one NO vote — tally is correct", async function () {
    steps = 10;
    this.timeout(15 * 60000);

    // Check if alice already voted (from previous test)
    const aliceVoted = await contract.hasVoted(signers.alice.address);
    const bobVoted = await contract.hasVoted(signers.bob.address);
    const ownerVoted = await contract.hasVoted(signers.owner.address);

    if (!aliceVoted) {
      progress(`Encrypting YES vote for alice...`);
      const enc = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(true).encrypt();
      const tx = await contract.connect(signers.alice).castVote(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Alice already voted — skipping`);
    }

    if (!bobVoted) {
      progress(`Encrypting YES vote for bob=${signers.bob.address}...`);
      const enc = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).addBool(true).encrypt();
      const tx = await contract.connect(signers.bob).castVote(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Bob already voted — skipping`);
    }

    if (!ownerVoted) {
      progress(`Encrypting NO vote for owner=${signers.owner.address}...`);
      const enc = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).addBool(false).encrypt();
      const tx = await contract.connect(signers.owner).castVote(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Owner already voted — skipping`);
    }

    progress(`Fetching encrypted tallies...`);
    const [encYes, encNo] = await contract.getTallies();
    expect(encYes).to.not.eq(ethers.ZeroHash);
    expect(encNo).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting YES tally via relayer...`);
    const yesCount = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encYes,
      contractAddress,
      signers.owner,
    );
    progress(`YES tally = ${yesCount}`);

    progress(`Decrypting NO tally via relayer...`);
    const noCount = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encNo,
      contractAddress,
      signers.owner,
    );
    progress(`NO tally = ${noCount}`);

    // At least 2 YES and 1 NO (may be higher if re-deployed contract accumulated votes)
    expect(yesCount).to.be.gte(2n);
    expect(noCount).to.be.gte(1n);

    progress(`Tally verified: YES=${yesCount} NO=${noCount}`);
  });

  it("double vote is rejected", async function () {
    steps = 3;
    this.timeout(5 * 60000);

    progress(`Checking if alice has already voted...`);
    const aliceVoted = await contract.hasVoted(signers.alice.address);

    if (!aliceVoted) {
      // Cast a first vote so alice has voted
      progress(`Alice has not voted yet — casting first vote...`);
      const enc = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(true).encrypt();
      const tx = await contract.connect(signers.alice).castVote(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Alice already voted — testing double vote rejection...`);
    }

    progress(`Attempting second vote from alice — should revert...`);
    const enc2 = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).addBool(false).encrypt();
    await expect(
      contract.connect(signers.alice).castVote(enc2.handles[0], enc2.inputProof)
    ).to.be.revertedWith("Already voted");

    progress(`Double vote correctly rejected`);
  });
});

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ConfidentialSalary } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ConfidentialSalarySepolia", function () {
  let signers: Signers;
  let contract: ConfidentialSalary;
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
      const deployment = await deployments.get("ConfidentialSalary");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("ConfidentialSalary", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags ConfidentialSalary'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => { step = 0; steps = 0; });

  it("employee submits encrypted salary and decrypts own value", async function () {
    steps = 6;
    this.timeout(10 * 60000);

    const aliceSubmitted = await contract.hasSubmitted(signers.alice.address);

    if (!aliceSubmitted) {
      progress(`Encrypting salary 5000 for alice=${signers.alice.address}...`);
      const enc = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(5000n)
        .encrypt();

      progress(`Submitting salary on-chain...`);
      const tx = await contract.connect(signers.alice).submitSalary(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Alice already submitted — skipping`);
      step++;
    }

    progress(`Fetching alice encrypted salary handle...`);
    const encSalary = await contract.connect(signers.alice).getMySalary();
    expect(encSalary).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting alice salary via relayer...`);
    const clearSalary = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encSalary,
      contractAddress,
      signers.alice,
    );
    progress(`Alice salary = ${clearSalary}`);
    expect(clearSalary).to.be.gte(5000n);

    progress(`Done — individual salary submit and decrypt confirmed`);
  });

  it("owner decrypts encrypted aggregate total after multiple submissions", async function () {
    steps = 10;
    this.timeout(20 * 60000);

    const aliceSubmitted = await contract.hasSubmitted(signers.alice.address);
    const bobSubmitted = await contract.hasSubmitted(signers.bob.address);

    if (!aliceSubmitted) {
      progress(`Alice submitting salary 5000...`);
      const enc = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(5000n)
        .encrypt();
      const tx = await contract.connect(signers.alice).submitSalary(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Alice already submitted — skipping`);
    }

    if (!bobSubmitted) {
      progress(`Bob submitting salary 7000...`);
      const enc = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(7000n)
        .encrypt();
      const tx = await contract.connect(signers.bob).submitSalary(enc.handles[0], enc.inputProof);
      await tx.wait();
    } else {
      progress(`Bob already submitted — skipping`);
    }

    progress(`Fetching encrypted total as owner...`);
    const encTotal = await contract.connect(signers.owner).getTotal();
    expect(encTotal).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting aggregate total via relayer...`);
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encTotal,
      contractAddress,
      signers.owner,
    );
    progress(`Aggregate total = ${clearTotal}`);
    expect(clearTotal).to.be.gte(12000n);

    progress(`Done — encrypted running total confirmed`);
  });

  it("double submission is rejected", async function () {
    steps = 3;
    this.timeout(10 * 60000);

    progress(`Checking if alice already submitted...`);
    const aliceSubmitted = await contract.hasSubmitted(signers.alice.address);

    if (!aliceSubmitted) {
      const enc = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(5000n)
        .encrypt();
      await contract.connect(signers.alice).submitSalary(enc.handles[0], enc.inputProof);
    }

    progress(`Attempting second submission from alice — should revert...`);
    const enc2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(9999n)
      .encrypt();
    await expect(
      contract.connect(signers.alice).submitSalary(enc2.handles[0], enc2.inputProof)
    ).to.be.revertedWith("Already submitted");

    progress(`Double submission correctly rejected`);
  });
});

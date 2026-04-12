import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialSalary", () => {
  let contract: any;
  let owner: any, alice: any, bob: any, carol: any;
  let contractAddress: string;

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialSalary");
    contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  it("deploys with zero count and zero total", async () => {
    expect(await contract.employeeCount()).to.equal(0n);
    expect(await contract.surveyClosed()).to.be.false;
  });

  it("employee can submit an encrypted salary", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(50000n);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof)).to.not.be.reverted;
    expect(await contract.employeeCount()).to.equal(1n);
    expect(await contract.hasSubmitted(alice.address)).to.be.true;
  });

  it("employee can decrypt their own salary", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(75000n);
    const enc = await input.encrypt();
    await contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof);

    const encSalary = await contract.connect(alice).getMySalary();
    const plain = await fhevm.userDecryptEuint(FhevmType.euint64, encSalary, contractAddress, alice);
    expect(plain).to.equal(75000n);
  });

  it("prevents double submission", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(50000n);
    const enc = await input.encrypt();
    await contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof);
    await expect(contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof)).to.be.revertedWith("Already submitted");
  });

  it("blocks submission after survey is closed", async () => {
    await contract.connect(owner).closeSurvey();
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(50000n);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof)).to.be.revertedWith("Survey is closed");
  });

  it("owner can read encrypted total after submissions", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(50000n);
    const enc = await input.encrypt();
    await contract.connect(alice).submitSalary(enc.handles[0], enc.inputProof);

    const encTotal = await contract.connect(owner).getTotal();
    const total = await fhevm.userDecryptEuint(FhevmType.euint64, encTotal, contractAddress, owner);
    expect(total).to.equal(50000n);
  });

  it("non-owner cannot read encrypted total", async () => {
    await expect(contract.connect(alice).getTotal()).to.be.reverted;
  });

  it("only owner can close survey", async () => {
    await expect(contract.connect(alice).closeSurvey()).to.be.reverted;
    await expect(contract.connect(owner).closeSurvey()).to.not.be.reverted;
  });

  it("only owner can request reveal", async () => {
    await expect(contract.connect(alice).requestReveal()).to.be.reverted;
    await expect(contract.connect(owner).requestReveal()).to.not.be.reverted;
  });

  it("full flow: 3 employees, owner reads correct total", async () => {
    const submit = async (signer: any, amount: bigint) => {
      const input = fhevm.createEncryptedInput(contractAddress, signer.address);
      input.add64(amount);
      const enc = await input.encrypt();
      await contract.connect(signer).submitSalary(enc.handles[0], enc.inputProof);
    };
    await submit(alice, 60000n);
    await submit(bob,   80000n);
    await submit(carol, 70000n);

    expect(await contract.employeeCount()).to.equal(3n);

    const encTotal = await contract.connect(owner).getTotal();
    const total = await fhevm.userDecryptEuint(FhevmType.euint64, encTotal, contractAddress, owner);
    expect(total).to.equal(210000n);
  });
});

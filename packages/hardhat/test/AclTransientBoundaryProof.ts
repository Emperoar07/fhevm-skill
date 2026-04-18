import { fhevm } from "hardhat";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("AclTransientBoundaryProof", () => {
  let contract: any;
  let alice: any;
  let contractAddress: string;

  beforeEach(async () => {
    [, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AclTransientBoundaryProof");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  async function encryptForAlice(value: bigint) {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(value);
    return input.encrypt();
  }

  it("shows transient access is visible in the creating transaction", async () => {
    const enc = await encryptForAlice(7n);
    expect(
      await contract.connect(alice).storeWithTransientOnly.staticCall(enc.handles[0], enc.inputProof)
    ).to.equal(true);
  });

  it("does not treat transient access as durable across later transactions", async () => {
    const enc = await encryptForAlice(11n);
    await contract.connect(alice).storeWithTransientOnly(enc.handles[0], enc.inputProof);
    expect(await contract.connect(alice).callerHasAccessNow()).to.equal(false);
  });

  it("keeps persistent access across later transactions", async () => {
    const enc = await encryptForAlice(13n);
    await contract.connect(alice).storeWithPersistentAccess(enc.handles[0], enc.inputProof);
    expect(await contract.connect(alice).callerHasAccessNow()).to.equal(true);
  });
});

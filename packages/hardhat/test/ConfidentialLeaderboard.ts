import { fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("ConfidentialLeaderboard", () => {
  let contract: any;
  let owner: any, alice: any, bob: any;
  let contractAddress: string;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialLeaderboard");
    contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  it("accepts an encrypted score submission", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(100n);
    const enc = await input.encrypt();
    await expect(contract.connect(alice).submitScore(enc.handles[0], enc.inputProof)).to.not.be.reverted;
  });

  it("player can decrypt their personal best", async () => {
    const input = fhevm.createEncryptedInput(contractAddress, alice.address);
    input.add64(42n);
    const enc = await input.encrypt();
    await contract.connect(alice).submitScore(enc.handles[0], enc.inputProof);

    const pbHandle = await contract.getPersonalBest(alice.address);
    const pb = await fhevm.userDecryptEuint(FhevmType.euint64, pbHandle, contractAddress, alice);
    expect(pb).to.equal(42n);
  });

  it("personal best updates when a higher score is submitted", async () => {
    const submit = async (score: bigint) => {
      const input = fhevm.createEncryptedInput(contractAddress, alice.address);
      input.add64(score);
      const enc = await input.encrypt();
      await contract.connect(alice).submitScore(enc.handles[0], enc.inputProof);
    };
    await submit(50n);
    await submit(80n);

    const pbHandle = await contract.getPersonalBest(alice.address);
    const pb = await fhevm.userDecryptEuint(FhevmType.euint64, pbHandle, contractAddress, alice);
    expect(pb).to.equal(80n);
  });

  it("personal best does not decrease on lower score", async () => {
    const submit = async (score: bigint) => {
      const input = fhevm.createEncryptedInput(contractAddress, alice.address);
      input.add64(score);
      const enc = await input.encrypt();
      await contract.connect(alice).submitScore(enc.handles[0], enc.inputProof);
    };
    await submit(80n);
    await submit(30n);

    const pbHandle = await contract.getPersonalBest(alice.address);
    const pb = await fhevm.userDecryptEuint(FhevmType.euint64, pbHandle, contractAddress, alice);
    expect(pb).to.equal(80n);
  });

  it("multiple players can submit scores", async () => {
    const submitFor = async (signer: any, score: bigint) => {
      const input = fhevm.createEncryptedInput(contractAddress, signer.address);
      input.add64(score);
      const enc = await input.encrypt();
      await contract.connect(signer).submitScore(enc.handles[0], enc.inputProof);
    };
    await submitFor(alice, 100n);
    await submitFor(bob, 200n);
    await submitFor(owner, 150n);

    const alicePB = await fhevm.userDecryptEuint(FhevmType.euint64, await contract.getPersonalBest(alice.address), contractAddress, alice);
    const bobPB   = await fhevm.userDecryptEuint(FhevmType.euint64, await contract.getPersonalBest(bob.address),   contractAddress, bob);
    expect(alicePB).to.equal(100n);
    expect(bobPB).to.equal(200n);
  });

  it("only owner can request reveal", async () => {
    await expect(contract.connect(alice).requestReveal()).to.be.reverted;
    await expect(contract.connect(owner).requestReveal()).to.not.be.reverted;
  });
});

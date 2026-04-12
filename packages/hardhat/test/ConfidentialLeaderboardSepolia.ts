import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ConfidentialLeaderboard } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ConfidentialLeaderboardSepolia", function () {
  let signers: Signers;
  let contract: ConfidentialLeaderboard;
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
      const deployment = await deployments.get("ConfidentialLeaderboard");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("ConfidentialLeaderboard", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags ConfidentialLeaderboard'";
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

  it("submit score and decrypt personal best", async function () {
    steps = 6;
    this.timeout(10 * 60000);

    progress(`Encrypting score 42 for alice=${signers.alice.address}...`);
    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(42n)
      .encrypt();

    progress(`Submitting score on-chain...`);
    const tx = await contract.connect(signers.alice).submitScore(enc.handles[0], enc.inputProof);
    await tx.wait();

    progress(`Fetching alice personal best handle...`);
    const pbHandle = await contract.getPersonalBest(signers.alice.address);
    expect(pbHandle).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting personal best via relayer...`);
    const pb = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      pbHandle,
      contractAddress,
      signers.alice,
    );
    progress(`Alice personal best = ${pb}`);
    expect(pb).to.be.gte(42n);

    progress(`Done — FHE.isInitialized + personal best confirmed`);
  });

  it("personal best updates on higher score — FHE.select confirmed", async function () {
    steps = 10;
    this.timeout(15 * 60000);

    progress(`Submitting score 50 for alice...`);
    const enc1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(50n)
      .encrypt();
    const tx1 = await contract.connect(signers.alice).submitScore(enc1.handles[0], enc1.inputProof);
    await tx1.wait();

    progress(`Decrypting alice personal best after score 50...`);
    const pb1 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.getPersonalBest(signers.alice.address),
      contractAddress,
      signers.alice,
    );
    progress(`Alice personal best = ${pb1}`);

    progress(`Submitting higher score 200 for alice...`);
    const enc2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(200n)
      .encrypt();
    const tx2 = await contract.connect(signers.alice).submitScore(enc2.handles[0], enc2.inputProof);
    await tx2.wait();

    progress(`Decrypting alice personal best after score 200...`);
    const pb2 = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.getPersonalBest(signers.alice.address),
      contractAddress,
      signers.alice,
    );
    progress(`Alice personal best after 200 = ${pb2}`);
    expect(pb2).to.be.gte(pb1);
    expect(pb2).to.be.gte(200n);

    progress(`FHE.select personal best update confirmed`);
  });

  it("multiple players — each decrypts their own personal best", async function () {
    steps = 10;
    this.timeout(20 * 60000);

    progress(`Alice submits score 100...`);
    const encAlice = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(100n)
      .encrypt();
    const tx1 = await contract.connect(signers.alice).submitScore(encAlice.handles[0], encAlice.inputProof);
    await tx1.wait();

    progress(`Bob submits score 300...`);
    const encBob = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add64(300n)
      .encrypt();
    const tx2 = await contract.connect(signers.bob).submitScore(encBob.handles[0], encBob.inputProof);
    await tx2.wait();

    progress(`Decrypting alice personal best...`);
    const alicePB = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.getPersonalBest(signers.alice.address),
      contractAddress,
      signers.alice,
    );
    progress(`Alice personal best = ${alicePB}`);
    expect(alicePB).to.be.gte(100n);

    progress(`Decrypting bob personal best...`);
    const bobPB = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.getPersonalBest(signers.bob.address),
      contractAddress,
      signers.bob,
    );
    progress(`Bob personal best = ${bobPB}`);
    expect(bobPB).to.be.gte(300n);

    progress(`Multi-player personal best isolation confirmed`);
  });
});

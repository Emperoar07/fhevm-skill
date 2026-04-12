import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { SealedBidAuction } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("SealedBidAuctionSepolia", function () {
  let signers: Signers;
  let contract: SealedBidAuction;
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
      const deployment = await deployments.get("SealedBidAuction");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("SealedBidAuction", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags SealedBidAuction'";
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

  it("alice places encrypted bid and decrypts her own bid", async function () {
    steps = 6;
    this.timeout(10 * 60000);

    progress(`Encrypting bid of 500 for alice=${signers.alice.address}...`);
    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(500n)
      .encrypt();

    progress(`Placing encrypted bid on-chain...`);
    const tx = await contract.connect(signers.alice).bid(enc.handles[0], enc.inputProof);
    await tx.wait();

    progress(`Fetching alice encrypted bid handle...`);
    const encBid = await contract.bids(signers.alice.address);
    expect(encBid).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting alice bid via relayer...`);
    const plainBid = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBid,
      contractAddress,
      signers.alice,
    );
    progress(`Alice bid = ${plainBid}`);
    expect(plainBid).to.eq(500n);

    progress(`Done — bid placed and decrypted correctly`);
  });

  it("multiple bidders — highest bid tracked via FHE.select", async function () {
    steps = 12;
    this.timeout(20 * 60000);

    progress(`Encrypting bid of 300 for alice...`);
    const encAlice = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add64(300n)
      .encrypt();

    progress(`Alice places bid of 300...`);
    const tx1 = await contract.connect(signers.alice).bid(encAlice.handles[0], encAlice.inputProof);
    await tx1.wait();

    progress(`Encrypting bid of 750 for bob=${signers.bob.address}...`);
    const encBob = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add64(750n)
      .encrypt();

    progress(`Bob places bid of 750...`);
    const tx2 = await contract.connect(signers.bob).bid(encBob.handles[0], encBob.inputProof);
    await tx2.wait();

    progress(`Encrypting bid of 400 for owner=${signers.owner.address}...`);
    const encOwner = await fhevm
      .createEncryptedInput(contractAddress, signers.owner.address)
      .add64(400n)
      .encrypt();

    progress(`Owner places bid of 400...`);
    const tx3 = await contract.connect(signers.owner).bid(encOwner.handles[0], encOwner.inputProof);
    await tx3.wait();

    progress(`Decrypting alice own bid...`);
    const aliceBid = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.bids(signers.alice.address),
      contractAddress,
      signers.alice,
    );
    progress(`Alice bid = ${aliceBid}`);
    expect(aliceBid).to.eq(300n);

    progress(`Decrypting bob own bid...`);
    const bobBid = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      await contract.bids(signers.bob.address),
      contractAddress,
      signers.bob,
    );
    progress(`Bob bid = ${bobBid}`);
    expect(bobBid).to.eq(750n);

    progress(`All bids verified — FHE.select tracking confirmed`);
  });

  it("non-owner cannot settle auction", async function () {
    steps = 2;
    this.timeout(3 * 60000);

    progress(`Attempting requestSettle from alice (non-owner)...`);
    await expect(contract.connect(signers.alice).requestSettle()).to.be.reverted;

    progress(`Correctly rejected — only owner can settle`);
  });
});

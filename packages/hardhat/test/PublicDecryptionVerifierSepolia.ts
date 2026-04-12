import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { PublicDecryptionVerifier } from "../types";
import { expect } from "chai";
import { encryptWithRetry } from "./helpers/sepoliaRetry";

type Signers = {
  owner: HardhatEthersSigner;
};

describe("PublicDecryptionVerifierSepolia", function () {
  let signers: Signers;
  let contract: PublicDecryptionVerifier;
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
      const deployment = await deployments.get("PublicDecryptionVerifier");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("PublicDecryptionVerifier", deployment.address);
    } catch (e) {
      (e as Error).message +=
        ". Call 'npx hardhat deploy --network sepolia --tags PublicDecryptionVerifier'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("stores 3 encrypted values, marks public, gets proof, verifies 3-handle checkSignatures", async function () {
    steps = 8;
    this.timeout(15 * 60000);

    // If already verified from a prior run, we can still re-verify — the contract allows it
    progress(`Encrypting values 100, 200, 300 for owner=${signers.owner.address}...`);

    const encA = await encryptWithRetry(contractAddress, signers.owner.address, i => i.add64(100n));
    const encB = await encryptWithRetry(contractAddress, signers.owner.address, i => i.add64(200n));
    const encC = await encryptWithRetry(contractAddress, signers.owner.address, i => i.add64(300n));

    progress(`Storing encrypted values on-chain...`);
    const storeTx = await contract.connect(signers.owner).storeValues(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof,
      encC.handles[0], encC.inputProof,
    );
    await storeTx.wait();

    progress(`Calling revealAll() to mark handles for public decryption...`);
    const revealTx = await contract.connect(signers.owner).revealAll();
    await revealTx.wait();

    progress(`Fetching handles from contract...`);
    const [handleA, handleB, handleC] = await contract.getHandles();
    console.log(`  handleA=${handleA}`);
    console.log(`  handleB=${handleB}`);
    console.log(`  handleC=${handleC}`);

    progress(`Calling fhevm.publicDecrypt([handleA, handleB, handleC])...`);
    const results = await fhevm.publicDecrypt([handleA, handleB, handleC]);
    console.log(`  clearValues=${JSON.stringify(results.clearValues, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2)}`);
    console.log(`  decryptionProof=${results.decryptionProof.slice(0, 20)}...`);

    // Extract the cleartext values — keyed by handle hex
    const cleartextA = BigInt(String(results.clearValues[handleA]));
    const cleartextB = BigInt(String(results.clearValues[handleB]));
    const cleartextC = BigInt(String(results.clearValues[handleC]));
    console.log(`  cleartextA=${cleartextA}, cleartextB=${cleartextB}, cleartextC=${cleartextC}`);

    progress(`Calling verify(${cleartextA}, ${cleartextB}, ${cleartextC}, proof) on-chain...`);
    const verifyTx = await contract.connect(signers.owner).verify(
      cleartextA,
      cleartextB,
      cleartextC,
      results.decryptionProof,
    );
    await verifyTx.wait();

    progress(`Asserting on-chain state...`);
    const revealed = await contract.revealed();
    expect(revealed).to.be.true;

    const storedA = await contract.cleartextA();
    const storedB = await contract.cleartextB();
    const storedC = await contract.cleartextC();
    expect(storedA).to.eq(cleartextA);
    expect(storedB).to.eq(cleartextB);
    expect(storedC).to.eq(cleartextC);
    expect(storedA).to.eq(100n);
    expect(storedB).to.eq(200n);
    expect(storedC).to.eq(300n);

    progress(`GAP-002 closed — FHE.checkSignatures with 3 handles verified end-to-end`);
  });
});

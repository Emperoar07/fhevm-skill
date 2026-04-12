import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ConfidentialToken } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ConfidentialTokenSepolia", function () {
  let signers: Signers;
  let token: ConfidentialToken;
  let tokenAddress: string;
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
      const deployment = await deployments.get("ConfidentialToken");
      tokenAddress = deployment.address;
      token = await ethers.getContractAt("ConfidentialToken", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags ConfidentialToken'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("mint then decrypt balance", async function () {
    steps = 6;
    this.timeout(5 * 60000);

    progress(`Minting 100 tokens to alice=${signers.alice.address}...`);
    const tx = await token.connect(signers.alice).mint(signers.alice.address, 100);
    await tx.wait();

    progress(`Fetching encrypted balance handle for alice...`);
    const encBalance = await token.balanceOf(signers.alice.address);
    expect(encBalance).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting alice balance via relayer (handle=${encBalance})...`);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBalance,
      tokenAddress,
      signers.alice,
    );
    progress(`Alice clear balance = ${clearBalance}`);
    expect(clearBalance).to.be.gte(100n);
  });

  it("confidential transfer then decrypt both balances", async function () {
    steps = 10;
    this.timeout(10 * 60000);

    progress(`Minting 200 tokens to alice...`);
    const mintTx = await token.connect(signers.alice).mint(signers.alice.address, 200);
    await mintTx.wait();

    progress(`Reading alice balance before transfer...`);
    const encBefore = await token.balanceOf(signers.alice.address);
    const aliceBefore = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBefore,
      tokenAddress,
      signers.alice,
    );
    progress(`Alice balance before transfer = ${aliceBefore}`);

    progress(`Encrypting transfer amount of 50 to bob=${signers.bob.address}...`);
    const encInput = await fhevm
      .createEncryptedInput(tokenAddress, signers.alice.address)
      .add64(50)
      .encrypt();

    progress(`Calling confidentialTransfer(bob, 50)...`);
    const transferTx = await token
      .connect(signers.alice)
      .confidentialTransfer(signers.bob.address, encInput.handles[0], encInput.inputProof);
    await transferTx.wait();

    progress(`Decrypting alice balance after transfer...`);
    const encAliceAfter = await token.balanceOf(signers.alice.address);
    const aliceAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encAliceAfter,
      tokenAddress,
      signers.alice,
    );
    progress(`Alice balance after transfer = ${aliceAfter}`);
    expect(aliceBefore - aliceAfter).to.eq(50n);

    progress(`Decrypting bob balance after transfer...`);
    const encBobAfter = await token.balanceOf(signers.bob.address);
    const bobAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBobAfter,
      tokenAddress,
      signers.bob,
    );
    progress(`Bob balance after transfer = ${bobAfter}`);
    expect(bobAfter).to.be.gte(50n);
  });

  it("confidential burn reduces balance", async function () {
    steps = 8;
    this.timeout(10 * 60000);

    progress(`Minting 100 tokens to alice for burn test...`);
    const mintTx = await token.connect(signers.alice).mint(signers.alice.address, 100);
    await mintTx.wait();

    progress(`Reading alice balance before burn...`);
    const encBefore = await token.balanceOf(signers.alice.address);
    const aliceBefore = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBefore,
      tokenAddress,
      signers.alice,
    );
    progress(`Alice balance before burn = ${aliceBefore}`);

    progress(`Encrypting burn amount of 30...`);
    const encBurn = await fhevm
      .createEncryptedInput(tokenAddress, signers.alice.address)
      .add64(30)
      .encrypt();

    progress(`Calling confidentialBurn(30)...`);
    const burnTx = await token
      .connect(signers.alice)
      .confidentialBurn(encBurn.handles[0], encBurn.inputProof);
    await burnTx.wait();

    progress(`Decrypting alice balance after burn...`);
    const encAfter = await token.balanceOf(signers.alice.address);
    const aliceAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encAfter,
      tokenAddress,
      signers.alice,
    );
    progress(`Alice balance after burn = ${aliceAfter}`);
    expect(aliceBefore - aliceAfter).to.eq(30n);
  });
});

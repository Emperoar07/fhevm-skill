import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

describe("Euint256OpsProof", function () {
  let alice: HardhatEthersSigner;
  let contract: any;
  let contractAddress: string;

  before(async function () {
    [alice] = await ethers.getSigners();
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    const factory = await ethers.getContractFactory("Euint256OpsProof");
    contract = await factory.deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
  });

  async function compute(a: bigint, b: bigint) {
    const encA = await fhevm.createEncryptedInput(contractAddress, alice.address).add256(a).encrypt();
    const encB = await fhevm.createEncryptedInput(contractAddress, alice.address).add256(b).encrypt();

    const tx = await contract.connect(alice).compute(encA.handles[0], encA.inputProof, encB.handles[0], encB.inputProof);
    await tx.wait();
  }

  it("supports the documented euint256 bitwise operations", async function () {
    const a = 0xf0n;
    const b = 0xccn;
    const maxUint256 = (1n << 256n) - 1n;

    await compute(a, b);

    const xorValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getXorValue(),
      contractAddress,
      alice,
    );
    const andValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getAndValue(),
      contractAddress,
      alice,
    );
    const orValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getOrValue(),
      contractAddress,
      alice,
    );
    const notValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getNotValue(),
      contractAddress,
      alice,
    );
    const isEqual = await fhevm.userDecryptEbool(await contract.getEqualFlag(), contractAddress, alice);
    const isNotEqual = await fhevm.userDecryptEbool(await contract.getNotEqualFlag(), contractAddress, alice);
    const selectedValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getSelectedValue(),
      contractAddress,
      alice,
    );

    expect(xorValue).to.equal(a ^ b);
    expect(andValue).to.equal(a & b);
    expect(orValue).to.equal(a | b);
    expect(notValue).to.equal(maxUint256 ^ a);
    expect(isEqual).to.equal(false);
    expect(isNotEqual).to.equal(true);
    expect(selectedValue).to.equal(b);
  });

  it("supports eq, ne, and select for equal operands", async function () {
    const value = 0x1234_5678_9abc_def0n;

    await compute(value, value);

    const isEqual = await fhevm.userDecryptEbool(await contract.getEqualFlag(), contractAddress, alice);
    const isNotEqual = await fhevm.userDecryptEbool(await contract.getNotEqualFlag(), contractAddress, alice);
    const selectedValue = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      await contract.getSelectedValue(),
      contractAddress,
      alice,
    );

    expect(isEqual).to.equal(true);
    expect(isNotEqual).to.equal(false);
    expect(selectedValue).to.equal(value);
  });
});

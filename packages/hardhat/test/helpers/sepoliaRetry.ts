/**
 * Retry helpers for Sepolia tests.
 *
 * The Zama relayer occasionally drops connections (ECONNRESET) under load.
 * These helpers wrap createEncryptedInput and userDecryptEuint with automatic
 * retries so transient network failures don't fail the test suite.
 */

import { fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";

const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("fetch failed") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("RelayerV2FetchError")
  );
}

/**
 * Encrypt an input with retry on relayer connection errors.
 * Usage: same as fhevm.createEncryptedInput(...).addXX(val).encrypt()
 */
export async function encryptWithRetry(
  contractAddress: string,
  userAddress: string,
  addFn: (input: ReturnType<typeof fhevm.createEncryptedInput>) => ReturnType<typeof fhevm.createEncryptedInput>,
  retries = DEFAULT_RETRIES
): Promise<Awaited<ReturnType<ReturnType<typeof fhevm.createEncryptedInput>["encrypt"]>>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const input = fhevm.createEncryptedInput(contractAddress, userAddress);
      return await addFn(input).encrypt();
    } catch (err) {
      if (attempt < retries && isRetryableError(err)) {
        console.log(`  [retry ${attempt}/${retries}] Relayer connection error — retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  throw new Error("encryptWithRetry exhausted all retries");
}

/**
 * Decrypt a euint handle with retry on relayer connection errors.
 */
export async function decryptWithRetry(
  type: FhevmType,
  handle: bigint,
  contractAddress: string,
  signer: HardhatEthersSigner,
  retries = DEFAULT_RETRIES
): Promise<bigint> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fhevm.userDecryptEuint(type, handle, contractAddress, signer);
    } catch (err) {
      if (attempt < retries && isRetryableError(err)) {
        console.log(`  [retry ${attempt}/${retries}] Relayer connection error — retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  throw new Error("decryptWithRetry exhausted all retries");
}

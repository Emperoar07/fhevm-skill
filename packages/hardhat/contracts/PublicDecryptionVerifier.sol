// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title PublicDecryptionVerifier
/// @notice Validates FHE.checkSignatures with 3 handles.
///         GAP-002 closure contract — proves the 3-handle public decryption
///         proof flow works end-to-end on Sepolia.
///
/// Flow:
///   1. Owner stores three encrypted values (a, b, c).
///   2. Owner calls revealAll() — marks all three for public decryption.
///   3. Off-chain: frontend calls publicDecrypt([handleA, handleB, handleC]).
///   4. Anyone calls verify(a, b, c, proof) — contract checks the 3-handle proof.
///   5. If valid, stores the revealed plaintext values.
contract PublicDecryptionVerifier is ZamaEthereumConfig, Ownable2Step {

    euint64 private _valueA;
    euint64 private _valueB;
    euint64 private _valueC;

    bool    public revealed;
    uint64  public cleartextA;
    uint64  public cleartextB;
    uint64  public cleartextC;

    event ValuesStored();
    event RevealRequested(bytes32 handleA, bytes32 handleB, bytes32 handleC);
    event ProofVerified(uint64 a, uint64 b, uint64 c);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Store three encrypted values. Owner only.
    function storeValues(
        externalEuint64 encA, bytes calldata proofA,
        externalEuint64 encB, bytes calldata proofB,
        externalEuint64 encC, bytes calldata proofC
    ) external onlyOwner {
        _valueA = FHE.fromExternal(encA, proofA);
        _valueB = FHE.fromExternal(encB, proofB);
        _valueC = FHE.fromExternal(encC, proofC);

        FHE.allowThis(_valueA);
        FHE.allow(_valueA, owner());
        FHE.allowThis(_valueB);
        FHE.allow(_valueB, owner());
        FHE.allowThis(_valueC);
        FHE.allow(_valueC, owner());

        emit ValuesStored();
    }

    /// @notice Mark all three handles for public decryption.
    ///         After calling this, pass the 3 handles to the relayer publicDecrypt.
    function revealAll() external onlyOwner {
        FHE.makePubliclyDecryptable(_valueA);
        FHE.makePubliclyDecryptable(_valueB);
        FHE.makePubliclyDecryptable(_valueC);

        emit RevealRequested(
            FHE.toBytes32(_valueA),
            FHE.toBytes32(_valueB),
            FHE.toBytes32(_valueC)
        );
    }

    /// @notice Verify a 3-handle public decryption proof.
    ///         handles[] order MUST match the order used in the publicDecrypt call.
    ///         Stores the revealed values on success.
    /// @param a  Claimed plaintext for _valueA
    /// @param b  Claimed plaintext for _valueB
    /// @param c  Claimed plaintext for _valueC
    /// @param decryptionProof  Proof returned by the relayer publicDecrypt call
    function verify(
        uint64 a,
        uint64 b,
        uint64 c,
        bytes calldata decryptionProof
    ) external {
        bytes32[] memory handles = new bytes32[](3);
        handles[0] = FHE.toBytes32(_valueA);
        handles[1] = FHE.toBytes32(_valueB);
        handles[2] = FHE.toBytes32(_valueC);

        // abi.encode must match the exact order of handles
        bytes memory cleartexts = abi.encode(a, b, c);

        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        // Proof valid — store results
        cleartextA = a;
        cleartextB = b;
        cleartextC = c;
        revealed = true;

        emit ProofVerified(a, b, c);
    }

    /// @notice Return all three handle bytes32 values for use in publicDecrypt.
    function getHandles() external view returns (bytes32, bytes32, bytes32) {
        return (
            FHE.toBytes32(_valueA),
            FHE.toBytes32(_valueB),
            FHE.toBytes32(_valueC)
        );
    }
}

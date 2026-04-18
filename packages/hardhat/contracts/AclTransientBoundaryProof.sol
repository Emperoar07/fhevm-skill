// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Local proof helper for ACL boundary behavior.
/// @dev This contract does not simulate a real chain re-org. It proves the narrower rule
///      that transient access is a same-transaction tool and should not be treated as
///      durable access across later transactions.
contract AclTransientBoundaryProof is ZamaEthereumConfig {
    euint64 private _stored;

    function storeWithTransientOnly(
        externalEuint64 encValue,
        bytes calldata inputProof
    ) external returns (bool accessGrantedInSameTx) {
        _stored = FHE.fromExternal(encValue, inputProof);
        FHE.allowThis(_stored);
        FHE.allowTransient(_stored, msg.sender);
        return FHE.isSenderAllowed(_stored);
    }

    function storeWithPersistentAccess(
        externalEuint64 encValue,
        bytes calldata inputProof
    ) external returns (bool accessGrantedInSameTx) {
        _stored = FHE.fromExternal(encValue, inputProof);
        FHE.allowThis(_stored);
        FHE.allow(_stored, msg.sender);
        return FHE.isSenderAllowed(_stored);
    }

    function callerHasAccessNow() external view returns (bool) {
        return FHE.isSenderAllowed(_stored);
    }
}

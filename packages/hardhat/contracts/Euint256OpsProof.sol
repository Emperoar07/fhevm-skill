// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint256, ebool, externalEuint256 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Euint256OpsProof
/// @notice Local validation contract for the documented euint256 operation surface.
contract Euint256OpsProof is ZamaEthereumConfig {
    euint256 private _xorValue;
    euint256 private _andValue;
    euint256 private _orValue;
    euint256 private _notValue;
    euint256 private _selectedValue;
    ebool private _equalFlag;
    ebool private _notEqualFlag;

    function compute(
        externalEuint256 encA,
        bytes calldata proofA,
        externalEuint256 encB,
        bytes calldata proofB
    ) external {
        euint256 a = FHE.fromExternal(encA, proofA);
        euint256 b = FHE.fromExternal(encB, proofB);
        ebool isEqual = FHE.eq(a, b);

        _xorValue = FHE.xor(a, b);
        _andValue = FHE.and(a, b);
        _orValue = FHE.or(a, b);
        _notValue = FHE.not(a);
        _selectedValue = FHE.select(isEqual, a, b);
        _equalFlag = isEqual;
        _notEqualFlag = FHE.ne(a, b);

        FHE.allowThis(_xorValue);
        FHE.allow(_xorValue, msg.sender);
        FHE.allowThis(_andValue);
        FHE.allow(_andValue, msg.sender);
        FHE.allowThis(_orValue);
        FHE.allow(_orValue, msg.sender);
        FHE.allowThis(_notValue);
        FHE.allow(_notValue, msg.sender);
        FHE.allowThis(_selectedValue);
        FHE.allow(_selectedValue, msg.sender);
        FHE.allowThis(_equalFlag);
        FHE.allow(_equalFlag, msg.sender);
        FHE.allowThis(_notEqualFlag);
        FHE.allow(_notEqualFlag, msg.sender);
    }

    function getXorValue() external view returns (euint256) {
        return _xorValue;
    }

    function getAndValue() external view returns (euint256) {
        return _andValue;
    }

    function getOrValue() external view returns (euint256) {
        return _orValue;
    }

    function getNotValue() external view returns (euint256) {
        return _notValue;
    }

    function getSelectedValue() external view returns (euint256) {
        return _selectedValue;
    }

    function getEqualFlag() external view returns (ebool) {
        return _equalFlag;
    }

    function getNotEqualFlag() external view returns (ebool) {
        return _notEqualFlag;
    }
}

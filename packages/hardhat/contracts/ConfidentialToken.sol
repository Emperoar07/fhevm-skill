// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ConfidentialToken
/// @notice A simple confidential token using FHEVM encrypted balances.
///         Validates mint, transfer, and userDecrypt patterns on Sepolia.
contract ConfidentialToken is ZamaEthereumConfig, Ownable2Step {

    mapping(address => euint64) private _balances;
    string public name;
    string public symbol;

    constructor(address initialOwner, string memory _name, string memory _symbol)
        Ownable(initialOwner)
    {
        name = _name;
        symbol = _symbol;
    }

    /// @notice Mint a publicly-specified amount to an address.
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 enc = FHE.asEuint64(amount);
        _balances[to] = FHE.add(_balances[to], enc);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        FHE.allow(_balances[to], owner());
    }

    /// @notice Transfer a confidential amount. Amount hidden from chain observers.
    function confidentialTransfer(
        address to,
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], amount);
        _balances[to] = FHE.add(_balances[to], amount);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[msg.sender], owner());
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
        FHE.allow(_balances[to], owner());
    }

    /// @notice Returns the encrypted balance handle for an address.
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Burn a confidential amount from the caller's balance.
    function confidentialBurn(
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external {
        require(FHE.isInitialized(_balances[msg.sender]), "no balance to burn");
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], amount);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allow(_balances[msg.sender], owner());
    }
}

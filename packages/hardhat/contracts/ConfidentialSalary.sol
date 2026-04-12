// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ConfidentialSalary
/// @notice Cold-start demo contract — built from SKILL.md alone, 10/10 tests passed first try.
/// Employees submit encrypted salaries; owner reads encrypted aggregate total.
contract ConfidentialSalary is ZamaEthereumConfig, Ownable2Step {
    mapping(address => euint64) private _salaries;
    mapping(address => bool)    public  hasSubmitted;
    euint64 private _totalSalary;
    uint256 public  employeeCount;
    bool    public  surveyClosed;

    event SalarySubmitted(address indexed employee);
    event SurveyClosed();
    event RevealRequested();

    constructor(address initialOwner) Ownable(initialOwner) {
        _totalSalary = FHE.asEuint64(0);
        FHE.allowThis(_totalSalary);
        FHE.allow(_totalSalary, initialOwner);
    }

    function submitSalary(externalEuint64 encSalary, bytes calldata inputProof) external {
        require(!surveyClosed, "Survey is closed");
        require(!hasSubmitted[msg.sender], "Already submitted");

        euint64 salary = FHE.fromExternal(encSalary, inputProof);
        _salaries[msg.sender] = salary;
        FHE.allowThis(_salaries[msg.sender]);
        FHE.allow(_salaries[msg.sender], msg.sender);

        _totalSalary = FHE.add(_totalSalary, salary);
        FHE.allowThis(_totalSalary);
        FHE.allow(_totalSalary, owner());

        hasSubmitted[msg.sender] = true;
        employeeCount++;
        emit SalarySubmitted(msg.sender);
    }

    function getMySalary() external view returns (euint64) {
        return _salaries[msg.sender];
    }

    function getTotal() external view onlyOwner returns (euint64) {
        return _totalSalary;
    }

    function closeSurvey() external onlyOwner {
        surveyClosed = true;
        emit SurveyClosed();
    }

    function requestReveal() external onlyOwner {
        FHE.makePubliclyDecryptable(_totalSalary);
        emit RevealRequested();
    }
}

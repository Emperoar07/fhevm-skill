// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ConfidentialVoting is ZamaEthereumConfig, Ownable2Step {
    euint64 private _yesCount;
    euint64 private _noCount;

    mapping(address => bool) public hasVoted;
    uint256 public deadline;

    event VoteCast(address indexed voter);
    event TallyRevealRequested();

    constructor(uint256 _deadline, address initialOwner) Ownable(initialOwner) {
        deadline  = _deadline;
        _yesCount = FHE.asEuint64(0);
        _noCount  = FHE.asEuint64(0);
        FHE.allowThis(_yesCount);
        FHE.allow(_yesCount, initialOwner);
        FHE.allowThis(_noCount);
        FHE.allow(_noCount, initialOwner);
    }

    function castVote(externalEbool encVote, bytes calldata inputProof) external {
        require(block.timestamp < deadline, "Voting closed");
        require(!hasVoted[msg.sender], "Already voted");

        ebool   vote   = FHE.fromExternal(encVote, inputProof);
        euint64 yesInc = FHE.select(vote, FHE.asEuint64(1), FHE.asEuint64(0));
        euint64 noInc  = FHE.select(vote, FHE.asEuint64(0), FHE.asEuint64(1));

        _yesCount = FHE.add(_yesCount, yesInc);
        _noCount  = FHE.add(_noCount,  noInc);

        FHE.allowThis(_yesCount);
        FHE.allow(_yesCount, owner());
        FHE.allowThis(_noCount);
        FHE.allow(_noCount, owner());

        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender);
    }

    function getTallies() external view returns (euint64 yes, euint64 no) {
        return (_yesCount, _noCount);
    }

    function requestReveal() external onlyOwner {
        require(block.timestamp >= deadline, "Voting still open");
        FHE.makePubliclyDecryptable(_yesCount);
        FHE.makePubliclyDecryptable(_noCount);
        emit TallyRevealRequested();
    }
}

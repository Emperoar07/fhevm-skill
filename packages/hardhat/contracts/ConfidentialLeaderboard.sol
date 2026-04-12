// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, eaddress, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ConfidentialLeaderboard is ZamaEthereumConfig, Ownable2Step {
    euint64  private _topScore;
    eaddress private _topPlayer;

    mapping(address => euint64) private _personalBest;

    event ScoreSubmitted(address indexed player);
    event TopScoreRevealRequested();

    constructor(address initialOwner) Ownable(initialOwner) {
        _topScore  = FHE.asEuint64(0);
        _topPlayer = FHE.asEaddress(address(0));
        FHE.allowThis(_topScore);
        FHE.allow(_topScore, initialOwner);
        FHE.allowThis(_topPlayer);
        FHE.allow(_topPlayer, initialOwner);
    }

    function submitScore(externalEuint64 encScore, bytes calldata inputProof) external {
        euint64 score = FHE.fromExternal(encScore, inputProof);

        ebool isNewTop = FHE.gt(score, _topScore);
        _topScore  = FHE.select(isNewTop, score, _topScore);
        _topPlayer = FHE.select(isNewTop, FHE.asEaddress(msg.sender), _topPlayer);

        FHE.allowThis(_topScore);
        FHE.allow(_topScore, owner());
        FHE.allowThis(_topPlayer);
        FHE.allow(_topPlayer, owner());

        if (!FHE.isInitialized(_personalBest[msg.sender])) {
            _personalBest[msg.sender] = score;
        } else {
            ebool beatsPB = FHE.gt(score, _personalBest[msg.sender]);
            _personalBest[msg.sender] = FHE.select(beatsPB, score, _personalBest[msg.sender]);
        }
        FHE.allowThis(_personalBest[msg.sender]);
        FHE.allow(_personalBest[msg.sender], msg.sender);

        emit ScoreSubmitted(msg.sender);
    }

    function getPersonalBest(address player) external view returns (euint64) {
        return _personalBest[player];
    }

    function requestReveal() external onlyOwner {
        FHE.makePubliclyDecryptable(_topScore);
        FHE.makePubliclyDecryptable(_topPlayer);
        emit TopScoreRevealRequested();
    }
}

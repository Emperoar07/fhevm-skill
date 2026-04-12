# FHEVM Agent Skill — Contract Templates

> **Part of the FHEVM Skill File System.**
> These are production-ready, copy-paste starting points for common FHEVM contract patterns.
> Each template compiles and has been validated against the test suite.
>
> Read `SKILL.md` for concepts. Read `SKILL-REFERENCE.md` for the full API. Read `SKILL-TESTING.md` for test patterns.
>
> **How to use:** Copy the template, replace every `// TODO:` comment with your logic,
> then run `pnpm compile` to confirm before writing tests.

---

## Metadata

| Field | Value |
|---|---|
| **Version** | 1.5.0 |
| **Validated against** | `@fhevm/solidity` v0.9/v0.10 |
| **Test result** | All templates compile and have passing tests |

---

## Template 1 — Minimal Contract (starting point for anything)

The smallest valid FHEVM contract. Inherit from this pattern for every new contract.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract MyConfidentialContract is ZamaEthereumConfig, Ownable2Step {

    // TODO: declare encrypted state variables
    euint64 private _value;

    constructor(address initialOwner) Ownable(initialOwner) {
        // TODO: initialize encrypted state if needed
        _value = FHE.asEuint64(0);
        FHE.allowThis(_value);
        FHE.allow(_value, initialOwner);
    }

    // TODO: add write functions that accept externalEuintXX inputs
    function setValue(externalEuint64 enc, bytes calldata inputProof) external {
        _value = FHE.fromExternal(enc, inputProof);
        FHE.allowThis(_value);
        FHE.allow(_value, msg.sender);
    }

    // TODO: add view functions that return encrypted handles
    function getValue() external view returns (euint64) {
        return _value;
        // Caller must have been granted FHE.allow(_value, caller) to decrypt
    }
}
```

---

## Template 2 — Confidential Token (ERC20-style with encrypted balances)

Encrypted balances. Transfer amounts are hidden. Uses the silent-clamp pattern instead of revert.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ConfidentialToken is ZamaEthereumConfig, Ownable2Step {
    string  public name;
    string  public symbol;
    uint64  public totalSupply;

    mapping(address => euint64) private _balances;

    event Transfer(address indexed from, address indexed to);

    constructor(
        string memory _name,
        string memory _symbol,
        uint64 initialSupply,
        address initialOwner
    ) Ownable(initialOwner) {
        name        = _name;
        symbol      = _symbol;
        totalSupply = initialSupply;

        _balances[initialOwner] = FHE.asEuint64(initialSupply);
        FHE.allowThis(_balances[initialOwner]);
        FHE.allow(_balances[initialOwner], initialOwner);
    }

    /// @notice Returns encrypted balance handle. Caller must have ACL access to decrypt.
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice Transfer encrypted amount. Silent clamp to 0 if insufficient balance.
    function transfer(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // TODO: add any additional validation (e.g. block transfers to zero address)

        ebool   hasEnough  = FHE.le(amount, _balances[msg.sender]);
        euint64 safeAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));

        _balances[msg.sender] = FHE.sub(_balances[msg.sender], safeAmount);
        _balances[to]         = FHE.add(_balances[to], safeAmount);

        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        emit Transfer(msg.sender, to);
        return true;
    }

    /// @notice Mint with publicly visible amount (onlyOwner).
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 mintAmount = FHE.asEuint64(amount);
        if (FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.add(_balances[to], mintAmount);
        } else {
            _balances[to] = mintAmount;
        }
        totalSupply += amount;
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
    }
}
```

---

## Template 3 — Confidential Voting

Encrypted YES/NO votes. Owner can request a public reveal after the deadline.

```solidity
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

        // Grant owner access to tallies from the start
        FHE.allowThis(_yesCount);
        FHE.allow(_yesCount, initialOwner);
        FHE.allowThis(_noCount);
        FHE.allow(_noCount, initialOwner);
    }

    /// @notice Cast an encrypted vote. true = YES, false = NO.
    function castVote(externalEbool encVote, bytes calldata inputProof) external {
        require(block.timestamp < deadline, "Voting closed");
        require(!hasVoted[msg.sender], "Already voted");

        ebool  vote    = FHE.fromExternal(encVote, inputProof);
        // YES votes: add 1 if true, else 0
        euint64 yesInc = FHE.select(vote, FHE.asEuint64(1), FHE.asEuint64(0));
        euint64 noInc  = FHE.select(vote, FHE.asEuint64(0), FHE.asEuint64(1));

        _yesCount = FHE.add(_yesCount, yesInc);
        _noCount  = FHE.add(_noCount,  noInc);

        // Re-grant after every mutation — handles changed
        FHE.allowThis(_yesCount);
        FHE.allow(_yesCount, owner());
        FHE.allowThis(_noCount);
        FHE.allow(_noCount, owner());

        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender);
    }

    /// @notice Returns encrypted tally handles. Owner must have ACL access to decrypt.
    function getTallies() external view returns (euint64 yes, euint64 no) {
        return (_yesCount, _noCount);
    }

    /// @notice Mark tallies for public decryption so anyone can see the result.
    function requestReveal() external onlyOwner {
        require(block.timestamp >= deadline, "Voting still open");
        FHE.makePubliclyDecryptable(_yesCount);
        FHE.makePubliclyDecryptable(_noCount);
        emit TallyRevealRequested();
    }

    // TODO: add claimResult(uint64 yes, uint64 no, bytes proof) using FHE.checkSignatures
    // if you need on-chain verification of the revealed result.
}
```

---

## Template 4 — Sealed-Bid Auction

Encrypted bids. Highest bidder tracked with `FHE.select`. Owner reveals winner after deadline.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, eaddress, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract SealedBidAuction is ZamaEthereumConfig, Ownable2Step {
    euint64   private _highestBid;
    eaddress  private _highestBidder;

    mapping(address => euint64) public bids;
    uint256 public auctionEnd;
    bool    public settled;

    event BidPlaced(address indexed bidder);
    event AuctionSettled();

    constructor(uint256 duration, address initialOwner) Ownable(initialOwner) {
        auctionEnd     = block.timestamp + duration;
        _highestBid    = FHE.asEuint64(0);
        _highestBidder = FHE.asEaddress(address(0));

        FHE.allowThis(_highestBid);
        FHE.allow(_highestBid, initialOwner);
        FHE.allowThis(_highestBidder);
        FHE.allow(_highestBidder, initialOwner);
    }

    /// @notice Place an encrypted bid.
    function bid(externalEuint64 encBid, bytes calldata inputProof) external {
        require(block.timestamp < auctionEnd, "Auction ended");

        euint64 amount = FHE.fromExternal(encBid, inputProof);

        // Track bidder's bid (for their own decryption)
        bids[msg.sender] = amount;
        FHE.allowThis(bids[msg.sender]);
        FHE.allow(bids[msg.sender], msg.sender);

        // Update highest bid using select (no plaintext comparison)
        ebool   isHigher      = FHE.gt(amount, _highestBid);
        _highestBid           = FHE.select(isHigher, amount,               _highestBid);
        _highestBidder        = FHE.select(isHigher, FHE.asEaddress(msg.sender), _highestBidder);

        FHE.allowThis(_highestBid);
        FHE.allow(_highestBid, owner());
        FHE.allowThis(_highestBidder);
        FHE.allow(_highestBidder, owner());

        emit BidPlaced(msg.sender);
    }

    /// @notice Returns bidder's own encrypted bid handle.
    function getMyBid() external view returns (euint64) {
        return bids[msg.sender];
    }

    /// @notice Mark winner and amount for public decryption.
    function requestSettle() external onlyOwner {
        require(block.timestamp >= auctionEnd, "Auction still running");
        require(!settled, "Already settled");
        FHE.makePubliclyDecryptable(_highestBid);
        FHE.makePubliclyDecryptable(_highestBidder);
        settled = true;
        emit AuctionSettled();
    }

    // TODO: add settle(address winner, uint64 amount, bytes proof) using FHE.checkSignatures
    // to verify the decrypted result on-chain before transferring prize/NFT.
}
```

---

## Template 5 — Confidential Survey / Aggregator

Per-user encrypted values with owner-only access to an encrypted running total.
Pattern: individual privacy + aggregate analytics.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract ConfidentialSurvey is ZamaEthereumConfig, Ownable2Step {
    mapping(address => euint64) private _responses;
    mapping(address => bool)    public  hasResponded;
    euint64 private _total;
    uint256 public  responseCount;
    bool    public  closed;

    event ResponseSubmitted(address indexed respondent);
    event SurveyClosed();

    constructor(address initialOwner) Ownable(initialOwner) {
        _total = FHE.asEuint64(0);
        FHE.allowThis(_total);
        FHE.allow(_total, initialOwner);
    }

    /// @notice Submit an encrypted response. Each address may submit once.
    function submitResponse(externalEuint64 enc, bytes calldata inputProof) external {
        require(!closed, "Survey is closed");
        require(!hasResponded[msg.sender], "Already responded");

        euint64 value = FHE.fromExternal(enc, inputProof);

        _responses[msg.sender] = value;
        FHE.allowThis(_responses[msg.sender]);
        FHE.allow(_responses[msg.sender], msg.sender);

        _total = FHE.add(_total, value);
        FHE.allowThis(_total);
        FHE.allow(_total, owner());

        hasResponded[msg.sender] = true;
        responseCount++;
        emit ResponseSubmitted(msg.sender);
    }

    /// @notice Returns respondent's own encrypted response.
    function getMyResponse() external view returns (euint64) {
        return _responses[msg.sender];
    }

    /// @notice Returns encrypted total — only owner has ACL access to decrypt.
    function getTotal() external view onlyOwner returns (euint64) {
        return _total;
    }

    /// @notice Close survey and mark total for public reveal.
    function closeSurvey() external onlyOwner {
        closed = true;
        FHE.makePubliclyDecryptable(_total);
        emit SurveyClosed();
    }

    // TODO: add claimResult(uint64 total, bytes proof) using FHE.checkSignatures
    // if you need on-chain verification of the revealed aggregate.
}
```

---

## Template 6 — Confidential Leaderboard

Per-user encrypted personal best. Global encrypted top score. Uses `FHE.isInitialized` for
first-submission detection.

```solidity
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

    /// @notice Submit an encrypted score. Updates personal best and global top if higher.
    function submitScore(externalEuint64 encScore, bytes calldata inputProof) external {
        euint64 score = FHE.fromExternal(encScore, inputProof);

        // Update global top score
        ebool isNewTop = FHE.gt(score, _topScore);
        _topScore  = FHE.select(isNewTop, score, _topScore);
        _topPlayer = FHE.select(isNewTop, FHE.asEaddress(msg.sender), _topPlayer);

        FHE.allowThis(_topScore);
        FHE.allow(_topScore, owner());
        FHE.allowThis(_topPlayer);
        FHE.allow(_topPlayer, owner());

        // Update personal best
        if (!FHE.isInitialized(_personalBest[msg.sender])) {
            _personalBest[msg.sender] = score;
        } else {
            ebool beatsPB = FHE.gt(score, _personalBest[msg.sender]);
            _personalBest[msg.sender] = FHE.select(beatsPB, score, _personalBest[msg.sender]);
        }
        FHE.allowThis(_personalBest[msg.sender]);
        FHE.allow(_personalBest[msg.sender], msg.sender);

        // TODO: track submission count, timestamps, or game-specific metadata here

        emit ScoreSubmitted(msg.sender);
    }

    /// @notice Returns player's own encrypted personal best.
    function getPersonalBest(address player) external view returns (euint64) {
        return _personalBest[player];
    }

    /// @notice Mark top score and top player for public reveal.
    function requestReveal() external onlyOwner {
        FHE.makePubliclyDecryptable(_topScore);
        FHE.makePubliclyDecryptable(_topPlayer);
        emit TopScoreRevealRequested();
    }

    // TODO: add claimWinner(address player, uint64 score, bytes proof) using FHE.checkSignatures
}
```

---

## Template 7 — ERC7984 Confidential Token (OpenZeppelin standard)

Uses the official OZ confidential token base contract. Preferred over Template 2 when you need
ERC20 interface compatibility.

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { ERC7984 } from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract MyConfidentialToken is ZamaEthereumConfig, ERC7984, Ownable2Step {
    constructor(address initialOwner, uint64 initialSupply)
        ERC7984("My Token", "MTK", "")  // TODO: set name, symbol, URI
        Ownable(initialOwner)
    {
        _mint(initialOwner, FHE.asEuint64(initialSupply));
    }

    /// @notice Mint with publicly visible amount.
    function mint(address to, uint64 amount) external onlyOwner {
        _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Mint with confidential amount (hidden from chain).
    function confidentialMint(
        address to,
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external onlyOwner {
        _mint(to, FHE.fromExternal(encAmount, inputProof));
    }

    // TODO: add burn, pause, or other token management functions as needed
}
```

---

## Quick-Start Boilerplate (smallest possible new contract)

Copy this to start any new contract from scratch:

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract TODO_Name is ZamaEthereumConfig {
    // TODO: state variables

    constructor() {
        // TODO: initialize
    }

    // TODO: functions
}
```

---

## ACL Checklist (use after writing any new function)

After writing a function that creates or modifies an encrypted value, verify:

```
[ ] FHE.fromExternal() called on every externalEuintXX parameter
[ ] FHE.allowThis(handle) called after every FHE operation that produces a new handle
[ ] FHE.allow(handle, msg.sender) called if the user needs to decrypt their own data
[ ] FHE.allow(handle, owner()) called if the owner needs to read this value
[ ] FHE.allow(handle, recipient) called for transfer-style operations
[ ] FHE.allowTransient(handle, extContract) called before passing to external contract
```

---

*Part of the FHEVM Skill File System. See also: [SKILL.md](SKILL.md) (master), [SKILL-REFERENCE.md](SKILL-REFERENCE.md) (API reference), [SKILL-TESTING.md](SKILL-TESTING.md) (testing).*

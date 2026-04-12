// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, eaddress, ebool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

contract SealedBidAuction is ZamaEthereumConfig, Ownable2Step {
    euint64  private _highestBid;
    eaddress private _highestBidder;

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

    function bid(externalEuint64 encBid, bytes calldata inputProof) external {
        require(block.timestamp < auctionEnd, "Auction ended");

        euint64 amount = FHE.fromExternal(encBid, inputProof);
        bids[msg.sender] = amount;
        FHE.allowThis(bids[msg.sender]);
        FHE.allow(bids[msg.sender], msg.sender);

        ebool isHigher = FHE.gt(amount, _highestBid);
        _highestBid    = FHE.select(isHigher, amount, _highestBid);
        _highestBidder = FHE.select(isHigher, FHE.asEaddress(msg.sender), _highestBidder);

        FHE.allowThis(_highestBid);
        FHE.allow(_highestBid, owner());
        FHE.allowThis(_highestBidder);
        FHE.allow(_highestBidder, owner());

        emit BidPlaced(msg.sender);
    }

    function getMyBid() external view returns (euint64) {
        return bids[msg.sender];
    }

    function requestSettle() external onlyOwner {
        require(block.timestamp >= auctionEnd, "Auction still running");
        require(!settled, "Already settled");
        FHE.makePubliclyDecryptable(_highestBid);
        FHE.makePubliclyDecryptable(_highestBidder);
        settled = true;
        emit AuctionSettled();
    }
}

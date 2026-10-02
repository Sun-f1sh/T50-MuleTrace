// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MuleTraceAuditRegistry
/// @notice Stores only SHA-256 commitments; sensitive evidence/model artifacts stay off-chain.
contract MuleTraceAuditRegistry {
    address public immutable owner;
    mapping(address => bool) public authorized;
    mapping(bytes32 => uint256) public anchoredAt;
    mapping(bytes32 => uint256) public modelVersionAnchoredAt;

    event AuditorAuthorizationChanged(address indexed auditor, bool authorized);
    event CommitmentAnchored(bytes32 indexed digest, address indexed auditor, uint256 timestamp);
    event ModelVersionAnchored(bytes32 indexed digest, address indexed auditor, uint256 timestamp);

    error NotOwner();
    error NotAuthorized();
    error EmptyCommitment();
    error AlreadyAnchored();
    error ModelVersionAlreadyAnchored();

    constructor() {
        owner = msg.sender;
        authorized[msg.sender] = true;
        emit AuditorAuthorizationChanged(msg.sender, true);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAuthorized() {
        if (!authorized[msg.sender]) revert NotAuthorized();
        _;
    }

    function setAuthorized(address auditor, bool enabled) external onlyOwner {
        if (auditor == address(0)) revert NotAuthorized();
        authorized[auditor] = enabled;
        emit AuditorAuthorizationChanged(auditor, enabled);
    }

    function anchor(bytes32 digest) external onlyAuthorized {
        if (digest == bytes32(0)) revert EmptyCommitment();
        if (anchoredAt[digest] != 0) revert AlreadyAnchored();
        anchoredAt[digest] = block.timestamp;
        emit CommitmentAnchored(digest, msg.sender, block.timestamp);
    }

    function verify(bytes32 digest) external view returns (bool) {
        return digest != bytes32(0) && anchoredAt[digest] != 0;
    }

    function anchorModelVersion(bytes32 digest) external onlyAuthorized {
        if (digest == bytes32(0)) revert EmptyCommitment();
        if (modelVersionAnchoredAt[digest] != 0) revert ModelVersionAlreadyAnchored();
        modelVersionAnchoredAt[digest] = block.timestamp;
        emit ModelVersionAnchored(digest, msg.sender, block.timestamp);
    }

    function verifyModelVersion(bytes32 digest) external view returns (bool) {
        return digest != bytes32(0) && modelVersionAnchoredAt[digest] != 0;
    }
}

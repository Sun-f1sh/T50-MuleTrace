const { expect } = require("chai");

describe("MuleTraceAuditRegistry", function () {
  async function deploy() {
    const [owner, analyst, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MuleTraceAuditRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, analyst, outsider };
  }
  it("anchors SHA-256 audit commitments and independently verifies storage", async function () {
    const { contract } = await deploy();
    const digest = ethers.sha256(ethers.toUtf8Bytes("canonical audit commitment"));
    await expect(contract.anchor(digest)).to.emit(contract, "CommitmentAnchored");
    expect(await contract.verify(digest)).to.equal(true);
    expect(await contract.anchoredAt(digest)).to.be.gt(0);
  });
  it("anchors separate non-sensitive model-version commitments", async function () {
    const { contract } = await deploy();
    const digest = ethers.sha256(ethers.toUtf8Bytes("model manifest digest"));
    await expect(contract.anchorModelVersion(digest)).to.emit(contract, "ModelVersionAnchored");
    expect(await contract.verifyModelVersion(digest)).to.equal(true);
    expect(await contract.modelVersionAnchoredAt(digest)).to.be.gt(0);
  });
  it("rejects unauthorized writers and allows owner-managed auditor roles", async function () {
    const { contract, analyst, outsider } = await deploy();
    const digest = ethers.sha256(ethers.toUtf8Bytes("authorized digest"));
    await expect(contract.connect(outsider).anchor(digest)).to.be.revertedWithCustomError(contract, "NotAuthorized");
    await expect(contract.connect(outsider).anchorModelVersion(digest)).to.be.revertedWithCustomError(contract, "NotAuthorized");
    await contract.setAuthorized(analyst.address, true);
    await expect(contract.connect(analyst).anchor(digest)).to.emit(contract, "CommitmentAnchored");
  });
  it("rejects zero and duplicate audit/model commitments", async function () {
    const { contract } = await deploy();
    const digest = ethers.sha256(ethers.toUtf8Bytes("one-time"));
    await expect(contract.anchor(ethers.ZeroHash)).to.be.revertedWithCustomError(contract, "EmptyCommitment");
    await contract.anchor(digest);
    await expect(contract.anchor(digest)).to.be.revertedWithCustomError(contract, "AlreadyAnchored");
    await contract.anchorModelVersion(digest);
    await expect(contract.anchorModelVersion(digest)).to.be.revertedWithCustomError(contract, "ModelVersionAlreadyAnchored");
  });
  it("restricts auditor authorization changes to the owner", async function () {
    const { contract, analyst, outsider } = await deploy();
    await expect(contract.connect(outsider).setAuthorized(analyst.address, true)).to.be.revertedWithCustomError(contract, "NotOwner");
  });
});

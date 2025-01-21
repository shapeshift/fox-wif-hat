import chai, { expect } from 'chai'
import { ethers } from 'hardhat'


describe("FoxWifHat", () => {
    
    it("can be deployed with no total supply", async () => {
        const FoxWifHat = await ethers.getContractFactory("FoxWifHat");
        const foxWifHat = await FoxWifHat.deploy();
        await foxWifHat.deployed();

        expect(await foxWifHat.totalSupply()).to.equal(0);
    });

    it("can mint tokens", async () => {
        const FoxWifHat = await ethers.getContractFactory("FoxWifHat");
        const foxWifHat = await FoxWifHat.deploy();
        await foxWifHat.deployed();

        const wallets = await ethers.getSigners()
        const wallet0 = wallets[0]

        await foxWifHat.mint(wallet0.address, 1000);
        expect(await foxWifHat.balanceOf(wallet0.address)).to.equal(1000);
    });

    it("can allow and revoke another address to mint tokens", async () => {
        const FoxWifHat = await ethers.getContractFactory("FoxWifHat");
        const foxWifHat = await FoxWifHat.deploy();
        await foxWifHat.deployed();

        const wallets = await ethers.getSigners()
        const wallet1 = wallets[1]
        const wallet2 = wallets[2]

        // attempt to mint with wallet1 which should fail
        await expect(foxWifHat.connect(wallet1).mint(wallet2.address, 1000)).to.be.revertedWith("FWH: only minter");

        // grant wallet1 the ability to mint tokens
        await foxWifHat.grantRole(await foxWifHat.MINTER_ROLE(), wallet1.address);

        await foxWifHat.connect(wallet1).mint(wallet2.address, 1000);
        expect(await foxWifHat.balanceOf(wallet2.address)).to.equal(1000);

        // revoke 
        await foxWifHat.revokeRole(await foxWifHat.MINTER_ROLE(), wallet1.address);
        // attempt to mint with wallet1 which should fail again
        await expect(foxWifHat.connect(wallet1).mint(wallet2.address, 1000)).to.be.revertedWith("FWH: only minter");
    })

    it("can grant admin role", async () => {
        const FoxWifHat = await ethers.getContractFactory("FoxWifHat");
        const foxWifHat = await FoxWifHat.deploy();
        await foxWifHat.deployed();

        const wallets = await ethers.getSigners()
        const wallet1 = wallets[1]
        const wallet2 = wallets[2]

        // attempt to grant admin role with wallet1 which should fail
        await expect(foxWifHat.connect(wallet1).grantRole(await foxWifHat.ADMIN_ROLE(), wallet2.address)).to.be.reverted

        // grant wallet1 the ability to grant admin role
        await foxWifHat.grantRole(await foxWifHat.ADMIN_ROLE(), wallet1.address);

        await foxWifHat.connect(wallet1).grantRole(await foxWifHat.ADMIN_ROLE(), wallet2.address);

        // revoke admin role
        await foxWifHat.revokeRole(await foxWifHat.ADMIN_ROLE(), wallet1.address);
        await expect(foxWifHat.connect(wallet1).grantRole(await foxWifHat.ADMIN_ROLE(), wallet2.address)).to.be.reverted
    })
});
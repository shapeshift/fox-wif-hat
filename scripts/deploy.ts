const { ethers } = require('hardhat')

const DAO_MSIG_ADDRESS = "0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502" // note this on BASE!
const MERKLE_ROOT = ""
const MINT_AMOUNT = ""


async function main() {

  if (MERKLE_ROOT === "" || MINT_AMOUNT === "") {
    // exit process early
    console.error("MERKLE_ROOT and MINT_AMOUNT must be set")
    return
  }

  const accounts = await ethers.getSigners();

  // deploy Fox Wif Hat
  const FoxWifHat = await ethers.getContractFactory('FoxWifHat')
  const foxWifHat = await FoxWifHat.deploy()
  await foxWifHat.deployed()

  // assign admin and mint to DAO msig
  const adminRole = await foxWifHat.ADMIN_ROLE();
  const minterRole = await foxWifHat.MINTER_ROLE();
  
  console.log(`Granting Admin to DAO: ${DAO_MSIG_ADDRESS}`);
  await foxWifHat.grantRole(adminRole, DAO_MSIG_ADDRESS);
  
  console.log(`Granting Minter to DAO: ${DAO_MSIG_ADDRESS}`);
  await foxWifHat.grantRole(minterRole, DAO_MSIG_ADDRESS);

  // deploy MerkleDistributor
  const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor')
  const merkleDistributor = await MerkleDistributor.deploy(foxWifHat.address, MERKLE_ROOT)
  await merkleDistributor.deployed()
  
  console.log(`MerkleDistributor deployed at ${merkleDistributor.address}`)

  // mint FOX wif hat to merkle distributor
  await foxWifHat.mint(merkleDistributor.address, MINT_AMOUNT)

  // remove our admin and minting permissions
  console.log(`Renouncing Admin Role`);
  await foxWifHat.renounceRole(adminRole, accounts[0].address);
  console.log(`Renouncing Minter Role`);
  await foxWifHat.renounceRole(minterRole, accounts[0].address);

  // transfer ownership of MerkleDistributor to DAO
  console.log(`Transferring MerkleDistributor Ownership to DAO: ${DAO_MSIG_ADDRESS}`);
  await merkleDistributor.transferOwnership(DAO_MSIG_ADDRESS);
}

main()
  // eslint-disable-next-line no-process-exit
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    // eslint-disable-next-line no-process-exit
    process.exit(1)
  })

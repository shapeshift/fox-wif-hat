import { BigNumber, utils } from 'ethers'
import BalanceTree from './balance-tree'

const { isAddress, getAddress } = utils

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
interface MerkleDistributorInfo {
  merkleRoot: string
  tokenTotal: string
  claims: {
    [account: string]: {
      index: number
      amount: string
      proof: string[]
    }
  }
}

type AddressBalance = { address: string, balance: string }


export function parseBalanceMap(balances: AddressBalance[]): MerkleDistributorInfo {
  // create a mapping of address to balances.
  const dataByAddress = balances.reduce<{
    [address: string]: BigNumber
  }>((memo, addressBalance) => {

    // confirm that the address is valid
    if (!isAddress(addressBalance.address)) {
      throw new Error(`Invalid address: ${addressBalance.address}`)
    }

    // parse the address
    const parsedAddress = getAddress(addressBalance.address)

    // confirm that the address is not already in the map
    if (memo[addressBalance.address]) {
      throw new Error(`Duplicate address: ${addressBalance.address}`)
    }
  
    memo[parsedAddress] = BigNumber.from(addressBalance.balance)
    return memo
  }, {})
  const sortedAddresses = Object.keys(dataByAddress).sort()
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({ address: address, amount: dataByAddress[address] }))
  )

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: { amount: string; index: number; proof: string[]}
  }>((memo, address, index) => {
    console.log('address:', address)
    console.log('index:', index)
    const amount = dataByAddress[address]
    console.log('amount:', amount)
    memo[address] = {
      index,
      amount: amount.toHexString(),
      proof: tree.getProof(index, address, amount),
    }
    return memo
  }, {})

  const tokenTotal: BigNumber = sortedAddresses.reduce<BigNumber>(
    (memo, key) => memo.add(dataByAddress[key]),
    BigNumber.from(0)
  )

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: tokenTotal.toHexString(),
    claims,
  }
}

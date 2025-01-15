import MerkleTree from './merkle-tree'
import { BigNumber, utils } from 'ethers'

export default class BalanceTree {
  private readonly tree: MerkleTree
  constructor(balances: { address: string; amount: BigNumber }[]) {
    console.log('tree balances:', balances)
    this.tree = new MerkleTree(
      balances.map(({ address, amount }, index) => {
        return BalanceTree.toNode(index, address, amount)
      })
    )
  }

  public static verifyProof(
    index: number | BigNumber,
    address: string,
    amount: BigNumber,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(index, address, amount)
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item)
    }

    return pair.equals(root)
  }

  // keccak256(abi.encode(index, address, amount))
  public static toNode(index: number | BigNumber, address: string, amount: BigNumber): Buffer {
    console.log('index:', index)
    console.log('address:', address)
    console.log('amount:', amount)
    return Buffer.from(
      utils.solidityKeccak256(['uint256', 'address', 'uint256'], [index, address, amount]).substr(2),
      'hex'
    )
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot()
  }

  // returns the hex bytes32 values of the proof
  public getProof(index: number | BigNumber, account: string, amount: BigNumber): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, account, amount))
  }
}

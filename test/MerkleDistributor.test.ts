import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, constants, Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import BalanceTree from '../src/balance-tree'
import { parseBalanceMap } from '../src/parse-balance-map'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999,
}

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

const deployContract = async (factory: ContractFactory, tokenAddress: string, merkleRoot: string) => {
  return await factory.deploy(tokenAddress, merkleRoot, overrides)
}

for (const contract of ['MerkleDistributor']) {
  describe(`${contract} tests`, () => {
    let token: Contract
    let distributorFactory: ContractFactory
    let wallet0: SignerWithAddress
    let wallet1: SignerWithAddress
    let wallets: SignerWithAddress[]

    beforeEach(async () => {
      wallets = await ethers.getSigners()
      wallet0 = wallets[0]
      wallet1 = wallets[1]
      const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
      token = await tokenFactory.deploy('Token', 'TKN', 0, overrides)
      distributorFactory = await ethers.getContractFactory(contract, wallet0)
    })

    describe('#token', () => {
      it('returns the token address', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        expect(await distributor.token()).to.eq(token.address)
      })
    })

    describe('#merkleRoot', () => {
      it('returns the zero merkle root', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        expect(await distributor.merkleRoot()).to.eq(ZERO_BYTES32)
      })
    })

    describe('#claim', () => {
      it('fails for empty proof', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith('InvalidProof()')
      })

      it('fails for invalid index', async () => {
        const distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith('InvalidProof()')
      })

      describe('two account tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree([
            { address: wallet0.address, amount: BigNumber.from(100) },
            { address: wallet1.address, amount: BigNumber.from(101) },
          ])
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot())
          await token.setBalance(distributor.address, 201)
        })

        it('successful claim', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(0, wallet0.address, 100)
          const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(101))
          await expect(distributor.claim(1, wallet1.address, 101, proof1, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(1, wallet1.address, 101)
        })

        it('transfers the token', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          expect(await token.balanceOf(wallet0.address)).to.eq(0)
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          expect(await token.balanceOf(wallet0.address)).to.eq(100)
        })

        it('must have enough to transfer', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await token.setBalance(distributor.address, 99)
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance'
          )
        })

        it('sets #isClaimed', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          expect(await distributor.isClaimed(0)).to.eq(false)
          expect(await distributor.isClaimed(1)).to.eq(false)
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          expect(await distributor.isClaimed(0)).to.eq(true)
          expect(await distributor.isClaimed(1)).to.eq(false)
        })

        it('cannot allow two claims', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await distributor.claim(0, wallet0.address, 100, proof0, overrides)
          await expect(distributor.claim(0, wallet0.address, 100, proof0, overrides)).to.be.revertedWith(
            'AlreadyClaimed()'
          )
        })

        it('cannot claim more than once: 0 and then 1', async () => {
          await distributor.claim(
            0,
            wallet0.address,
            100,
            tree.getProof(0, wallet0.address, BigNumber.from(100)),
            overrides
          )
          await distributor.claim(
            1,
            wallet1.address,
            101,
            tree.getProof(1, wallet1.address, BigNumber.from(101)),
            overrides
          )

          await expect(
            distributor.claim(
              0,
              wallet0.address,
              100,
              tree.getProof(0, wallet0.address, BigNumber.from(100)),
              overrides
            )
          ).to.be.revertedWith('AlreadyClaimed()')
        })

        it('cannot claim more than once: 1 and then 0', async () => {
          await distributor.claim(
            1,
            wallet1.address,
            101,
            tree.getProof(1, wallet1.address, BigNumber.from(101)),
            overrides
          )
          await distributor.claim(
            0,
            wallet0.address,
            100,
            tree.getProof(0, wallet0.address, BigNumber.from(100)),
            overrides
          )

          await expect(
            distributor.claim(
              1,
              wallet1.address,
              101,
              tree.getProof(1, wallet1.address, BigNumber.from(101)),
              overrides
            )
          ).to.be.revertedWith('AlreadyClaimed()')
        })

        it('cannot claim for address other than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(1, wallet1.address, 101, proof0, overrides)).to.be.revertedWith(
            'InvalidProof()'
          )
        })

        it('cannot claim more than proof', async () => {
          const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
          await expect(distributor.claim(0, wallet0.address, 101, proof0, overrides)).to.be.revertedWith(
            'InvalidProof()'
          )
        })

      })

      describe('larger tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        beforeEach('deploy', async () => {
          tree = new BalanceTree(
            wallets.map((wallet, ix) => {
              return { address: wallet.address, amount: BigNumber.from(ix + 1) }
            })
          )
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot())
          await token.setBalance(distributor.address, 201)
        })

        it('claim index 4', async () => {
          const proof = tree.getProof(4, wallets[4].address, BigNumber.from(5))
          await expect(distributor.claim(4, wallets[4].address, 5, proof, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(4, wallets[4].address, 5)
        })

        it('claim index 9', async () => {
          const proof = tree.getProof(9, wallets[9].address, BigNumber.from(10))
          await expect(distributor.claim(9, wallets[9].address, 10, proof, overrides))
            .to.emit(distributor, 'Claimed')
            .withArgs(9, wallets[9].address, 10)
        })

      
      })

      describe('realistic size tree', () => {
        let distributor: Contract
        let tree: BalanceTree
        const NUM_LEAVES = 100_000
        const NUM_SAMPLES = 25

        beforeEach('deploy', async () => {
          const elements: { address: string; amount: BigNumber }[] = []
          for (let i = 0; i < NUM_LEAVES; i++) {
            const node = { address: wallet0.address, amount: BigNumber.from(100) }
            elements.push(node)
          }
          tree = new BalanceTree(elements)
          distributor = await deployContract(distributorFactory, token.address, tree.getHexRoot())
          await token.setBalance(distributor.address, constants.MaxUint256)
        })

        it('proof verification works', () => {
          const root = Buffer.from(tree.getHexRoot().slice(2), 'hex')
          for (let i = 0; i < NUM_LEAVES; i += NUM_LEAVES / NUM_SAMPLES) {
            const proof = tree
              .getProof(i, wallet0.address, BigNumber.from(100))
              .map((el) => Buffer.from(el.slice(2), 'hex'))
            const validProof = BalanceTree.verifyProof(i, wallet0.address, BigNumber.from(100), proof, root)
            expect(validProof).to.be.true
          }
        })

      

        it('no double claims in random distribution', async () => {
          for (let i = 0; i < 25; i += Math.floor(Math.random() * (NUM_LEAVES / NUM_SAMPLES))) {
            const proof = tree.getProof(i, wallet0.address, BigNumber.from(100))
            await distributor.claim(i, wallet0.address, 100, proof, overrides)
            await expect(distributor.claim(i, wallet0.address, 100, proof, overrides)).to.be.revertedWith(
              'AlreadyClaimed()'
            )
          }
        })
      })

      describe('parseBalanceMap', () => {
        let distributor: Contract
        let claims: {
          [account: string]: {
            index: number
            amount: string
            proof: string[]
          }
        }
        beforeEach('deploy', async () => {
          const { claims: innerClaims, merkleRoot, tokenTotal } = parseBalanceMap(
            [ 
              { address: wallet0.address, balance:  "200" },
              { address: wallet1.address, balance:  "300" },
              { address: wallets[2].address, balance:  "250" }
            ]
          )
          expect(tokenTotal).to.eq('0x28a857425466f80000') // 750 with 18 decimals
          claims = innerClaims
          distributor = await deployContract(distributorFactory, token.address, merkleRoot)
          await token.setBalance(distributor.address, tokenTotal)
        })

        it('check the proofs is as expected', () => {
          expect(claims).to.deep.eq({
            [wallet0.address]: {
              index: 2,
              amount: '0x0ad78ebc5ac6200000',
              proof: [
                '0x24cb45e98e17ea69218d9d0422c9cbfae63ae810b442e3e8e34550a14af5b696',
                '0xb831028c247f5710bc73447229e2fb749dc2f3023c42b54bb6bf34495cb6f42d',
              ],
            },
            [wallet1.address]: {
              index: 1,
              amount: '0x1043561a8829300000',
              proof: [
                '0xac4b229fd524883991978d7370e0fb20044dfd87f336ddb567b3d6e7c000e708',
              ],
            },
            [wallets[2].address]: {
              index: 0,
              amount: '0x0d8d726b7177a80000',
              proof: [
                '0x279fba6d03a94ef5bbe224b93ee0eb1b2a9fabba05bd70d4f52857f315193ce5',
                '0xb831028c247f5710bc73447229e2fb749dc2f3023c42b54bb6bf34495cb6f42d',
              ],
            },
          })
        })

        it('all claims work exactly once', async () => {
          for (let account in claims) {
            const claim = claims[account]
            await expect(distributor.claim(claim.index, account, claim.amount, claim.proof, overrides))
              .to.emit(distributor, 'Claimed')
              .withArgs(claim.index, account, claim.amount)
            await expect(
              distributor.claim(claim.index, account, claim.amount, claim.proof, overrides)
            ).to.be.revertedWith('AlreadyClaimed()')
          }
          expect(await token.balanceOf(distributor.address)).to.eq(0)
        })
      })
    })

    describe('#owner', () => {
      it('non owner cannot withdraw', async () => {
        let distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        await token.setBalance(distributor.address, 201)
        distributor = distributor.connect(wallet1)
        await expect(distributor.withdraw(overrides)).to.be.revertedWith('Ownable: caller is not the owner')

        distributor = distributor.connect(wallet0)
        await distributor.transferOwnership(wallet1.address)
        expect(await token.balanceOf(wallet1.address)).to.eq(0)
        distributor = distributor.connect(wallet1)
        await distributor.withdraw(overrides)
        expect(await token.balanceOf(wallet1.address)).to.eq(201)
      })
      it('owner can withdraw', async () => {
        let distributor = await deployContract(distributorFactory, token.address, ZERO_BYTES32)
        await token.setBalance(distributor.address, 201)
        expect(await token.balanceOf(wallet0.address)).to.eq(0)
        await distributor.withdraw(overrides)
        expect(await token.balanceOf(wallet0.address)).to.eq(201)
      })
    })
  })
}
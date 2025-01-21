# FOX wif hat
Token and associated claiming framework



## BASE deployment

- [FOX WIF Hat Token](https://basescan.org/token/0x0d0b60d12f0e5c16beb06afad764d0c3a0183cca)
- [Merkle Distributor](https://basescan.org/address/0xacf1823f3229ad0f6f9e3010d09ed6a6bfeffba2)
- [Merkle Tree](https://ipfs.io/ipfs/bafybeih6ij5lgdn55pva5ljx2ucjex7umx56glzurbx3mb5sxlik26ee4a)

## Deployment notes
1. generate the merkle tree with desired inputs
```bash
yarn generate-merkle-root -i ./scripts/input_example.csv
```
2. pin to IPFS (and add hash to web ticket fo claim implementation in the frontend)
3. deploy the MerkleDistributor with the correct merkle root (note: scripts/deploy.js should handle the below steps, just make sure variables are set correctly). This can be done with `npx hardhat run scripts/deploy.ts --network base`
4. Deploy FOX WIF Hat 
5. Mint token to the MerkleDistributor
6. Grant roles to the DAO multisig for minting on FOX WIF Hat and ownership of the MerkleDistributor
7. revoke roles from the deployer
8. Verify all is well and verify contracts on block explorer
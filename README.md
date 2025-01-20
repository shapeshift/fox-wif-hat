# FOX wif hat
Token and associated claiming framework



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
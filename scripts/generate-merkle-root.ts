import { program } from 'commander'
import fs from 'fs'
import { parseBalanceMap } from '../src/parse-balance-map'

program
  .version('0.0.0')
  .requiredOption(
    '-i, --input <path>',
    'input csv file location containing a map of account addresses to string balances'
  )

program.parse(process.argv)

// read in csv file
const csv_data = fs.readFileSync(program.input, { encoding: 'utf8' })

// convert csv to json
const json = csv_data.split('\n').map((line) => {
  const [address, balance] = line.split(',')
  // convert balance to string
  return { address, balance: balance.toString() }
})

if (typeof json !== 'object') throw new Error('Invalid JSON')
console.log(JSON.stringify(parseBalanceMap(json as any)))

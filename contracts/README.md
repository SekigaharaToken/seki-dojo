## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Fork Testing with Anvil

Anvil can fork any live chain, giving you all deployed contract state locally while keeping transactions sandboxed.

### Quick Start

```bash
# Fork Base Sepolia (chain ID 84532)
anvil --fork-url https://sepolia.base.org --chain-id 84532 --code-size-limit 30000 &

# All deployed contracts are accessible at their real addresses
cast call 0x4200000000000000000000000000000000000021 "version()(string)" --rpc-url http://127.0.0.1:8545
```

### Key Concepts

- **State is real, transactions are local** — reads hit forked state, writes only affect your local fork
- **Default test accounts** — Anvil provides 10 funded accounts. First key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Code size limit** — large contracts (EAS, etc.) need `--code-size-limit 30000`

### Time Manipulation

For time-dependent contracts (streaks, lockups, vesting):

```bash
# Advance 1 day (86400 seconds)
cast rpc evm_increaseTime 86400 --rpc-url http://127.0.0.1:8545
cast rpc evm_mine --rpc-url http://127.0.0.1:8545

# Verify new timestamp
cast block latest --rpc-url http://127.0.0.1:8545 -j | jq '.timestamp'
```

### Environment Setup Pattern

Scripts that share config with a Vite frontend should use a `getEnv()` helper (see `src/config/env.js`) to read from `import.meta.env` in Vite or `process.env` in Node. Point scripts at the fork with:

```bash
RPC_URL=http://127.0.0.1:8545 \
OPERATOR_PRIVATE_KEY=0xac0974... \
VITE_CHAIN_ID=84532 \
node --env-file=.env scripts/your-script.js
```

### Running the E2E Test

```bash
# Full pipeline: fork → 7 check-ins → distribution → cleanup
./scripts/e2e-test.sh
```

# TypeScript Staking Deposit Generator

This TypeScript implementation provides the same functionality as the Python staking-deposit-cli for generating Ethereum validator deposit data, including withdrawal credentials, deposit data root, and signatures.

## Features

- ✅ Generate withdrawal credentials from validator public key
- ✅ Create deposit data root and signatures using 12-word mnemonic
- ✅ Support for both BLS and ETH1 withdrawal types
- ✅ EIP-2334 compliant key derivation
- ✅ Multiple network support (Mainnet, Holesky)
- ✅ Full TypeScript support with type definitions
- ✅ Comprehensive test suite

## Installation

```bash
npm install
```

## Usage

### Basic Example

```typescript
import {
  generateDepositDataFromMnemonic,
  HoleskySetting,
  ETH2GWEI,
  bytesToHex
} from './src/index';

// Your 12-word mnemonic (keep this secure!)
const mnemonic = 'your twelve word mnemonic phrase goes here and should be kept secure';

async function generateDeposit() {
  // Generate deposit data for validator index 0 with 32 ETH
  const depositData = await generateDepositDataFromMnemonic(
    mnemonic,
    0, // validator index
    BigInt(32 * ETH2GWEI), // 32 ETH in Gwei
    HoleskySetting // Use Holesky testnet
  );
  
  console.log('Withdrawal Credentials:', bytesToHex(depositData.withdrawalCredentials));
  console.log('Deposit Data Root:', bytesToHex(depositData.depositDataRoot));
  console.log('Signature:', bytesToHex(depositData.signature));
}

generateDeposit();
```

### With ETH1 Withdrawal Address

```typescript
import { hexToBytes } from './src/index';

// Your ETH1 withdrawal address
const ethAddress = hexToBytes('0x1234567890123456789012345678901234567890');

const depositData = await generateDepositDataFromMnemonic(
  mnemonic,
  0,
  BigInt(32 * ETH2GWEI),
  HoleskySetting,
  '', // no mnemonic password
  ethAddress // ETH1 withdrawal address
);
```

### Using the Credential Class

```typescript
import { Credential, WithdrawalType } from './src/index';

const credential = new Credential(
  mnemonic,
  '', // mnemonic password
  0, // validator index
  BigInt(32 * ETH2GWEI),
  HoleskySetting
);

console.log('Withdrawal Type:', credential.withdrawalType);
console.log('Signing Public Key:', bytesToHex(credential.signingPublicKey));
console.log('Withdrawal Public Key:', bytesToHex(credential.withdrawalPublicKey));

const depositData = await credential.generateDepositData();
```

## API Reference

### `generateDepositDataFromMnemonic(mnemonic, validatorIndex, amount, chainSetting, mnemonicPassword?, ethWithdrawalAddress?)`

Generates complete deposit data from a mnemonic.

**Parameters:**
- `mnemonic: string` - 12-word BIP39 mnemonic phrase
- `validatorIndex: number` - Validator index (0-based)
- `amount: bigint` - Deposit amount in Gwei
- `chainSetting: ChainSetting` - Network configuration (MainnetSetting, HoleskySetting)
- `mnemonicPassword?: string` - Optional mnemonic password
- `ethWithdrawalAddress?: Uint8Array` - Optional ETH1 withdrawal address (20 bytes)

**Returns:** `Promise<DepositResult>`

### `DepositResult`

```typescript
interface DepositResult {
  withdrawalCredentials: Uint8Array;    // 32 bytes
  depositDataRoot: Uint8Array;          // 32 bytes
  signature: Uint8Array;                // 96 bytes
  depositMessage: DepositMessageType;
  depositData: DepositDataType;
  signingPublicKey: Uint8Array;         // 48 bytes
  withdrawalPublicKey: Uint8Array;      // 48 bytes
}
```

### Chain Settings

Available chain configurations:

```typescript
import { MainnetSetting, HoleskySetting } from './src/index';

// Ethereum Mainnet
const mainnetData = await generateDepositDataFromMnemonic(
  mnemonic, 0, BigInt(32 * ETH2GWEI), MainnetSetting
);

// Holesky Testnet
const holeskyData = await generateDepositDataFromMnemonic(
  mnemonic, 0, BigInt(32 * ETH2GWEI), HoleskySetting
);
```

### Utility Functions

```typescript
import { hexToBytes, bytesToHex } from './src/index';

// Convert hex string to bytes
const bytes = hexToBytes('0x1234567890abcdef');

// Convert bytes to hex string
const hex = bytesToHex(new Uint8Array([0x12, 0x34, 0x56])); // '0x123456'
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Run Example

```bash
npm run example
```

## Key Derivation

This implementation follows EIP-2334 for key derivation:

- Purpose: `12381` (BLS signature scheme)
- Coin Type: `3600` (Ethereum consensus layer)
- Account: Validator index
- Withdrawal key path: `m/12381/3600/{validator_index}/0`
- Signing key path: `m/12381/3600/{validator_index}/0/0`

## Security Considerations

- **Never expose your mnemonic phrase** - Keep it secure and private
- **Use secure random number generation** for production mnemonics
- **Validate all inputs** before processing
- **Use testnet first** (Holesky) before mainnet operations
- **Verify deposit data** before submitting to the deposit contract

## Compatibility

This TypeScript implementation produces identical results to the Python staking-deposit-cli, ensuring compatibility with existing Ethereum staking infrastructure.

## Dependencies

- `@noble/bls12-381` - BLS signature operations
- `@noble/hashes` - Cryptographic hash functions
- `@scure/bip39` - BIP39 mnemonic operations

## License

MIT License - see LICENSE file for details.
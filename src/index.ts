// Main exports
export {
  generateDepositDataFromMnemonic,
  Credential,
  WithdrawalType,
  type DepositResult
} from './credentials';

export {
  MainnetSetting,
  HoleskySetting,
  type ChainSetting,
  MIN_DEPOSIT_AMOUNT,
  MAX_DEPOSIT_AMOUNT,
  ETH2GWEI
} from './constants';

export {
  mnemonicAndPathToKey,
  generateValidatorKeys
} from './utils/keyDerivation';

export {
  skToPk,
  sign,
  verify
} from './utils/bls';

export {
  computeDepositDomain,
  computeSigningRoot,
  getDepositMessageRoot,
  getDepositDataRoot,
  type DepositMessageType,
  type DepositDataType
} from './utils/ssz';

// Utility function to convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Utility function to convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
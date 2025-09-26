import { mnemonicToSeedSync } from '@scure/bip39';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';
import { PURPOSE, COIN_TYPE } from '../constants';

const BLS_CURVE_ORDER = BigInt('52435875175126190479447740508185965837690552500527637822603658699938581184513');

/**
 * Derives a master secret key from a mnemonic seed
 * Following EIP-2333: https://eips.ethereum.org/EIPS/eip-2333
 */
function deriveMasterSK(seed: Uint8Array): bigint {
  const salt = new TextEncoder().encode('BLS-SIG-KEYGEN-SALT-');
  return hkdfModR(seed, '', salt);
}

/**
 * Derives a child secret key from a parent secret key and index
 * Following EIP-2333: https://eips.ethereum.org/EIPS/eip-2333
 */
function deriveChildSK(parentSK: bigint, index: number): bigint {
  if (index < 0 || index >= 2**32) {
    throw new Error(`index should be >= 0 and < 2^32. Got index=${index}`);
  }
  
  const lamportPK = parentSKToLamportPK(parentSK, index);
  return hkdfModR(lamportPK, '');
}

/**
 * HKDF-MOD-R as defined in EIP-2333
 */
function hkdfModR(ikm: Uint8Array, keyInfo: string, salt?: Uint8Array): bigint {
  const L = 48; // ceil((3 * ceil(log2(r))) / 16)
  let currentSalt = salt || new TextEncoder().encode('BLS-SIG-KEYGEN-SALT-');
  let SK = BigInt(0);
  
  while (SK === BigInt(0)) {
    currentSalt = sha256(currentSalt);
    const ikmWithPostfix = new Uint8Array(ikm.length + 1);
    ikmWithPostfix.set(ikm);
    ikmWithPostfix[ikm.length] = 0x00; // I2OSP(0, 1)
    
    const info = new TextEncoder().encode(keyInfo + String(L));
    const okm = hkdf(sha256, ikmWithPostfix, currentSalt, info, L);
    
    // Convert to big integer
    let result = BigInt(0);
    for (let i = 0; i < okm.length; i++) {
      result = result * BigInt(256) + BigInt(okm[i]);
    }
    SK = result % BLS_CURVE_ORDER;
  }
  
  return SK;
}

/**
 * Convert parent SK to Lamport public key
 */
function parentSKToLamportPK(parentSK: bigint, index: number): Uint8Array {
  const salt = new Uint8Array(4);
  const view = new DataView(salt.buffer);
  view.setUint32(0, index, false); // big-endian
  
  const ikm = new Uint8Array(32);
  const skBytes = parentSK.toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    ikm[i] = parseInt(skBytes.substr(i * 2, 2), 16);
  }
  
  const lamportSK = ikmToLamportSK(ikm, salt);
  
  // Create Lamport PK
  const lamportPK = new Uint8Array(32 * 255);
  for (let i = 0; i < 255; i++) {
    const hash = sha256(lamportSK[i]);
    lamportPK.set(hash, i * 32);
  }
  
  // Compress Lamport PK
  return sha256(lamportPK);
}

/**
 * Convert IKM to Lamport secret key
 */
function ikmToLamportSK(ikm: Uint8Array, salt: Uint8Array): Uint8Array[] {
  const lamportSK: Uint8Array[] = [];
  
  for (let i = 0; i < 255; i++) {
    const info = new Uint8Array(2);
    const view = new DataView(info.buffer);
    view.setUint16(0, i, false); // big-endian
    
    const sk = hkdf(sha256, ikm, salt, info, 32);
    lamportSK.push(sk);
  }
  
  return lamportSK;
}

/**
 * Derives a key from mnemonic and BIP-44 path
 * Following EIP-2334: https://eips.ethereum.org/EIPS/eip-2334
 */
export function mnemonicAndPathToKey(mnemonic: string, path: string, password: string = ''): bigint {
  // Generate seed from mnemonic
  const seed = mnemonicToSeedSync(mnemonic, password);
  
  // Parse the path (e.g., "m/12381/3600/0/0")
  const pathSegments = path.split('/').slice(1); // Remove 'm'
  
  // Start with master key
  let sk = deriveMasterSK(seed);
  
  // Derive through each path segment
  for (const segment of pathSegments) {
    const index = parseInt(segment, 10);
    sk = deriveChildSK(sk, index);
  }
  
  return sk;
}

/**
 * Generate signing and withdrawal keys for a validator
 */
export function generateValidatorKeys(mnemonic: string, validatorIndex: number, password: string = '') {
  const account = validatorIndex.toString();
  const withdrawalKeyPath = `m/${PURPOSE}/${COIN_TYPE}/${account}/0`;
  const signingKeyPath = `${withdrawalKeyPath}/0`;
  
  const withdrawalSK = mnemonicAndPathToKey(mnemonic, withdrawalKeyPath, password);
  const signingSK = mnemonicAndPathToKey(mnemonic, signingKeyPath, password);
  
  return {
    withdrawalSK,
    signingSK,
    withdrawalKeyPath,
    signingKeyPath
  };
}
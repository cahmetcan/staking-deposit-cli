import { sha256 } from '@noble/hashes/sha256';
import { DOMAIN_DEPOSIT, ZERO_BYTES32 } from '../constants';
import type { ChainSetting } from '../constants';

// Type definitions
export type DepositMessageType = {
  pubkey: Uint8Array;
  withdrawal_credentials: Uint8Array;
  amount: bigint;
};

export type DepositDataType = {
  pubkey: Uint8Array;
  withdrawal_credentials: Uint8Array;
  amount: bigint;
  signature: Uint8Array;
};

export type SigningDataType = {
  object_root: Uint8Array;
  domain: Uint8Array;
};

export type ForkDataType = {
  current_version: Uint8Array;
  genesis_validators_root: Uint8Array;
};

/**
 * Simple SSZ serialization for our specific types
 * This is a minimal implementation following the SSZ spec for our needs
 */

function serializeUint64(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(v & BigInt(0xff));
    v = v >> BigInt(8);
  }
  return bytes;
}

function serializeDepositMessage(msg: DepositMessageType): Uint8Array {
  // pubkey (48) + withdrawal_credentials (32) + amount (8)
  const serialized = new Uint8Array(88);
  serialized.set(msg.pubkey, 0);
  serialized.set(msg.withdrawal_credentials, 48);
  serialized.set(serializeUint64(msg.amount), 80);
  return serialized;
}

function serializeDepositData(data: DepositDataType): Uint8Array {
  // pubkey (48) + withdrawal_credentials (32) + amount (8) + signature (96)
  const serialized = new Uint8Array(184);
  serialized.set(data.pubkey, 0);
  serialized.set(data.withdrawal_credentials, 48);
  serialized.set(serializeUint64(data.amount), 80);
  serialized.set(data.signature, 88);
  return serialized;
}

function serializeSigningData(data: SigningDataType): Uint8Array {
  // object_root (32) + domain (32)
  const serialized = new Uint8Array(64);
  serialized.set(data.object_root, 0);
  serialized.set(data.domain, 32);
  return serialized;
}

function serializeForkData(data: ForkDataType): Uint8Array {
  // current_version (4) + genesis_validators_root (32)
  const serialized = new Uint8Array(36);
  serialized.set(data.current_version, 0);
  serialized.set(data.genesis_validators_root, 4);
  return serialized;
}

/**
 * Hash tree root functions - simplified for our use case
 * For basic types, hash tree root is just the SHA256 hash
 */

export function hashTreeRootDepositMessage(msg: DepositMessageType): Uint8Array {
  return sha256(serializeDepositMessage(msg));
}

export function hashTreeRootDepositData(data: DepositDataType): Uint8Array {
  return sha256(serializeDepositData(data));
}

export function hashTreeRootSigningData(data: SigningDataType): Uint8Array {
  return sha256(serializeSigningData(data));
}

export function hashTreeRootForkData(data: ForkDataType): Uint8Array {
  return sha256(serializeForkData(data));
}

/**
 * Compute fork data root
 */
export function computeForkDataRoot(currentVersion: Uint8Array, genesisValidatorsRoot: Uint8Array): Uint8Array {
  if (currentVersion.length !== 4) {
    throw new Error(`Fork version should be 4 bytes. Got ${currentVersion.length}`);
  }
  
  const forkData: ForkDataType = {
    current_version: currentVersion,
    genesis_validators_root: genesisValidatorsRoot
  };
  
  return hashTreeRootForkData(forkData);
}

/**
 * Compute deposit fork data root (simplified for deposits)
 */
export function computeDepositForkDataRoot(currentVersion: Uint8Array): Uint8Array {
  return computeForkDataRoot(currentVersion, ZERO_BYTES32);
}

/**
 * Compute deposit domain
 */
export function computeDepositDomain(forkVersion: Uint8Array): Uint8Array {
  if (forkVersion.length !== 4) {
    throw new Error(`Fork version should be 4 bytes. Got ${forkVersion.length}`);
  }
  
  const domainType = DOMAIN_DEPOSIT;
  const forkDataRoot = computeDepositForkDataRoot(forkVersion);
  
  // Domain = domain_type + fork_data_root[:28]
  const domain = new Uint8Array(32);
  domain.set(domainType, 0);
  domain.set(forkDataRoot.slice(0, 28), 4);
  
  return domain;
}

/**
 * Compute signing root
 */
export function computeSigningRoot(sszObject: DepositMessageType, domain: Uint8Array): Uint8Array {
  if (domain.length !== 32) {
    throw new Error(`Domain should be 32 bytes. Got ${domain.length}`);
  }
  
  const objectRoot = hashTreeRootDepositMessage(sszObject);
  const signingData: SigningDataType = {
    object_root: objectRoot,
    domain: domain
  };
  
  return hashTreeRootSigningData(signingData);
}

/**
 * Get hash tree root of deposit message
 */
export function getDepositMessageRoot(depositMessage: DepositMessageType): Uint8Array {
  return hashTreeRootDepositMessage(depositMessage);
}

/**
 * Get hash tree root of deposit data
 */
export function getDepositDataRoot(depositData: DepositDataType): Uint8Array {
  return hashTreeRootDepositData(depositData);
}
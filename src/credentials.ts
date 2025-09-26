import { sha256 } from '@noble/hashes/sha256';
import { generateValidatorKeys } from './utils/keyDerivation';
import { skToPk, sign } from './utils/bls';
import {
  computeDepositDomain,
  computeSigningRoot,
  getDepositMessageRoot,
  getDepositDataRoot,
  type DepositMessageType,
  type DepositDataType
} from './utils/ssz';
import {
  BLS_WITHDRAWAL_PREFIX,
  ETH1_ADDRESS_WITHDRAWAL_PREFIX,
  MIN_DEPOSIT_AMOUNT,
  MAX_DEPOSIT_AMOUNT,
  type ChainSetting
} from './constants';

export enum WithdrawalType {
  BLS_WITHDRAWAL = 0,
  ETH1_ADDRESS_WITHDRAWAL = 1
}

export interface DepositResult {
  withdrawalCredentials: Uint8Array;
  depositDataRoot: Uint8Array;
  signature: Uint8Array;
  depositMessage: DepositMessageType;
  depositData: DepositDataType;
  signingPublicKey: Uint8Array;
  withdrawalPublicKey: Uint8Array;
}

export class Credential {
  private withdrawalSK: bigint;
  private signingSK: bigint;
  private amount: bigint;
  private chainSetting: ChainSetting;
  private ethWithdrawalAddress?: Uint8Array;
  
  constructor(
    mnemonic: string,
    mnemonicPassword: string,
    validatorIndex: number,
    amount: bigint,
    chainSetting: ChainSetting,
    ethWithdrawalAddress?: Uint8Array
  ) {
    if (amount < MIN_DEPOSIT_AMOUNT || amount > MAX_DEPOSIT_AMOUNT) {
      throw new Error(`Amount ${amount} is not within valid deposit bounds`);
    }
    
    const keys = generateValidatorKeys(mnemonic, validatorIndex, mnemonicPassword);
    this.withdrawalSK = keys.withdrawalSK;
    this.signingSK = keys.signingSK;
    this.amount = amount;
    this.chainSetting = chainSetting;
    this.ethWithdrawalAddress = ethWithdrawalAddress;
  }
  
  /**
   * Get signing public key
   */
  get signingPublicKey(): Uint8Array {
    return skToPk(this.signingSK);
  }
  
  /**
   * Get withdrawal public key
   */
  get withdrawalPublicKey(): Uint8Array {
    return skToPk(this.withdrawalSK);
  }
  
  /**
   * Get withdrawal type
   */
  get withdrawalType(): WithdrawalType {
    return this.ethWithdrawalAddress ? WithdrawalType.ETH1_ADDRESS_WITHDRAWAL : WithdrawalType.BLS_WITHDRAWAL;
  }
  
  /**
   * Generate withdrawal credentials
   */
  get withdrawalCredentials(): Uint8Array {
    const credentials = new Uint8Array(32);
    
    if (this.withdrawalType === WithdrawalType.BLS_WITHDRAWAL) {
      // BLS withdrawal: 0x00 + hash(withdrawal_pubkey)[1:]
      credentials.set(BLS_WITHDRAWAL_PREFIX, 0);
      const withdrawalPkHash = sha256(this.withdrawalPublicKey);
      credentials.set(withdrawalPkHash.slice(1), 1);
    } else if (this.withdrawalType === WithdrawalType.ETH1_ADDRESS_WITHDRAWAL && this.ethWithdrawalAddress) {
      // ETH1 withdrawal: 0x01 + 11 zero bytes + eth1_address (20 bytes)
      credentials.set(ETH1_ADDRESS_WITHDRAWAL_PREFIX, 0);
      credentials.set(new Uint8Array(11), 1); // 11 zero bytes
      credentials.set(this.ethWithdrawalAddress, 12);
    } else {
      throw new Error('Invalid withdrawal configuration');
    }
    
    return credentials;
  }
  
  /**
   * Create deposit message
   */
  get depositMessage(): DepositMessageType {
    return {
      pubkey: this.signingPublicKey,
      withdrawal_credentials: this.withdrawalCredentials,
      amount: this.amount
    };
  }
  
  /**
   * Create signed deposit data
   */
  async signedDeposit(): Promise<DepositDataType> {
    const depositMessage = this.depositMessage;
    const domain = computeDepositDomain(this.chainSetting.GENESIS_FORK_VERSION);
    const signingRoot = computeSigningRoot(depositMessage, domain);
    const signature = await sign(this.signingSK, signingRoot);
    
    return {
      pubkey: depositMessage.pubkey,
      withdrawal_credentials: depositMessage.withdrawal_credentials,
      amount: depositMessage.amount,
      signature: signature
    };
  }
  
  /**
   * Generate all deposit data (main method)
   */
  async generateDepositData(): Promise<DepositResult> {
    const depositMessage = this.depositMessage;
    const signedDeposit = await this.signedDeposit();
    
    return {
      withdrawalCredentials: this.withdrawalCredentials,
      depositDataRoot: getDepositDataRoot(signedDeposit),
      signature: signedDeposit.signature,
      depositMessage: depositMessage,
      depositData: signedDeposit,
      signingPublicKey: this.signingPublicKey,
      withdrawalPublicKey: this.withdrawalPublicKey
    };
  }
}

/**
 * Generate deposit data from mnemonic and validator information
 */
export async function generateDepositDataFromMnemonic(
  mnemonic: string,
  validatorIndex: number,
  amount: bigint,
  chainSetting: ChainSetting,
  mnemonicPassword: string = '',
  ethWithdrawalAddress?: Uint8Array
): Promise<DepositResult> {
  const credential = new Credential(
    mnemonic,
    mnemonicPassword,
    validatorIndex,
    amount,
    chainSetting,
    ethWithdrawalAddress
  );
  
  return await credential.generateDepositData();
}
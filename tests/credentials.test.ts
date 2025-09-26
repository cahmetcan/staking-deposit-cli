import {
  generateDepositDataFromMnemonic,
  MainnetSetting,
  HoleskySetting,
  ETH2GWEI,
  WithdrawalType,
  Credential,
  bytesToHex
} from '../src/index';

// Test mnemonic (same as used in Python tests)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Ethereum Staking Deposit Generator', () => {
  describe('Basic functionality', () => {
    test('should generate deposit data with BLS withdrawal', async () => {
      const result = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting
      );
      
      expect(result.withdrawalCredentials).toHaveLength(32);
      expect(result.depositDataRoot).toHaveLength(32);
      expect(result.signature).toHaveLength(96);
      expect(result.signingPublicKey).toHaveLength(48);
      expect(result.withdrawalPublicKey).toHaveLength(48);
      
      // BLS withdrawal should start with 0x00
      expect(result.withdrawalCredentials[0]).toBe(0x00);
    });
    
    test('should generate deposit data with ETH1 withdrawal', async () => {
      const ethAddress = new Uint8Array(20).fill(0x42); // Mock ETH1 address
      
      const result = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting,
        '',
        ethAddress
      );
      
      expect(result.withdrawalCredentials).toHaveLength(32);
      expect(result.depositDataRoot).toHaveLength(32);
      expect(result.signature).toHaveLength(96);
      
      // ETH1 withdrawal should start with 0x01
      expect(result.withdrawalCredentials[0]).toBe(0x01);
      
      // Should contain the ETH1 address in the last 20 bytes
      const addressFromCredentials = result.withdrawalCredentials.slice(12);
      expect(addressFromCredentials).toEqual(ethAddress);
    });
    
    test('should generate different keys for different validator indices', async () => {
      const result1 = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting
      );
      
      const result2 = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        1,
        BigInt(32 * ETH2GWEI),
        HoleskySetting
      );
      
      expect(result1.signingPublicKey).not.toEqual(result2.signingPublicKey);
      expect(result1.withdrawalPublicKey).not.toEqual(result2.withdrawalPublicKey);
      expect(result1.withdrawalCredentials).not.toEqual(result2.withdrawalCredentials);
    });
    
    test('should work with different chain settings', async () => {
      const mainnetResult = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        0,
        BigInt(32 * ETH2GWEI),
        MainnetSetting
      );
      
      const holeskyResult = await generateDepositDataFromMnemonic(
        TEST_MNEMONIC,
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting
      );
      
      // Keys should be the same (derived from same mnemonic and index)
      expect(mainnetResult.signingPublicKey).toEqual(holeskyResult.signingPublicKey);
      expect(mainnetResult.withdrawalPublicKey).toEqual(holeskyResult.withdrawalPublicKey);
      expect(mainnetResult.withdrawalCredentials).toEqual(holeskyResult.withdrawalCredentials);
      
      // But signatures should be different (different fork versions)
      expect(mainnetResult.signature).not.toEqual(holeskyResult.signature);
      expect(mainnetResult.depositDataRoot).not.toEqual(holeskyResult.depositDataRoot);
    });
    
    test('should reject invalid deposit amounts', async () => {
      await expect(
        generateDepositDataFromMnemonic(
          TEST_MNEMONIC,
          0,
          BigInt(0), // Invalid: too small
          HoleskySetting
        )
      ).rejects.toThrow();
      
      await expect(
        generateDepositDataFromMnemonic(
          TEST_MNEMONIC,
          0,
          BigInt(100 * ETH2GWEI), // Invalid: too large
          HoleskySetting
        )
      ).rejects.toThrow();
    });
  });
  
  describe('Credential class', () => {
    test('should create credential with BLS withdrawal', () => {
      const credential = new Credential(
        TEST_MNEMONIC,
        '',
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting
      );
      
      expect(credential.withdrawalType).toBe(WithdrawalType.BLS_WITHDRAWAL);
      expect(credential.signingPublicKey).toHaveLength(48);
      expect(credential.withdrawalPublicKey).toHaveLength(48);
      expect(credential.withdrawalCredentials).toHaveLength(32);
      expect(credential.withdrawalCredentials[0]).toBe(0x00);
    });
    
    test('should create credential with ETH1 withdrawal', () => {
      const ethAddress = new Uint8Array(20).fill(0x33);
      const credential = new Credential(
        TEST_MNEMONIC,
        '',
        0,
        BigInt(32 * ETH2GWEI),
        HoleskySetting,
        ethAddress
      );
      
      expect(credential.withdrawalType).toBe(WithdrawalType.ETH1_ADDRESS_WITHDRAWAL);
      expect(credential.withdrawalCredentials[0]).toBe(0x01);
      
      const addressFromCredentials = credential.withdrawalCredentials.slice(12);
      expect(addressFromCredentials).toEqual(ethAddress);
    });
  });
});
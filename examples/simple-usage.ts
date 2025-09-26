#!/usr/bin/env ts-node
/**
 * Simple usage example for generating Ethereum validator deposit data
 * 
 * This script demonstrates how to generate withdrawal credentials, 
 * deposit data root, and signature using a validator's public key 
 * and a 12-word mnemonic phrase.
 */

import {
  generateDepositDataFromMnemonic,
  HoleskySetting,
  MainnetSetting,
  ETH2GWEI,
  bytesToHex,
  hexToBytes
} from '../src/index';

// ⚠️  SECURITY WARNING: Never use this test mnemonic in production!
// This is the standard test mnemonic used in many crypto libraries
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function demonstrateBasicUsage() {
  console.log('🔐 TypeScript Staking Deposit Generator');
  console.log('======================================\n');
  
  // Example 1: Basic BLS withdrawal (most common)
  console.log('📝 Example 1: BLS Withdrawal (Default)');
  console.log('--------------------------------------');
  
  const basicDeposit = await generateDepositDataFromMnemonic(
    TEST_MNEMONIC,
    0, // First validator (index 0)
    BigInt(32 * ETH2GWEI), // 32 ETH in Gwei
    HoleskySetting // Holesky testnet
  );
  
  console.log('✅ Generated deposit data for Validator 0:');
  console.log(`   Withdrawal Credentials: ${bytesToHex(basicDeposit.withdrawalCredentials)}`);
  console.log(`   Deposit Data Root:      ${bytesToHex(basicDeposit.depositDataRoot)}`);
  console.log(`   Signature:              ${bytesToHex(basicDeposit.signature)}`);
  console.log(`   Signing Public Key:     ${bytesToHex(basicDeposit.signingPublicKey)}`);
  console.log(`   Withdrawal Public Key:  ${bytesToHex(basicDeposit.withdrawalPublicKey)}\n`);
  
  // Example 2: ETH1 withdrawal address
  console.log('📝 Example 2: ETH1 Withdrawal Address');
  console.log('------------------------------------');
  
  // Example ETH1 address - replace with your actual withdrawal address
  const ethWithdrawalAddress = hexToBytes('0x742d35Cc6634C0532925a3b8D5c9c3C21eb43A18');
  
  const eth1Deposit = await generateDepositDataFromMnemonic(
    TEST_MNEMONIC,
    1, // Second validator (index 1)
    BigInt(32 * ETH2GWEI),
    HoleskySetting,
    '', // No mnemonic password
    ethWithdrawalAddress
  );
  
  console.log('✅ Generated deposit data for Validator 1 with ETH1 withdrawal:');
  console.log(`   ETH1 Address:           ${bytesToHex(ethWithdrawalAddress)}`);
  console.log(`   Withdrawal Credentials: ${bytesToHex(eth1Deposit.withdrawalCredentials)}`);
  console.log(`   Deposit Data Root:      ${bytesToHex(eth1Deposit.depositDataRoot)}`);
  console.log(`   Signature:              ${bytesToHex(eth1Deposit.signature)}\n`);
  
  // Example 3: Multiple validators
  console.log('📝 Example 3: Multiple Validators');
  console.log('---------------------------------');
  
  const validators = [];
  for (let i = 0; i < 3; i++) {
    const deposit = await generateDepositDataFromMnemonic(
      TEST_MNEMONIC,
      i,
      BigInt(32 * ETH2GWEI),
      HoleskySetting
    );
    
    validators.push({
      index: i,
      pubkey: bytesToHex(deposit.signingPublicKey),
      withdrawalCredentials: bytesToHex(deposit.withdrawalCredentials),
      depositDataRoot: bytesToHex(deposit.depositDataRoot)
    });
  }
  
  console.log('✅ Generated data for 3 validators:');
  validators.forEach(v => {
    console.log(`   Validator ${v.index}:`);
    console.log(`     Public Key:      ${v.pubkey}`);
    console.log(`     Withdrawal Cred: ${v.withdrawalCredentials}`);
    console.log(`     Deposit Root:    ${v.depositDataRoot}`);
  });
  
  console.log('\n🎉 All examples completed successfully!');
  console.log('\n⚠️  Remember:');
  console.log('   - Never share your real mnemonic phrase');
  console.log('   - Test on Holesky before using Mainnet');
  console.log('   - Verify all data before submitting deposits');
}

// Example of error handling
async function demonstrateErrorHandling() {
  console.log('\n📝 Example 4: Error Handling');
  console.log('----------------------------');
  
  try {
    // This will fail - invalid deposit amount
    await generateDepositDataFromMnemonic(
      TEST_MNEMONIC,
      0,
      BigInt(100 * ETH2GWEI), // Too much! Max is 32 ETH
      HoleskySetting
    );
  } catch (error) {
    console.log('❌ Caught expected error for invalid amount:', (error as Error).message);
  }
  
  try {
    // This will fail - invalid mnemonic
    await generateDepositDataFromMnemonic(
      'invalid mnemonic phrase',
      0,
      BigInt(32 * ETH2GWEI),
      HoleskySetting
    );
  } catch (error) {
    console.log('❌ Caught expected error for invalid mnemonic:', (error as Error).message);
  }
  
  console.log('✅ Error handling works correctly!');
}

// Run all examples
async function main() {
  try {
    await demonstrateBasicUsage();
    await demonstrateErrorHandling();
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { main };
import {
  generateDepositDataFromMnemonic,
  MainnetSetting,
  HoleskySetting,
  ETH2GWEI,
  bytesToHex
} from '../src/index';

// Example mnemonic (12 words) - DO NOT use this in production!
const EXAMPLE_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function example() {
  console.log('🔐 Ethereum Staking Deposit Generator (TypeScript)\n');
  
  try {
    // Generate deposit data for validator index 0 with 32 ETH
    const depositData = await generateDepositDataFromMnemonic(
      EXAMPLE_MNEMONIC,
      0, // validator index
      BigInt(32 * ETH2GWEI), // 32 ETH in Gwei
      HoleskySetting, // Use Holesky testnet
      '', // no mnemonic password
      // undefined // no ETH1 withdrawal address (uses BLS withdrawal)
    );
    
    console.log('📋 Generated Deposit Data:');
    console.log('========================');
    console.log(`Validator Index: 0`);
    console.log(`Amount: 32 ETH`);
    console.log(`Network: ${HoleskySetting.NETWORK_NAME}`);
    console.log();
    
    console.log('🔑 Keys:');
    console.log(`Signing Public Key: ${bytesToHex(depositData.signingPublicKey)}`);
    console.log(`Withdrawal Public Key: ${bytesToHex(depositData.withdrawalPublicKey)}`);
    console.log();
    
    console.log('📄 Deposit Data:');
    console.log(`Withdrawal Credentials: ${bytesToHex(depositData.withdrawalCredentials)}`);
    console.log(`Deposit Data Root: ${bytesToHex(depositData.depositDataRoot)}`);
    console.log(`Signature: ${bytesToHex(depositData.signature)}`);
    console.log();
    
    console.log('🔍 Deposit Message:');
    console.log(`Public Key: ${bytesToHex(depositData.depositMessage.pubkey)}`);
    console.log(`Withdrawal Credentials: ${bytesToHex(depositData.depositMessage.withdrawal_credentials)}`);
    console.log(`Amount: ${depositData.depositMessage.amount.toString()} Gwei`);
    console.log();
    
    // Example with ETH1 withdrawal address
    console.log('🏦 Example with ETH1 Withdrawal Address:');
    console.log('========================================');
    
    // Example ETH1 address (20 bytes)
    const ethAddress = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      0x12, 0x34, 0x56, 0x78
    ]);
    
    const depositDataWithEth1 = await generateDepositDataFromMnemonic(
      EXAMPLE_MNEMONIC,
      1, // different validator index
      BigInt(32 * ETH2GWEI),
      HoleskySetting,
      '',
      ethAddress
    );
    
    console.log(`ETH1 Withdrawal Address: ${bytesToHex(ethAddress)}`);
    console.log(`Withdrawal Credentials: ${bytesToHex(depositDataWithEth1.withdrawalCredentials)}`);
    console.log(`Deposit Data Root: ${bytesToHex(depositDataWithEth1.depositDataRoot)}`);
    console.log();
    
    console.log('✅ Example completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating deposit data:', error);
    process.exit(1);
  }
}

// Run the example
example();
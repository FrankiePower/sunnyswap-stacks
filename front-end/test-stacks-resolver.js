// Quick test to verify Stacks resolver configuration
require('dotenv').config();
const { getAddressFromPrivateKey } = require('@stacks/transactions');

const privateKey = process.env.STACKS_RESOLVER_PRIVATE_KEY;
const contract = process.env.STACKS_HTLC_CONTRACT;
const network = process.env.STACKS_NETWORK;

console.log('='.repeat(70));
console.log('Stacks Resolver Configuration Check');
console.log('='.repeat(70));

if (!privateKey) {
  console.log('❌ STACKS_RESOLVER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

if (!contract) {
  console.log('❌ STACKS_HTLC_CONTRACT not set in .env');
  process.exit(1);
}

const address = getAddressFromPrivateKey(
  privateKey,
  network === 'mainnet' ? 0x16 : 0x1a // testnet = 0x1a
);

console.log('✅ Private Key:  ', privateKey.substring(0, 20) + '...');
console.log('✅ Address:      ', address);
console.log('✅ Contract:     ', contract);
console.log('✅ Network:      ', network || 'testnet');
console.log('='.repeat(70));

if (address !== 'ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF') {
  console.log('⚠️  WARNING: Address does not match deployed contract!');
  console.log('   Expected:    ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF');
  console.log('   Got:        ', address);
} else {
  console.log('✅ Address matches deployed contract!');
}

console.log('='.repeat(70));
console.log('\n🚀 Ready to test resolver flow!');
console.log('\nNext steps:');
console.log('1. Make sure you have testnet STX at: ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF');
console.log('2. Create a new swap order in the UI');
console.log('3. Watch the resolver create both escrows automatically');
console.log('='.repeat(70));

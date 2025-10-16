// Helper script to get Stacks private key from mnemonic
const { getAddressFromPrivateKey, TransactionVersion } = require('@stacks/transactions');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const BIP32 = BIP32Factory(ecc);
const fs = require('fs');
const toml = require('toml');

async function deriveStacksKey() {
  // Read mnemonic from Testnet.toml
  const tomlFile = fs.readFileSync('./settings/Testnet.toml', 'utf8');
  const config = toml.parse(tomlFile);
  const mnemonic = config.accounts.deployer.mnemonic;

  if (!mnemonic || mnemonic === "YOUR_TESTNET_MNEMONIC_HERE") {
    console.error('❌ Please add your mnemonic to settings/Testnet.toml first!');
    process.exit(1);
  }

  // Derive seed from mnemonic
  const seed = await bip39.mnemonicToSeed(mnemonic);

  // Standard Stacks derivation path: m/44'/5757'/0'/0/0
  const node = BIP32.fromSeed(seed);
  const child = node.derivePath("m/44'/5757'/0'/0/0");
  const privateKey = child.privateKey.toString('hex');

  // Get Stacks address for testnet
  const address = getAddressFromPrivateKey(privateKey, TransactionVersion.Testnet);

  console.log('='.repeat(70));
  console.log('Stacks Resolver Credentials');
  console.log('='.repeat(70));
  console.log('Private Key:', privateKey);
  console.log('Address:    ', address);
  console.log('Network:    ', 'Testnet');
  console.log('='.repeat(70));
  console.log('\n📋 Add to /Users/user/SuperFranky/sunnyswap-stacks/front-end/.env:');
  console.log('='.repeat(70));
  console.log(`STACKS_RESOLVER_PRIVATE_KEY=${privateKey}`);
  console.log('='.repeat(70));
  console.log('\n💰 Get testnet STX:');
  console.log('https://explorer.hiro.so/sandbox/faucet?chain=testnet');
  console.log(`Paste address: ${address}`);
  console.log('='.repeat(70));
}

deriveStacksKey().catch(console.error);

// Simple script to get Stacks private key from mnemonic in Testnet.toml
const { generateWallet, getStxAddress } = require('@stacks/wallet-sdk');
const fs = require('fs');
const toml = require('toml');

async function getStacksKey() {
  try {
    // Read mnemonic from Testnet.toml
    const tomlFile = fs.readFileSync('./settings/Testnet.toml', 'utf8');
    const config = toml.parse(tomlFile);
    const mnemonic = config.accounts.deployer.mnemonic;

    if (!mnemonic || mnemonic === "YOUR_TESTNET_MNEMONIC_HERE") {
      console.error('❌ Please add your mnemonic to settings/Testnet.toml first!');
      process.exit(1);
    }

    // Generate wallet from mnemonic
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: '',
    });

    // Get first account (index 0) for testnet
    const account = wallet.accounts[0];
    const address = getStxAddress({ account, transactionVersion: 'testnet' });

    console.log('='.repeat(70));
    console.log('🔑 Stacks Resolver Credentials (from Testnet.toml)');
    console.log('='.repeat(70));
    console.log('Private Key:', account.stxPrivateKey);
    console.log('Address:    ', address);
    console.log('Network:    ', 'Testnet');
    console.log('Derivation: ', "m/44'/5757'/0'/0/0");
    console.log('='.repeat(70));
    console.log('\n📋 Add to /Users/user/SuperFranky/sunnyswap-stacks/front-end/.env:');
    console.log('='.repeat(70));
    console.log(`STACKS_RESOLVER_PRIVATE_KEY=${account.stxPrivateKey}`);
    console.log(`STACKS_HTLC_CONTRACT=ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc`);
    console.log(`STACKS_NETWORK=testnet`);
    console.log('='.repeat(70));
    console.log('\n💰 Get testnet STX for this address:');
    console.log('https://explorer.hiro.so/sandbox/faucet?chain=testnet');
    console.log(`Address: ${address}`);
    console.log('='.repeat(70));
    console.log('\n✅ This wallet deployed the contract, it should match:');
    console.log('   ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getStacksKey();

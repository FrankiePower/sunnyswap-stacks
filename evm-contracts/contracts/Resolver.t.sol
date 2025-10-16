// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {Resolver} from "./Resolver.sol";
import {STXEscrowFactory} from "./STXEscrowFactory.sol";
import {MockERC20} from "./test/MockERC20.sol";
import {IBaseEscrow} from "./interfaces/IBaseEscrow.sol";
import {TimelocksLib, Timelocks} from "./libraries/TimelocksLib.sol";
import {Address, AddressLib} from "./libraries/AddressLib.sol";

/**
 * @title Resolver Unit Tests
 * @notice Solidity tests for the Resolver contract
 */
contract ResolverTest is Test {
    using AddressLib for address;
    using AddressLib for Address;

    Resolver public resolver;
    STXEscrowFactory public factory;
    MockERC20 public accessToken;

    address public owner;
    address public resolverBot;
    address public user;
    address public treasury;

    // Add receive function to accept ETH (for treasury)
    receive() external payable {}

    // Configuration
    uint32 public constant RESCUE_DELAY_SRC = 86400; // 24 hours
    uint32 public constant RESCUE_DELAY_DST = 86400; // 24 hours
    uint256 public constant CREATION_FEE = 0.0001 ether;

    function setUp() public {
        // Create test accounts
        owner = address(this);
        resolverBot = makeAddr("resolverBot");
        user = makeAddr("user");

        // Fund accounts
        vm.deal(owner, 100 ether);
        vm.deal(resolverBot, 100 ether);
        vm.deal(user, 100 ether);

        // Deploy access token
        accessToken = new MockERC20("Access Token", "ACCESS");

        // Deploy factory
        STXEscrowFactory.StacksConfig memory stacksConfig = STXEscrowFactory.StacksConfig({
            minConfirmations: 1,
            dustThreshold: 1000000,        // 1 STX
            maxAmount: 1000000000000       // 1 million STX
        });

        factory = new STXEscrowFactory(
            accessToken,
            owner,
            RESCUE_DELAY_SRC,
            RESCUE_DELAY_DST,
            CREATION_FEE,
            owner,  // treasury
            stacksConfig
        );

        // Deploy resolver (owned by resolverBot)
        resolver = new Resolver(address(factory), resolverBot);
    }

    function test_InitialState() public view {
        assertEq(resolver.getFactory(), address(factory));
        assertEq(resolver.owner(), resolverBot);
    }

    function test_OnlyOwnerCanDeploySrc() public {
        IBaseEscrow.Immutables memory immutables = _createTestImmutables();
        uint256 requiredValue = immutables.amount + immutables.safetyDeposit + CREATION_FEE;

        // User should not be able to deploy
        vm.prank(user);
        vm.expectRevert();
        resolver.deploySrc{value: requiredValue}(immutables);

        // Owner (resolverBot) should be able to deploy
        vm.prank(resolverBot);
        resolver.deploySrc{value: requiredValue}(immutables);
    }

    function test_OnlyOwnerCanDeployDst() public {
        IBaseEscrow.Immutables memory immutables = _createTestImmutables();
        uint256 requiredValue = immutables.amount + immutables.safetyDeposit + CREATION_FEE;

        // User should not be able to deploy
        vm.prank(user);
        vm.expectRevert();
        resolver.deployDst{value: requiredValue}(immutables);

        // Owner (resolverBot) should be able to deploy
        vm.prank(resolverBot);
        resolver.deployDst{value: requiredValue}(immutables);
    }

    function test_CanReceiveETH() public {
        uint256 initialBalance = address(resolver).balance;

        // Send ETH to resolver
        (bool success,) = address(resolver).call{value: 1 ether}("");
        assertTrue(success);

        assertEq(address(resolver).balance, initialBalance + 1 ether);
    }

    function test_OnlyOwnerCanWithdrawETH() public {
        // Send ETH to resolver
        vm.prank(user);
        (bool success,) = address(resolver).call{value: 1 ether}("");
        assertTrue(success);

        // User should not be able to withdraw
        vm.prank(user);
        vm.expectRevert();
        resolver.withdrawETH(payable(user), 0.5 ether);

        // Owner should be able to withdraw
        vm.prank(resolverBot);
        resolver.withdrawETH(payable(resolverBot), 0.5 ether);

        assertEq(address(resolver).balance, 0.5 ether);
    }

    function test_ArbitraryCallsOnlyOwner() public {
        address[] memory targets = new address[](1);
        bytes[] memory arguments = new bytes[](1);

        targets[0] = address(accessToken);
        arguments[0] = abi.encodeWithSignature("mint(address,uint256)", user, 1000);

        // User should not be able to call
        vm.prank(user);
        vm.expectRevert();
        resolver.arbitraryCalls(targets, arguments);

        // Owner should be able to call
        vm.prank(resolverBot);
        resolver.arbitraryCalls(targets, arguments);

        assertEq(accessToken.balanceOf(user), 1000);
    }

    function test_ArbitraryCallsRevertOnLengthMismatch() public {
        address[] memory targets = new address[](2);
        bytes[] memory arguments = new bytes[](1);

        vm.prank(resolverBot);
        vm.expectRevert();
        resolver.arbitraryCalls(targets, arguments);
    }

    // Helper function to create test immutables
    function _createTestImmutables() internal view returns (IBaseEscrow.Immutables memory) {
        return IBaseEscrow.Immutables({
            orderHash: keccak256("test-order"),
            hashlock: keccak256("test-secret"),
            maker: AddressLib.wrap(user),
            taker: AddressLib.wrap(resolverBot),
            token: AddressLib.wrap(address(0)),  // ETH
            amount: 0.1 ether,
            safetyDeposit: 0.01 ether,
            timelocks: Timelocks.wrap(0)  // Will be set by resolver
        });
    }
}

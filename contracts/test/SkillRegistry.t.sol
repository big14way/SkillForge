// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { BaseTest } from "./helpers/BaseTest.sol";
import { SkillINFT } from "../src/SkillINFT.sol";
import { SkillRegistry } from "../src/SkillRegistry.sol";
import { SkillTypes } from "../src/libraries/SkillTypes.sol";

contract SkillRegistryTest is BaseTest {
    SkillINFT internal inft;
    SkillRegistry internal registry;

    address internal escrow = makeAddr("escrow");

    function setUp() public {
        address oracleAddr = _wallet("oracle").addr;
        vm.startPrank(deployer);
        inft = new SkillINFT(deployer, oracleAddr);
        registry = new SkillRegistry(deployer, address(inft));
        registry.setSkillEscrow(escrow);
        vm.stopPrank();
    }

    function _mintAndRegister(address owner, string memory category, uint256 price)
        internal
        returns (uint256 tokenId)
    {
        vm.prank(owner);
        tokenId = inft.mint(owner, _defaultDataHash(), _defaultStorageURI());

        vm.prank(owner);
        registry.registerSkill(
            tokenId,
            string(abi.encodePacked("skill-", vm.toString(tokenId))),
            "desc",
            category,
            price,
            _defaultStorageURI()
        );
    }

    function test_Register_IndexesByCategoryAndCreator() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        SkillTypes.Skill memory s = registry.getSkill(tokenId);
        assertEq(s.creator, creator);
        assertEq(s.category, "trading");
        assertEq(s.pricePerUse, 1 ether);
        assertTrue(s.isActive);

        uint256[] memory byCat = registry.getSkillsByCategory("trading");
        assertEq(byCat.length, 1);
        assertEq(byCat[0], tokenId);

        uint256[] memory byCreator = registry.getSkillsByCreator(creator);
        assertEq(byCreator.length, 1);
    }

    function test_Register_RevertsIfNotOwner() public {
        vm.prank(creator);
        uint256 tokenId = inft.mint(creator, _defaultDataHash(), _defaultStorageURI());

        vm.expectRevert(SkillRegistry.NotTokenOwner.selector);
        vm.prank(stranger);
        registry.registerSkill(tokenId, "n", "d", "c", 1, "uri");
    }

    function test_Register_RevertsOnDuplicate() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.expectRevert(SkillRegistry.AlreadyRegistered.selector);
        vm.prank(creator);
        registry.registerSkill(tokenId, "n", "d", "c", 1, "uri");
    }

    function test_Register_RevertsOnEmptyCategory() public {
        vm.prank(creator);
        uint256 tokenId = inft.mint(creator, _defaultDataHash(), _defaultStorageURI());

        vm.expectRevert(SkillRegistry.EmptyCategory.selector);
        vm.prank(creator);
        registry.registerSkill(tokenId, "n", "d", "", 1, "uri");
    }

    function test_UpdateQualityScore_RevertsForNonEscrow() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.expectRevert(SkillRegistry.NotEscrow.selector);
        vm.prank(stranger);
        registry.updateQualityScore(tokenId, 5000);
    }

    function test_UpdateQualityScore_RevertsIfOutOfRange() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.expectRevert(SkillRegistry.InvalidQualityScore.selector);
        vm.prank(escrow);
        registry.updateQualityScore(tokenId, 10_001);
    }

    function test_UpdateQualityScore_RevertsForUnknownSkill() public {
        vm.expectRevert(SkillRegistry.SkillNotFound.selector);
        vm.prank(escrow);
        registry.updateQualityScore(42, 5000);
    }

    function test_UpdateQualityScore_PersistsValue() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.prank(escrow);
        registry.updateQualityScore(tokenId, 9500);

        assertEq(registry.getSkill(tokenId).qualityScore, 9500);
    }

    function test_IncrementRentals_RevertsForNonEscrow() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.expectRevert(SkillRegistry.NotEscrow.selector);
        vm.prank(stranger);
        registry.incrementRentals(tokenId);
    }

    function test_IncrementRentals_IncreasesCounter() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.prank(escrow);
        registry.incrementRentals(tokenId);
        vm.prank(escrow);
        registry.incrementRentals(tokenId);

        assertEq(registry.getSkill(tokenId).totalRentals, 2);
    }

    function test_Deactivate_OnlyOwner() public {
        uint256 tokenId = _mintAndRegister(creator, "trading", 1 ether);

        vm.expectRevert(SkillRegistry.NotTokenOwner.selector);
        vm.prank(stranger);
        registry.deactivateSkill(tokenId);

        vm.prank(creator);
        registry.deactivateSkill(tokenId);

        assertFalse(registry.getSkill(tokenId).isActive);
    }

    function test_Deactivate_RevertsForUnknownSkill() public {
        vm.expectRevert(SkillRegistry.SkillNotFound.selector);
        vm.prank(creator);
        registry.deactivateSkill(404);
    }

    function test_GetTopSkills_ReturnsSortedByScore() public {
        uint256 a = _mintAndRegister(creator, "trading", 1 ether);
        uint256 b = _mintAndRegister(creator, "trading", 1 ether);
        uint256 c = _mintAndRegister(creator, "trading", 1 ether);

        vm.startPrank(escrow);
        registry.updateQualityScore(a, 1000);
        registry.updateQualityScore(b, 9000);
        registry.updateQualityScore(c, 5000);
        vm.stopPrank();

        uint256[] memory top = registry.getTopSkills(3);
        assertEq(top[0], b);
        assertEq(top[1], c);
        assertEq(top[2], a);
    }

    function test_GetTopSkills_SkipsInactiveSkills() public {
        uint256 a = _mintAndRegister(creator, "trading", 1 ether);
        uint256 b = _mintAndRegister(creator, "trading", 1 ether);

        vm.prank(escrow);
        registry.updateQualityScore(b, 7000);
        vm.prank(creator);
        registry.deactivateSkill(a);

        uint256[] memory top = registry.getTopSkills(5);
        // Only b is active; trailing slots remain zero
        assertEq(top[0], b);
        assertEq(top[1], 0);
    }

    function test_GetTopSkills_EmptyRegistry() public view {
        uint256[] memory top = registry.getTopSkills(5);
        assertEq(top.length, 0);
    }

    function test_SetSkillEscrow_OnlyOwner() public {
        address newEscrow = makeAddr("new-escrow");

        vm.expectRevert();
        vm.prank(stranger);
        registry.setSkillEscrow(newEscrow);

        vm.prank(deployer);
        registry.setSkillEscrow(newEscrow);

        assertEq(registry.skillEscrow(), newEscrow);
    }

    function test_SetSkillEscrow_RevertsOnZero() public {
        vm.expectRevert(SkillRegistry.InvalidEscrow.selector);
        vm.prank(deployer);
        registry.setSkillEscrow(address(0));
    }

    function test_Constructor_RevertsOnZeroINFT() public {
        vm.expectRevert(SkillRegistry.InvalidEscrow.selector);
        new SkillRegistry(deployer, address(0));
    }
}

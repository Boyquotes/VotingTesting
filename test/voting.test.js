// voting.test.js Nicolas Villa 11/2021
const { BN, ether, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const Voting = artifacts.require('Voting');

contract('Voting', function (accounts) {
  const Owner = accounts[0];
  const Voter1 = accounts[1];
  const Voter2 = accounts[2];
  const Voter3 = accounts[3];
  const Voter4 = accounts[4];
  const notOwner = accounts[5];

  let VotingInstance;

  // utility function to set a voting campaign with X voter(s) and change the status according to the process
  async function prepareAddVoters(_votingInstance, _voters){
    for(let i = 0; i < _voters.length; i++){
        await _votingInstance.addVoter(_voters[i], {from: Owner});
    }
    await _votingInstance.startProposalsRegistering({from: Owner});
  }
  // utility function to set a voting campaign with X proposal(s) -> array and change the status according to the process
  async function prepareAddProposal(_votingInstance, _voters, _proposals){
    for(let j = 0; j < _proposals.length; j++){
        await _votingInstance.addProposal(_proposals[j], {from: _voters[j]});
    }
    await _votingInstance.endProposalsRegistering({from: Owner});
  }
  // utility function to set a voting campaign with X voter(s) -> array and X proposal(s) -> array
  async function prepareVote(_votingInstance, _voters, _proposals){
    await prepareAddVoters(_votingInstance, _voters);
    await prepareAddProposal(_votingInstance, _voters, _proposals);
  }
  // utility function to add multiple votes -> array
  async function addMultipleVotes(_votingInstance, _voters, _votes){
    for(let i = 0; i < _votes.length; i++){
        await _votingInstance.setVote(_votes[i], {from: _voters[i]});
    }
    await _votingInstance.endVotingSession({from: Owner});
  }

  context("Events and Revert trigger", function() {
    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });

    it('Revert if addVoter not call by the contract owner', async function () { 
      await (expectRevert(VotingInstance.addVoter(Voter1, {from: notOwner}), "Ownable: caller is not the owner"));
    });

    it("Register Voter1", async () => {
        let receipt = await VotingInstance.addVoter(Voter1, {from: Owner});
        expectEvent(receipt, 'VoterRegistered', {voterAddress: Voter1});
    });
    it("GetWinner in an incorrect workflow status", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.getWinner(),
        "Votes are not tallied yet"
      );
    });
  });

  context('addProposal, testing add proposal and associated events', function (accounts) {
    const Proposal1 = 'Bitcoin';
    const EmptyProposal = '';

    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });

    it("AddProposal in an incorrect workflow status", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await VotingInstance.endProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.addProposal(Proposal1, { from: Voter1 }),
        "Proposals are not allowed yet"
      );
    });
    it("Add an empty description proposal", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.addProposal(EmptyProposal, { from: Voter1 }),
        "Vous ne pouvez pas ne rien proposer"
      );
    });

    it('addProposal 1', async function () { 
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({from: Owner});
      let receipt = await VotingInstance.addProposal(Proposal1, {from: Voter1});

      let theProposal1 = await VotingInstance.proposalsArray(0);
      expect(theProposal1.description).to.equal(Proposal1);
      expect(theProposal1.voteCount).to.be.bignumber.equal('0');

      expectEvent(receipt, "ProposalRegistered", { proposalId: new BN(0)}); 
    });
  });

  context('addVoter and setVote, testing add vote and associated events', function (accounts) {
    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });
    const Proposal1 = 'Ethereum';
    const Proposal2 = 'BNB';

    it("addVoter in an incorrect workflow status", async () => {
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.addVoter(Voter1, {from: Owner}),
        "Voters registration is not open yet"
      );
    });

    it("setVote in an incorrect workflow status", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await VotingInstance.addProposal(Proposal1, {from: Voter1});
      await VotingInstance.endProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.setVote('1', {from: Voter1}),
        "Voting session havent started yet"
      );
    });
    it("setVote but have already vote", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await VotingInstance.addProposal(Proposal1, {from: Voter1});
      await VotingInstance.endProposalsRegistering({ from: Owner });
      await VotingInstance.startVotingSession({from: Owner});
      await VotingInstance.setVote('0', {from: Voter1});
      await expectRevert(
        VotingInstance.setVote('0', {from: Voter1}),
        "You have already voted"
      );
    });
    it("setVote but proposal not found", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await VotingInstance.addProposal(Proposal1, {from: Voter1});
      await VotingInstance.endProposalsRegistering({ from: Owner });
      await VotingInstance.startVotingSession({from: Owner});
      await expectRevert(
        VotingInstance.setVote(new BN(2), {from: Voter1}),
        "Proposal not found"
      );
    });

    it('setVote', async function () {
      let Voters = [Voter1, Voter2, Voter3];
      let Proposals = [Proposal1, Proposal2];
      await prepareVote(VotingInstance, Voters, Proposals);
      // Voting before startVotingSession -> FAIL
      await (expectRevert(VotingInstance.setVote('1', {from: Voter1}), 'Voting session havent started yet'));
      await VotingInstance.startVotingSession({from: Owner});
      let receipt = await VotingInstance.setVote('1', {from: Voter1});
      // Info Voter1
      let infoVoter1 = await VotingInstance.getVoter(Voter1, {from: Voter2});
      let proposalObject = await VotingInstance.getOneProposal(1);
      expect(proposalObject.description).to.be.equal('BNB');
      expect(proposalObject.voteCount).to.be.equal('1');
      expect(infoVoter1.hasVoted).to.be.equal(true);
      expect(infoVoter1.votedProposalId).to.be.equal('1');
  
      expectEvent(receipt, "Voted", { voter: Voter1, proposalId: '1'}); 
    });
    it('setVote but not a voter', async function () {
      // Voting with a non voter user -> FAIL
      await (expectRevert(VotingInstance.setVote('1', {from: Voter1}), "You're not a voter"));
    });
    it('addVoter twice', async function () {
      let Voters = [Voter1];
      await VotingInstance.addVoter(Voter1, {from: Owner});
      //Add Voter1 twice -> FAIL
      await (expectRevert(prepareAddVoters(VotingInstance, Voters), 'Already registered')); 
    });
  });

  context('getVoter, voter information', function (accounts) {
    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });
    let Voters = [Voter1, Voter2, Voter3];

    it('getvoter information', async function () {
      await prepareAddVoters(VotingInstance, Voters);
      let infoVoter1 = await VotingInstance.getVoter(Voter1, {from: Voter2});
      expect(infoVoter1.hasVoted).to.be.equal(false);
    });
  });

  context('Test WorkFlowStatus Changement', function (accounts) {
    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });

    it('WorkflowStatusChange information testing in correct workflow order', async function () {
      let currentStatus = await VotingInstance.workflowStatus.call();
      let receipt = await VotingInstance.startProposalsRegistering({from: Owner});

      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '0', newStatus: '1'});
      receipt = await VotingInstance.endProposalsRegistering({from: Owner});
      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '1', newStatus: '2'});
      receipt = await VotingInstance.startVotingSession({from: Owner});
      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '2', newStatus: '3'});
      receipt = await VotingInstance.endVotingSession({from: Owner});
      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '3', newStatus: '4'});
    });
    it('WorkflowStatusChange information fail if incorrect order workflow', async function () {
      let currentStatus = await VotingInstance.workflowStatus.call();
      let receipt = await VotingInstance.startProposalsRegistering({from: Owner});

      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '0', newStatus: '1'});
      receipt = await VotingInstance.endProposalsRegistering({from: Owner});
      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '1', newStatus: '2'});
      // End voting before Start Voting will be fail
      await (expectRevert(VotingInstance.endVotingSession({from: Owner}), 'Voting session havent started yet'));
    });
  });

  context('tallyVotes, Game Over', function (accounts) {
    beforeEach(async function () {
      VotingInstance = await Voting.new({from: Owner});
    });
    let Voters = [Voter1, Voter2, Voter3];
    let Proposals = ['Bitcoin', 'Ethereum', 'BNB'];
    let Votes = [2, 1, 2];

    it("Get tallyVotes in an incorrect workflow status", async () => {
      await VotingInstance.addVoter(Voter1, {from: Owner});
      await VotingInstance.startProposalsRegistering({ from: Owner });
      await expectRevert(
        VotingInstance.tallyVotes(),
        "Current status is not voting session ended"
      );
    });

    it('get tally votes and check winner information', async function () {
      await prepareVote(VotingInstance, Voters, Proposals);
      await VotingInstance.startVotingSession({from: Owner});
      await addMultipleVotes(VotingInstance, Voters, Votes);
      let receipt = await VotingInstance.tallyVotes({from: Owner});
      let winningProposal = await VotingInstance.getWinner();
      expectEvent(receipt, "WorkflowStatusChange", { previousStatus: '4', newStatus: '5'});
      expect(winningProposal.voteCount).to.be.equal('2');
      expect(winningProposal.description).to.be.equal('BNB');
    });
  });

});


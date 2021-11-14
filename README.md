# Voting Tests Suite - DEFI 2

## Tests coverage :

### Voter :
- addVoter Function
- getVoter Function
- setVote Function
- Testing expect voter object

### Proposal :
- addProposal Function
- getOneProposal Function
- Testing expect proposal object

### Events:
- VoterRegistered
- WorkflowStatusChange
- ProposalRegistered
- Voted

### Reverts / Require:
- addVote : Ownable: caller is not the owner
- setVote : Voting session havent started yet
- addVoter : Already registered
- addVoter : Voters registration is not open yet
- addProposal : Proposals are not allowed yet
- getWinner : Votes are not tallied yet

### Testing expect winner Proposal object :
- getWinner

## INSTALLATION
```bash
git clone this repository
```

RUN in the root directory :
```bash
npm install @openzeppelin/contracts --save
npm install @openzeppelin/test-helpers --save
```
First launch : compilation contract + test :
```bash
truffle compil
truffle test test/voting.test.js --network development -g Voting
```
Other launch test, compilation not neccessary if you don't modify solidity file :
```bash
truffle test test/voting.test.js --network development -g Voting  --compile-none
```
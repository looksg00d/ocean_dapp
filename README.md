# King of the Hill DApp 

A decentralized application (DApp) game running on Oasis Sapphire Testnet where players compete to become the king by placing higher bids. Features real-time updates, on-chain messaging, and nickname system. Smart contracts in this repository https://github.com/looksg00d/smartcontracts_oasis

## Game Mechanics

- Bid higher than the current king to claim the throne
- Stay king longer to earn more rewards
- Previous king gets their bid back + rewards
- Real-time leaderboard tracks longest-reigning kings
- On-chain messaging system for player interaction

## Tech Stack

- **Frontend:** React.js
- **Smart Contracts:** Solidity
- **Blockchain:** Oasis Sapphire Testnet
- **Web3 Integration:** ethers.js
- **Token Standard:** ERC20 (OCEAN Token)

## Smart Contracts

- **Main Game Contract:** `0x255A17D141C19689fc5b2001E82DD9cBd99e8197`
- **OCEAN Token:** `0x973e69303259B0c2543a38665122b773D28405fB`
- **Nicknames Contract:** `0xd622248e7a4849082f1909665F421998c1b4d355`

## Features

- **Wallet Integration:** MetaMask support
- **Real-time Updates:** Auto-refresh every 10 seconds
- **Leaderboard:** Top kings by time on throne
- **Messaging System:** On-chain player communication
- **Nickname System:** Custom player names
- **Token Integration:** OCEAN token for bidding

## Local Development

Clone the repo:
`git clone https://github.com/looksg00d/ocean_dapp.git`
`cd ocean_dapp`

Install dependencies:
`npm install`

Start local development server:
`npm start`


## How to Play

1. Connect MetaMask wallet
2. Switch to Oasis Sapphire Testnet
3. Get test OCEAN tokens
4. Approve tokens for contract
5. Place bid higher than current king
6. Set nickname (optional)
7. Send messages to other players
   
## Security

- Smart contracts deployed on secure testnet
- Token approvals for exact bid amounts
- Protected contract functions
- Error handling for failed transactions

## Contributing

Pull requests are welcome! For major changes, please open an issue first

## Acknowledgments

- Oasis Network team
- OCEAN Protocol
- OpenZeppelin for contract standards
- React and ethers.js communities


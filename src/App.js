import React, { useState, useEffect } from 'react';
import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits, formatUnits } from '@ethersproject/units';
import IERC20Template from './IERC20Template.json'; // ERC20 token ABI spec
import KingOfTheHillABI from './KingOfTheHill.json'; // Main contract ABI
import NicknamesABI from './Nicknames.json'; // Add Nicknames ABI import
import './App.css';

// Contract addresses for Sapphire Testnet
const OCEAN_TOKEN_ADDRESS = '0x973e69303259B0c2543a38665122b773D28405fB'; // Update with new addr
const KING_CONTRACT_ADDRESS = '0x255A17D141C19689fc5b2001E82DD9cBd99e8197'; // Update with new addr
const NICKNAMES_CONTRACT_ADDRESS = '0xd622248e7a4849082f1909665F421998c1b4d355'; // New contract addr

// Sapphire Testnet config
const SAPPHIRE_CHAIN_ID = '0x5aff'; // 23295 in hex (correct value)
const SAPPHIRE_PARAMS = {
  chainId: SAPPHIRE_CHAIN_ID,
  chainName: 'Oasis Sapphire Testnet',
  nativeCurrency: {
    name: 'TEST',
    symbol: 'TEST',
    decimals: 18
  },
  rpcUrls: ['https://testnet.sapphire.oasis.io'], // Updated URL
  blockExplorerUrls: ['https://testnet.explorer.sapphire.oasis.dev']
};

// Add RPC URL at the top with other constants
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"; // Replace with your Infura key
// or use public RPC
// const RPC_URL = "https://rpc2.sepolia.org";

function App() {
  // State hooks setup
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [currentKing, setCurrentKing] = useState('');
  const [currentPrize, setCurrentPrize] = useState('');
  const [timeOnThrone, setTimeOnThrone] = useState('');
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [initialTime, setInitialTime] = useState(null);
  const [localTime, setLocalTime] = useState(0);
  const [currentBid, setCurrentBid] = useState('0');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [topKings, setTopKings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [isLoadingTopKings, setIsLoadingTopKings] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [nickname, setNickname] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  // Hook up wallet connection
  const connectWallet = async () => {
    try {
      // First, check and switch network
      const networkOk = await checkAndSwitchNetwork();
      if (!networkOk) return;

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Setup wallet event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      fetchKingInfo();
    } catch (error) {
      console.error('Error connecting:', error);
      setMessage('CONNECTION ERROR');
    }
  };

  // Handle wallet account changes
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setIsConnected(false);
      setAccount('');
    } else {
      setAccount(accounts[0]);
      setIsConnected(true);
    }
  };

  // Init check for wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            fetchKingInfo();
          }
        } catch (error) {
          console.error('Connection check failed:', error);
        }
      }
    };
    checkConnection();
  }, []);

  // Helper to request account access
  const requestAccount = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found!');
    }
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    return accounts[0];
  };

  // Token approval tx
  const approveTokens = async () => {
    if (!amount) {
      setMessage('ENTER AMOUNT');
      return;
    }

    try {
      await requestAccount();
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const oceanTokenContract = new Contract(OCEAN_TOKEN_ADDRESS, IERC20Template, signer);
      
      // Fire the approval tx
      const tx = await oceanTokenContract.approve(KING_CONTRACT_ADDRESS, parseUnits(amount, 18));
      await tx.wait();
      setMessage('TOKENS APPROVED');
    } catch (error) {
      console.error('Error:', error);
      setMessage('APPROVAL FAILED');
    }
  };

  // Main game interaction - claim the throne
  const claimThrone = async () => {
    if (!amount) {
      setMessage('ENTER AMOUNT');
      return;
    }

    try {
      await requestAccount();
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // First, check allowance
      const oceanTokenContract = new Contract(OCEAN_TOKEN_ADDRESS, IERC20Template, signer);
      const allowance = await oceanTokenContract.allowance(account, KING_CONTRACT_ADDRESS);
      const bidAmount = parseUnits(amount, 18);
      
      if (allowance.lt(bidAmount)) {
        setMessage('TOKENS NOT APPROVED');
        return;
      }

      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);

      // Fire the claim tx
      const tx = await kingContract.claimThrone(bidAmount);
      await tx.wait();
      fetchKingInfo();
    } catch (error) {
      console.error('Error:', error);
      // Check error message to determine the reason
      if (error.message.includes('bid not high enough') || 
          error.message.includes('insufficient bid') ||
          error.message.toLowerCase().includes('higher than current')) {
        setMessage('BID MUST BE HIGHER');
      } else if (error.message.includes('insufficient balance')) {
        setMessage('INSUFFICIENT BALANCE');
      } else if (error.message.includes('user rejected')) {
        setMessage('TRANSACTION CANCELLED');
      } else {
        setMessage('TRANSACTION FAILED');
      }
    }
  };

  // Fetch current game state
  const fetchKingInfo = async () => {
    try {
      const provider = new Web3Provider(window.ethereum);
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Get current king's data
      const [king, bid, time] = await kingContract.getKingInfo();
      setCurrentKing(king);
      setCurrentBid(formatUnits(bid, 18));
      setInitialTime(Number(time));
      setLocalTime(Number(time));
    } catch (error) {
      console.error('Failed to fetch king info:', error);
    }
  };

  // Local time counter
  useEffect(() => {
    if (initialTime !== null) {
      const interval = setInterval(() => {
        setLocalTime(prevTime => prevTime + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [initialTime]);

  // Quick initial data load
  useEffect(() => {
    const quickFetch = async () => {
      setIsLoading(true);
      try {
        let provider;
        
        // Try different provider options
        if (window.ethereum) {
          provider = new Web3Provider(window.ethereum);
        } else {
          // Fallback to public RPC if no wallet
          provider = new JsonRpcProvider(RPC_URL);
        }

        const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
        
        const [king, bid, time] = await kingContract.getKingInfo();
        setCurrentKing(king);
        setCurrentBid(formatUnits(bid, 18));
        setInitialTime(Number(time));
        setLocalTime(Number(time));
        setIsLoading(false);
      } catch (error) {
        console.error('Quick fetch failed:', error);
        // Try alternative RPC if first attempt fails
        try {
          const fallbackProvider = new JsonRpcProvider("https://rpc2.sepolia.org");
          const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, fallbackProvider);
          
          const [king, bid, time] = await kingContract.getKingInfo();
          setCurrentKing(king);
          setCurrentBid(formatUnits(bid, 18));
          setInitialTime(Number(time));
          setLocalTime(Number(time));
          setIsLoading(false);
        } catch (fallbackError) {
          console.error('Fallback fetch failed:', fallbackError);
          setIsLoading(false);
        }
      }
    };

    quickFetch();
  }, []); // Empty deps array = run once on mount

  // Keep the existing periodic refresh for when wallet is connected
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchKingInfo, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // MetaMask existence check
  useEffect(() => {
    const checkMetaMask = async () => {
      if (!window.ethereum) {
        setMessage('Please install MetaMask!');
        return;
      }
    };
    checkMetaMask();
  }, []);

  // Wallet disconnect handler
  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount('');
    setMessage('');
    setIsDropdownOpen(false);
  };

  // Fetch top kings
  const fetchTopKings = async () => {
    try {
      setIsLoadingTopKings(true);
      console.log('Fetching top kings...');
      
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Use getTopKings instead of event listeners
      const topKingsData = await kingContract.getTopKings();
      console.log('Raw top kings data:', topKingsData);
      
      // Get nicknames for all addresses
      const kingsWithNicknames = await Promise.all(
        topKingsData.map(async (king) => {
          const nickname = await getNickname(king.addr);
          return {
            address: king.addr,
            nickname: nickname || king.addr,
            timeOnThrone: Number(king.timeOnThrone)
          };
        })
      );
      
      // Sort by time on throne (though they should already be sorted)
      const formattedKings = kingsWithNicknames
        .filter(king => king.address !== "0x0000000000000000000000000000000000000000")
        .sort((a, b) => b.timeOnThrone - a.timeOnThrone);
      
      console.log('Formatted kings:', formattedKings);
      setTopKings(formattedKings);
      
    } catch (error) {
      console.error('Failed to fetch top kings:', error);
    } finally {
      setIsLoadingTopKings(false);
    }
  };

  // Fetch messages from the chain
  const fetchMessages = async () => {
    try {
      setIsLoadingMessages(true);
      
      // Init provider based on wallet availability
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Grab all msgs directly from the contract
      const allMessages = await kingContract.getAllMessages();
      console.log('Raw messages from contract:', allMessages);
      
      // Process the msg data
      const fetchedMessages = await Promise.all(
        allMessages.map(async (msg) => {
          const nickname = await getNickname(msg.sender);
          return {
            id: Math.random().toString(), // tmp id for React key prop
            sender: nickname || msg.sender,
            content: msg.content
          };
        })
      );
      
      // Flip array to show newest msgs first
      const sortedMessages = [...fetchedMessages].reverse();
      console.log('Processed messages:', sortedMessages);
      
      setMessages(sortedMessages);
      
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Auto-refresh messages
  useEffect(() => {
    if (showMessages) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000); // Refresh every 10 secs
      return () => clearInterval(interval);
    }
  }, [showMessages]);

  // Send msg to the chain
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      setMessage('ENTER MESSAGE');
      return;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);
      
      setMessage('SENDING MESSAGE...');
      const tx = await kingContract.sendMessage(newMessage);
      await tx.wait();
      
      setNewMessage('');
      setMessage('MESSAGE SENT');
      
      // Refresh messages list immediately after sending
      await fetchMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage('FAILED TO SEND MESSAGE');
    }
  };

  // Check and switch network if needed
  const checkAndSwitchNetwork = async () => {
    try {
      if (!window.ethereum) {
        setMessage('METAMASK NOT FOUND');
        return false;
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SAPPHIRE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SAPPHIRE_PARAMS],
          });
          return true;
        } catch (error) {
          console.error('Error adding Sapphire network:', error);
          setMessage('FAILED TO ADD SAPPHIRE');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking network:', error);
      setMessage('NETWORK CHECK FAILED');
      return false;
    }
  };

  // Handle chain switching
  const handleChainChanged = async (chainId) => {
    if (chainId !== SAPPHIRE_CHAIN_ID) {
      setMessage('PLEASE SWITCH TO SAPPHIRE');
      setIsConnected(false);
      window.location.reload();
    }
  };

  // Grab nickname for an address
  const getNickname = async (address) => {
    try {
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const nicknamesContract = new Contract(
        NICKNAMES_CONTRACT_ADDRESS,
        NicknamesABI,
        provider
      );
      
      const nickname = await nicknamesContract.getNickname(address);
      // Return full nickname or address
      return nickname || address;
    } catch (error) {
      console.error('Error fetching nickname:', error);
      return address;
    }
  };

  // Set user's nickname
  const setUserNicknameHandler = async () => {
    if (!nickname.trim()) {
      setMessage('ENTER NICKNAME');
      return;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const nicknamesContract = new Contract(
        NICKNAMES_CONTRACT_ADDRESS,
        NicknamesABI,
        signer
      );
      
      setMessage('SETTING NICKNAME...');
      const tx = await nicknamesContract.setNickname(nickname);
      await tx.wait();
      
      setUserNickname(nickname);
      setShowNicknameModal(false);
      setMessage('NICKNAME SET');
    } catch (error) {
      console.error('Error setting nickname:', error);
      setMessage('FAILED TO SET NICKNAME');
    }
  };

  // Check nickname when wallet connects
  useEffect(() => {
    const checkNickname = async () => {
      if (isConnected && account) {
        const nick = await getNickname(account);
        setUserNickname(nick);
      }
    };
    checkNickname();
  }, [isConnected, account]);

  // Update king's display name with nickname
  useEffect(() => {
    const updateKingNickname = async () => {
      if (currentKing && currentKing !== "0x0000000000000000000000000000000000000000") {
        const kingNick = await getNickname(currentKing);
        setCurrentKing(kingNick);
      }
    };
    updateKingNickname();
  }, [currentKing]);

  // UI render
  return (
    <div className="app-container">
      <div className="header">
        <div className="top-section">
          <div className="king-address">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <h2>SYNCHRONIZING WITH BLOCKCHAIN...</h2>
              </div>
            ) : currentKing && currentKing !== "0x0000000000000000000000000000000000000000" ? (
              <>
                <h2>KING:</h2>
                <p>{currentKing}</p>
                <h3 className="current-bid">CURRENT BID: {currentBid} OCEAN</h3>
              </>
            ) : (
              <h2>THRONE AWAITS ITS FIRST RULER</h2>
            )}
          </div>
          {!isConnected ? (
            <button className="connect-button" onClick={connectWallet}>
              {'>'} CONNECT WALLET
            </button>
          ) : (
            <div className="account-info">
              <div className="account-dropdown">
                <div 
                  className="account-address" 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {/* Always show shortened address */}
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : ''}
                  <span className="dropdown-arrow">▼</span>
                </div>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <button onClick={() => setShowNicknameModal(true)}>
                      {'>'} SET NICKNAME
                    </button>
                    <button onClick={disconnectWallet}>
                      {'>'} DISCONNECT
                    </button>
                  </div>
                )}
              </div>
              <div className="connection-status">
                <span className="status-dot"></span>
                CONNECTED
              </div>
            </div>
          )}
        </div>

        <div className="king-animation">
          <img src="/king.gif" alt="ASCII King" className="king-gif" />
        </div>

        <div className="leaderboard-container">
          <button 
            className="leaderboard-toggle" 
            onClick={() => {
              console.log('Toggle clicked, current state:', showLeaderboard);
              setShowLeaderboard(!showLeaderboard);
              if (!showLeaderboard) {
                console.log('Fetching top kings...');
                fetchTopKings();
              }
            }}
          >
            {'>'} {showLeaderboard ? 'HIDE' : 'SHOW'} TOP KINGS
          </button>
          
          {showLeaderboard && (
            <div className="leaderboard">
              <h3>{'>'} HALL OF FAME</h3>
              {isLoadingTopKings ? (
                <div className="loading-message">{'>'} LOADING TOP KINGS...</div>
              ) : topKings && topKings.length > 0 ? (
                <div className="leaderboard-list">
                  {topKings.map((king, index) => (
                    <div key={index} className="leaderboard-item">
                      <span className="rank">#{index + 1}</span>
                      <div className="king-info">
                        <span className="address">
                          {king.nickname}
                        </span>
                        <span className="time">
                          {(king.timeOnThrone || 0)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-message">{'>'} NO KINGS YET</div>
              )}
            </div>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="game-container">
          <div className="king-info">
            <div className="info-card">
              <h3>{'>'} TIME ON THRONE</h3>
              <p>{localTime ? `${localTime} sec.` : '0 sec.'}</p>
            </div>
          </div>

          <div className="action-container">
            <input
              type="text"
              placeholder="> ENTER AMOUNT"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
            />
            <div className="button-group">
              <button className="action-button" onClick={approveTokens}>
              {'>'} APPROVE TOKENS
              </button>
              <button className="action-button claim-button" onClick={claimThrone}>
              {'>'} BECOME KING
              </button>
            </div>
          </div>

          {message && (
            <div className="message">
              {'>'} {message}
              <button 
                className="message-close" 
                onClick={() => setMessage('')}
              >
                ×
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="connect-prompt">
          <p>{'>'} CONNECT WALLET TO START THE GAME</p>
        </div>
      )}

      <div className="messages-container">
        <button 
          className="messages-toggle" 
          onClick={() => {
            setShowMessages(!showMessages);
            if (!showMessages) fetchMessages();
          }}
        >
          {'>'} {showMessages ? 'HIDE' : 'SHOW'} MESSAGES
        </button>
        
        {showMessages && (
          <div className="messages-board">
            <h3>{'>'} MESSAGES</h3>
            {isConnected && (
              <div className="message-input-container">
                <input
                  type="text"
                  placeholder="> ENTER MESSAGE"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="message-input"
                />
                <button 
                  onClick={sendMessage} 
                  className="send-message-button"
                  disabled={isLoadingMessages}
                >
                  {'>'} SEND
                </button>
              </div>
            )}
            {isLoadingMessages ? (
              <div className="loading-message">{'>'} LOADING MESSAGES...</div>
            ) : messages.length > 0 ? (
              <div className="messages-list">
                {messages.map((msg) => (
                  <div key={msg.id} className="message-item">
                    <span className="message-sender">
                      {msg.sender}
                    </span>
                    <span className="message-content">{msg.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">{'>'} NO MESSAGES YET</div>
            )}
          </div>
        )}
      </div>

      {isConnected && window.ethereum && window.ethereum.chainId !== SAPPHIRE_CHAIN_ID && (
        <div className="network-warning">
          <p>{'>'} WRONG NETWORK DETECTED</p>
          <button 
            className="network-switch-button"
            onClick={checkAndSwitchNetwork}
          >
            {'>'} SWITCH TO SAPPHIRE TESTNET
          </button>
        </div>
      )}

      {showNicknameModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{'>'} SET NICKNAME</h3>
            <input
              type="text"
              placeholder="> ENTER NICKNAME"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="nickname-input"
            />
            <div className="modal-buttons">
              <button onClick={setUserNicknameHandler}>{'>'} CONFIRM</button>
              <button onClick={() => setShowNicknameModal(false)}>{'>'} CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
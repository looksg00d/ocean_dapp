import React, { useState, useEffect } from 'react';
import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits, formatUnits } from '@ethersproject/units';
import IERC20Template from './IERC20Template.json'; // ERC20 token ABI spec
import KingOfTheHillABI from './KingOfTheHill.json'; // Main contract ABI
import './App.css';

// Contract addresses on testnet
const OCEAN_TOKEN_ADDRESS = '0x1B083D8584dd3e6Ff37d04a6e7e82b5F622f3985';
const KING_CONTRACT_ADDRESS = '0x1Ea92711A421B55D01089aF3A1cb6508C8c54572';

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

  // Hook up wallet connection
  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Setup wallet event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
      
      fetchKingInfo();
    } catch (error) {
      console.error('Error connecting:', error);
      setMessage('Connection error.');
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
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);

      // Fire the claim tx
      const tx = await kingContract.claimThrone(parseUnits(amount, 18));
      await tx.wait();
      fetchKingInfo();
    } catch (error) {
      console.error('Error:', error);
      setMessage('BID MUST BE HIGHER');
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
        } catch (fallbackError) {
          console.error('Fallback fetch failed:', fallbackError);
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

  // UI render
  return (
    <div className="app-container">
      <div className="header">
        <div className="top-section">
          <div className="king-address">
            {currentKing ? (
              <>
                <h2>KING:</h2>
                <p>{currentKing}</p>
                <h3 className="current-bid">CURRENT BID: {currentBid} OCEAN</h3>
              </>
            ) : (
              <h2>THRONE IS FREE</h2>
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
                  {account.slice(0, 6)}...{account.slice(-4)}
                  <span className="dropdown-arrow">▼</span>
                </div>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
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
    </div>
  );
}

export default App;
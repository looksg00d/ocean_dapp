import React, { useState, useEffect } from 'react';
import { Web3Provider, JsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits, formatUnits } from '@ethersproject/units';
import IERC20Template from './IERC20Template.json'; // ERC20 token ABI spec
import KingOfTheHillABI from './KingOfTheHill.json'; // Main contract ABI
import './App.css';

// Contract addresses on testnet
const OCEAN_TOKEN_ADDRESS = '0x1B083D8584dd3e6Ff37d04a6e7e82b5F622f3985';
const KING_CONTRACT_ADDRESS = '0x845e301402Ba655b51bd308363fa1dD0741B56dd';

// Add RPC URL at the top with other constants
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"; // Replace with your Infura key
// or use public RPC
// const RPC_URL = "https://rpc2.sepolia.org";

// Добавим константы для Sepolia
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // Chain ID в hex формате
const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'SEP',
    decimals: 18
  },
  rpcUrls: ['https://rpc2.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

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

  // Hook up wallet connection
  const connectWallet = async () => {
    try {
      // Сначала проверяем и переключаем сеть
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
      
      // Сначала проверим allowance
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
      // Проверяем текст ошибки для определения причины
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
      
      // Получаем события
      const filter = kingContract.filters.NewKing();
      const events = await kingContract.queryFilter(filter);
      console.log('King events:', events);
      
      // Создаем Map для хранения уникальных адресов и их времени
      const kingsMap = new Map();
      
      // Обрабатываем события и суммируем время для каждого уникального адреса
      for(const event of events) {
        const kingAddress = event.args.king;
        
        try {
          // Получаем актуальные данные из массива kings
          for(let i = 0; i < 10; i++) {
            const kingData = await kingContract.kings(i);
            if(kingData.addr.toLowerCase() === kingAddress.toLowerCase()) {
              const currentTime = Number(kingData.timeOnThrone);
              
              if(kingsMap.has(kingAddress)) {
                // Если адрес уже есть, обновляем время
                const existingTime = kingsMap.get(kingAddress);
                kingsMap.set(kingAddress, existingTime + currentTime);
              } else {
                // Если адреса еще нет, добавляем новую запись
                kingsMap.set(kingAddress, currentTime);
              }
              break;
            }
          }
        } catch(e) {
          console.log('Reached end of kings array');
          break;
        }
      }
      
      // Преобразуем Map в массив и сортируем по времени
      const formattedKings = Array.from(kingsMap, ([address, timeOnThrone]) => ({
        address,
        timeOnThrone
      })).sort((a, b) => b.timeOnThrone - a.timeOnThrone);
      
      console.log('Formatted kings:', formattedKings);
      setTopKings(formattedKings);
      
    } catch (error) {
      console.error('Failed to fetch top kings:', error);
    } finally {
      setIsLoadingTopKings(false);
    }
  };

  // Функция для получения сообщений
  const fetchMessages = async () => {
    try {
      setIsLoadingMessages(true);
      console.log('Fetching messages...');
      
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Получаем все события NewMessage
      const filter = kingContract.filters.NewMessage();
      const events = await kingContract.queryFilter(filter);
      console.log('Message events:', events);
      
      // Преобразуем события в сообщения
      const fetchedMessages = events.map(event => ({
        sender: event.args.sender,
        content: event.args.content,
        // Можно добавить timestamp, если он есть в событии
        timestamp: event.blockTimestamp || new Date().getTime()
      }));
      
      console.log('All fetched messages:', fetchedMessages);
      
      // Сортируем сообщения по времени (новые сверху)
      const sortedMessages = fetchedMessages.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(sortedMessages);
      
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Фнкция отправки сообщения
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      setMessage('ENTER MESSAGE');
      return;
    }

    try {
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);
      
      const tx = await kingContract.sendMessage(newMessage);
      await tx.wait();
      
      setNewMessage('');
      fetchMessages(); // Обновляем писок сообщенй
      setMessage('MESSAGE SENT');
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage('FAILED TO SEND MESSAGE');
    }
  };

  // Добавьте этот useEffect для автоматического обновления сообщений
  useEffect(() => {
    if (showMessages) {
      // Первоначальная загрузка
      fetchMessages();
      
      // Подписываемся на новые события
      const provider = window.ethereum 
        ? new Web3Provider(window.ethereum)
        : new JsonRpcProvider(RPC_URL);
      
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);
      
      // Слушаем новые сообщения
      const handleNewMessage = (sender, content) => {
        console.log('New message received:', { sender, content });
        setMessages(prev => [{
          sender,
          content,
          timestamp: new Date().getTime()
        }, ...prev]);
      };
      
      kingContract.on('NewMessage', handleNewMessage);
      
      // Очищаем подписку при размонтировании
      return () => {
        kingContract.off('NewMessage', handleNewMessage);
      };
    }
  }, [showMessages]);

  // Функция для проверки и переключения сети
  const checkAndSwitchNetwork = async () => {
    try {
      if (!window.ethereum) {
        setMessage('METAMASK NOT FOUND');
        return false;
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          // Пробуем переключиться на Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
          return true;
        } catch (switchError) {
          // Если сеть не добавлена (код 4902), пробуем добавить её
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_PARAMS],
              });
              return true;
            } catch (addError) {
              console.error('Error adding Sepolia:', addError);
              setMessage('FAILED TO ADD SEPOLIA');
              return false;
            }
          }
          console.error('Error switching to Sepolia:', switchError);
          setMessage('FAILED TO SWITCH NETWORK');
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

  // Добавим обработчик изменения сети
  const handleChainChanged = async (chainId) => {
    if (chainId !== SEPOLIA_CHAIN_ID) {
      setMessage('PLEASE SWITCH TO SEPOLIA');
      setIsConnected(false);
      window.location.reload();
    }
  };

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
                  {topKings.map((king, index) => {
                    console.log(`Rendering king ${index}:`, king);
                    return (
                      <div key={index} className="leaderboard-item">
                        <span className="rank">#{index + 1}</span>
                        <div className="king-info">
                          <span className="address">
                            {king.address || 'Unknown Address'}
                          </span>
                          <span className="time">
                            {(king.timeOnThrone || 0)}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
                <button onClick={sendMessage} className="send-message-button">
                  {'>'} SEND
                </button>
              </div>
            )}
            {isLoadingMessages ? (
              <div className="loading-message">{'>'} LOADING MESSAGES...</div>
            ) : messages.length > 0 ? (
              <div className="messages-list">
                {messages.map((msg, index) => (
                  <div key={index} className="message-item">
                    <span className="message-sender">
                      {msg.sender.slice(0, 6)}...{msg.sender.slice(-4)}
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

      {isConnected && window.ethereum && window.ethereum.chainId !== SEPOLIA_CHAIN_ID && (
        <div className="network-warning">
          <p>{'>'} WRONG NETWORK DETECTED</p>
          <button 
            className="network-switch-button"
            onClick={checkAndSwitchNetwork}
          >
            {'>'} SWITCH TO SEPOLIA
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
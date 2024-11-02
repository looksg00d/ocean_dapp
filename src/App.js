import React, { useState, useEffect } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';
import IERC20Template from './IERC20Template.json'; // Импортируйте ABI для токенов
import KingOfTheHillABI from './KingOfTheHill.json'; // Импортируйте ABI для контракта "Король горы"

const OCEAN_TOKEN_ADDRESS = '0x1B083D8584dd3e6Ff37d04a6e7e82b5F622f3985';
const KING_CONTRACT_ADDRESS = '0x1Ea92711A421B55D01089aF3A1cb6508C8c54572';

function App() {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [currentKing, setCurrentKing] = useState('');
  const [currentPrize, setCurrentPrize] = useState('');
  const [timeOnThrone, setTimeOnThrone] = useState('');

  const requestAccount = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  };

  const approveTokens = async () => {
    if (!amount) {
      setMessage('Введите сумму для одобрения.');
      return;
    }

    try {
      await requestAccount();
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      console.log('IERC20Template:', IERC20Template); // Проверка импортированного ABI
      const oceanTokenContract = new Contract(OCEAN_TOKEN_ADDRESS, IERC20Template, signer);
      
      const tx = await oceanTokenContract.approve(KING_CONTRACT_ADDRESS, parseUnits(amount, 18));
      await tx.wait();
      setMessage('Токены успешно одобрены.');
    } catch (error) {
      console.error('Полная ошибка:', error);
      setMessage('Ошибка при одобрении токенов.');
    }
  };

  const claimThrone = async () => {
    if (!amount) {
      setMessage('Введите сумму для отправки.');
      return;
    }

    try {
      await requestAccount();
      const provider = new Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, signer);

      const tx = await kingContract.claimThrone(parseUnits(amount, 18));
      await tx.wait();
      setMessage('Вы претендовали на трон!');
      fetchKingInfo();
    } catch (error) {
      console.error('Ошибка при отправке токенов:', error);
      setMessage('Ошибка при отправке токенов.');
    }
  };

  const fetchKingInfo = async () => {
    try {
      const provider = new Web3Provider(window.ethereum);
      const kingContract = new Contract(KING_CONTRACT_ADDRESS, KingOfTheHillABI, provider);

      const [king, prize, time] = await kingContract.getKingInfo();
      setCurrentKing(king);
      setCurrentPrize(prize.toString());
      setTimeOnThrone(time.toString());
    } catch (error) {
      console.error('Ошибка при получении информации о короле:', error);
    }
  };

  useEffect(() => {
    fetchKingInfo();
  }, []);

  return (
    <div className="App">
      <h1>Король горы</h1>
      <input
        type="text"
        placeholder="Введите сумму"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={approveTokens}>Одобрить токены</button>
      <button onClick={claimThrone}>Претендовать на трон</button>
      {message && <p>{message}</p>}
      <p>Текущий король: {currentKing}</p>
      <p>Текущий приз: {currentPrize}</p>
      <p>Время на троне: {timeOnThrone} секунд</p>
    </div>
  );
}

export default App;
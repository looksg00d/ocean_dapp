import React from 'react';
import { useEthers } from '@usedapp/core';
import { Button } from '@chakra-ui/react';

const ConnectButton = () => {
  const { activateBrowserWallet, account } = useEthers();

  return (
    <Button onClick={activateBrowserWallet}>
      {account ? `Connected: ${account}` : 'Connect Wallet'}
    </Button>
  );
};

export default ConnectButton;
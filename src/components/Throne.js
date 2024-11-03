import React, { useState } from 'react';
import { Box, VStack, Spinner, Text } from '@chakra-ui/react';

const Throne = () => {
  const [throneStatus, setThroneStatus] = useState("Loading smart contract data..");

  return (
    <Box>
      {isLoading ? (
        <VStack>
          <Spinner size="xl" />
          <Text>Synchronizing with blockchain...</Text>
        </VStack>
      ) : (
        <Box>
          <Text>Throne status: {throneStatus}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Throne; 
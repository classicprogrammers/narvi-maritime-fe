import React from 'react';
import {
  Box,
  Text,
  Avatar,
  VStack,
  HStack,
  Badge,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { useUser } from 'redux/hooks/useUser';

const UserProfile = () => {
  const { user, isAuthenticated, logout } = useUser();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  if (!isAuthenticated || !user) {
    return (
      <Box p={4} textAlign="center">
        <Text color={textColor}>Please log in to view your profile</Text>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={6}
      maxW="400px"
      mx="auto"
    >
      <VStack spacing={4} align="stretch">
        <Box textAlign="center">
          <Avatar
            size="xl"
            name={user.name}
            src={user.avatar}
            mb={3}
          />
          <Text fontSize="xl" fontWeight="bold" color={textColor}>
            {user.name}
          </Text>
          <Text color="gray.500" fontSize="sm">
            {user.email}
          </Text>
        </Box>

        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold" color={textColor}>Role:</Text>
            <Badge colorScheme="blue" variant="subtle">
              {user.role}
            </Badge>
          </HStack>
          
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold" color={textColor}>User ID:</Text>
            <Text fontSize="sm" color="gray.600">{user.id}</Text>
          </HStack>
          
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold" color={textColor}>Created:</Text>
            <Text fontSize="sm" color="gray.600">
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </HStack>
        </Box>

        <Box>
          <Text fontWeight="semibold" color={textColor} mb={2}>
            Permissions:
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {user.permissions.map((permission, index) => (
              <Badge key={index} colorScheme="green" variant="outline">
                {permission}
              </Badge>
            ))}
          </HStack>
        </Box>

        <Button
          colorScheme="red"
          variant="outline"
          onClick={logout}
          size="sm"
        >
          Logout
        </Button>
      </VStack>
    </Box>
  );
};

export default UserProfile;

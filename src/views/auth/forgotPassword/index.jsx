import React from "react";
import { NavLink, useHistory } from "react-router-dom";
// Chakra imports
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
// Custom components
import { HSeparator } from "components/separator/Separator";
import DefaultAuth from "layouts/auth/Default";
// Assets
import illustration from "assets/img/auth/auth.png";
import { MdEmail } from "react-icons/md";
import { FaArrowLeft } from "react-icons/fa";
// Redux
import { useUser } from "redux/hooks/useUser";

function ForgotPassword() {
  const history = useHistory();
  const toast = useToast();

  // Redux user actions and state
  const { resetPassword, isLoading, error, clearError } = useUser();

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorDetails = useColorModeValue("navy.700", "secondaryGray.600");
  const textColorBrand = useColorModeValue("#174693", "white");
  const brandStars = useColorModeValue("#174693", "#174693");

  // Form state
  const [email, setEmail] = React.useState("");

  const handleInputChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Forgot password form submitted'); // Debug log

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      console.log('Sending password reset email...'); // Debug log

      const result = await resetPassword(email);
      console.log('Password reset result:', result); // Debug log

      if (result.success) {
        toast({
          title: "Success",
          description: "Password reset email sent! Please check your inbox.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        // Redirect to signin page after a delay
        setTimeout(() => {
          history.push('/auth/sign-in');
        }, 3000);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send password reset email. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

    } catch (error) {
      console.error('Password reset error:', error); // Debug log
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Clear error when component unmounts or error changes
  React.useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Flex
        maxW="100%"
        w='100%'
        mx="auto"
        me='auto'
        h='100%'
        alignItems='start'
        justifyContent='center'
        mb="30px"
        px="25px"
        mt="40px"
        flexDirection='column'>
        <Box me='auto'>
          <Heading color={textColor} fontSize='36px' mb='10px'>
            Forgot Password
          </Heading>
          <Text
            mb='36px'
            ms='4px'
            color={textColorSecondary}
            fontWeight='400'
            fontSize='md'>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </Box>
        <Flex
          zIndex='2'
          direction='column'
          w="100%"
          maxW='420px'
          background='transparent'
          borderRadius='15px'
          mx="auto"
          me='auto'
          mb="20px">

          <form onSubmit={handleSubmit}>
            <FormControl>
              <FormLabel
                display='flex'
                ms='4px'
                fontSize='sm'
                fontWeight='500'
                color={textColor}
                mb='8px'>
                Email<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                isRequired={true}
                variant='auth'
                fontSize='sm'
                ms="0px"
                type='email'
                name="email"
                value={email}
                onChange={handleInputChange}
                placeholder='mail@simmmple.com'
                mb='24px'
                fontWeight='500'
                size='lg'
              />

              <Button
                type="submit"
                fontSize='sm'
                variant='brand'
                fontWeight='500'
                w='100%'
                h='50px'
                mb='24px'
                isLoading={isLoading}
                loadingText="Sending...">
                <Icon as={MdEmail} w='20px' h='20px' me='10px' />
                Send Reset Link
              </Button>
            </FormControl>
          </form>

          <Flex
            flexDirection='column'
            justifyContent='center'
            alignItems='start'
            maxW='100%'
            mt='0px'>
            <Text color={textColorDetails} fontWeight='400' fontSize='14px'>
              Remember your password?
              <NavLink to='/auth/sign-in'>
                <Text
                  color={textColorBrand}
                  as='span'
                  ms='5px'
                  fontWeight='500'>
                  Sign In
                </Text>
              </NavLink>
            </Text>
          </Flex>

          <Flex
            justifyContent='center'
            alignItems='center'
            mt='20px'>
            <Button
              variant='ghost'
              color={textColorBrand}
              fontSize='sm'
              fontWeight='500'
              onClick={() => history.goBack()}
              leftIcon={<FaArrowLeft />}>
              Back to Previous Page
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}

export default ForgotPassword;

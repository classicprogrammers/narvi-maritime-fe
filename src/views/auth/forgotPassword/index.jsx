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
} from "@chakra-ui/react";
// Custom components
import DefaultAuth from "layouts/auth/Default";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import illustration from "assets/img/auth/auth.png";
import { MdEmail } from "react-icons/md";
// Redux
import { useUser } from "redux/hooks/useUser";
// API
import { getApiEndpoint } from "../../../config/api";
import api from "../../../api/axios";

function ForgotPassword() {
  const history = useHistory();

  // Redux user actions and state
  const {
    resetPassword,
    forgotPasswordLoading,
    forgotPasswordError,
    forgotPasswordSuccess,
    clearForgotPassword
  } = useUser();

  // Modal states
  const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");

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

  // Forgot Password API call function
  const handleForgotPasswordApi = async (email) => {
    try {
      const response = await api.post(getApiEndpoint("FORGOT_PASSWORD"), {
        email: email,
      });

      return response.data;
    } catch (error) {
      console.error("Forgot password API failed:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setModalMessage("Please enter your email address");
      setIsFailureModalOpen(true);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalMessage("Please enter a valid email address");
      setIsFailureModalOpen(true);
      return;
    }

    try {

      // Call the forgot password API directly
      const apiResult = await handleForgotPasswordApi(email);
      
      if (apiResult) {
        // Update Redux state
        const result = await resetPassword(email);
        
        if (result.success) {
          setModalMessage("Password reset email sent successfully! Please check your inbox.");
          setIsSuccessModalOpen(true);
        } else {
          setModalMessage(result.error || "Failed to send password reset email. Please try again.");
          setIsFailureModalOpen(true);
        }
      } else {
        setModalMessage("Failed to send password reset email. Please try again.");
        setIsFailureModalOpen(true);
      }

    } catch (error) {
      console.error('Password reset error:', error); // Debug log
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setModalMessage(errorMessage);
      setIsFailureModalOpen(true);
    }
  };

  // Handle success modal close
  const handleSuccessModalClose = () => {
    setIsSuccessModalOpen(false);
    // Redirect to signin page after success
    setTimeout(() => {
      history.push('/auth/sign-in');
    }, 1000);
  };

  // Handle failure modal close
  const handleFailureModalClose = () => {
    setIsFailureModalOpen(false);
  };

  // Watch for Redux state changes
  React.useEffect(() => {
    if (forgotPasswordSuccess) {
      setModalMessage("Password reset email sent successfully! Please check your inbox.");
      setIsSuccessModalOpen(true);
      clearForgotPassword(); // Clear the success state
    }
  }, [forgotPasswordSuccess, clearForgotPassword]);

  React.useEffect(() => {
    if (forgotPasswordError) {
      setModalMessage(forgotPasswordError);
      setIsFailureModalOpen(true);
      clearForgotPassword(); // Clear the error state
    }
  }, [forgotPasswordError, clearForgotPassword]);

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
                isLoading={forgotPasswordLoading}
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

        </Flex>
      </Flex>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleSuccessModalClose}
        title="Email Sent Successfully!"
        message={modalMessage}
      />

      {/* Failure Modal */}
      <FailureModal
        isOpen={isFailureModalOpen}
        onClose={handleFailureModalClose}
        title="Failed to Send Email"
        message={modalMessage}
      />
    </DefaultAuth>
  );
}

export default ForgotPassword;

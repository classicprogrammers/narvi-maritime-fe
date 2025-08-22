import React from "react";
import { NavLink, useHistory } from "react-router-dom";
// Chakra imports
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
// Custom components
import { HSeparator } from "components/separator/Separator";
import DefaultAuth from "layouts/auth/Default";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import illustration from "assets/img/auth/auth.png";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
// Redux
import { useUser } from "redux/hooks/useUser";

function SignIn() {
  const history = useHistory();
  const toast = useToast();

  // Redux user state and actions
  const { login, isLoading, error, clearError } = useUser();

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
  const googleBg = useColorModeValue("secondaryGray.300", "whiteAlpha.200");
  const googleText = useColorModeValue("navy.700", "white");
  const googleHover = useColorModeValue(
    { bg: "gray.200" },
    { bg: "whiteAlpha.300" }
  );
  const googleActive = useColorModeValue(
    { bg: "secondaryGray.300" },
    { bg: "whiteAlpha.200" }
  );

  // Form state
  const [show, setShow] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleClick = () => setShow(!show);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted'); // Debug log

    if (!formData.email || !formData.password) {
      setModalMessage("Please fill in all required fields");
      setIsFailureModalOpen(true);
      return;
    }

    try {
      console.log('Attempting login...'); // Debug log
      const result = await login(formData.email, formData.password);
      console.log('Login result:', result); // Debug log

      if (result.success) {
        setModalMessage("Login successful! Redirecting to dashboard...");
        setIsSuccessModalOpen(true);

        // Redirect to admin dashboard after modal closes
        setTimeout(() => {
          history.push('/admin');
        }, 2000);
      } else {
        setModalMessage(result.error || "Login failed. Please check your credentials.");
        setIsFailureModalOpen(true);
      }
    } catch (error) {
      console.error('Login error:', error); // Debug log
      setModalMessage("An unexpected error occurred. Please try again.");
      setIsFailureModalOpen(true);
    }
  };

  // Clear error when component unmounts or error changes
  React.useEffect(() => {
    if (error) {
      setModalMessage(error);
      setIsFailureModalOpen(true);
      clearError();
    }
  }, [error, clearError]);

  // Error boundary for debugging
  React.useEffect(() => {
    const handleError = (error) => {
      console.error('Global error caught:', error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

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
            Sign In
          </Heading>
          <Text
            mb='36px'
            ms='4px'
            color={textColorSecondary}
            fontWeight='400'
            fontSize='md'>
            Enter your email and password to sign in!
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
          <Button
            fontSize='sm'
            me='0px'
            mb='26px'
            py='15px'
            h='50px'
            borderRadius='16px'
            bg={googleBg}
            color={googleText}
            fontWeight='500'
            _hover={googleHover}
            _active={googleActive}
            _focus={googleActive}>
            <Icon as={FcGoogle} w='20px' h='20px' me='10px' />
            Sign in with Google
          </Button>
          <Flex align='center' mb='25px'>
            <HSeparator />
            <Text color='gray.400' mx='14px'>
              or
            </Text>
            <HSeparator />
          </Flex>
          <form onSubmit={handleSubmit}>
            <FormControl>
              <FormLabel
                ms='4px'
                fontSize='sm'
                fontWeight='500'
                color={textColor}
                display='flex'>
                Email<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                isRequired={true}
                variant='auth'
                fontSize='sm'
                ms='0px'
                type='email'
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder='mail@simmmple.com'
                mb='24px'
                fontWeight='500'
                size='lg'
              />
              <FormLabel
                ms='4px'
                fontSize='sm'
                fontWeight='500'
                color={textColor}
                display='flex'>
                Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size='md'>
                <Input
                  isRequired={true}
                  fontSize='sm'
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder='Min. 8 characters'
                  mb='24px'
                  size='lg'
                  type={show ? 'text' : 'password'}
                  variant='auth'
                />
                <InputRightElement display='flex' alignItems='center' mt='4px'>
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: 'pointer' }}
                    as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleClick}
                  />
                </InputRightElement>
              </InputGroup>
              <Flex justifyContent='space-between' align='center' mb='24px'>
                <FormControl display='flex' alignItems='center'>
                  <Checkbox
                    id='remember-login'
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    colorScheme='brandScheme'
                    me='10px'
                  />
                  <FormLabel
                    htmlFor='remember-login'
                    mb='0'
                    fontWeight='normal'
                    color={textColor}
                    fontSize='sm'>
                    Keep me logged in
                  </FormLabel>
                </FormControl>
                <NavLink to='/auth/forgot-password'>
                  <Text
                    color={textColorBrand}
                    fontSize='sm'
                    w='124px'
                    fontWeight='500'>
                    Forgot password?
                  </Text>
                </NavLink>
              </Flex>
              <Button
                type="submit"
                fontSize='sm'
                variant='brand'
                fontWeight='500'
                w='100%'
                h='50'
                mb='24px'
                isLoading={isLoading}
                loadingText="Signing In...">
                Sign In
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
              Not registered yet?
              <NavLink to='/auth/sign-up'>
                <Text color={textColorBrand} as='span' ms='5px' fontWeight='500'>
                  Create an Account
                </Text>
              </NavLink>
            </Text>
          </Flex>
        </Flex>
      </Flex>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Login Successful!"
        message={modalMessage}
      />

      {/* Failure Modal */}
      <FailureModal
        isOpen={isFailureModalOpen}
        onClose={() => setIsFailureModalOpen(false)}
        title="Login Failed"
        message={modalMessage}
      />
    </DefaultAuth>
  );
}

export default SignIn;

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
} from "@chakra-ui/react";
// Custom components
import DefaultAuth from "layouts/auth/Default";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import illustration from "assets/img/auth/auth.png";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
// Redux
import { useUser } from "redux/hooks/useUser";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../../redux/slices/userSlice";
// API
import { getApiEndpoint } from "../../../config/api";
import api from "../../../api/axios";

function SignIn() {
  const history = useHistory();

  // Redux user state and actions
  const { isLoading, error, clearError } = useUser();
  const dispatch = useDispatch();

  // Modal states
  const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
  const [isFailureModalOpen, setIsFailureModalOpen] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("#174693", "white");
  const brandStars = useColorModeValue("#174693", "#174693");

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

  // Login API call function
  const handleLoginApi = async (email, password) => {
    try {
      const payload = {
        login: email,
        password: password,
      };

      const response = await api.post(getApiEndpoint("LOGIN"), payload);

      const result = response.data;

      // Check if authentication was successful based on backend response format
      if (result.result && result.result.status === "success") {
        return {
          success: true,
          user: {
            id: result.result.user_id || Date.now(),
            email: email,
            name: result.result.name || email,
            role: result.result.role || "user",
            user_type: result.result.user_type || "user", // Include user_type from API response
            avatar: null,
            permissions: ["read"],
            createdAt: new Date().toISOString(),
          },
          token: result.result.session_id || result.result.token || "session_token",
        };
      } else if (result.result && result.result.status === "error") {
        throw new Error(result.result.message || "Login failed");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("🔐 Login API failed:", error);

      // If it's a network error, log it
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        console.log("🔐 Network error - backend server may be down");
      }

      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setModalMessage("Please fill in all required fields");
      setIsFailureModalOpen(true);
      return;
    }

    try {

      // Call the login API directly
      const apiResult = await handleLoginApi(formData.email, formData.password);


      if (apiResult.success) {

        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(apiResult.user));
        localStorage.setItem("token", apiResult.token);

        // Update Redux state directly
        dispatch(loginSuccess({
          user: apiResult.user,
          token: apiResult.token,
        }));

        // Master data is preloaded by admin layout when user lands on dashboard (avoids duplicate API calls)

        setModalMessage("Login successful! Redirecting to dashboard...");
        setIsSuccessModalOpen(true);

        // Redirect to admin dashboard immediately after successful login
        setTimeout(() => {
          history.push('/admin/default');
        }, 1000);
      } else {
        setModalMessage("Login failed. Please check your credentials.");
        setIsFailureModalOpen(true);
      }
    } catch (error) {
      console.error('🔐 Login error:', error);
      setModalMessage(error.message || "Login failed. Please try again.");
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
        alignItems='center'
        justifyContent='center'
        mb="30px"
        px="25px"
        mt="40px"
        flexDirection='column'>
        <Box
          w="100%"
          maxW='450px'
          mx="auto"
          bg={useColorModeValue("white", "navy.800")}
          borderRadius='20px'
          boxShadow={useColorModeValue(
            "0px 4px 20px rgba(0, 0, 0, 0.1)",
            "0px 4px 20px rgba(0, 0, 0, 0.3)"
          )}
          border={useColorModeValue("1px solid", "1px solid")}
          borderColor={useColorModeValue("gray.200", "whiteAlpha.100")}
          p="40px">
          <Box textAlign="center" mb="30px">
            <Heading color={textColor} fontSize='32px' mb='10px'>
              Sign In
            </Heading>
            <Text
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
            background='transparent'
            borderRadius='15px'
            mx="auto"
            mb="20px">
            {/* Google Sign In Button - Commented Out */}
            {/* <Button
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
          </Flex> */}
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
                  type='text'
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
                    placeholder='Enter your password'
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
                  {/* <NavLink to='/auth/forgot-password'>
                    <Text
                      color={textColorBrand}
                      fontSize='sm'
                      w='124px'
                      fontWeight='500'>
                      Forgot password?
                    </Text>
                  </NavLink> */}
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
            {/* Footer Section - Commented Out */}
            {/* <Flex
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
          </Flex> */}
          </Flex>
        </Box>
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

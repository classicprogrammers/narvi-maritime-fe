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
import DefaultAuth from "layouts/auth/Default";
// Assets
import illustration from "assets/img/auth/auth.png";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
// Redux
import { useUser } from "redux/hooks/useUser";
// API
import { getApiEndpoint } from "../../../config/api";
import api from "../../../api/axios";

function SignUp() {
  const history = useHistory();
  const toast = useToast();

  // Redux user state and actions
  const { signupLoading, signupError, clearError, signup } = useUser();

  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorDetails = useColorModeValue("navy.700", "secondaryGray.600");
  const textColorBrand = useColorModeValue("#174693", "white");
  const brandStars = useColorModeValue("#174693", "#174693");

  // Form state
  const [show, setShow] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const handleClick = () => setShow(!show);
  const handleConfirmClick = () => setShowConfirm(!showConfirm);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Signup API call function
  const handleSignupApi = async (userData) => {
    try {
      const payload = {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password: userData.password,
      };

      const response = await api.post(getApiEndpoint("SIGNUP"), payload);

      const result = response.data;
      return result;
    } catch (error) {
      console.error("🔐 Signup API failed:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Error",
        description: "Please agree to the terms and conditions",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {

      // Call the signup API directly
      const apiResult = await handleSignupApi({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      if (apiResult) {
        // Update Redux state
        const result = await signup({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        });

        if (result.success) {
          toast({
            title: "Success",
            description: "Account created successfully! Please sign in.",
            status: "success",
            duration: 3000,
            isClosable: true,
          });

          // Redirect to signin page
          setTimeout(() => {
            history.push('/auth/sign-in');
          }, 1500);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create account. Please try again.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create account. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Sign up error:", error); // Debug log

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Clear error when component unmounts or error changes
  React.useEffect(() => {
    if (signupError) {
      clearError();
    }
  }, [signupError, clearError]);

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Flex
        maxW="100%"
        w="100%"
        mx="auto"
        me="auto"
        h="100%"
        alignItems="start"
        justifyContent="center"
        mb="30px"
        px="25px"
        mt="40px"
        flexDirection="column"
      >
        <Box me="auto">
          <Heading color={textColor} fontSize="36px" mb="10px">
            Sign Up
          </Heading>
          <Text
            mb="36px"
            ms="4px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize="md"
          >
            Create your account to get started!
          </Text>
        </Box>
        <Flex
          zIndex="2"
          direction="column"
          w="100%"
          maxW="420px"
          background="transparent"
          borderRadius="15px"
          mx="auto"
          me="auto"
          mb="20px"
        >
          <form onSubmit={handleSubmit}>
            <FormControl>
              <Flex gap="10px" mb="24px">
                <Box flex="1">
                  <FormLabel
                    display="flex"
                    ms="4px"
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
                    First Name<Text color={brandStars}>*</Text>
                  </FormLabel>
                  <Input
                    isRequired={true}
                    variant="auth"
                    fontSize="sm"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    fontWeight="500"
                    size="lg"
                  />
                </Box>
                <Box flex="1">
                  <FormLabel
                    display="flex"
                    ms="4px"
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
                    Last Name<Text color={brandStars}>*</Text>
                  </FormLabel>
                  <Input
                    isRequired={true}
                    variant="auth"
                    fontSize="sm"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    fontWeight="500"
                    size="lg"
                  />
                </Box>
              </Flex>

              <FormLabel
                display="flex"
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                mb="8px"
              >
                Email<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                isRequired={true}
                variant="auth"
                fontSize="sm"
                ms="0px"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="mail@simmmple.com"
                mb="24px"
                fontWeight="500"
                size="lg"
              />

              <FormLabel
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                display="flex"
              >
                Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size="md">
                <Input
                  isRequired={true}
                  fontSize="sm"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min. 8 characters"
                  mb="24px"
                  size="lg"
                  type={show ? "text" : "password"}
                  variant="auth"
                />
                <InputRightElement display="flex" alignItems="center" mt="4px">
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: "pointer" }}
                    as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleClick}
                  />
                </InputRightElement>
              </InputGroup>

              <FormLabel
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                display="flex"
              >
                Confirm Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size="md">
                <Input
                  isRequired={true}
                  fontSize="sm"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  mb="24px"
                  size="lg"
                  type={showConfirm ? "text" : "password"}
                  variant="auth"
                />
                <InputRightElement display="flex" alignItems="center" mt="4px">
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: "pointer" }}
                    as={showConfirm ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleConfirmClick}
                  />
                </InputRightElement>
              </InputGroup>

              <Flex justifyContent="start" align="center" mb="24px">
                <FormControl display="flex" alignItems="center">
                  <Checkbox
                    id="agree-terms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    colorScheme="brandScheme"
                    me="10px"
                  />
                  <FormLabel
                    htmlFor="agree-terms"
                    mb="0"
                    fontWeight="normal"
                    color={textColor}
                    fontSize="sm"
                  >
                    I agree to the{" "}
                    <Text as="span" color={textColorBrand} fontWeight="500">
                      Terms and Conditions
                    </Text>
                  </FormLabel>
                </FormControl>
              </Flex>

              <Button
                type="submit"
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50px"
                mb="24px"
                isLoading={signupLoading}
                loadingText="Creating Account..."
              >
                Create Account
              </Button>
            </FormControl>
          </form>
          <Flex
            flexDirection="column"
            justifyContent="center"
            alignItems="start"
            maxW="100%"
            mt="0px"
          >
            <Text color={textColorDetails} fontWeight="400" fontSize="14px">
              Already have an account?
              <NavLink to="/auth/sign-in">
                <Text color={textColorBrand} as="span" ms="5px" fontWeight="500">
                  Sign In
                </Text>
              </NavLink>
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}

export default SignUp;

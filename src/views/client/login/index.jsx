import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
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
import { useHistory } from "react-router-dom";
import { MdEmail, MdLock, MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { useDispatch } from "react-redux";
import { loginSuccess } from "redux/slices/userSlice";
import api from "api/axios";
import { getApiEndpoint } from "config/api";

function ClientLogin() {
  const history = useHistory();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const brand = "#174693";
  const cardBg = useColorModeValue("white", "navy.800");
  const pageBg = useColorModeValue("secondaryGray.300", "navy.900");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const headingColor = useColorModeValue("navy.700", "white");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");

  const initials = useMemo(() => {
    if (!formData.email) return "C";
    return formData.email.trim().charAt(0).toUpperCase();
  }, [formData.email]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const loginWithApi = async (email, password) => {
    const payload = { login: email, password };
    const response = await api.post(getApiEndpoint("LOGIN"), payload);
    const result = response?.data?.result;

    if (!result) {
      throw new Error("Invalid response from server");
    }

    if (result.status === "error") {
      throw new Error(result.message || "Login failed");
    }

    if (result.status === "success") {
      return {
        user: {
          id: result.user_id || Date.now(),
          email,
          name: result.name || email.split("@")[0],
          role: result.role || "user",
          user_type: result.user_type || "client",
        },
        token: result.session_id || result.token || "client_session_token",
      };
    }

    throw new Error("Unable to log in");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const authData = await loginWithApi(formData.email, formData.password);
      dispatch(loginSuccess(authData));
      history.push("/Client/Vessels");
    } catch (error) {
      setErrorMessage(error.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg={pageBg}
      px={{ base: 4, md: 8 }}
      py={{ base: 6, md: 12 }}
    >
      <Box
        w="100%"
        maxW="460px"
        bg={cardBg}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        boxShadow="0 20px 60px rgba(23, 70, 147, 0.14)"
        p={{ base: 6, md: 10 }}
      >
        <Flex align="center" justify="space-between" mb={7}>
          <Box>
            <Text fontSize="sm" color={muted} fontWeight="600">
              Client Access Portal
            </Text>
            <Heading mt={1} color={headingColor} fontSize="32px" lineHeight="40px">
              Welcome back
            </Heading>
          </Box>
          <Flex
            align="center"
            justify="center"
            w="46px"
            h="46px"
            borderRadius="full"
            bg="secondaryGray.300"
            color={brand}
            fontWeight="700"
            fontSize="md"
          >
            {initials}
          </Flex>
        </Flex>

        <Text mb={6} color={muted} fontSize="sm">
          Sign in to access your vessel details and client resources.
        </Text>

        <form onSubmit={handleSubmit}>
          <FormControl mb={4} isRequired>
            <FormLabel fontSize="sm" fontWeight="500" color={headingColor}>
              Email
            </FormLabel>
            <InputGroup>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                h="48px"
                borderRadius="12px"
                fontSize="sm"
                fontWeight="500"
              />
              <InputRightElement h="48px">
                <Icon as={MdEmail} color="secondaryGray.600" />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl mb={2} isRequired>
            <FormLabel fontSize="sm" fontWeight="500" color={headingColor}>
              Password
            </FormLabel>
            <InputGroup>
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                h="48px"
                borderRadius="12px"
                pr="44px"
                fontSize="sm"
                fontWeight="500"
              />
              <InputRightElement h="48px" pr="1">
                <Icon
                  as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                  color="secondaryGray.600"
                  cursor="pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {errorMessage ? (
            <Text mt={3} mb={2} color="red.500" fontSize="sm" fontWeight="500">
              {errorMessage}
            </Text>
          ) : null}

          <Button
            mt={5}
            w="100%"
            h="50px"
            type="submit"
            borderRadius="12px"
            variant="brand"
            leftIcon={<Icon as={MdLock} />}
            isLoading={isSubmitting}
            loadingText="Signing In"
            fontSize="sm"
            fontWeight="500"
          >
            Login to Client Portal
          </Button>
        </form>
      </Box>
    </Flex>
  );
}

export default ClientLogin;

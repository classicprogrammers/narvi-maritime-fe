import React from "react";
import { useHistory } from "react-router-dom";
// Chakra imports
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Input,
    Select,
    Text,
    useColorModeValue,
    VStack,
    HStack,
    Icon,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import { MdPersonAdd, MdBusiness, MdPerson } from "react-icons/md";
// API
import { registerCustomerApi } from "api/customer";
// Redux
import { useCustomer } from "redux/hooks/useCustomer";

function CustomerRegistration() {
    const history = useHistory();

    // Redux
    const { countries, isLoading: countriesLoading, getCountries, addCustomerToRedux } = useCustomer();
    const countryList = countries?.countries;

    // Modal states
    const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
    const [isFailureModalOpen, setIsFailureModalOpen] = React.useState(false);
    const [modalMessage, setModalMessage] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    // Chakra color mode
    const textColor = useColorModeValue("secondaryGray.900", "white");
    const textColorSecondary = useColorModeValue("gray.700", "gray.400");
    const textColorBrand = useColorModeValue("#174693", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
    const inputBg = useColorModeValue("white", "navy.900");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const placeholderColor = useColorModeValue("gray.400", "gray.500");

    // Form state
    const [formData, setFormData] = React.useState({
        name: "",
        client_code: "",
        client_category: "",
        email: "",
        email2: "",
        phone: "",
        phone2: "",
        street: "",
        street2: "",
        city: "",
        zip: "",
        country_id: "",
        reg_no: "",
        website: "",
        remarks: "",
    });

    // Load countries on component mount
    React.useEffect(() => {
        // Ensure component is mounted before making API calls
        let isMounted = true;

        const loadCountries = async () => {
            try {
                if (isMounted) {
                    await getCountries();
                }
            } catch (error) {
                console.error("Failed to load countries:", error);
            }
        };

        loadCountries();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [getCountries]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Validation
        if (!formData.name) {
            setModalMessage("Name and Email are required fields");
            setIsFailureModalOpen(true);
            setIsLoading(false);
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email) && formData.email) {
            setModalMessage("Please enter a valid email address");
            setIsFailureModalOpen(true);
            setIsLoading(false);
            return;
        }

        try {
            const result = await registerCustomerApi({
                name: formData.name,
                client_code: formData.client_code,
                client_category: formData.client_category,
                email: formData.email,
                email2: formData.email2,
                phone: formData.phone,
                phone2: formData.phone2,
                street: formData.street,
                street2: formData.street2,
                city: formData.city,
                zip: formData.zip,
                country_id: parseInt(formData.country_id) || null,
                reg_no: formData.reg_no,
                website: formData.website,
                remarks: formData.remarks,
            });

            // Check if the API call was actually successful
            if (result && result.result && result.result.status === "success") {
                // Add the new client to Redux
                const newClient = {
                    id: result.result.id || Date.now(), // Use API response ID or generate one
                    name: formData.name,
                    client_code: formData.client_code,
                    client_category: formData.client_category,
                    email: formData.email,
                    email2: formData.email2,
                    phone: formData.phone,
                    phone2: formData.phone2,
                    street: formData.street,
                    street2: formData.street2,
                    city: formData.city,
                    zip: formData.zip,
                    country_id: parseInt(formData.country_id) || null,
                    reg_no: formData.reg_no,
                    website: formData.website,
                    remarks: formData.remarks,
                    status: "Active",
                    joinDate: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                    }),
                };

                addCustomerToRedux(newClient);

                setModalMessage("Client registered successfully!");
                setIsSuccessModalOpen(true);

                // Reset form after success
                setFormData({
                    name: "",
                    client_code: "",
                    client_category: "",
                    email: "",
                    email2: "",
                    phone: "",
                    phone2: "",
                    street: "",
                    street2: "",
                    city: "",
                    zip: "",
                    country_id: "",
                    reg_no: "",
                    website: "",
                    remarks: "",
                });
            } else {
                // API returned an error or invalid response
                setModalMessage("Registration failed. Please try again.");
                setIsFailureModalOpen(true);
            }
        } catch (error) {
            console.error("Registration error:", error);
            setModalMessage(error.message || "An unexpected error occurred. Please try again.");
            setIsFailureModalOpen(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle success modal close
    const handleSuccessModalClose = () => {
        setIsSuccessModalOpen(false);
        // Navigate to customer page after successful registration
        history.push('/admin/contacts/customer');
    };

    // Handle failure modal close
    const handleFailureModalClose = () => {
        setIsFailureModalOpen(false);
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <VStack spacing={6} align="stretch">
                <Card
                    direction='column'
                    w='100%'
                    px='0px'
                    overflowX={{ sm: "scroll", lg: "hidden" }}>
                    <Flex px='25px' justify='space-between' mb='20px' align='center'>
                        <Text
                            color={textColor}
                            fontSize='22px'
                            fontWeight='700'
                            lineHeight='100%'>
                            Client Registration
                        </Text>
                        <Button
                            leftIcon={<Icon as={MdPersonAdd} />}
                            colorScheme="blue"
                            size="sm"
                            onClick={() => history.push('/admin/contacts/customer')}
                        >
                            View Clients
                        </Button>
                    </Flex>

                    <Box px='25px' pb='25px'>
                        <Text
                            color={textColorSecondary}
                            fontSize='md'
                            fontWeight='400'
                            mb='30px'>
                            Register a new client with complete information. Fill in the required fields marked with an asterisk (*).
                        </Text>

                        <form onSubmit={handleSubmit}>
                            <VStack spacing="6" align="stretch">
                                {/* Personal Information Section */}
                                <Box>
                                    <Flex align="center" mb="20px">
                                        <Icon as={MdPerson} color={textColorBrand} fontSize="18px" mr="8px" />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Personal Information
                                        </Text>
                                    </Flex>

                                    {/* Name and Client Code Row */}
                                    <HStack spacing="6" mb="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Client Code
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="client_code"
                                                value={formData.client_code}
                                                onChange={handleInputChange}
                                                placeholder="e.g., ACME123, CLIENT001..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl isRequired>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Client Name
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="e.g., ACME Shipping Co., John Smith..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>

                                    {/* Client Category and Registration Number Row */}
                                    <HStack spacing="6" mb="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Client Category
                                            </FormLabel>
                                            <Select
                                                variant="outline"
                                                fontSize="sm"
                                                name="client_category"
                                                value={formData.client_category}
                                                onChange={handleInputChange}
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                                sx={{
                                                    option: {
                                                        bg: inputBg,
                                                        color: inputText,
                                                        _hover: {
                                                            bg: useColorModeValue("blue.50", "blue.900"),
                                                        },
                                                    },
                                                }}
                                            >
                                                <option value="">Select Category</option>
                                                <option value="shipspares">Ship Spares</option>
                                                <option value="bunker">Bunker</option>
                                                <option value="other">Other</option>
                                            </Select>
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Registration Number
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="reg_no"
                                                value={formData.reg_no}
                                                onChange={handleInputChange}
                                                placeholder="e.g., SG12345678, US123456789..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>

                                    {/* Email and Email2 Row */}
                                    <HStack spacing="6" mb="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Primary Email
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="e.g., contact@acme.com..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Secondary Email
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="email"
                                                name="email2"
                                                value={formData.email2}
                                                onChange={handleInputChange}
                                                placeholder="e.g., backup@acme.com..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>

                                    {/* Phone and Phone2 Row */}
                                    <HStack spacing="6" mb="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Primary Phone
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="e.g., +65 1234 5678..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Secondary Phone
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="tel"
                                                name="phone2"
                                                value={formData.phone2}
                                                onChange={handleInputChange}
                                                placeholder="e.g., +65 9876 5432..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>
                                </Box>

                                {/* Address Information Section */}
                                <Box>
                                    <Flex align="center" mb="20px">
                                        <Icon as={MdBusiness} color={textColorBrand} fontSize="18px" mr="8px" />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Address Information
                                        </Text>
                                    </Flex>

                                    {/* Street Address Row */}
                                    <HStack spacing="6" mb="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Street Address
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="street"
                                                value={formData.street}
                                                onChange={handleInputChange}
                                                placeholder="e.g., 119 Airport Cargo Road..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Street Address 2
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="street2"
                                                value={formData.street2}
                                                onChange={handleInputChange}
                                                placeholder="e.g., #01-03/04 Changi Cargo Megaplex..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>

                                    {/* City, Zip, and Country Row */}
                                    <HStack spacing="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                City
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                placeholder="e.g., New York, London, Tokyo..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                ZIP Code
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="zip"
                                                value={formData.zip}
                                                onChange={handleInputChange}
                                                placeholder="e.g., 10001, SW1A 1AA, 100-0001..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Country
                                            </FormLabel>
                                            <Select
                                                variant="outline"
                                                fontSize="sm"
                                                name="country_id"
                                                value={formData.country_id}
                                                onChange={handleInputChange}
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                                isDisabled={countriesLoading}
                                                sx={{
                                                    option: {
                                                        bg: inputBg,
                                                        color: inputText,
                                                        _hover: {
                                                            bg: useColorModeValue("blue.50", "blue.900"),
                                                        },
                                                    },
                                                }}
                                            >
                                                <option value="">
                                                    {countriesLoading ? "Loading countries..." : "Select Country"}
                                                </option>

                                                {countryList && countryList.length > 0 ? (
                                                    countryList.map((country) => (
                                                        <option key={country.id} value={country.id}>
                                                            {country.name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    !countriesLoading && (
                                                        <option value="" disabled>
                                                            Countries not available. Please check backend connection.
                                                        </option>
                                                    )
                                                )}
                                            </Select>
                                        </FormControl>
                                    </HStack>

                                    {/* Website and Remarks Row */}
                                    <HStack spacing="6" mt="6">
                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Website
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="url"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleInputChange}
                                                placeholder="e.g., http://acme.com..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel
                                                fontSize="sm"
                                                fontWeight="600"
                                                color={textColor}
                                                mb="8px"
                                            >
                                                Remarks
                                            </FormLabel>
                                            <Input
                                                variant="outline"
                                                fontSize="sm"
                                                type="text"
                                                name="remarks"
                                                value={formData.remarks}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Preferred supplier for spare parts..."
                                                size="lg"
                                                borderRadius="12px"
                                                bg={inputBg}
                                                color={inputText}
                                                border="2px"
                                                borderColor={borderColor}
                                                _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                                                _focus={{
                                                    borderColor: textColorBrand,
                                                    boxShadow: `0 0 0 1px ${textColorBrand}`,
                                                }}
                                                _hover={{
                                                    borderColor: "blue.300",
                                                }}
                                            />
                                        </FormControl>
                                    </HStack>
                                </Box>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    fontSize="sm"
                                    variant="brand"
                                    fontWeight="600"
                                    w="100%"
                                    h="50px"
                                    mt="20px"
                                    isLoading={isLoading}
                                    loadingText="Registering Client..."
                                    leftIcon={<MdPersonAdd />}
                                    borderRadius="12px"
                                    _hover={{
                                        transform: "translateY(-2px)",
                                        boxShadow: "0px 8px 25px rgba(112, 144, 176, 0.25)",
                                    }}
                                    transition="all 0.3s ease"
                                >
                                    Register Client
                                </Button>
                            </VStack>
                        </form>
                    </Box>
                </Card>
            </VStack>

            {/* Success Modal */}
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessModalClose}
                title="Client Registration Successful!"
                message={modalMessage}
            />

            {/* Failure Modal */}
            <FailureModal
                isOpen={isFailureModalOpen}
                onClose={handleFailureModalClose}
                title="Client Registration Failed"
                message={modalMessage}
            />
        </Box>
    );
}

export default CustomerRegistration;

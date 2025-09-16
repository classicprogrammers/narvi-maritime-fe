import React from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
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
import { MdPersonAdd, MdBusiness, MdPerson, MdEdit } from "react-icons/md";
// API
import { registerVendorApi, updateVendorApi } from "api/vendor";
// Redux
import { useVendor } from "redux/hooks/useVendor";

function VendorRegistration() {
    const history = useHistory();
    const params = useParams(); // Get all URL params
    const location = useLocation(); // Get location state for vendor data

    // Redux
    const { countries, isLoading: countriesLoading, getCountries } = useVendor();
    const countryList = countries?.countries;
   
    // Extract id from params
    let id = params.id;
    
    // Fallback: extract ID from URL manually if useParams fails
    if (!id) {
        const pathParts = location.pathname.split('/');
        const idFromPath = pathParts[pathParts.length - 1];
        if (idFromPath && !isNaN(idFromPath)) {
            id = idFromPath;
        }
    }
    
    // Determine if we're in edit mode
    const isEditMode = Boolean(id);
    
    // Get vendor data from location state
    const vendorDataFromState = location.state?.vendorData;

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
        email: "",
        phone: "",
        street: "",
        city: "",
        zip: "",
        country_id: "",
    });

    // Load vendor data for editing
    const loadVendorData = React.useCallback(() => {
        try {
            
            let vendorData = vendorDataFromState;
            
            // Fallback: try to get from localStorage if location state is not available
            if (!vendorData) {
                const storedVendorData = localStorage.getItem(`vendor_${id}`);
                if (storedVendorData) {
                    try {
                        vendorData = JSON.parse(storedVendorData);
                    } catch (parseError) {
                        console.error("Error parsing stored vendor data:", parseError);
                    }
                }
            }
            
            if (vendorData) {
                
                const formDataToSet = {
                    name: vendorData.name || "",
                    email: vendorData.email || "",
                    phone: vendorData.phone || "",
                    street: vendorData.street || "",
                    city: vendorData.city || "",
                    zip: vendorData.zip || "",
                    country_id: vendorData.country_id || "",
                };
                
                setFormData(formDataToSet);
            } else {
                console.error("No vendor data found in location state or localStorage");
                setModalMessage("No vendor data available. Please go back to the vendor list and try editing again.");
                setIsFailureModalOpen(true);
            }
        } catch (error) {
            console.error("Error loading vendor data:", error);
            
            // Extract detailed error message
            let errorMessage = "Failed to load vendor data. Please try again.";
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data) {
                const responseData = error.response.data;
                if (responseData.result && responseData.result.message) {
                    errorMessage = responseData.result.message;
                } else if (responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseData.error) {
                    errorMessage = responseData.error;
                }
            }
            
            setModalMessage(errorMessage);
            setIsFailureModalOpen(true);
        }
    }, [id, vendorDataFromState]);

    // Load countries on component mount
    React.useEffect(() => {
        if (!countries || countries.length === 0) {
            getCountries();
        }
    }, [countries, getCountries]);

    // Load vendor data when in edit mode
    React.useEffect(() => {
        if (isEditMode && id) {
            loadVendorData();
        }
    }, [isEditMode, id, loadVendorData]);

    // Cleanup localStorage when component unmounts
    React.useEffect(() => {
        return () => {
            if (isEditMode && id) {
                localStorage.removeItem(`vendor_${id}`);
            }
        };
    }, [isEditMode, id]);

    // Handle input changes
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.name || formData.name.trim() === "") {
            setModalMessage("❌ Vendor name is required. Please enter a vendor name.");
            setIsFailureModalOpen(true);
            return;
        }

        if (!formData.email || formData.email.trim() === "") {
            setModalMessage("❌ Email address is required. Please enter an email address.");
            setIsFailureModalOpen(true);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setModalMessage("❌ Invalid email format. Please enter a valid email address (e.g., vendor@company.com).");
            setIsFailureModalOpen(true);
            return;
        }

        try {
            setIsLoading(true);

            let result;
            if (isEditMode) {
                // Update existing vendor
                result = await updateVendorApi(id, formData);
            } else {
                // Register new vendor
                result = await registerVendorApi(formData);
            }

            // Handle JSON-RPC response format
            if (result && result.result && result.result.status === "success") {
                const action = isEditMode ? "updated" : "registered";
                setModalMessage(`Vendor "${formData.name}" has been ${action} successfully!`);
                setIsSuccessModalOpen(true);

                // Reset form only for new registrations
                if (!isEditMode) {
                    setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        street: "",
                        city: "",
                        zip: "",
                        country_id: "",
                    });
                }
            } else {
                // Handle error response
                const action = isEditMode ? "update" : "registration";
                const errorMessage = result?.result?.message || result?.message || `Failed to ${action} vendor`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            const action = isEditMode ? "update" : "registration";
            console.error(`Vendor ${action} error in component:`, error);
            
            // Extract detailed error message
            let errorMessage = `Failed to ${action} vendor. Please try again.`;
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response && error.response.data) {
                const responseData = error.response.data;
                // Check for JSON-RPC error format
                if (responseData.result && responseData.result.message) {
                    errorMessage = responseData.result.message;
                } else if (responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseData.error) {
                    errorMessage = responseData.error;
                }
            }
            
            setModalMessage(errorMessage);
            setIsFailureModalOpen(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle success modal close
    const handleSuccessModalClose = () => {
        setIsSuccessModalOpen(false);
        history.push("/admin/contacts/vendors");
    };

    // Handle failure modal close
    const handleFailureModalClose = () => {
        setIsFailureModalOpen(false);
    };

    // Handle back to vendors
    const handleBackToVendors = () => {
        history.push("/admin/contacts/vendors");
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Card
                direction="column"
                w="100%"
                px="0px"
                overflowX={{ sm: "scroll", lg: "hidden" }}
            >
                {/* Header */}
                <Flex px="25px" justify="space-between" mb="20px" align="center">
                    <Text
                        color={textColor}
                        fontSize="22px"
                        fontWeight="700"
                        lineHeight="100%">
                        {isEditMode ? "Edit Vendor" : "Vendor Registration"}
                    </Text>
                    <Button
                        leftIcon={<Icon as={isEditMode ? MdEdit : MdPersonAdd} />}
                        colorScheme="blue"
                        size="sm"
                        onClick={handleBackToVendors}
                    >
                        Back to Vendors
                    </Button>
                </Flex>

                {/* Form */}
                <Box px="25px" pb="25px">
                    <form onSubmit={handleSubmit}>
                        <VStack spacing={6} align="stretch">
                            {/* Basic Information Section */}
                            <Card p="6" borderRadius="lg" border="1px" borderColor={borderColor}>
                                <VStack spacing={4} align="stretch">
                                    <HStack spacing={2} mb={4}>
                                        <Icon as={MdBusiness} color={textColorBrand} boxSize={6} />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Basic Information
                                        </Text>
                                    </HStack>

                                    <FormControl isRequired>
                                        <FormLabel color={textColorSecondary}>Vendor Name</FormLabel>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            placeholder="Enter vendor name"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            _focus={{
                                                borderColor: "blue.400",
                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                            }}
                                            _placeholder={{ color: placeholderColor }}
                                        />
                                    </FormControl>

                                    <FormControl isRequired>
                                        <FormLabel color={textColorSecondary}>Email Address</FormLabel>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            placeholder="Enter email address"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            _focus={{
                                                borderColor: "blue.400",
                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                            }}
                                            _placeholder={{ color: placeholderColor }}
                                        />
                                    </FormControl>
                                </VStack>
                            </Card>

                            {/* Contact Information Section */}
                            <Card p="6" borderRadius="lg" border="1px" borderColor={borderColor}>
                                <VStack spacing={4} align="stretch">
                                    <HStack spacing={2} mb={4}>
                                        <Icon as={MdPerson} color={textColorBrand} boxSize={6} />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Contact Information
                                        </Text>
                                    </HStack>

                                    <HStack spacing={4}>
                                        <FormControl>
                                            <FormLabel color={textColorSecondary}>Phone</FormLabel>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange("phone", e.target.value)}
                                                placeholder="Enter phone number"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                _focus={{
                                                    borderColor: "blue.400",
                                                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                                }}
                                                _placeholder={{ color: placeholderColor }}
                                            />
                                        </FormControl>

                                    </HStack>
                                </VStack>
                            </Card>

                            {/* Address Information Section */}
                            <Card p="6" borderRadius="lg" border="1px" borderColor={borderColor}>
                                <VStack spacing={4} align="stretch">
                                    <HStack spacing={2} mb={4}>
                                        <Icon as={MdBusiness} color={textColorBrand} boxSize={6} />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Address Information
                                        </Text>
                                    </HStack>

                                    <FormControl>
                                        <FormLabel color={textColorSecondary}>Street Address</FormLabel>
                                        <Input
                                            value={formData.street}
                                            onChange={(e) => handleInputChange("street", e.target.value)}
                                            placeholder="Enter street address"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            _focus={{
                                                borderColor: "blue.400",
                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                            }}
                                            _placeholder={{ color: placeholderColor }}
                                        />
                                    </FormControl>

                                    <HStack spacing={4}>
                                        <FormControl>
                                            <FormLabel color={textColorSecondary}>City</FormLabel>
                                            <Input
                                                value={formData.city}
                                                onChange={(e) => handleInputChange("city", e.target.value)}
                                                placeholder="Enter city"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                _focus={{
                                                    borderColor: "blue.400",
                                                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                                }}
                                                _placeholder={{ color: placeholderColor }}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel color={textColorSecondary}>ZIP Code</FormLabel>
                                            <Input
                                                value={formData.zip}
                                                onChange={(e) => handleInputChange("zip", e.target.value)}
                                                placeholder="Enter ZIP code"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                _focus={{
                                                    borderColor: "blue.400",
                                                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                                }}
                                                _placeholder={{ color: placeholderColor }}
                                            />
                                        </FormControl>
                                    </HStack>

                                    <FormControl>
                                        <FormLabel color={textColorSecondary}>Country</FormLabel>
                                        <Select
                                            value={formData.country_id}
                                            onChange={(e) => handleInputChange("country_id", e.target.value)}
                                            placeholder="Select country"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            _focus={{
                                                borderColor: "blue.400",
                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                                            }}
                                            isDisabled={countriesLoading}
                                        >
                                            {countryList && countryList.map((country) => (
                                                <option key={country.id} value={country.id}>
                                                    {country.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </VStack>
                            </Card>

                            {/* Submit Button */}
                            <HStack spacing={4} justify="center" pt={4}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBackToVendors}
                                    size="lg"
                                    px={8}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    colorScheme="blue"
                                    size="lg"
                                    px={8}
                                    isLoading={isLoading}
                                    loadingText={isEditMode ? "Updating..." : "Registering..."}
                                    leftIcon={<Icon as={isEditMode ? MdEdit : MdPersonAdd} />}
                                >
                                    {isEditMode ? "Update Vendor" : "Register Vendor"}
                                </Button>
                            </HStack>
                        </VStack>
                    </form>
                </Box>
            </Card>

            {/* Success Modal */}
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessModalClose}
                title={isEditMode ? "Vendor Update Successful!" : "Vendor Registration Successful!"}
                message={modalMessage}
            />

            {/* Failure Modal */}
            <FailureModal
                isOpen={isFailureModalOpen}
                onClose={handleFailureModalClose}
                title={isEditMode ? "Vendor Update Failed" : "Vendor Registration Failed"}
                message={modalMessage}
            />
        </Box>
    );
}

export default VendorRegistration;

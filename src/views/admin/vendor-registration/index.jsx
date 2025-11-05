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
    Text,
    useColorModeValue,
    VStack,
    HStack,
    Icon,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
} from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import { MdPersonAdd, MdBusiness, MdPerson, MdEdit, MdAdd, MdRemove } from "react-icons/md";
// API
import { registerVendorApi, updateVendorApi, createVendorPersonApi } from "api/vendor";
import SearchableSelect from "components/forms/SearchableSelect";
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
    // const placeholderColor = useColorModeValue("gray.400", "gray.500");
    const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
    const headingColor = useColorModeValue("secondaryGray.900", "white");
    const borderLight = useColorModeValue("gray.200", "whiteAlpha.200");
    const gridInputWidth = { base: "60%", md: "60%" };

    // Form state
    const [formData, setFormData] = React.useState({
        name: "",
        agentsdb_id: "",
        address_type: "",
        street: "",
        street2: "",
        zip: "",
        city: "",
        country_id: "",
        reg_no: "",
        email: "",
        email2: "",
        phone: "",
        phone2: "",
        website: "",
        pic: "",
        cnee1: "",
        cnee2: "",
        cnee3: "",
        cnee4: "",
        cnee5: "",
        cnee6: "",
        cnee7: "",
        cnee8: "",
        cnee9: "",
        cnee10: "",
        cnee11: "",
        cnee12: "",
        cnee_text: "",
        warnings: "",
        narvi_approved: "",
        remarks: "",
    });

    // Agent People table (same UX as clients)
    const peopleTableColumns = [
        { key: "company_name", label: "Agent company" },
        { key: "first_name", label: "First name" },
        { key: "last_name", label: "Last name" },
        { key: "prefix", label: "Prefix" },
        { key: "job_title", label: "Job title" },
        { key: "email", label: "E-mail" },
        { key: "tel_direct", label: "Tel direct" },
        { key: "phone", label: "Mobile" },
        { key: "tel_other", label: "Tel other" },
        { key: "linked_in", label: "LinkedIn" },
        { key: "remarks", label: "Remark" },
    ];

    const emptyPersonRow = {
        company_name: "",
        first_name: "",
        last_name: "",
        prefix: "",
        job_title: "",
        email: "",
        tel_direct: "",
        phone: "",
        tel_other: "",
        linked_in: "",
        remarks: "",
    };

    const [peopleRows, setPeopleRows] = React.useState([]);

    // State to track how many CNEE fields are visible
    const [visibleCneeFields, setVisibleCneeFields] = React.useState(1);

    // Function to add more CNEE fields
    const addCneeField = () => {
        if (visibleCneeFields < 12) {
            setVisibleCneeFields(prev => prev + 1);
        }
    };

    // Function to remove CNEE field
    const removeCneeField = (index) => {
        if (visibleCneeFields > 1) {
            // Clear the field being removed
            const fieldName = `cnee${index}`;
            setFormData(prev => ({
                ...prev,
                [fieldName]: ""
            }));
            setVisibleCneeFields(prev => prev - 1);
        }
    };

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
                    agentsdb_id: vendorData.agentsdb_id || "",
                    address_type: vendorData.address_type || "",
                    street: vendorData.street || "",
                    street2: vendorData.street2 || "",
                    zip: vendorData.zip || "",
                    city: vendorData.city || "",
                    country_id: vendorData.country_id || "",
                    reg_no: vendorData.reg_no || "",
                    email: vendorData.email || "",
                    email2: vendorData.email2 || "",
                    phone: vendorData.phone || "",
                    phone2: vendorData.phone2 || "",
                    website: vendorData.website || "",
                    pic: vendorData.pic || "",
                    cnee1: vendorData.cnee1 || "",
                    cnee2: vendorData.cnee2 || "",
                    cnee3: vendorData.cnee3 || "",
                    cnee4: vendorData.cnee4 || "",
                    cnee5: vendorData.cnee5 || "",
                    cnee6: vendorData.cnee6 || "",
                    cnee7: vendorData.cnee7 || "",
                    cnee8: vendorData.cnee8 || "",
                    cnee9: vendorData.cnee9 || "",
                    cnee10: vendorData.cnee10 || "",
                    cnee11: vendorData.cnee11 || "",
                    cnee12: vendorData.cnee12 || "",
                    cnee_text: vendorData.cnee_text || "",
                    warnings: vendorData.warnings || "",
                    narvi_approved: vendorData.narvi_approved || "",
                };

                setFormData(formDataToSet);

                // Set visible CNEE fields based on data
                let maxCneeIndex = 1;
                for (let i = 1; i <= 12; i++) {
                    if (formDataToSet[`cnee${i}`] && formDataToSet[`cnee${i}`].trim() !== "") {
                        maxCneeIndex = i;
                    }
                }
                setVisibleCneeFields(maxCneeIndex);
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
            setModalMessage("❌ Agent company name is required. Please enter an agent company name.");
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
                setModalMessage(`Agent "${formData.name}" has been ${action} successfully!`);
                setIsSuccessModalOpen(true);

                // Create people rows if any
                const createdAgentId = isEditMode ? id : result.result.id;
                if (createdAgentId && peopleRows.length > 0) {
                    for (const row of peopleRows) {
                        await createVendorPersonApi(createdAgentId, row);
                    }
                    setPeopleRows([]);
                }

                // Reset form only for new registrations
                if (!isEditMode) {
                    setFormData({
                        name: "",
                        agentsdb_id: "",
                        address_type: "",
                        street: "",
                        street2: "",
                        zip: "",
                        city: "",
                        country_id: "",
                        reg_no: "",
                        email: "",
                        email2: "",
                        phone: "",
                        phone2: "",
                        website: "",
                        pic: "",
                        cnee1: "",
                        cnee2: "",
                        cnee3: "",
                        cnee4: "",
                        cnee5: "",
                        cnee6: "",
                        cnee7: "",
                        cnee8: "",
                        cnee9: "",
                        cnee10: "",
                        cnee11: "",
                        cnee12: "",
                        cnee_text: "",
                        warnings: "",
                        narvi_approved: "",
                    });
                    setVisibleCneeFields(1);
                }
            } else {
                // Handle error response
                const action = isEditMode ? "update" : "registration";
                const errorMessage = result?.result?.message || result?.message || `Failed to ${action} agent`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            const action = isEditMode ? "update" : "registration";
            console.error(`Agent ${action} error in component:`, error);

            // Extract detailed error message
            let errorMessage = `Failed to ${action} agent. Please try again.`;

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
        history.push("/admin/contacts/agents");
    };

    // Handle failure modal close
    const handleFailureModalClose = () => {
        setIsFailureModalOpen(false);
    };

    // Handle back to vendors
    const handleBackToVendors = () => {
        history.push("/admin/contacts/agents");
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
                        {isEditMode ? "Edit Agent" : "Agent Registration"}
                    </Text>
                    <Button
                        leftIcon={<Icon as={isEditMode ? MdEdit : MdPersonAdd} />}
                        colorScheme="blue"
                        size="sm"
                        onClick={handleBackToVendors}
                    >
                        Back to Agents
                    </Button>
                </Flex>

                {/* Form */}
                <Box px="25px" pb="25px">
                    <form onSubmit={handleSubmit}>
                        <VStack spacing={6} align="stretch">
                            {/* Personal Information grid (matches client) */}
                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box>
                                    <Box as={"div"}>
                                        <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                            {/* Company name */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company name</Text>
                                                <Input name="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., ACME Shipping" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* Address1 */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address1</Text>
                                                <Input name="street" value={formData.street} onChange={(e) => handleInputChange('street', e.target.value)} placeholder="Street address" size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Address2 */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address2</Text>
                                                <Input name="street2" value={formData.street2} onChange={(e) => handleInputChange('street2', e.target.value)} placeholder="Suite / Unit" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* Postcode + City */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Postcode + City</Text>
                                                <HStack spacing={2} w={gridInputWidth}>
                                                    <Input name="zip" value={formData.zip} onChange={(e) => handleInputChange('zip', e.target.value)} placeholder="Zip" size="sm" />
                                                    <Input name="city" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="City" size="sm" />
                                                </HStack>
                                            </Box>

                                            {/* Country */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Country</Text>
                                                <Box w={gridInputWidth}>
                                                    <SearchableSelect
                                                        value={formData.country_id}
                                                        onChange={(val) => handleInputChange('country_id', val)}
                                                        options={countryList || []}
                                                        placeholder={countriesLoading ? "Loading countries..." : "Select Country"}
                                                        displayKey="name"
                                                        valueKey="id"
                                                        isLoading={countriesLoading}
                                                    />
                                                </Box>
                                            </Box>
                                            {/* Reg No */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Reg No</Text>
                                                <Input name="reg_no" value={formData.reg_no} onChange={(e) => handleInputChange('reg_no', e.target.value)} placeholder="Registration" size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Agents DB ID (Agent Code) */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Agent Code</Text>
                                                <Input name="agentsdb_id" value={formData.agentsdb_id} onChange={(e) => handleInputChange('agentsdb_id', e.target.value)} placeholder="AG-001" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* Email1 */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email1</Text>
                                                <Input type="email" name="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="name@company.com" size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Email2 */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email2</Text>
                                                <Input type="email" name="email2" value={formData.email2} onChange={(e) => handleInputChange('email2', e.target.value)} placeholder="optional" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* Phone1 */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone1</Text>
                                                <Input name="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+65..." size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Phone2 */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone2</Text>
                                                <Input name="phone2" value={formData.phone2} onChange={(e) => handleInputChange('phone2', e.target.value)} placeholder="optional" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* Website */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Website</Text>
                                                <Input name="website" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} placeholder="https://..." size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Remarks */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Remarks</Text>
                                                <Input name="remarks" value={formData.remarks} onChange={(e) => handleInputChange('remarks', e.target.value)} placeholder="Notes..." size="sm" w={gridInputWidth} />
                                            </Box>

                                            {/* Address Type */}
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address Type</Text>
                                                <Input name="address_type" value={formData.address_type} onChange={(e) => handleInputChange('address_type', e.target.value)} placeholder="e.g., Warehouse, Office, Main" size="sm" w={gridInputWidth} />
                                            </Box>
                                            {/* PIC (kept for parity with previous vendor form) */}
                                            <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>PIC</Text>
                                                <Input name="pic" value={formData.pic} onChange={(e) => handleInputChange('pic', e.target.value)} placeholder="Person in charge" size="sm" w={gridInputWidth} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                                {/* Close border wrapper */}
                            </Box>

                            {/* CNEE Information (moved into personal information area) */}
                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box px={4} py={3} bg={sectionHeadingBg} borderBottom="1px" borderColor={borderLight}>
                                    <HStack justify="space-between">
                                        <HStack spacing={2}>
                                            <Icon as={MdBusiness} color={textColorBrand} />
                                            <Text fontSize="sm" fontWeight="600" color={headingColor}>CNEE Information</Text>
                                        </HStack>
                                        <Button size="xs" variant="outline" leftIcon={<Icon as={MdAdd} />} onClick={addCneeField} isDisabled={visibleCneeFields >= 12}>Add More</Button>
                                    </HStack>
                                </Box>
                                <Box p={4}>
                                    {Array.from({ length: visibleCneeFields }, (_, index) => {
                                        const fieldNumber = index + 1;
                                        const fieldName = `cnee${fieldNumber}`;
                                        return (
                                            <HStack key={fieldNumber} spacing={4} align="end" mb={3}>
                                                <FormControl flex={1}>
                                                    <FormLabel color={textColorSecondary}>CNEE {fieldNumber}</FormLabel>
                                                    <Input
                                                        value={formData[fieldName] || ""}
                                                        onChange={(e) => handleInputChange(fieldName, e.target.value)}
                                                        placeholder={`Enter CNEE ${fieldNumber}`}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    />
                                                </FormControl>
                                                {visibleCneeFields > 1 && (
                                                    <Button size="sm" colorScheme="red" variant="outline" onClick={() => removeCneeField(fieldNumber)}>
                                                        <Icon as={MdRemove} />
                                                    </Button>
                                                )}
                                            </HStack>
                                        );
                                    })}

                                    <HStack spacing={4}>
                                        <FormControl>
                                            <FormLabel color={textColorSecondary}>CNEE Text</FormLabel>
                                            <Input
                                                value={formData.cnee_text}
                                                onChange={(e) => handleInputChange("cnee_text", e.target.value)}
                                                placeholder="Enter additional CNEE text"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel color={textColorSecondary}>Warnings</FormLabel>
                                            <Input
                                                value={formData.warnings}
                                                onChange={(e) => handleInputChange("warnings", e.target.value)}
                                                placeholder="Enter any warnings or notes"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                        </FormControl>
                                    </HStack>
                                    <FormControl mt={3}>
                                        <FormLabel color={textColorSecondary}>Narvi Maritime Approved Agent</FormLabel>
                                        <Input
                                            value={formData.narvi_approved}
                                            onChange={(e) => handleInputChange("narvi_approved", e.target.value)}
                                            placeholder="Enter approval status or notes"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </FormControl>
                                </Box>
                            </Box>

                        </VStack>
                    </form>
                </Box>
            </Card>

            {/* Agent People Section */}
            <Card p="6" mt={2} borderRadius="lg" border="1px" borderColor={borderColor}>
                <VStack spacing={4} align="stretch">
                    <HStack spacing={2} mb={2} justify="space-between">
                        <HStack spacing={2}>
                            <Icon as={MdPerson} color={textColorBrand} boxSize={6} />
                            <Text fontSize="lg" fontWeight="600" color={textColor}>
                                Agent People
                            </Text>
                        </HStack>
                        <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => {
                                const required = ["first_name", "last_name", "email"];
                                const hasIncomplete = peopleRows.some((row) =>
                                    required.some((f) => !String(row[f] || "").trim())
                                );
                                if (hasIncomplete) return;
                                setPeopleRows((prev) => [
                                    ...prev,
                                    { ...emptyPersonRow, company_name: formData.name || "" },
                                ]);
                            }}
                        >
                            Add Agent Person
                        </Button>
                    </HStack>

                    <Box border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={inputBg}>
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    {peopleTableColumns.map((c) => (
                                        <Th key={c.key} fontSize="xs" textTransform="uppercase">{c.label}</Th>
                                    ))}
                                    <Th fontSize="xs" textTransform="uppercase" w="80px">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {peopleRows.length === 0 ? (
                                    <Tr>
                                        <Td colSpan={peopleTableColumns.length + 1} textAlign="center" py={8}>
                                            <Text color={textColorSecondary}>No agent people added yet.</Text>
                                        </Td>
                                    </Tr>
                                ) : (
                                    peopleRows.map((row, rowIndex) => (
                                        <Tr key={rowIndex}>
                                            {peopleTableColumns.map((column) => (
                                                <Td key={column.key} minW="170px" px={3} py={2}>
                                                    <Input
                                                        value={row[column.key]}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setPeopleRows((prev) => {
                                                                const updated = [...prev];
                                                                updated[rowIndex] = { ...updated[rowIndex], [column.key]: value };
                                                                return updated;
                                                            });
                                                        }}
                                                        size="sm"
                                                        isRequired={["first_name", "last_name", "email"].includes(column.key)}
                                                        isReadOnly={column.key === "company_name"}
                                                        isDisabled={column.key === "company_name"}
                                                    />
                                                </Td>
                                            ))}
                                            <Td px={3} py={2}>
                                                <IconButton
                                                    aria-label="Delete row"
                                                    icon={<MdRemove />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowIndex))}
                                                />
                                            </Td>
                                        </Tr>
                                    ))
                                )}
                            </Tbody>
                        </Table>
                    </Box>
                </VStack>
            </Card>

            {/* Final Submit Buttons */}
            <HStack spacing={4} justify="center" pt={4} px="25px" pb="25px">
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
                    onClick={(e) => { e.preventDefault(); const form = document.querySelector('form'); if (form) { form.requestSubmit(); } }}
                >
                    {isEditMode ? "Update Agent" : "Register Agent"}
                </Button>
            </HStack>

            {/* Success Modal */}
            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessModalClose}
                title={isEditMode ? "Agent Update Successful!" : "Agent Registration Successful!"}
                message={modalMessage}
            />

            {/* Failure Modal */}
            <FailureModal
                isOpen={isFailureModalOpen}
                onClose={handleFailureModalClose}
                title={isEditMode ? "Agent Update Failed" : "Agent Registration Failed"}
                message={modalMessage}
            />
        </Box>
    );
}

export default VendorRegistration;

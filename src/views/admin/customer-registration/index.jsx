import React from "react";
import { useHistory, useLocation } from "react-router-dom";
// Chakra imports
import {
    Box,
    Button,
    Flex,
    Input,
    Text,
    useColorModeValue,
    VStack,
    HStack,
    Icon,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
// Custom components
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import { MdPersonAdd, MdPerson } from "react-icons/md";
// API
import { registerCustomerApi, createCustomerPersonApi, updateCustomerApi } from "api/customer";
import SearchableSelect from "components/forms/SearchableSelect";
// Redux
import { useCustomer } from "redux/hooks/useCustomer";

function CustomerRegistration() {
    const history = useHistory();
    const location = useLocation();

    // Redux
    const { countries, customers, isLoading: countriesLoading, getCountries, addCustomerToRedux } = useCustomer();
    const countryList = countries?.countries;

    // Modal states
    const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
    const [isFailureModalOpen, setIsFailureModalOpen] = React.useState(false);
    const [modalMessage, setModalMessage] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    // People table state (same UX as Client Detail)
    const peopleTableColumns = [
        { key: "company_name", label: "Client company" },
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

    // Chakra color mode
    const textColor = useColorModeValue("secondaryGray.900", "white");
    const textColorSecondary = useColorModeValue("gray.700", "gray.400");
    const textColorBrand = useColorModeValue("#174693", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
    const inputBg = useColorModeValue("white", "navy.900");
    const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
    const rowEvenBg = useColorModeValue("gray.50", "gray.700");
    const headingColor = useColorModeValue("secondaryGray.900", "white");
    const gridInputWidth = { base: "60%", md: "60%" };

    // If a client is passed via navigation state, or clientId is provided, we are editing
    const editingClient = React.useMemo(() => {
        if (location.state?.client) return location.state.client;
        const idFromState = location.state?.clientId;
        if (!idFromState) return null;
        const list = Array.isArray(customers)
            ? customers
            : Array.isArray(customers?.customers)
                ? customers.customers
                : [];
        return list.find((c) => String(c.id) === String(idFromState)) || null;
    }, [location.state, customers]);

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
        prefix: "",
        job_title: "",
    });

    // Prefill when editing
    React.useEffect(() => {
        if (editingClient) {
            setFormData({
                name: editingClient.name || "",
                client_code: editingClient.client_code || "",
                client_category: editingClient.client_category || "",
                email: editingClient.email || "",
                email2: editingClient.email2 || "",
                phone: editingClient.phone || "",
                phone2: editingClient.phone2 || "",
                street: editingClient.street || "",
                street2: editingClient.street2 || "",
                city: editingClient.city || "",
                zip: editingClient.zip || "",
                country_id: editingClient.country_id || "",
                reg_no: editingClient.reg_no || "",
                website: editingClient.website || "",
                remarks: editingClient.remarks || "",
                prefix: editingClient.prefix || "",
                job_title: editingClient.job_title || "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingClient?.id]);

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
        // Intentionally run once on mount; getCountries identity may change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            const doRegister = async () => registerCustomerApi({
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
            const doUpdate = async () => updateCustomerApi(editingClient.id, {
                ...formData,
                country_id: parseInt(formData.country_id) || null,
            });

            const result = editingClient ? await doUpdate() : await doRegister();

            // Check if the API call was actually successful
            if (
                (!editingClient && result && result.result && result.result.status === "success") ||
                (editingClient && result)
            ) {
                const createdClientId = editingClient ? editingClient.id : result.result.id;
                // Add the new client to Redux
                const newClient = {
                    id: createdClientId || Date.now(), // Use API response ID or generate one
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

                // If any people rows were added, create them now using returned client id
                if (createdClientId && peopleRows.length > 0) {
                    for (const row of peopleRows) {
                        await createCustomerPersonApi(createdClientId, row);
                    }
                }

                setModalMessage(editingClient ? "Client updated successfully!" : "Client registered successfully!");
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
                    prefix: "",
                    job_title: "",
                });
                setPeopleRows([]);
            } else {
                // API returned an error or invalid response
                setModalMessage(editingClient ? "Update failed. Please try again." : "Registration failed. Please try again.");
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
                            {editingClient ? "Edit Client" : "Client Registration"}
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

                        <form onSubmit={handleSubmit}>
                            <VStack spacing="6" align="stretch">
                                {/* Personal Information Section - same grid UI as Client Detail, but with inputs */}
                                <Box>
                                    <Flex align="center" mb="20px">
                                        <Icon as={MdPerson} color={textColorBrand} fontSize="18px" mr="8px" />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Personal Information
                                        </Text>
                                    </Flex>

                                    <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                                        <Box>
                                            <Box as={"div"}>
                                                <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                                    {/* Company name */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company name</Text>
                                                        <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., ACME Shipping" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* Address1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address1</Text>
                                                        <Input name="street" value={formData.street} onChange={handleInputChange} placeholder="Street address" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* Address2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address2</Text>
                                                        <Input name="street2" value={formData.street2} onChange={handleInputChange} placeholder="Suite / Unit" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* Postcode + City */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Postcode + City</Text>
                                                        <HStack spacing={2} w={gridInputWidth}>
                                                            <Input name="zip" value={formData.zip} onChange={handleInputChange} placeholder="Zip" size="sm" />
                                                            <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="City" size="sm" />
                                                        </HStack>
                                                    </Box>

                                                    {/* Country */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Country</Text>
                                                        <Box w={gridInputWidth}>
                                                            <SearchableSelect
                                                                value={formData.country_id}
                                                                onChange={(val) => setFormData((prev) => ({ ...prev, country_id: val }))}
                                                                options={countryList || []}
                                                                placeholder={countriesLoading ? "Loading countries..." : "Select Country"}
                                                                displayKey="name"
                                                                valueKey="id"
                                                                isLoading={countriesLoading}
                                                            />
                                                        </Box>
                                                    </Box>
                                                    {/* Reg No */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Reg No</Text>
                                                        <Input name="reg_no" value={formData.reg_no} onChange={handleInputChange} placeholder="Registration" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* Category */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Category</Text>
                                                        <Box w={gridInputWidth}>
                                                            <SearchableSelect
                                                                value={formData.client_category}
                                                                onChange={(val) => setFormData((prev) => ({ ...prev, client_category: val }))}
                                                                options={[
                                                                    { id: "shipspares", name: "Ship Spares" },
                                                                    { id: "bunker", name: "Bunker" },
                                                                    { id: "other", name: "Other" },
                                                                ]}
                                                                placeholder="Select Category"
                                                                displayKey="name"
                                                                valueKey="id"
                                                            />
                                                        </Box>
                                                    </Box>
                                                    {/* Email1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email1</Text>
                                                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@company.com" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* Email2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email2</Text>
                                                        <Input type="email" name="email2" value={formData.email2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* Phone1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone1</Text>
                                                        <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+65..." size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* Phone2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone2</Text>
                                                        <Input name="phone2" value={formData.phone2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* Website */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Website</Text>
                                                        <Input name="website" value={formData.website} onChange={handleInputChange} placeholder="https://..." size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* PIC and Job Title belong to Client People, so not shown here */}

                                                    {/* Remarks */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Remarks</Text>
                                                        <Input name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Notes..." size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* Client Code */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Client Code</Text>
                                                        <Input name="client_code" value={formData.client_code} onChange={handleInputChange} placeholder="ACME123" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Client People Section (mirrors ClientDetail.jsx) */}
                                <Box>
                                    <Flex justify="space-between" align="center" mb={4}>
                                        <Heading size="md" color={headingColor}>
                                            Client People
                                        </Heading>
                                        <Button colorScheme="blue" onClick={() => {
                                            const required = ["first_name", "last_name", "email"];
                                            const hasIncomplete = peopleRows.some((row) =>
                                                required.some((f) => !String(row[f] || "").trim())
                                            );
                                            if (hasIncomplete) return;
                                            setPeopleRows((prev) => [
                                                ...prev,
                                                { ...emptyPersonRow, company_name: formData.name || "" },
                                            ]);
                                        }} isDisabled={peopleRows.some((row) => ["first_name", "last_name", "email"].some((f) => !String(row[f] || "").trim()))}>
                                            Add Client Person
                                        </Button>
                                    </Flex>

                                    <Box border="1px solid" borderColor={borderColor} borderRadius="lg" overflow="auto" bg={inputBg} boxShadow="sm">
                                        <Table size="sm" sx={{ tableLayout: "auto" }}>
                                            <Thead bg={sectionHeadingBg} position="sticky" top={0} zIndex={1}>
                                                <Tr>
                                                    {peopleTableColumns.map((column) => (
                                                        <Th key={column.key} fontSize="xs" minW="170px" textTransform="uppercase" color={headingColor}>
                                                            {column.label}
                                                        </Th>
                                                    ))}
                                                    <Th fontSize="xs" textTransform="uppercase" color={headingColor} w="80px">
                                                        Actions
                                                    </Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {peopleRows.length === 0 ? (
                                                    <Tr>
                                                        <Td colSpan={peopleTableColumns.length} textAlign="center" py={8}>
                                                            <Text color={textColorSecondary}>No client people added yet.</Text>
                                                        </Td>
                                                    </Tr>
                                                ) : (
                                                    peopleRows.map((row, rowIndex) => (
                                                        <Tr key={rowIndex} bg={rowIndex % 2 === 0 ? rowEvenBg : "transparent"}>
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
                                                                        style={{ backgroundColor: "#f7f7f77a" }}
                                                                        border="1px solid"
                                                                        borderColor={borderColor}
                                                                        borderRadius="md"
                                                                        _focus={{
                                                                            borderColor: "blue.500",
                                                                            boxShadow: "0 0 0 1px rgba(0, 123, 255, 0.2)",
                                                                        }}
                                                                        placeholder={"company_name" in row ? (column.key === "company_name" ? "" : undefined) : undefined}
                                                                    />
                                                                </Td>
                                                            ))}
                                                            <Td px={3} py={2}>
                                                                <IconButton
                                                                    aria-label="Delete row"
                                                                    icon={<DeleteIcon />}
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
                                </Box>

                                {/* Address fields moved into Personal Information grid above */}

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
                                    loadingText="Registering Client & People..."
                                    leftIcon={<MdPersonAdd />}
                                    borderRadius="12px"
                                    _hover={{
                                        transform: "translateY(-2px)",
                                        boxShadow: "0px 8px 25px rgba(112, 144, 176, 0.25)",
                                    }}
                                    transition="all 0.3s ease"
                                >
                                    {editingClient ? "Update Client" : `Register Client${peopleRows.length ? " & People" : ""}`}
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

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
    Icon,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    Select,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
// Custom components
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
// Assets
import { MdPersonAdd, MdPerson, MdArrowBack } from "react-icons/md";
// API
import { registerCustomerApi, updateCustomerApi } from "api/customer";
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

    const peoplePlaceholders = {
        company_name: "Auto",
        first_name: "First Name",
        last_name: "Last Name",
        prefix: "",
        job_title: "Job Title",
        email: "Email",
        tel_direct: "Tel direct",
        phone: "Mobile",
        tel_other: "Tel other",
        linked_in: "LinkedIn",
        remarks: "Notes...",
    };

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
    // Track original children to detect deletions and updates
    const [originalChildren, setOriginalChildren] = React.useState([]);

    // Delete confirmation dialog
    const { isOpen: isDeleteDialogOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
    const [rowToDelete, setRowToDelete] = React.useState(null);
    const cancelRef = React.useRef();

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

            // Populate peopleRows from children array if it exists
            if (Array.isArray(editingClient.children) && editingClient.children.length > 0) {
                // Store original children with IDs for tracking updates/deletes
                setOriginalChildren(editingClient.children);

                const childrenRows = editingClient.children.map((child) => {
                    // Helper function to convert false/null/undefined to empty string
                    const getValue = (val) => (val !== false && val !== null && val !== undefined) ? String(val) : "";

                    return {
                        // Store original ID for tracking updates
                        _originalId: child.id,
                        company_name: editingClient.name || "",
                        first_name: getValue(child.first_name),
                        last_name: getValue(child.last_name),
                        prefix: getValue(child.prefix),
                        job_title: getValue(child.job_title),
                        email: getValue(child.email),
                        tel_direct: getValue(child.tel_direct),
                        phone: getValue(child.phone),
                        tel_other: getValue(child.tel_other),
                        linked_in: getValue(child.linked_in),
                        remarks: getValue(child.remarks),
                    };
                });
                setPeopleRows(childrenRows);
            } else {
                setPeopleRows([]);
                setOriginalChildren([]);
            }
        } else {
            // Reset peopleRows and originalChildren when not editing
            setPeopleRows([]);
            setOriginalChildren([]);
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
            // Build children payload with operations (update, delete, create)
            const children = [];

            if (editingClient) {
                // When editing, we need to handle updates, deletes, and creates

                // 1. Find deleted children (in originalChildren but not in peopleRows)
                const currentPeopleIds = new Set(
                    peopleRows
                        .filter(row => row._originalId)
                        .map(row => row._originalId)
                );
                originalChildren.forEach((originalChild) => {
                    if (!currentPeopleIds.has(originalChild.id)) {
                        // This child was deleted - send delete operation
                        children.push({
                            id: originalChild.id,
                            op: "delete"
                        });
                    }
                });

                // 2. Find updated and new children
                peopleRows.forEach((row) => {
                    if (row._originalId) {
                        // This is an update - child exists with ID
                        const childPayload = {
                            id: row._originalId,
                            op: "update",
                            first_name: row.first_name || undefined,
                            last_name: row.last_name || undefined,
                            name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || undefined,
                            company_type: "person",
                            client_category: formData.client_category || undefined,
                            email: row.email || undefined,
                            email2: row.email2 || undefined,
                            phone: row.phone || undefined,
                            phone2: row.phone2 || undefined,
                            prefix: row.prefix || undefined,
                            job_title: row.job_title || undefined,
                            tel_direct: row.tel_direct || undefined,
                            tel_other: row.tel_other || undefined,
                            linked_in: row.linked_in || undefined,
                            remarks: row.remarks || undefined,
                        };
                        // Remove undefined values
                        Object.keys(childPayload).forEach(key => {
                            if (childPayload[key] === undefined) {
                                delete childPayload[key];
                            }
                        });
                        children.push(childPayload);
                    } else {
                        // This is a new child - no original ID
                        const childPayload = {
                            first_name: row.first_name || undefined,
                            last_name: row.last_name || undefined,
                            name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || undefined,
                            company_type: "person",
                            client_category: formData.client_category || undefined,
                            email: row.email || undefined,
                            email2: row.email2 || undefined,
                            phone: row.phone || undefined,
                            phone2: row.phone2 || undefined,
                            prefix: row.prefix || undefined,
                            job_title: row.job_title || undefined,
                            tel_direct: row.tel_direct || undefined,
                            tel_other: row.tel_other || undefined,
                            linked_in: row.linked_in || undefined,
                            remarks: row.remarks || undefined,
                        };
                        // Remove undefined values
                        Object.keys(childPayload).forEach(key => {
                            if (childPayload[key] === undefined) {
                                delete childPayload[key];
                            }
                        });
                        children.push(childPayload);
                    }
                });
            } else {
                // When creating new, all children are new (no operations needed)
                peopleRows.forEach((row) => {
                    const childPayload = {
                        first_name: row.first_name || undefined,
                        last_name: row.last_name || undefined,
                        name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || undefined,
                        company_type: "person",
                        client_category: formData.client_category || undefined,
                        email: row.email || undefined,
                        email2: row.email2 || undefined,
                        phone: row.phone || undefined,
                        phone2: row.phone2 || undefined,
                        prefix: row.prefix || undefined,
                        job_title: row.job_title || undefined,
                        tel_direct: row.tel_direct || undefined,
                        tel_other: row.tel_other || undefined,
                        linked_in: row.linked_in || undefined,
                        remarks: row.remarks || undefined,
                    };
                    // Remove undefined values
                    Object.keys(childPayload).forEach(key => {
                        if (childPayload[key] === undefined) {
                            delete childPayload[key];
                        }
                    });
                    children.push(childPayload);
                });
            }

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
                company_type: "company",
                children: children.length ? children : undefined,
            });
            const doUpdate = async () => updateCustomerApi(editingClient.id, {
                ...formData,
                country_id: parseInt(formData.country_id) || null,
                children: children.length ? children : undefined,
            });

            const result = editingClient ? await doUpdate() : await doRegister();

            // Check if the API call was actually successful
            // For both register and update, check result.status === "success"
            if (result && result.result && result.result.status === "success") {
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
                setOriginalChildren([]);
            } else {
                // API returned an error or invalid response (fallback - should be caught in catch block)
                let errorMsg = editingClient ? "Update failed. Please try again." : "Registration failed. Please try again.";

                // Check if result has error details
                if (result && result.result && result.result.status === "error") {
                    errorMsg = result.result.message || errorMsg;

                    // Add validation errors if present
                    if (result.result.errors && typeof result.result.errors === "object") {
                        const errorDetails = Object.entries(result.result.errors)
                            .map(([field, message]) => `• ${field}: ${message}`)
                            .join("\n");
                        if (errorDetails) {
                            errorMsg = `${errorMsg}\n\nValidation Errors:\n${errorDetails}`;
                        }
                    }
                }

                setModalMessage(errorMsg);
                setIsFailureModalOpen(true);
            }
        } catch (error) {
            // Error modal is already shown by the API error handler (handleApiError)
            // Just log the error and stop loading
            console.error("Registration error:", error);
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

    // Handle confirmed deletion of client people row
    const handleConfirmDelete = () => {
        if (rowToDelete !== null) {
            setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowToDelete));
            setRowToDelete(null);
            onDeleteDialogClose();
        }
    };

    // Handle cancel deletion
    const handleCancelDelete = () => {
        setRowToDelete(null);
        onDeleteDialogClose();
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
                            leftIcon={<Icon as={MdArrowBack} />}
                            size="sm"
                            onClick={() => history.push('/admin/contacts/customer')}
                        >
                            Back to Clients
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
                                                    {/* 1. Client Code */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Client Code</Text>
                                                        <Input name="client_code" value={formData.client_code} onChange={handleInputChange} placeholder="Client ID" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 2. Company name */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company name</Text>
                                                        <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Client Full Name" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 3. Category */}
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
                                                    {/* 4. Address1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address1</Text>
                                                        <Input name="street" value={formData.street} onChange={handleInputChange} placeholder="Street address" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 5. Address2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address2</Text>
                                                        <Input name="street2" value={formData.street2} onChange={handleInputChange} placeholder="Suite / Unit" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 6. Postcode */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Postcode</Text>
                                                        <Input name="zip" value={formData.zip} onChange={handleInputChange} placeholder="Zip" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 7. City */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>City</Text>
                                                        <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="City" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 8. Country */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
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
                                                    {/* 9. Reg No */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Reg No</Text>
                                                        <Input name="reg_no" value={formData.reg_no} onChange={handleInputChange} placeholder="Registration" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 10. Email1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email1</Text>
                                                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@company.com" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 11. Email2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email2</Text>
                                                        <Input type="email" name="email2" value={formData.email2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 12. Phone1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone1</Text>
                                                        <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+65..." size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 13. Phone2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone2</Text>
                                                        <Input name="phone2" value={formData.phone2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 14. Website */}
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Website</Text>
                                                        <Input name="website" value={formData.website} onChange={handleInputChange} placeholder="https://..." size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    {/* 15. Remarks */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Remarks</Text>
                                                        <Input name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="Notes..." size="sm" w={gridInputWidth} />
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
                                                                    {column.key === "prefix" ? (
                                                                        <Select
                                                                            value={row[column.key] || ""}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setPeopleRows((prev) => {
                                                                                    const updated = [...prev];
                                                                                    updated[rowIndex] = { ...updated[rowIndex], [column.key]: value || "" };
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                            size="sm"
                                                                            style={{ backgroundColor: "#f7f7f77a" }}
                                                                            border="1px solid"
                                                                            borderColor={borderColor}
                                                                            borderRadius="md"
                                                                            _focus={{
                                                                                borderColor: "blue.500",
                                                                                boxShadow: "0 0 0 1px rgba(0, 123, 255, 0.2)",
                                                                            }}
                                                                        >
                                                                            <option value="">Select Prefix</option>
                                                                            <option value="mr">Mr.</option>
                                                                            <option value="ms">Ms.</option>
                                                                            <option value="mrs">Mrs.</option>
                                                                            <option value="dr">Dr.</option>
                                                                            <option value="prof">Prof.</option>
                                                                        </Select>
                                                                    ) : (
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
                                                                            placeholder={peoplePlaceholders[column.key] || undefined}
                                                                        />
                                                                    )}
                                                                </Td>
                                                            ))}
                                                            <Td px={3} py={2}>
                                                                <IconButton
                                                                    aria-label="Delete row"
                                                                    icon={<DeleteIcon />}
                                                                    size="sm"
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        // If row has _originalId (came from API), show confirmation
                                                                        if (row._originalId) {
                                                                            setRowToDelete(rowIndex);
                                                                            onDeleteDialogOpen();
                                                                        } else {
                                                                            // New row, delete immediately without confirmation
                                                                            setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
                                                                        }
                                                                    }}
                                                                />
                                                            </Td>
                                                        </Tr>
                                                    ))
                                                )}
                                            </Tbody>
                                        </Table>
                                    </Box>
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={handleCancelDelete}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Client Person
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            We have noticed you want to delete this client person. This change will be permanently deleted once you click on the "Update Client" button. Are you sure you want to continue?
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={handleCancelDelete}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleConfirmDelete} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}

export default CustomerRegistration;

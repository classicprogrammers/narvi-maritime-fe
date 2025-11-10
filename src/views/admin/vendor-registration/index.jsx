import React from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
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
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    Heading,
    Select,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure,
    Checkbox,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { MdPersonAdd, MdBusiness, MdPerson, MdEdit, MdAdd, MdArrowBack } from "react-icons/md";
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
import { registerVendorApi, updateVendorApi } from "api/vendor";
import SearchableSelect from "components/forms/SearchableSelect";
import { useVendor } from "redux/hooks/useVendor";

// Constants
const REQUIRED_PERSON_FIELDS = ["first_name", "last_name", "email"];
const MAX_CNEE_FIELDS = 12;

const INITIAL_FORM_DATA = {
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
    narvi_approved: false,
    remarks: "",
};

// Helper functions
const getValue = (val) => (val !== false && val !== null && val !== undefined) ? String(val) : "";

const convertApprovalValueToBoolean = (value) => {
    if (value === true || value === "true" || value === "1" || value === 1) return true;
    if (value === false || value === "false" || value === "0" || value === 0 || value === "" || value === null || value === undefined) return false;
    return false;
};

const normalizePersonFromApi = (person = {}, companyName = "") => ({
    _originalId: person.id,
    company_name: companyName,
    first_name: getValue(person.first_name),
    last_name: getValue(person.last_name),
    prefix: getValue(person.prefix),
    job_title: getValue(person.job_title),
    email: getValue(person.email),
    tel_direct: getValue(person.tel_direct || person.telDirect),
    phone: getValue(person.phone),
    tel_other: getValue(person.tel_other),
    linked_in: getValue(person.linked_in),
    remarks: getValue(person.remarks),
    id: person.id,
});

const buildChildPayload = (row, isUpdate = false, isEditMode = false) => {
    // Build name from first_name and last_name
    const firstName = (row.first_name || "").trim();
    const lastName = (row.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const payload = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        name: fullName || undefined, // Backend requires name field
        type: "contact",
        company_type: "person",
        prefix: row.prefix || undefined,
        job_title: row.job_title || undefined,
        email: row.email || undefined,
        email2: row.email2 || undefined,
        phone: row.phone || undefined,
        phone2: row.phone2 || undefined,
        tel_direct: row.tel_direct || undefined,
        tel_other: row.tel_other || undefined,
        fax: row.fax || undefined,
        linked_in: row.linked_in || undefined,
        remarks: row.remarks || undefined,
        street: row.street || undefined,
        street2: row.street2 || undefined,
        zip: row.zip || undefined,
        city: row.city || undefined,
        country_id: row.country_id || undefined,
        reg_no: row.reg_no || undefined,
        website: row.website || undefined,
    };

    // For edit mode, set operation type
    if (isEditMode) {
        if (isUpdate) {
            // Update: include id and op: "update"
            payload.id = row._originalId;
            payload.op = "update";
        } else {
            // Create: include op: "create" but no id
            payload.op = "create";
        }
    }
    // For new registration, don't add op or id (children are created with the agent)

    // Remove undefined values
    // IMPORTANT: If name is empty/undefined, the backend will reject it
    // So we should not send children without a name
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
    });

    // If name is still not set or is empty after processing, remove it
    // This will cause the payload to be rejected by hasRequiredChildFields check
    if (!payload.name || !payload.name.trim()) {
        delete payload.name;
    }

    return payload;
};

// Check if a child payload has required fields
const hasRequiredChildFields = (payload) => {
    // Backend requires name field (which comes from first_name and last_name)
    return !!(payload.name && payload.name.trim());
};

const extractErrorMessage = (error) => {
    // Prioritize backend error messages
    if (error?.response?.data) {
        const data = error.response.data;
        const result = data.result || data;

        // Check for validation errors
        if (result.errors && typeof result.errors === "object") {
            const errorMessages = [];

            // Extract error messages from errors object
            Object.entries(result.errors).forEach(([key, value]) => {
                if (value) {
                    if (typeof value === "string") {
                        errorMessages.push(value);
                    } else if (Array.isArray(value)) {
                        errorMessages.push(...value.filter(msg => typeof msg === "string"));
                    } else if (typeof value === "object") {
                        // Handle nested error objects
                        Object.values(value).forEach(nestedValue => {
                            if (typeof nestedValue === "string") {
                                errorMessages.push(nestedValue);
                            }
                        });
                    }
                }
            });

            if (errorMessages.length > 0) {
                return errorMessages.join("\n");
            }
        }

        // Fallback to main message
        return result.message || data.message || data.error || "An error occurred";
    }

    // Check if error itself has result.errors (from API response, not HTTP error)
    if (error?.result?.errors && typeof error.result.errors === "object") {
        const errorMessages = [];
        Object.entries(error.result.errors).forEach(([key, value]) => {
            if (value) {
                if (typeof value === "string") {
                    errorMessages.push(value);
                } else if (Array.isArray(value)) {
                    errorMessages.push(...value.filter(msg => typeof msg === "string"));
                }
            }
        });
        if (errorMessages.length > 0) {
            return errorMessages.join("\n");
        }
    }

    // Fallback to error message if it exists (might be from backend)
    if (error?.message) {
        return error.message;
    }

    return "An error occurred";
};

const isSuccessResponse = (response) => {
    if (!response) return false;
    if (response.result?.status === "success") return true;
    if (response.status === "success") return true;
    if (response.success === true) return true;
    return false;
};

function VendorRegistration() {
    const history = useHistory();
    const params = useParams();
    const location = useLocation();
    const { countries, isLoading: countriesLoading, getCountries } = useVendor();
    const countryList = countries?.countries;

    // Only treat as edit mode if id exists and is a valid number (not "new", "register", etc.)
    const pathId = params.id || location.pathname.split('/').pop();
    const id = pathId && !isNaN(pathId) && pathId !== "new" && pathId !== "register" ? pathId : null;
    const isEditMode = Boolean(id);
    const vendorDataFromState = location.state?.vendorData;
    const [originalVendorData, setOriginalVendorData] = React.useState(null);

    const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
    const [isFailureModalOpen, setIsFailureModalOpen] = React.useState(false);
    const [modalMessage, setModalMessage] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    const textColor = useColorModeValue("secondaryGray.900", "white");
    const textColorSecondary = useColorModeValue("gray.700", "gray.400");
    const textColorBrand = useColorModeValue("#174693", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
    const inputBg = useColorModeValue("white", "navy.900");
    const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
    const headingColor = useColorModeValue("secondaryGray.900", "white");
    const borderLight = useColorModeValue("gray.200", "whiteAlpha.200");
    const rowEvenBg = useColorModeValue("gray.50", "whiteAlpha.100");
    const gridInputWidth = { base: "60%", md: "60%" };
    const idInputBg = useColorModeValue("gray.100", "gray.700");

    const [formData, setFormData] = React.useState(INITIAL_FORM_DATA);

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
    const [originalChildren, setOriginalChildren] = React.useState([]);
    const { isOpen: isDeleteDialogOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
    const [rowToDelete, setRowToDelete] = React.useState(null);
    const cancelRef = React.useRef();
    const [visibleCneeFields, setVisibleCneeFields] = React.useState(1);

    const hasIncompletePersonRow = React.useMemo(
        () => peopleRows.some((row) => REQUIRED_PERSON_FIELDS.some((field) => !String(row[field] || "").trim())),
        [peopleRows]
    );

    const addCneeField = () => {
        if (visibleCneeFields < MAX_CNEE_FIELDS) {
            setVisibleCneeFields(prev => prev + 1);
        }
    };

    const removeCneeField = (index) => {
        if (visibleCneeFields > 1) {
            setFormData(prev => ({ ...prev, [`cnee${index}`]: "" }));
            setVisibleCneeFields(prev => prev - 1);
        }
    };

    const loadVendorData = React.useCallback(() => {
        if (!isEditMode || !id) return;

        try {
            let vendorData = vendorDataFromState;

            if (!vendorData) {
                const stored = localStorage.getItem(`vendor_${id}`);
                if (stored) {
                    try {
                        vendorData = JSON.parse(stored);
                    } catch (parseError) {
                        console.error("Error parsing stored vendor data:", parseError);
                    }
                }
            }

            if (!vendorData) {
                console.warn("No vendor data available for editing. ID:", id);
                return;
            }

            // Store original vendor data to preserve server-side fields like parent_id
            setOriginalVendorData(vendorData);

            setFormData({
                ...INITIAL_FORM_DATA,
                name: vendorData.name || "",
                agentsdb_id: vendorData.agentsdb_id || "",
                address_type: vendorData.agents_address_type || vendorData.address_type || "",
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
                pic: vendorData.agents_pic || vendorData.pic || "",
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
                narvi_approved: convertApprovalValueToBoolean(vendorData.narvi_maritime_approved_agent ?? vendorData.narvi_approved),
                remarks: vendorData.remarks || "",
            });

            const peopleFromApi = vendorData.children || vendorData.agent_people || vendorData.people || vendorData.contacts || [];

            if (Array.isArray(peopleFromApi) && peopleFromApi.length > 0) {
                // Store original children with their IDs for deletion tracking
                setOriginalChildren(peopleFromApi.filter(child => child && child.id));
                // Only include people with meaningful data in peopleRows
                const normalizedPeople = peopleFromApi
                    .filter(person => person && person.id) // Only include people with IDs
                    .map(person => normalizePersonFromApi(person, vendorData.name || ""));
                setPeopleRows(normalizedPeople);
            } else {
                setPeopleRows([]);
                setOriginalChildren([]);
            }

            let maxCneeIndex = 1;
            for (let i = 1; i <= MAX_CNEE_FIELDS; i++) {
                if (vendorData[`cnee${i}`]?.trim()) {
                    maxCneeIndex = i;
                }
            }
            setVisibleCneeFields(maxCneeIndex);
        } catch (error) {
            console.error("Error loading vendor data:", error);
        }
    }, [id, isEditMode, vendorDataFromState]);

    React.useEffect(() => {
        if (!countries || countries.length === 0) {
            getCountries();
        }
    }, [countries, getCountries]);

    React.useEffect(() => {
        if (isEditMode && id) {
            loadVendorData();
        }
    }, [isEditMode, id, loadVendorData]);

    React.useEffect(() => {
        return () => {
            if (isEditMode && id) {
                localStorage.removeItem(`vendor_${id}`);
            }
        };
    }, [isEditMode, id]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updatePeopleRow = (rowIndex, field, value) => {
        setPeopleRows(prev => {
            const updated = [...prev];
            updated[rowIndex] = { ...updated[rowIndex], [field]: value };
            return updated;
        });
    };

    const addPersonRow = () => {
        if (!hasIncompletePersonRow) {
            setPeopleRows(prev => [...prev, { ...emptyPersonRow, company_name: formData.name || "" }]);
        }
    };

    const deletePersonRow = (rowIndex, row) => {
        if (row._originalId) {
            setRowToDelete(rowIndex);
            onDeleteDialogOpen();
        } else {
            setPeopleRows(prev => prev.filter((_, idx) => idx !== rowIndex));
        }
    };

    const buildChildrenPayload = () => {
        const children = [];

        if (isEditMode) {
            // Get all current person IDs that exist in peopleRows (those that are not deleted)
            // Convert to numbers/strings for consistent comparison
            const currentIds = new Set();
            peopleRows.forEach(row => {
                const originalId = row._originalId || row.id;
                if (originalId) {
                    // Convert to string for consistent comparison
                    currentIds.add(String(originalId));
                }
            });

            // For each original child, check if it still exists in peopleRows
            // If not, mark it for deletion - send ONLY id and op
            originalChildren.forEach(child => {
                if (!child || !child.id) return; // Skip invalid children

                const childId = String(child.id);
                if (!currentIds.has(childId)) {
                    // This child was deleted - send minimal delete payload
                    children.push({
                        id: child.id, // Keep original type (number or string)
                        op: "delete"
                    });
                }
            });

            // Add all current people rows (both new and updated)
            // These are people that still exist in the UI
            peopleRows.forEach(row => {
                const originalId = row._originalId || row.id;
                const hasOriginalId = !!originalId;

                // Check if this row has required fields (first_name and last_name for name)
                const hasRequiredFields = !!(row.first_name?.trim() || row.last_name?.trim());

                // If it has an originalId but no required fields, it should be treated as deleted
                // (should have been removed from peopleRows, but handle it just in case)
                if (hasOriginalId && !hasRequiredFields) {
                    // This shouldn't happen if deletion works correctly, but handle it
                    // by marking it for deletion instead of sending empty update
                    const childId = String(originalId);
                    // Check if we already added it as a delete
                    const alreadyDeleted = children.some(child =>
                        child.op === "delete" && String(child.id) === childId
                    );
                    if (!alreadyDeleted) {
                        children.push({ id: originalId, op: "delete" });
                    }
                    return; // Don't add as update
                }

                // Skip rows without required fields
                if (!hasRequiredFields) {
                    return; // Don't add rows without first_name or last_name
                }

                const payload = buildChildPayload(row, hasOriginalId, true); // isEditMode = true

                // Validate that payload has name (required by backend)
                if (hasRequiredChildFields(payload)) {
                    children.push(payload);
                }
            });
        } else {
            // For new registration, only add rows with required fields
            peopleRows.forEach(row => {
                // Check if row has required fields (first_name or last_name for name)
                const hasRequiredFields = !!(row.first_name?.trim() || row.last_name?.trim());

                if (!hasRequiredFields) {
                    return; // Skip rows without required fields
                }

                const payload = buildChildPayload(row, false, false); // isEditMode = false (new registration)

                // Validate that payload has name (required by backend)
                if (hasRequiredChildFields(payload)) {
                    children.push(payload);
                }
            });
        }

        return children;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setIsLoading(true);

            // For updates, include server-side fields from original vendor data (like parent_id)
            const updatePayload = isEditMode && originalVendorData
                ? {
                    ...formData,
                    parent_id: originalVendorData.parent_id !== undefined
                        ? originalVendorData.parent_id
                        : (originalVendorData.parentId !== undefined
                            ? originalVendorData.parentId
                            : (originalVendorData.parent !== undefined
                                ? originalVendorData.parent
                                : false)),
                    children: buildChildrenPayload()
                }
                : { ...formData, children: buildChildrenPayload() };

            const result = isEditMode
                ? await updateVendorApi(id, updatePayload)
                : await registerVendorApi(updatePayload);

            if (isSuccessResponse(result)) {
                const action = isEditMode ? "updated" : "registered";
                setModalMessage(`Agent "${formData.name}" has been ${action} successfully!`);
                setIsSuccessModalOpen(true);

                if (!isEditMode) {
                    setFormData(INITIAL_FORM_DATA);
                    setPeopleRows([]);
                    setOriginalChildren([]);
                    setVisibleCneeFields(1);
                }
            } else {
                // Backend returned an error response
                // Extract error message with validation errors
                const errorMsg = extractErrorMessageFromResult(result) ||
                    result?.result?.message ||
                    result?.message ||
                    result?.error ||
                    `Failed to ${isEditMode ? "update" : "register"} agent`;
                setModalMessage(errorMsg);
                setIsFailureModalOpen(true);
            }
        } catch (error) {
            // Show backend error messages only
            console.error(`Agent ${isEditMode ? "update" : "registration"} error:`, error);

            // Check if error has result property (from API response)
            if (error?.result) {
                const errorMsg = extractErrorMessageFromResult(error) || extractErrorMessage(error);
                setModalMessage(errorMsg);
                setIsFailureModalOpen(true);
            } else if (error?.response) {
                // HTTP error response
                const errorMsg = extractErrorMessage(error);
                setModalMessage(errorMsg);
                setIsFailureModalOpen(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to extract error messages from API result
    const extractErrorMessageFromResult = (result) => {
        const resultData = result?.result || result;

        // Check for validation errors
        if (resultData?.errors && typeof resultData.errors === "object") {
            const errorMessages = [];

            // Extract error messages from errors object
            Object.entries(resultData.errors).forEach(([key, value]) => {
                if (value) {
                    if (typeof value === "string") {
                        errorMessages.push(value);
                    } else if (Array.isArray(value)) {
                        errorMessages.push(...value.filter(msg => typeof msg === "string"));
                    } else if (typeof value === "object") {
                        // Handle nested error objects
                        Object.values(value).forEach(nestedValue => {
                            if (typeof nestedValue === "string") {
                                errorMessages.push(nestedValue);
                            } else if (Array.isArray(nestedValue)) {
                                errorMessages.push(...nestedValue.filter(msg => typeof msg === "string"));
                            }
                        });
                    }
                }
            });

            if (errorMessages.length > 0) {
                // Combine main message with validation errors
                const mainMessage = resultData.message || "Validation failed";
                return `${mainMessage}\n\n${errorMessages.join("\n")}`;
            }
        }

        // Fallback to main message
        return resultData?.message || null;
    };

    const handleSuccessModalClose = () => {
        setIsSuccessModalOpen(false);
        history.push("/admin/contacts/agents");
    };

    const handleFailureModalClose = () => {
        setIsFailureModalOpen(false);
    };

    const handleBackToVendors = () => {
        history.push("/admin/contacts/agents");
    };

    const handleConfirmDelete = () => {
        if (rowToDelete !== null) {
            setPeopleRows((prev) => prev.filter((_, idx) => idx !== rowToDelete));
            setRowToDelete(null);
            onDeleteDialogClose();
        }
    };

    const handleCancelDelete = () => {
        setRowToDelete(null);
        onDeleteDialogClose();
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Card
                direction="column"
                w="100%"
                px="0px"
                overflowX={{ sm: "scroll", lg: "hidden" }}
            >
                <Flex px="25px" justify="space-between" mb="20px" align="center">
                    <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
                        {isEditMode ? "Edit Agent" : "Agent Registration"}
                    </Text>
                    <Button leftIcon={<Icon as={MdArrowBack} />} size="sm" onClick={handleBackToVendors}>
                        Back to Agents
                    </Button>
                </Flex>

                <Box px="25px" pb="25px">
                    <form onSubmit={handleSubmit}>
                        <VStack spacing={6} align="stretch">
                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                    {/* ID - Show on both create and update pages, placed first */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary} pt={1}>DB ID</Text>
                                        <VStack spacing={1} align="flex-start" w={gridInputWidth}>
                                            <Input
                                                name="id"
                                                value={isEditMode && id ? id : ""}
                                                placeholder={isEditMode ? "" : "Will be auto-generated"}
                                                size="sm"
                                                w="100%"
                                                isReadOnly
                                                isDisabled
                                                bg={idInputBg}
                                                cursor="not-allowed"
                                                _disabled={{
                                                    opacity: 1,
                                                    cursor: "not-allowed",
                                                }}
                                            />
                                        </VStack>
                                    </Box>
                                    {/* Company name - No right border when ID is shown (right column) */}
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
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
                                    {/* Agent Code */}
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
                                    {/* PIC */}
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>PIC</Text>
                                        <Input name="pic" value={formData.pic} onChange={(e) => handleInputChange('pic', e.target.value)} placeholder="Person in charge" size="sm" w={gridInputWidth} />
                                    </Box>
                                </Box>
                            </Box>

                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box px={4} py={3} bg={sectionHeadingBg} borderBottom="1px" borderColor={borderLight}>
                                    <HStack justify="space-between">
                                        <HStack spacing={2}>
                                            <Icon as={MdBusiness} color={textColorBrand} />
                                            <Text fontSize="sm" fontWeight="600" color={headingColor}>CNEE Information</Text>
                                        </HStack>
                                        <Button size="xs" variant="outline" leftIcon={<Icon as={MdAdd} />} onClick={addCneeField} isDisabled={visibleCneeFields >= MAX_CNEE_FIELDS}>Add More</Button>
                                    </HStack>
                                </Box>
                                <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                    {Array.from({ length: visibleCneeFields }, (_, index) => {
                                        const fieldNumber = index + 1;
                                        const fieldName = `cnee${fieldNumber}`;
                                        const isOdd = (fieldNumber % 2 === 1);
                                        const isLastField = fieldNumber === visibleCneeFields;
                                        const showRemoveButton = visibleCneeFields > 1 && isLastField;
                                        const hasRightBorder = isOdd && !isLastField;
                                        return (
                                            <Box
                                                key={fieldNumber}
                                                px={4}
                                                py={2}
                                                borderColor={borderLight}
                                                borderRight={hasRightBorder ? { base: "none", md: `1px solid ${borderLight}` } : "none"}
                                                display="flex"
                                                justifyContent="space-between"
                                                alignItems="center"
                                                gap={2}
                                            >
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>CNEE {fieldNumber}</Text>
                                                <HStack spacing={2} w={gridInputWidth} align="center">
                                                    <Input
                                                        value={formData[fieldName] || ""}
                                                        onChange={(e) => handleInputChange(fieldName, e.target.value)}
                                                        placeholder={`Enter CNEE ${fieldNumber}`}
                                                        size="sm"
                                                        flex={1}
                                                    />
                                                    {showRemoveButton && (
                                                        <IconButton
                                                            aria-label="Remove CNEE field"
                                                            icon={<Icon as={DeleteIcon} />}
                                                            size="sm"
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => removeCneeField(fieldNumber)}
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>
                                        );
                                    })}
                                    {/* CNEE Text */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>CNEE Text</Text>
                                        <Input
                                            value={formData.cnee_text || ""}
                                            onChange={(e) => handleInputChange("cnee_text", e.target.value)}
                                            placeholder="Enter additional CNEE text"
                                            size="sm"
                                            w={gridInputWidth}
                                        />
                                    </Box>
                                    {/* Warnings */}
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Warnings</Text>
                                        <Input
                                            value={formData.warnings || ""}
                                            onChange={(e) => handleInputChange("warnings", e.target.value)}
                                            placeholder="Enter any warnings or notes"
                                            size="sm"
                                            w={gridInputWidth}
                                        />
                                    </Box>
                                    {/* Narvi Maritime Approved Agent */}
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Narvi Maritime Approved Agent</Text>
                                        <Checkbox
                                            isChecked={formData.narvi_approved === true}
                                            onChange={(e) => handleInputChange("narvi_approved", e.target.checked)}
                                            size="md"
                                            colorScheme="blue"
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </VStack>
                    </form>
                </Box>
            </Card>

            <Card p="6" mt={6} borderRadius="lg" border="1px" borderColor={borderColor}>
                <VStack spacing={4} align="stretch">
                    <Flex justify="space-between" align="center">
                        <Heading
                            size="md"
                            color={headingColor}
                            display="flex"
                            alignItems="center"
                            gap={2}
                        >
                            <Icon as={MdPerson} color={textColorBrand} boxSize={6} />
                            Agent People
                        </Heading>
                        <Button
                            colorScheme="blue"
                            onClick={addPersonRow}
                            isDisabled={hasIncompletePersonRow}
                        >
                            Add Agent Person
                        </Button>
                    </Flex>

                    <Box
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="lg"
                        overflow="auto"
                        bg={inputBg}
                        boxShadow="sm"
                    >
                        <Table size="sm" sx={{ tableLayout: "auto" }}>
                            <Thead bg={sectionHeadingBg} position="sticky" top={0} zIndex={1}>
                                <Tr>
                                    {peopleTableColumns.map((column) => (
                                        <Th
                                            key={column.key}
                                            fontSize="xs"
                                            minW="170px"
                                            textTransform="uppercase"
                                            color={headingColor}
                                        >
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
                                        <Td colSpan={peopleTableColumns.length + 1} textAlign="center" py={8}>
                                            <Text color={textColorSecondary}>No agent people added yet.</Text>
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
                                                            onChange={(e) => updatePeopleRow(rowIndex, column.key, e.target.value || "")}
                                                            size="sm"
                                                            border="1px solid"
                                                            borderColor={borderLight}
                                                            borderRadius="md"
                                                            bg="#f7f7f77a"
                                                            _focus={{
                                                                borderColor: "blue.500",
                                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.3)",
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
                                                            value={row[column.key] || ""}
                                                            onChange={(e) => updatePeopleRow(rowIndex, column.key, e.target.value)}
                                                            size="sm"
                                                            isRequired={REQUIRED_PERSON_FIELDS.includes(column.key)}
                                                            isReadOnly={column.key === "company_name"}
                                                            isDisabled={column.key === "company_name"}
                                                            placeholder={peoplePlaceholders[column.key] || undefined}
                                                            border="1px solid"
                                                            borderColor={borderLight}
                                                            borderRadius="md"
                                                            bg="#f7f7f77a"
                                                            _focus={{
                                                                borderColor: "blue.500",
                                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.3)",
                                                            }}
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
                                                    onClick={() => deletePersonRow(rowIndex, row)}
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

            <HStack spacing={4} justify="center" pt={4} px="25px" pb="25px">
                <Button type="button" variant="outline" onClick={handleBackToVendors} size="lg" px={8}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    colorScheme="blue"
                    size="lg"
                    px={8}
                    isLoading={isLoading}
                    loadingText={isEditMode ? "Updating..." : "Registering..."}
                    leftIcon={<Icon as={isEditMode ? MdEdit : MdPersonAdd} />}
                    onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e);
                    }}
                >
                    {isEditMode ? "Update Agent" : "Register Agent"}
                </Button>
            </HStack>

            <SuccessModal
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessModalClose}
                title={isEditMode ? "Agent Update Successful!" : "Agent Registration Successful!"}
                message={modalMessage}
            />

            <FailureModal
                isOpen={isFailureModalOpen}
                onClose={handleFailureModalClose}
                title={isEditMode ? "Agent Update Failed" : "Agent Registration Failed"}
                message={modalMessage}
            />

            <AlertDialog
                isOpen={isDeleteDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={handleCancelDelete}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Agent Person
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            We have noticed you want to delete this agent person. This change will be permanently deleted once you click on the "Update Agent" button. Are you sure you want to continue?
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

export default VendorRegistration;

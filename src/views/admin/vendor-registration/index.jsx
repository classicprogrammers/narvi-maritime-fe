import React from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
import {
    Box,
    Button,
    Flex,
    Input,
    InputGroup,
    InputRightElement,
    Text,
    useColorModeValue,
    useToast,
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
    Textarea,
    Tooltip,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { MdPersonAdd, MdBusiness, MdPerson, MdEdit, MdAdd, MdArrowBack } from "react-icons/md";
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
import { registerVendorApi, updateVendorApi } from "api/vendor";
import SearchableSelect from "components/forms/SearchableSelect";
import { listUsersApi } from "api/users";
import { useVendor } from "redux/hooks/useVendor";

// Constants
const REQUIRED_PERSON_FIELDS = ["first_name", "email"];
const MAX_CNEE_FIELDS = 12;

const INITIAL_FORM_DATA = {
    name: "",
    agentsdb_id: "",
    address_type: "",
    street: "",
    street2: "",
    street3: "",
    street4: "",
    street5: "",
    street6: "",
    street7: "",
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
    payment_term: "",
    type_client: "",
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
    whatsapp: !!person.whatsapp,
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
        whatsapp: row.whatsapp ? true : false,
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

    const toast = useToast();
    const [formData, setFormData] = React.useState(INITIAL_FORM_DATA);

    // Users for PIC field - loaded from existing users API (no new entitySelects API)
    const [users, setUsers] = React.useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);

    React.useEffect(() => {
        let isMounted = true;

        const fetchUsersForPic = async () => {
            setIsLoadingUsers(true);
            try {
                const data = await listUsersApi();
                // Normalize possible response shapes similar to users admin page / stock page
                const list =
                    Array.isArray(data) ? data :
                        Array.isArray(data?.users) ? data.users :
                            Array.isArray(data?.result) ? data.result :
                                Array.isArray(data?.data) ? data.data :
                                    [];

                const normalizedUsers = list
                    .map((u, idx) => ({
                        id: u.id ?? u.user_id ?? idx + 1,
                        name: u.name ?? u.full_name ?? "",
                        email: u.email ?? u.login ?? "",
                        active: typeof u.active === "boolean"
                            ? u.active
                            : (u.status ? String(u.status).toLowerCase() === "active" : true),
                        ...u,
                    }))
                    .filter((u) => u.active);

                if (isMounted) {
                    setUsers(normalizedUsers);
                }
            } catch (error) {
                // Error is already surfaced via global API modal; just log here
                console.error("Failed to fetch users for PIC field:", error);
                if (isMounted) {
                    setUsers([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingUsers(false);
                }
            }
        };

        fetchUsersForPic();

        return () => {
            isMounted = false;
        };
    }, []);

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
        // Replace LinkedIn with WhatsApp checkbox
        { key: "whatsapp", label: "WhatsApp" },
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
        whatsapp: "",
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
        whatsapp: false,
        remarks: "",
    };

    const [peopleRows, setPeopleRows] = React.useState([]);
    const [originalChildren, setOriginalChildren] = React.useState([]);
    const { isOpen: isDeleteDialogOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
    const [rowToDelete, setRowToDelete] = React.useState(null);
    const cancelRef = React.useRef();
    // New CNEE rows structure (replaces flat cnee1–cnee12 UI)
    const emptyCneeRow = React.useMemo(
        () => ({
            cnee: "air", // "air" | "cargo" | "ocean_freight"
            cnee_text: "",
            warnings: "",
            narvi_approved: false,
        }),
        []
    );
    const [cneeRows, setCneeRows] = React.useState([
        {
            cnee: "air",
            cnee_text: "",
            warnings: "",
            narvi_approved: false,
        },
    ]);
    // Keep original CNEE rows (with IDs) for delete tracking in edit mode
    const [originalCneeRows, setOriginalCneeRows] = React.useState([]);
    // Address fields visibility state (default: 2, max: 4)
    const [visibleAddressFields, setVisibleAddressFields] = React.useState(2);

    const hasIncompletePersonRow = React.useMemo(
        () => peopleRows.some((row) => REQUIRED_PERSON_FIELDS.some((field) => !String(row[field] || "").trim())),
        [peopleRows]
    );

    const addMoreAddress = () => {
        if (visibleAddressFields < 7) {
            setVisibleAddressFields(prev => prev + 1);
        }
    };

    const removeAddressField = (level) => {
        if (level === 7 && visibleAddressFields >= 7) {
            setFormData((prev) => ({ ...prev, street7: "" }));
            setVisibleAddressFields(6);
        } else if (level === 6 && visibleAddressFields >= 6) {
            setFormData((prev) => ({ ...prev, street6: "", street7: "" }));
            setVisibleAddressFields(5);
        } else if (level === 5 && visibleAddressFields >= 5) {
            setFormData((prev) => ({ ...prev, street5: "", street6: "", street7: "" }));
            setVisibleAddressFields(4);
        } else if (level === 4 && visibleAddressFields >= 4) {
            setFormData((prev) => ({ ...prev, street4: "", street5: "", street6: "", street7: "" }));
            setVisibleAddressFields(3);
        } else if (level === 3 && visibleAddressFields >= 3) {
            setFormData((prev) => ({ ...prev, street3: "", street4: "", street5: "", street6: "", street7: "" }));
            setVisibleAddressFields(2);
        }
    };

    const addCneeRow = () => {
        if (cneeRows.length < MAX_CNEE_FIELDS) {
            setCneeRows(prev => [...prev, { ...emptyCneeRow }]);
        }
    };

    const updateCneeRow = (rowIndex, field, value) => {
        setCneeRows(prev => {
            const updated = [...prev];
            updated[rowIndex] = { ...updated[rowIndex], [field]: value };
            return updated;
        });
    };

    const removeCneeRow = (rowIndex) => {
        if (cneeRows.length <= 1) return;
        setCneeRows(prev => prev.filter((_, idx) => idx !== rowIndex));
    };

    const handleCopyCneeData = () => {
        if (!cneeRows || cneeRows.length === 0) {
            toast({
                title: "No CNEE information",
                description: "There is no CNEE data to copy.",
                status: "info",
                duration: 2000,
                isClosable: true,
            });
            return;
        }

        const lines = [];

        cneeRows.forEach((row, index) => {
            const typeLabel = (() => {
                if (row.cnee === "air") return "Air freight";
                if (row.cnee === "cargo") return "Cargo freight";
                if (row.cnee === "ocean_freight") return "Ocean freight";
                return String(row.cnee || "-");
            })();

            lines.push(`CNEE ${index + 1}: ${typeLabel}`);
            lines.push(`NARVI MARITIME APPROVED: ${row.narvi_approved ? "Yes" : "No"}`);

            if (row.cnee_text && String(row.cnee_text).trim() !== "") {
                lines.push(`CNEE TEXT: ${String(row.cnee_text).trim()}`);
            }

            if (row.warnings && String(row.warnings).trim() !== "") {
                lines.push(`WARNINGS: ${String(row.warnings).trim()}`);
            }

            lines.push("");
        });

        const textToCopy = lines.join("\n").trim();
        if (!textToCopy) {
            toast({
                title: "Nothing to copy",
                description: "CNEE fields are empty.",
                status: "info",
                duration: 2000,
                isClosable: true,
            });
            return;
        }

        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                toast({
                    title: "CNEE information copied",
                    description: "You can now paste it into another CNEE field.",
                    status: "success",
                    duration: 2000,
                    isClosable: true,
                });
            })
            .catch(() => {
                toast({
                    title: "Copy failed",
                    description: "Unable to copy CNEE information. Please try again.",
                    status: "error",
                    duration: 2000,
                    isClosable: true,
                });
            });
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
                street3: vendorData.street3 || "",
                street4: vendorData.street4 || "",
                street5: vendorData.street5 || "",
                street6: vendorData.street6 || "",
                street7: vendorData.street7 || "",
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
                warnings: vendorData.warnings || "",
                narvi_approved: convertApprovalValueToBoolean(vendorData.narvi_maritime_approved_agent ?? vendorData.narvi_approved),
                remarks: vendorData.remarks || "",
                payment_term: vendorData.payment_term || "",
                type_client: vendorData.type_client || "",
            });

            // Determine how many address fields to show based on existing data
            let maxAddressIndex = 2;
            if (vendorData.street3) maxAddressIndex = 3;
            if (vendorData.street4) maxAddressIndex = 4;
            if (vendorData.street5) maxAddressIndex = 5;
            if (vendorData.street6) maxAddressIndex = 6;
            if (vendorData.street7) maxAddressIndex = 7;
            setVisibleAddressFields(maxAddressIndex);

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

            // Initialize CNEE rows from new agent_cnee_ids if available, otherwise from legacy fields
            let initialCneeRows = [];

            if (Array.isArray(vendorData.agent_cnee_ids) && vendorData.agent_cnee_ids.length > 0) {
                // Preserve original rows with IDs for delete tracking
                setOriginalCneeRows(
                    vendorData.agent_cnee_ids.filter((item) => item && item.id)
                );

                initialCneeRows = vendorData.agent_cnee_ids.map((item) => ({
                    _originalId: item.id,
                    cnee: item.cnee || "air",
                    cnee_text: getValue(item.cnee_text),
                    warnings: getValue(item.warnings),
                    narvi_approved: convertApprovalValueToBoolean(
                        item.narvi_maritime_approved_agent ?? item.narvi_approved
                    ),
                }));
            } else {
                setOriginalCneeRows([]);

                const cneeTexts = [];
                for (let i = 1; i <= MAX_CNEE_FIELDS; i++) {
                    const raw = vendorData[`cnee${i}`];
                    if (raw && String(raw).trim() !== "") {
                        cneeTexts.push(String(raw).trim());
                    }
                }
                if (vendorData.cnee_text && String(vendorData.cnee_text).trim() !== "") {
                    cneeTexts.push(String(vendorData.cnee_text).trim());
                }

                if (cneeTexts.length > 0) {
                    const warnings = getValue(vendorData.warnings);
                    const narviApproved = convertApprovalValueToBoolean(
                        vendorData.narvi_maritime_approved_agent ?? vendorData.narvi_approved
                    );
                    initialCneeRows = cneeTexts.map((text) => ({
                        cnee: "air",
                        cnee_text: text,
                        warnings,
                        narvi_approved: narviApproved,
                    }));
                }
            }

            if (!initialCneeRows.length) {
                initialCneeRows = [{ ...emptyCneeRow }];
            }
            setCneeRows(initialCneeRows);
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

    // Build agent_cnee_ids payload with create/update/delete semantics
    const buildCneePayload = () => {
        const items = [];

        if (isEditMode) {
            // Current IDs in UI (existing rows only)
            const currentIds = new Set();
            cneeRows.forEach((row) => {
                const originalId = row._originalId || row.id;
                if (originalId) {
                    currentIds.add(String(originalId));
                }
            });

            // Any original CNEE not present in currentIds should be deleted
            originalCneeRows.forEach((item) => {
                if (!item || !item.id) return;
                const idStr = String(item.id);
                if (!currentIds.has(idStr)) {
                    items.push({
                        id: item.id,
                        op: "delete",
                    });
                }
            });

            // Add current CNEE rows as create/update
            cneeRows.forEach((row) => {
                const originalId = row._originalId || row.id;
                const hasOriginalId = !!originalId;

                const base = {
                    cnee: row.cnee,
                    cnee_text: row.cnee_text || "",
                    warnings: row.warnings || "",
                    narvi_maritime_approved_agent: !!row.narvi_approved,
                };

                if (hasOriginalId) {
                    items.push({
                        ...base,
                        id: originalId,
                        op: "update",
                    });
                } else {
                    items.push({
                        ...base,
                        op: "create",
                    });
                }
            });
        } else {
            // For new registration, just send plain items without id/op
            cneeRows.forEach((row) => {
                items.push({
                    cnee: row.cnee,
                    cnee_text: row.cnee_text || "",
                    warnings: row.warnings || "",
                    narvi_maritime_approved_agent: !!row.narvi_approved,
                });
            });
        }

        return items;
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
                    children: buildChildrenPayload(),
                    agent_cnee_ids: buildCneePayload(),
                }
                : {
                    ...formData,
                    children: buildChildrenPayload(),
                    agent_cnee_ids: buildCneePayload(),
                };

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
                    setCneeRows([{ ...emptyCneeRow }]);
                    setOriginalCneeRows([]);
                    setVisibleAddressFields(2);
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
                            {/* Company / Agent information - unified two-column layout */}
                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                    {/* LEFT 1: Company name / RIGHT 1: Address Type */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company name</Text>
                                        <Input name="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., ACME Shipping" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address Type</Text>
                                        <Input name="address_type" value={formData.address_type} onChange={(e) => handleInputChange('address_type', e.target.value)} placeholder="e.g., Warehouse, Office, Main" size="sm" w={gridInputWidth} />
                                    </Box>

                                    {/* LEFT 2: Address1 / RIGHT 2: Agent Code */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address1</Text>
                                        <Input name="street" value={formData.street} onChange={(e) => handleInputChange('street', e.target.value)} placeholder="Street address" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Agent Code</Text>
                                        <Input name="agentsdb_id" value={formData.agentsdb_id} onChange={(e) => handleInputChange('agentsdb_id', e.target.value)} placeholder="AG-001" size="sm" w={gridInputWidth} />
                                    </Box>

                                    {/* LEFT 3: Address2(+) / RIGHT 3: Agent Type */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address2</Text>
                                        <InputGroup w={gridInputWidth}>
                                            <Input
                                                name="street2"
                                                value={formData.street2}
                                                onChange={(e) => handleInputChange('street2', e.target.value)}
                                                placeholder="Suite / Unit"
                                                size="sm"
                                                pr={visibleAddressFields < 3 ? "32px" : "0"}
                                            />
                                            {visibleAddressFields < 3 && (
                                                <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                    <IconButton
                                                        aria-label="Add Address3"
                                                        icon={<Icon as={MdAdd} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        colorScheme="blue"
                                                        onClick={addMoreAddress}
                                                        h="24px"
                                                        w="24px"
                                                        minW="24px"
                                                    />
                                                </InputRightElement>
                                            )}
                                        </InputGroup>
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Agent Type</Text>
                                        <Input name="type_client" value={formData.type_client} onChange={(e) => handleInputChange('type_client', e.target.value)} placeholder="e.g. Key / Regular / Prospect" size="sm" w={gridInputWidth} />
                                    </Box>

                                    {/* LEFT: Address3–7 with empty right cells for alignment */}
                                    {visibleAddressFields >= 3 && (
                                        <>
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address3</Text>
                                                <InputGroup w={gridInputWidth}>
                                                    <Input
                                                        name="street3"
                                                        value={formData.street3}
                                                        onChange={(e) => handleInputChange('street3', e.target.value)}
                                                        placeholder="Additional address line"
                                                        size="sm"
                                                        pr="64px"
                                                    />
                                                    <InputRightElement width="64px" height="100%" display="flex" alignItems="center" justifyContent="flex-end" pr={1}>
                                                        {visibleAddressFields < 4 && (
                                                            <IconButton
                                                                aria-label="Add Address4"
                                                                icon={<Icon as={MdAdd} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="blue"
                                                                onClick={addMoreAddress}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                                mr={1}
                                                            />
                                                        )}
                                                        <IconButton
                                                            aria-label="Remove Address3"
                                                            icon={<Icon as={DeleteIcon} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => removeAddressField(3)}
                                                            h="24px"
                                                            w="24px"
                                                            minW="24px"
                                                        />
                                                    </InputRightElement>
                                                </InputGroup>
                                            </Box>
                                            <Box px={4} py={2} borderColor={borderLight}></Box>
                                        </>
                                    )}

                                    {visibleAddressFields >= 4 && (
                                        <>
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address4</Text>
                                                <InputGroup w={gridInputWidth}>
                                                    <Input
                                                        name="street4"
                                                        value={formData.street4}
                                                        onChange={(e) => handleInputChange('street4', e.target.value)}
                                                        placeholder="Additional address line"
                                                        size="sm"
                                                        pr={visibleAddressFields < 5 ? "32px" : "0"}
                                                    />
                                                    {visibleAddressFields < 5 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Add Address5"
                                                                icon={<Icon as={MdAdd} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="blue"
                                                                onClick={addMoreAddress}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                    {visibleAddressFields >= 5 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Remove Address4"
                                                                icon={<Icon as={DeleteIcon} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="red"
                                                                onClick={() => removeAddressField(4)}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                </InputGroup>
                                            </Box>
                                            <Box px={4} py={2} borderColor={borderLight}></Box>
                                        </>
                                    )}

                                    {visibleAddressFields >= 5 && (
                                        <>
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address5</Text>
                                                <InputGroup w={gridInputWidth}>
                                                    <Input
                                                        name="street5"
                                                        value={formData.street5}
                                                        onChange={(e) => handleInputChange('street5', e.target.value)}
                                                        placeholder="Additional address line"
                                                        size="sm"
                                                        pr={visibleAddressFields < 6 ? "32px" : "0"}
                                                    />
                                                    {visibleAddressFields < 6 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Add Address6"
                                                                icon={<Icon as={MdAdd} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="blue"
                                                                onClick={addMoreAddress}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                    {visibleAddressFields >= 6 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Remove Address5"
                                                                icon={<Icon as={DeleteIcon} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="red"
                                                                onClick={() => removeAddressField(5)}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                </InputGroup>
                                            </Box>
                                            <Box px={4} py={2} borderColor={borderLight}></Box>
                                        </>
                                    )}

                                    {visibleAddressFields >= 6 && (
                                        <>
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address6</Text>
                                                <InputGroup w={gridInputWidth}>
                                                    <Input
                                                        name="street6"
                                                        value={formData.street6}
                                                        onChange={(e) => handleInputChange('street6', e.target.value)}
                                                        placeholder="Additional address line"
                                                        size="sm"
                                                        pr={visibleAddressFields < 7 ? "32px" : "0"}
                                                    />
                                                    {visibleAddressFields < 7 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Add Address7"
                                                                icon={<Icon as={MdAdd} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="blue"
                                                                onClick={addMoreAddress}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                    {visibleAddressFields >= 7 && (
                                                        <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                            <IconButton
                                                                aria-label="Remove Address6"
                                                                icon={<Icon as={DeleteIcon} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                colorScheme="red"
                                                                onClick={() => removeAddressField(6)}
                                                                h="24px"
                                                                w="24px"
                                                                minW="24px"
                                                            />
                                                        </InputRightElement>
                                                    )}
                                                </InputGroup>
                                            </Box>
                                            <Box px={4} py={2} borderColor={borderLight}></Box>
                                        </>
                                    )}

                                    {visibleAddressFields >= 7 && (
                                        <>
                                            <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address7</Text>
                                                <InputGroup w={gridInputWidth}>
                                                    <Input
                                                        name="street7"
                                                        value={formData.street7}
                                                        onChange={(e) => handleInputChange('street7', e.target.value)}
                                                        placeholder="Additional address line"
                                                        size="sm"
                                                        pr="32px"
                                                    />
                                                    <InputRightElement width="32px" height="100%" display="flex" alignItems="center" justifyContent="center">
                                                        <IconButton
                                                            aria-label="Remove Address7"
                                                            icon={<Icon as={DeleteIcon} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => removeAddressField(7)}
                                                            h="24px"
                                                            w="24px"
                                                            minW="24px"
                                                        />
                                                    </InputRightElement>
                                                </InputGroup>
                                            </Box>
                                            <Box px={4} py={2} borderColor={borderLight}></Box>
                                        </>
                                    )}

                                    {/* LEFT: Postcode / RIGHT: Payment Terms */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Postcode</Text>
                                        <Input name="zip" value={formData.zip} onChange={(e) => handleInputChange('zip', e.target.value)} placeholder="Zip" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Payment Terms</Text>
                                        <Input name="payment_term" value={formData.payment_term} onChange={(e) => handleInputChange('payment_term', e.target.value)} placeholder="e.g. 30 days" size="sm" w={gridInputWidth} />
                                    </Box>

                                    {/* LEFT: City / RIGHT: Remarks */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>City</Text>
                                        <Input name="city" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="City" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary} mt={1}>Remarks</Text>
                                        <Textarea
                                            name="remarks"
                                            value={formData.remarks}
                                            onChange={(e) => handleInputChange('remarks', e.target.value)}
                                            placeholder="Notes..."
                                            size="sm"
                                            w={gridInputWidth}
                                            rows={3}
                                        />
                                    </Box>

                                    {/* LEFT: Country / RIGHT: Website */}
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
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Website</Text>
                                        <Input name="website" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} placeholder="https://..." size="sm" w={gridInputWidth} />
                                    </Box>

                                    {/* LEFT: RegNo / RIGHT: Warnings */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Reg No</Text>
                                        <Input name="reg_no" value={formData.reg_no} onChange={(e) => handleInputChange('reg_no', e.target.value)} placeholder="Registration" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary} mt={1}>Warnings</Text>
                                        <Textarea
                                            value={formData.warnings || ""}
                                            onChange={(e) => handleInputChange("warnings", e.target.value)}
                                            placeholder="Enter any warnings or notes"
                                            size="sm"
                                            w={gridInputWidth}
                                            rows={3}
                                            resize="vertical"
                                        />
                                    </Box>

                                    {/* LEFT: Phone1 / RIGHT: DB ID */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone1</Text>
                                        <Input name="phone" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="+65..." size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
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

                                    {/* LEFT: Phone2 / RIGHT empty */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone2</Text>
                                        <Input name="phone2" value={formData.phone2} onChange={(e) => handleInputChange('phone2', e.target.value)} placeholder="optional" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight}></Box>

                                    {/* LEFT: Email1 / RIGHT empty */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email1</Text>
                                        <Input type="email" name="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="name@company.com" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight}></Box>

                                    {/* LEFT: Email2 / RIGHT empty */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email2</Text>
                                        <Input type="email" name="email2" value={formData.email2} onChange={(e) => handleInputChange('email2', e.target.value)} placeholder="optional" size="sm" w={gridInputWidth} />
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight}></Box>

                                    {/* LEFT: PIC / RIGHT empty */}
                                    <Box px={4} py={2} borderColor={borderLight} borderRight={{ base: "none", md: `1px solid ${borderLight}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>PIC</Text>
                                        <Box w={gridInputWidth}>
                                            <SearchableSelect
                                                value={formData.pic}
                                                onChange={(val) => handleInputChange("pic", val)}
                                                options={users || []}
                                                placeholder={isLoadingUsers ? "Loading users..." : "Select PIC user"}
                                                displayKey="name"
                                                valueKey="name"
                                                isLoading={isLoadingUsers}
                                            />
                                        </Box>
                                    </Box>
                                    <Box px={4} py={2} borderColor={borderLight}></Box>
                                </Box>
                            </Box>

                            <Box border="1px solid" borderColor={borderLight} borderRadius="md" overflow="hidden">
                                <Box px={4} py={3} bg={sectionHeadingBg} borderBottom="1px" borderColor={borderLight}>
                                    <HStack justify="space-between">
                                        <HStack spacing={2}>
                                            <Icon as={MdBusiness} color={textColorBrand} />
                                            <Text fontSize="sm" fontWeight="600" color={headingColor}>CNEE Information</Text>
                                        </HStack>
                                        <HStack spacing={2}>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={handleCopyCneeData}
                                            >
                                                Copy CNEE
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                leftIcon={<Icon as={MdAdd} />}
                                                onClick={addCneeRow}
                                                isDisabled={cneeRows.length >= MAX_CNEE_FIELDS}
                                            >
                                                Add CNEE
                                            </Button>
                                        </HStack>
                                    </HStack>
                                </Box>
                                <Box>
                                    {cneeRows.map((row, rowIndex) => (
                                        <Box
                                            key={rowIndex}
                                            borderTop="1px solid"
                                            borderColor={borderLight}
                                            px={4}
                                            py={3}
                                        >
                                            {cneeRows.length > 1 && (
                                                <Flex justify="flex-end" mb={2}>
                                                    <IconButton
                                                        aria-label="Remove CNEE"
                                                        icon={<DeleteIcon />}
                                                        size="xs"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => removeCneeRow(rowIndex)}
                                                    />
                                                </Flex>
                                            )}

                                            <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }} columnGap={4} rowGap={3}>
                                                {/* CNEE Type */}
                                                <Box
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                    gap={2}
                                                    mb={{ base: 3, md: 0 }}
                                                >
                                                    <Text
                                                        fontSize="xs"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        color={textColorSecondary}
                                                    >
                                                        {`CNEE ${rowIndex + 1}`}
                                                    </Text>
                                                    <Select
                                                        value={row.cnee}
                                                        onChange={(e) => updateCneeRow(rowIndex, "cnee", e.target.value)}
                                                        size="sm"
                                                        w={gridInputWidth}
                                                    >
                                                        <option value="air">Air freight</option>
                                                        <option value="cargo">Cargo freight</option>
                                                        <option value="ocean_freight">Ocean freight</option>
                                                    </Select>
                                                </Box>

                                                {/* Approved checkbox */}
                                                <Box
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                    gap={2}
                                                >
                                                    <Text
                                                        fontSize="xs"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        color={textColorSecondary}
                                                    >
                                                        Narvi Maritime Approved
                                                    </Text>
                                                    <Checkbox
                                                        isChecked={!!row.narvi_approved}
                                                        onChange={(e) => updateCneeRow(rowIndex, "narvi_approved", e.target.checked)}
                                                        size="md"
                                                        colorScheme="blue"
                                                    />
                                                </Box>

                                                {/* CNEE Text */}
                                                <Box
                                                    mt={3}
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="flex-start"
                                                    gap={2}
                                                >
                                                    <Text
                                                        fontSize="xs"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        color={textColorSecondary}
                                                        mt={1}
                                                    >
                                                        CNEE Text
                                                    </Text>
                                                    <Textarea
                                                        value={row.cnee_text || ""}
                                                        onChange={(e) => updateCneeRow(rowIndex, "cnee_text", e.target.value)}
                                                        placeholder="Enter CNEE notes / free text"
                                                        size="sm"
                                                        w={gridInputWidth}
                                                        rows={2}
                                                        resize="vertical"
                                                    />
                                                </Box>

                                                {/* Warnings */}
                                                <Box
                                                    mt={3}
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="flex-start"
                                                    gap={2}
                                                >
                                                    <Text
                                                        fontSize="xs"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        color={textColorSecondary}
                                                        mt={1}
                                                    >
                                                        Warnings
                                                    </Text>
                                                    <Textarea
                                                        value={row.warnings || ""}
                                                        onChange={(e) => updateCneeRow(rowIndex, "warnings", e.target.value)}
                                                        placeholder="Enter warnings for this CNEE type"
                                                        size="sm"
                                                        w={gridInputWidth}
                                                        rows={2}
                                                        resize="vertical"
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
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
                                                    ) : column.key === "whatsapp" ? (
                                                        <Checkbox
                                                            isChecked={!!row.whatsapp}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                updatePeopleRow(rowIndex, "whatsapp", checked);
                                                            }}
                                                        >
                                                            Works via WhatsApp
                                                        </Checkbox>
                                                    ) : column.key === "remarks" ? (
                                                        <Textarea
                                                            value={row[column.key] || ""}
                                                            onChange={(e) => updatePeopleRow(rowIndex, column.key, e.target.value)}
                                                            size="sm"
                                                            border="1px solid"
                                                            borderColor={borderLight}
                                                            borderRadius="md"
                                                            bg="#f7f7f77a"
                                                            _focus={{
                                                                borderColor: "blue.500",
                                                                boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.3)",
                                                            }}
                                                            placeholder={peoplePlaceholders[column.key] || undefined}
                                                            rows={3}
                                                            resize="vertical"
                                                        />
                                                    ) : (
                                                        <Tooltip
                                                            label={row[column.key] || ""}
                                                            isDisabled={!row[column.key]}
                                                            hasArrow
                                                            placement="top"
                                                            openDelay={200}
                                                        >
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
                                                        </Tooltip>
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

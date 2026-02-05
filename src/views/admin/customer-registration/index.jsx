import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useToast } from "@chakra-ui/react";
import {
    Box,
    Button,
    Flex,
    Input,
    InputGroup,
    InputRightElement,
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
    Select,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure,
    Textarea,
    Tooltip,
    Checkbox,
    Alert,
    AlertIcon,
    Badge,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import Card from "components/card/Card";
import { SuccessModal, FailureModal } from "components/modals";
import { MdPersonAdd, MdPerson, MdArrowBack, MdAdd, MdOpenInNew, MdAttachFile, MdDownload, MdVisibility, MdClose as MdRemove } from "react-icons/md";
import { registerCustomerApi, updateCustomerApi, getCustomerAttachmentApi } from "api/customer";
import { refreshMasterData, MASTER_KEYS } from "utils/masterDataCache";
import { getVesselTypes } from "api/vessels";
import SearchableSelect from "components/forms/SearchableSelect";
import { useCustomer } from "redux/hooks/useCustomer";


const isValidUrl = (string) => {
    if (!string || typeof string !== "string") return false;
    const trimmed = string.trim();
    if (trimmed === "") return false;

    try {
        let urlString = trimmed;
        if (!/^https?:\/\//i.test(urlString)) {
            urlString = `https://${urlString}`;
        }
        new URL(urlString);
        return true;
    } catch (_) {
        return false;
    }
};

const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return trimmed;
};

function CustomerRegistration() {
    const history = useHistory();
    const location = useLocation();
    const toast = useToast();

    const { countries, customers, isLoading: countriesLoading, getCountries, addCustomerToRedux } = useCustomer();
    const countryList = countries?.countries;

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
        { key: "whatsapp", label: "WhatsApp" },
        { key: "remarks", label: "Remark" },
        { key: "attachments", label: "Attachments" },
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
        attachments: [],
        attachment_to_delete: [],
        existingAttachments: [],
    };

    const [peopleRows, setPeopleRows] = React.useState([]);
    const [originalChildren, setOriginalChildren] = React.useState([]);

    const { isOpen: isDeleteDialogOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
    const [rowToDelete, setRowToDelete] = React.useState(null);
    const cancelRef = React.useRef();
    const submittedSuccessfully = React.useRef(false);

    const textColor = useColorModeValue("secondaryGray.900", "white");
    const textColorSecondary = useColorModeValue("gray.700", "gray.400");
    const textColorBrand = useColorModeValue("#174693", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
    const inputBg = useColorModeValue("white", "navy.900");
    const cardBg = useColorModeValue("white", "navy.800");
    const sectionHeadingBg = useColorModeValue("orange.50", "orange.700");
    const rowEvenBg = useColorModeValue("gray.50", "gray.700");
    const headingColor = useColorModeValue("secondaryGray.900", "white");
    const gridInputWidth = { base: "60%", md: "60%" };
    const editModeBg = useColorModeValue("blue.50", "blue.900");
    const editModeBorderColor = useColorModeValue("blue.300", "blue.500");
    const editModeAlertBg = useColorModeValue("blue.100", "blue.800");

    const getAutoHtmlSize = (value, placeholder = "", opts = {}) => {
        const { min = 12, max = 60, padding = 2 } = opts || {};
        const valueLen = String(value ?? "").length;
        const placeholderLen = String(placeholder ?? "").length;
        const desired = Math.max(valueLen, placeholderLen) + padding;
        return Math.min(max, Math.max(min, desired));
    };

    const getAutoCols = (value, placeholder = "", opts = {}) => {
        const { min = 24, max = 90, padding = 2 } = opts || {};
        const text = String(value ?? "");
        const maxLineLen = text.split(/\r?\n/).reduce((acc, line) => Math.max(acc, line.length), 0);
        const placeholderLen = String(placeholder ?? "").length;
        const desired = Math.max(maxLineLen, placeholderLen) + padding;
        return Math.min(max, Math.max(min, desired));
    };

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
        street3: "",
        street4: "",
        street5: "",
        street6: "",
        street7: "",
        city: "",
        zip: "",
        country_id: "",
        reg_no: "",
        website: "",
        payment_term: "",
        type_client: "",
        company_type_text: "",
        vessel_type: "",
        vessel_type1: "",
        vessel_type2: "",
        vessel_type3: "",
        remarks: "",
        tariffs: "",
        client_invoicing: "",
        prefix: "",
        job_title: "",
        attachments: [],
        attachment_to_delete: [],
        existingAttachments: [],
    });

    const [vesselTypes, setVesselTypes] = React.useState([]);
    const [isLoadingVesselTypes, setIsLoadingVesselTypes] = React.useState(false);
    const [isLoadingAttachment, setIsLoadingAttachment] = React.useState(false);

    const [visibleAddressFields, setVisibleAddressFields] = React.useState(2);

    const [visibleVesselTypeFields, setVisibleVesselTypeFields] = React.useState(1);

    const addMoreVesselType = () => {
        if (visibleVesselTypeFields < 3) {
            setVisibleVesselTypeFields(prev => prev + 1);
        }
    };

    const removeVesselTypeField = (level) => {
        if (level === 3 && visibleVesselTypeFields >= 3) {
            setFormData((prev) => ({ ...prev, vessel_type3: "" }));
            setVisibleVesselTypeFields(2);
        } else if (level === 2 && visibleVesselTypeFields >= 2) {
            setFormData((prev) => ({ ...prev, vessel_type2: "", vessel_type3: "" }));
            setVisibleVesselTypeFields(1);
        } else if (level === 1 && visibleVesselTypeFields >= 1) {
            setFormData((prev) => ({ ...prev, vessel_type1: "", vessel_type2: "", vessel_type3: "" }));
            setVisibleVesselTypeFields(0);
        }
    };

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
                street3: editingClient.street3 || "",
                street4: editingClient.street4 || "",
                street5: editingClient.street5 || "",
                street6: editingClient.street6 || "",
                street7: editingClient.street7 || "",
                city: editingClient.city || "",
                zip: editingClient.zip || "",
                country_id: editingClient.country_id || "",
                reg_no: editingClient.reg_no || "",
                website: editingClient.website || "",
                payment_term: editingClient.payment_term || "",
                type_client: editingClient.type_client || "",
                company_type_text: editingClient.company_type_text || "",
                vessel_type: editingClient.vessel_type || editingClient.vessel_types || "",
                vessel_type1: editingClient.vessel_type1 || editingClient.vessel_type || "",
                vessel_type2: editingClient.vessel_type2 || "",
                vessel_type3: editingClient.vessel_type3 || "",
                remarks: editingClient.remarks || "",
                tariffs: editingClient.tariffs || "",
                client_invoicing: editingClient.client_invoicing || "",
                prefix: editingClient.prefix || "",
                job_title: editingClient.job_title || "",
                attachments: [], // New uploads
                attachment_to_delete: [], // IDs to delete
                existingAttachments: Array.isArray(editingClient.attachments) ? editingClient.attachments.map(att => ({
                    id: att.id,
                    filename: att.filename || att.name,
                    mimetype: att.mimetype || att.type
                })) : [], // Existing attachments from API
            });

            // Determine how many address fields to show based on existing data
            let maxAddressIndex = 2;
            if (editingClient.street3) maxAddressIndex = 3;
            if (editingClient.street4) maxAddressIndex = 4;
            if (editingClient.street5) maxAddressIndex = 5;
            if (editingClient.street6) maxAddressIndex = 6;
            if (editingClient.street7) maxAddressIndex = 7;
            setVisibleAddressFields(maxAddressIndex);

            // Determine how many vessel type fields to show based on existing data
            let maxVesselTypeIndex = 1;
            if (editingClient.vessel_type2) maxVesselTypeIndex = 2;
            if (editingClient.vessel_type3) maxVesselTypeIndex = 3;
            setVisibleVesselTypeFields(maxVesselTypeIndex);

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
                        whatsapp: !!child.whatsapp,
                        remarks: getValue(child.remarks),
                        attachments: [], // Array of { filename, mimetype, datas } for new uploads
                        attachment_to_delete: [], // Array of attachment IDs to delete (for updates)
                        existingAttachments: Array.isArray(child.attachments) ? child.attachments.map(att => ({
                            id: att.id,
                            filename: att.filename || att.name,
                            mimetype: att.mimetype || att.type
                        })) : [], // Array of existing attachments from API
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

    // Load vessel types on mount
    React.useEffect(() => {
        let isMounted = true;

        const loadVesselTypes = async () => {
            try {
                setIsLoadingVesselTypes(true);
                const types = await getVesselTypes();
                if (!isMounted) return;
                setVesselTypes(types);
            } catch (error) {
                console.error("Failed to load vessel types:", error);
            } finally {
                if (isMounted) setIsLoadingVesselTypes(false);
            }
        };

        loadVesselTypes();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Helper function to handle numbered list on Enter (reusable for both main remarks and people remarks)
    const createNumberedListHandler = (updateFunction) => {
        return (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const currentText = e.target.value;
                const cursorPosition = e.target.selectionStart;

                // Get the text before and after cursor
                const textBeforeCursor = currentText.substring(0, cursorPosition);
                const textAfterCursor = currentText.substring(cursorPosition);

                // Find the current line (text from last newline to cursor)
                const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");
                const currentLine = textBeforeCursor.substring(lastNewlineIndex + 1);

                // If current line is empty, just add a newline
                if (!currentLine.trim()) {
                    const newValue = textBeforeCursor + "\n" + textAfterCursor;
                    updateFunction(newValue);
                    // Set cursor position after the newline
                    setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                    }, 0);
                    return;
                }

                // Parse existing numbered items to get the next number
                const allLines = currentText.split("\n");
                let maxNumber = 0;

                // Find the highest number in existing numbered items
                allLines.forEach(line => {
                    const match = line.trim().match(/^(\d+)\.\s/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNumber) {
                            maxNumber = num;
                        }
                    }
                });

                // Check if current line already has a number prefix
                const trimmedCurrentLine = currentLine.trim();
                const hasNumberPrefix = /^\d+\.\s/.test(trimmedCurrentLine);

                let newLine;
                if (hasNumberPrefix) {
                    // Already has a number, keep it as is
                    newLine = currentLine;
                } else {
                    // Add numbering to current line
                    const nextNumber = maxNumber + 1;
                    // Preserve any leading whitespace
                    const leadingWhitespace = currentLine.match(/^\s*/)?.[0] || "";
                    const lineContent = trimmedCurrentLine;
                    newLine = leadingWhitespace + `${nextNumber}. ${lineContent}`;
                }

                // Build the new value
                const linesBefore = lastNewlineIndex >= 0
                    ? textBeforeCursor.substring(0, lastNewlineIndex + 1)
                    : "";
                const newValue = linesBefore + newLine + "\n" + textAfterCursor;

                updateFunction(newValue);

                // Set cursor position after the newline
                setTimeout(() => {
                    const newCursorPos = linesBefore.length + newLine.length + 1;
                    e.target.selectionStart = e.target.selectionEnd = newCursorPos;
                }, 0);
            }
        };
    };

    // Handle remarks field with numbered list on Enter
    const handleRemarksKeyDown = createNumberedListHandler((newValue) => {
        setFormData(prev => ({
            ...prev,
            remarks: newValue
        }));
    });

    const handleClientInvoicingKeyDown = createNumberedListHandler((newValue) => {
        setFormData(prev => ({
            ...prev,
            client_invoicing: newValue
        }));
    });

    // Handle file upload for customer attachments
    const handleCustomerFileUpload = (files) => {
        const fileArray = Array.from(files || []);
        const filePromises = fileArray.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result || '';
                // Extract base64 data without data URL prefix
                const base64data = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
                resolve({
                    filename: file.name,
                    datas: base64data,
                    mimetype: file.type || 'application/octet-stream'
                });
            };
            reader.readAsDataURL(file);
        }));

        Promise.all(filePromises).then(newAttachments => {
            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...newAttachments]
            }));
        });
    };

    // Handle file upload for child/person attachments
    const handleChildFileUpload = (rowIndex, files) => {
        const fileArray = Array.from(files || []);
        const filePromises = fileArray.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result || '';
                // Extract base64 data without data URL prefix
                const base64data = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
                resolve({
                    filename: file.name,
                    datas: base64data,
                    mimetype: file.type || 'application/octet-stream'
                });
            };
            reader.readAsDataURL(file);
        }));

        Promise.all(filePromises).then(newAttachments => {
            setPeopleRows(prevRows => prevRows.map((row, idx) => {
                if (idx === rowIndex) {
                    return {
                        ...row,
                        attachments: [...(row.attachments || []), ...newAttachments]
                    };
                }
                return row;
            }));
        });
    };

    // Handle delete customer attachment (new uploads)
    const handleDeleteCustomerAttachment = (attachmentIndex) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, idx) => idx !== attachmentIndex)
        }));
    };

    // Handle delete existing customer attachment
    const handleDeleteExistingCustomerAttachment = (attachmentId) => {
        setFormData(prev => ({
            ...prev,
            existingAttachments: prev.existingAttachments.filter(att => att.id !== attachmentId),
            attachment_to_delete: [...(prev.attachment_to_delete || []), attachmentId]
        }));
    };

    // Handle delete child attachment (new uploads)
    const handleDeleteChildAttachment = (rowIndex, attachmentIndex) => {
        setPeopleRows(prevRows => prevRows.map((row, idx) => {
            if (idx === rowIndex) {
                return {
                    ...row,
                    attachments: (row.attachments || []).filter((_, attIdx) => attIdx !== attachmentIndex)
                };
            }
            return row;
        }));
    };

    // Handle delete existing child attachment
    const handleDeleteExistingChildAttachment = (rowIndex, attachmentId) => {
        setPeopleRows(prevRows => prevRows.map((row, idx) => {
            if (idx === rowIndex) {
                return {
                    ...row,
                    existingAttachments: (row.existingAttachments || []).filter(att => att.id !== attachmentId),
                    attachment_to_delete: [...(row.attachment_to_delete || []), attachmentId]
                };
            }
            return row;
        }));
    };

    // View customer/person attachment: call /api/customers/{id}/attachments (or /attachments/{attachmentId}) and open in new tab
    const handleViewCustomerAttachment = async (attachment) => {
        const customerId = editingClient?.id;
        if (!customerId) {
            toast({
                title: "Cannot view attachment",
                description: "Save the client first to view attachments.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        if (!attachment?.id) {
            toast({
                title: "Cannot view attachment",
                description: "Attachment ID is missing.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        try {
            setIsLoadingAttachment(true);
            const response = await getCustomerAttachmentApi(customerId, attachment.id, false);
            if (response?.data instanceof Blob) {
                const mimeType = response.type || attachment.mimetype || "application/octet-stream";
                const fileUrl = URL.createObjectURL(response.data);
                window.open(fileUrl, "_blank");
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load attachment from server.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (err) {
            toast({
                title: "Error",
                description: err?.message || "Failed to view attachment",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoadingAttachment(false);
        }
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
                            whatsapp: row.whatsapp ? true : false,
                            remarks: row.remarks || undefined,
                            attachments: row.attachments && row.attachments.length > 0 ? row.attachments : undefined,
                            attachment_to_delete: row.attachment_to_delete && row.attachment_to_delete.length > 0 ? row.attachment_to_delete : undefined,
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
                            whatsapp: row.whatsapp ? true : false,
                            remarks: row.remarks || undefined,
                            attachments: row.attachments && row.attachments.length > 0 ? row.attachments : undefined,
                            attachment_to_delete: row.attachment_to_delete && row.attachment_to_delete.length > 0 ? row.attachment_to_delete : undefined,
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
                        whatsapp: row.whatsapp ? true : false,
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
                street3: formData.street3 || undefined,
                street4: formData.street4 || undefined,
                street5: formData.street5 || undefined,
                street6: formData.street6 || undefined,
                street7: formData.street7 || undefined,
                city: formData.city,
                zip: formData.zip,
                country_id: parseInt(formData.country_id) || null,
                reg_no: formData.reg_no,
                website: formData.website,
                payment_term: formData.payment_term || undefined,
                type_client: formData.type_client || undefined,
                company_type_text: formData.company_type_text || undefined,
                vessel_type: formData.vessel_type || undefined,
                vessel_type1: formData.vessel_type1 || undefined,
                vessel_type2: formData.vessel_type2 || undefined,
                vessel_type3: formData.vessel_type3 || undefined,
                remarks: formData.remarks,
                tariffs: formData.tariffs || "",
                client_invoicing: formData.client_invoicing || "",
                company_type: "company",
                attachments: formData.attachments && formData.attachments.length > 0 ? formData.attachments : undefined,
                children: children.length ? children : undefined,
            });
            const doUpdate = async () => updateCustomerApi(editingClient.id, {
                ...formData,
                country_id: parseInt(formData.country_id) || null,
                company_type_text: formData.company_type_text || "",
                attachments: formData.attachments && formData.attachments.length > 0 ? formData.attachments : undefined,
                attachment_to_delete: formData.attachment_to_delete && formData.attachment_to_delete.length > 0 ? formData.attachment_to_delete : undefined,
                children: children.length ? children : undefined,
            });

            const result = editingClient ? await doUpdate() : await doRegister();

            // Check if the API call was actually successful
            // For both register and update, check result.status === "success"
            if (result && result.result && result.result.status === "success") {
                refreshMasterData(MASTER_KEYS.CLIENTS).catch(() => {});
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
                    payment_term: formData.payment_term,
                    type_client: formData.type_client,
                    company_type_text: formData.company_type_text,
                    vessel_type: formData.vessel_type,
                    vessel_type1: formData.vessel_type1,
                    vessel_type2: formData.vessel_type2,
                    vessel_type3: formData.vessel_type3,
                    remarks: formData.remarks,
                    status: "Active",
                    joinDate: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                    }),
                };

                addCustomerToRedux(newClient);

                submittedSuccessfully.current = true;
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
                    street3: "",
                    street4: "",
                    street5: "",
                    street6: "",
                    street7: "",
                    city: "",
                    zip: "",
                    country_id: "",
                    reg_no: "",
                    website: "",
                    payment_term: "",
                    type_client: "",
                    company_type_text: "",
                    vessel_type: "",
                    vessel_type1: "",
                    vessel_type2: "",
                    vessel_type3: "",
                    remarks: "",
                    tariffs: "",
                    client_invoicing: "",
                    prefix: "",
                    job_title: "",
                });
                setVisibleAddressFields(2);
                setVisibleVesselTypeFields(1);
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
                    overflowX={{ sm: "scroll", lg: "hidden" }}
                    bg={editingClient ? editModeBg : undefined}
                    border={editingClient ? `3px solid ${editModeBorderColor}` : undefined}
                    borderRadius={editingClient ? "lg" : undefined}
                    boxShadow={editingClient ? "0 0 0 1px rgba(66, 153, 225, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)" : undefined}>
                    {/* Prominent EDIT MODE Banner */}
                    {editingClient && (
                        <Alert
                            status="info"
                            bg={editModeAlertBg}
                            borderBottom="2px solid"
                            borderColor={editModeBorderColor}
                            borderRadius="0"
                            py={3}
                            px={6}
                            mb={4}
                        >
                            <AlertIcon boxSize="24px" color={editModeBorderColor} />
                            <Flex align="center" gap={3} flex={1}>
                                <Badge
                                    colorScheme="blue"
                                    fontSize="md"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                    fontWeight="bold"
                                    textTransform="uppercase"
                                >
                                    EDIT MODE
                                </Badge>
                                <Text
                                    fontSize="md"
                                    fontWeight="600"
                                    color={textColor}
                                    flex={1}
                                >
                                    You are currently editing client: <strong>{editingClient.name || editingClient.client_code || "Client"}</strong>
                                </Text>
                            </Flex>
                        </Alert>
                    )}
                    <Flex px='25px' justify='space-between' mb='20px' align='center'>
                        <Flex align="center" gap={3}>
                            <Text
                                color={textColor}
                                fontSize='22px'
                                fontWeight='700'
                                lineHeight='100%'>
                                {editingClient ? "Edit Client" : "Client Registration"}
                            </Text>
                            {editingClient && (
                                <Badge
                                    colorScheme="blue"
                                    fontSize="sm"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    fontWeight="bold"
                                >
                                    EDITING
                                </Badge>
                            )}
                        </Flex>
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
                                {/* Company Information Section - unified two-column layout */}
                                <Box>
                                    <Flex align="center" mb="20px">
                                        <Icon as={MdPerson} color={textColorBrand} fontSize="18px" mr="8px" />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Company information
                                        </Text>
                                    </Flex>

                                    <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                                        <Box>
                                            <Box as={"div"}>
                                                <Box display={{ base: "block", md: "grid" }} gridTemplateColumns={{ md: "repeat(2, 1fr)" }}>
                                                    {/* LEFT 1: Company name / RIGHT 1: Client code */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company name</Text>
                                                        <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Client Full Name" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Client Code</Text>
                                                        <Input name="client_code" value={formData.client_code} onChange={handleInputChange} placeholder="Client ID" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* LEFT 2: Address 1 / RIGHT 2: Category */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address1</Text>
                                                        <Input name="street" value={formData.street} onChange={handleInputChange} placeholder="Street address" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
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

                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address2</Text>
                                                        <InputGroup w={gridInputWidth}>
                                                            <Input
                                                                name="street2"
                                                                value={formData.street2}
                                                                onChange={handleInputChange}
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
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Client Type</Text>
                                                        <Input name="type_client" value={formData.type_client} onChange={handleInputChange} placeholder="e.g. Key / Regular / Prospect" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* LEFT: empty / RIGHT: Company Type Text */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }}></Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Company Type Text</Text>
                                                        <Input name="company_type_text" value={formData.company_type_text} onChange={handleInputChange} placeholder="add company type" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* LEFT: Address3–7 (if present), RIGHT: empty for alignment */}
                                                    {visibleAddressFields >= 3 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address3</Text>
                                                                <InputGroup w={gridInputWidth}>
                                                                    <Input
                                                                        name="street3"
                                                                        value={formData.street3}
                                                                        onChange={handleInputChange}
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
                                                            <Box px={4} py={2} borderColor={borderColor}></Box>
                                                        </>
                                                    )}

                                                    {visibleAddressFields >= 4 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address4</Text>
                                                                <InputGroup w={gridInputWidth}>
                                                                    <Input
                                                                        name="street4"
                                                                        value={formData.street4}
                                                                        onChange={handleInputChange}
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
                                                            <Box px={4} py={2} borderColor={borderColor}></Box>
                                                        </>
                                                    )}

                                                    {visibleAddressFields >= 5 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address5</Text>
                                                                <InputGroup w={gridInputWidth}>
                                                                    <Input
                                                                        name="street5"
                                                                        value={formData.street5}
                                                                        onChange={handleInputChange}
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
                                                            <Box px={4} py={2} borderColor={borderColor}></Box>
                                                        </>
                                                    )}

                                                    {visibleAddressFields >= 6 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address6</Text>
                                                                <InputGroup w={gridInputWidth}>
                                                                    <Input
                                                                        name="street6"
                                                                        value={formData.street6}
                                                                        onChange={handleInputChange}
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
                                                            <Box px={4} py={2} borderColor={borderColor}></Box>
                                                        </>
                                                    )}

                                                    {visibleAddressFields >= 7 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Address7</Text>
                                                                <InputGroup w={gridInputWidth}>
                                                                    <Input
                                                                        name="street7"
                                                                        value={formData.street7}
                                                                        onChange={handleInputChange}
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
                                                            <Box px={4} py={2} borderColor={borderColor}></Box>
                                                        </>
                                                    )}

                                                    {/* LEFT: Postcode / RIGHT: Payment Terms */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Postcode</Text>
                                                        <Input name="zip" value={formData.zip} onChange={handleInputChange} placeholder="Zip" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Payment Terms</Text>
                                                        <Input name="payment_term" value={formData.payment_term} onChange={handleInputChange} placeholder="e.g. 30 days" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* LEFT: City / RIGHT: Vessel Type 1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>City</Text>
                                                        <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="City" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Vessel Type</Text>
                                                        <Flex gap={2} alignItems="center" w={gridInputWidth}>
                                                            <Box flex="1">
                                                                <SearchableSelect
                                                                    value={formData.vessel_type1}
                                                                    onChange={(val) => setFormData((prev) => ({ ...prev, vessel_type1: val }))}
                                                                    options={vesselTypes || []}
                                                                    placeholder={isLoadingVesselTypes ? "Loading vessel types..." : "Select Vessel Type"}
                                                                    displayKey="vessel_type"
                                                                    valueKey="vessel_type"
                                                                    formatOption={(option) => option?.vessel_type || ""}
                                                                    isLoading={isLoadingVesselTypes}
                                                                />
                                                            </Box>
                                                            {visibleVesselTypeFields < 2 && (
                                                                <IconButton
                                                                    aria-label="Add Vessel Type 2"
                                                                    icon={<Icon as={MdAdd} />}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    colorScheme="blue"
                                                                    onClick={addMoreVesselType}
                                                                    h="24px"
                                                                    w="24px"
                                                                    minW="24px"
                                                                />
                                                            )}
                                                        </Flex>
                                                    </Box>

                                                    {/* RIGHT: Vessel Type 2 (if visible) */}
                                                    {visibleVesselTypeFields >= 2 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }}></Box>
                                                            <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Vessel Type 2</Text>
                                                                <Flex gap={2} alignItems="center" w={gridInputWidth}>
                                                                    <Box flex="1">
                                                                        <SearchableSelect
                                                                            value={formData.vessel_type2}
                                                                            onChange={(val) => setFormData((prev) => ({ ...prev, vessel_type2: val }))}
                                                                            options={vesselTypes || []}
                                                                            placeholder={isLoadingVesselTypes ? "Loading vessel types..." : "Select Vessel Type"}
                                                                            displayKey="vessel_type"
                                                                            valueKey="vessel_type"
                                                                            formatOption={(option) => option?.vessel_type || ""}
                                                                            isLoading={isLoadingVesselTypes}
                                                                        />
                                                                    </Box>
                                                                    {visibleVesselTypeFields < 3 && (
                                                                        <IconButton
                                                                            aria-label="Add Vessel Type 3"
                                                                            icon={<Icon as={MdAdd} />}
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            colorScheme="blue"
                                                                            onClick={addMoreVesselType}
                                                                            h="24px"
                                                                            w="24px"
                                                                            minW="24px"
                                                                        />
                                                                    )}
                                                                    <IconButton
                                                                        aria-label="Remove Vessel Type 2"
                                                                        icon={<Icon as={DeleteIcon} />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() => removeVesselTypeField(2)}
                                                                        h="24px"
                                                                        w="24px"
                                                                        minW="24px"
                                                                    />
                                                                </Flex>
                                                            </Box>
                                                        </>
                                                    )}

                                                    {/* RIGHT: Vessel Type 3 (if visible) */}
                                                    {visibleVesselTypeFields >= 3 && (
                                                        <>
                                                            <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }}></Box>
                                                            <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                                <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Vessel Type 3</Text>
                                                                <Flex gap={2} alignItems="center" w={gridInputWidth}>
                                                                    <Box flex="1">
                                                                        <SearchableSelect
                                                                            value={formData.vessel_type3}
                                                                            onChange={(val) => setFormData((prev) => ({ ...prev, vessel_type3: val }))}
                                                                            options={vesselTypes || []}
                                                                            placeholder={isLoadingVesselTypes ? "Loading vessel types..." : "Select Vessel Type"}
                                                                            displayKey="vessel_type"
                                                                            valueKey="vessel_type"
                                                                            formatOption={(option) => option?.vessel_type || ""}
                                                                            isLoading={isLoadingVesselTypes}
                                                                        />
                                                                    </Box>
                                                                    <IconButton
                                                                        aria-label="Remove Vessel Type 3"
                                                                        icon={<Icon as={DeleteIcon} />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() => removeVesselTypeField(3)}
                                                                        h="24px"
                                                                        w="24px"
                                                                        minW="24px"
                                                                    />
                                                                </Flex>
                                                            </Box>
                                                        </>
                                                    )}

                                                    {/* LEFT: Country / RIGHT: Remarks */}
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
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary} mt={1}>Remarks</Text>
                                                        <Textarea
                                                            name="remarks"
                                                            value={formData.remarks}
                                                            onChange={handleInputChange}
                                                            onKeyDown={handleRemarksKeyDown}
                                                            placeholder="Type and press Enter to create numbered list..."
                                                            size="sm"
                                                            w={gridInputWidth}
                                                            rows={3}
                                                        />
                                                    </Box>

                                                    {/* LEFT: RegNo / RIGHT: Website */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Reg No</Text>
                                                        <Input name="reg_no" value={formData.reg_no} onChange={handleInputChange} placeholder="Registration" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Website</Text>
                                                        <Flex gap={2} alignItems="center" w={gridInputWidth}>
                                                            <Input name="website" value={formData.website} onChange={handleInputChange} placeholder="https://..." size="sm" flex="1" />
                                                            {formData.website && isValidUrl(formData.website) && (
                                                                <Button
                                                                    size="xs"
                                                                    colorScheme="blue"
                                                                    variant="outline"
                                                                    leftIcon={<Icon as={MdOpenInNew} />}
                                                                    onClick={() => {
                                                                        const normalizedUrl = normalizeUrl(formData.website);
                                                                        window.open(normalizedUrl, "_blank", "noopener,noreferrer");
                                                                    }}
                                                                >
                                                                    Visit
                                                                </Button>
                                                            )}
                                                        </Flex>
                                                    </Box>

                                                    {/* LEFT: Empty / RIGHT: Tariffs */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }}></Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Tariffs</Text>
                                                        <Input name="tariffs" value={formData.tariffs} onChange={handleInputChange} placeholder="Tariffs" size="sm" w={gridInputWidth} />
                                                    </Box>

                                                    {/* LEFT: Empty / RIGHT: Client Invoicing */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }}></Box>
                                                    <Box px={4} py={2} borderColor={borderColor} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary} mt={1}>Client Invoicing</Text>
                                                        <Textarea
                                                            name="client_invoicing"
                                                            value={formData.client_invoicing}
                                                            onChange={handleInputChange}
                                                            onKeyDown={handleClientInvoicingKeyDown}
                                                            placeholder="Type and press Enter to create numbered list..."
                                                            size="sm"
                                                            w={gridInputWidth}
                                                            rows={3}
                                                            resize="vertical"
                                                        />
                                                    </Box>

                                                    {/* LEFT: Phone1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone1</Text>
                                                        <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+65..." size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor}></Box>

                                                    {/* LEFT: Phone2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Phone2</Text>
                                                        <Input name="phone2" value={formData.phone2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor}></Box>

                                                    {/* LEFT: Email1 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email1</Text>
                                                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@company.com" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor}></Box>

                                                    {/* LEFT: Email2 */}
                                                    <Box px={4} py={2} borderColor={borderColor} borderRight={{ base: "none", md: `1px solid ${borderColor}` }} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                                                        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color={textColorSecondary}>Email2</Text>
                                                        <Input type="email" name="email2" value={formData.email2} onChange={handleInputChange} placeholder="optional" size="sm" w={gridInputWidth} />
                                                    </Box>
                                                    <Box px={4} py={2} borderColor={borderColor}></Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Customer Attachments Section */}
                                <Box>
                                    <Flex align="center" mb="20px">
                                        <Icon as={MdAttachFile} color={textColorBrand} fontSize="18px" mr="8px" />
                                        <Text fontSize="lg" fontWeight="600" color={textColor}>
                                            Attachments
                                        </Text>
                                    </Flex>
                                    <Box border="1px solid" borderColor={borderColor} borderRadius="md" p={4} bg={inputBg}>
                                        <VStack spacing={3} align="stretch">
                                            <Input
                                                type="file"
                                                multiple
                                                accept="application/pdf,image/*,.doc,.docx"
                                                onChange={(e) => handleCustomerFileUpload(e.target.files)}
                                                display="none"
                                                id="customer-file-upload"
                                            />
                                            <label htmlFor="customer-file-upload">
                                                <Button
                                                    as="span"
                                                    leftIcon={<Icon as={MdAttachFile} />}
                                                    colorScheme="blue"
                                                    variant="outline"
                                                    size="sm"
                                                    cursor="pointer"
                                                    w="100%"
                                                >
                                                    Upload Files
                                                </Button>
                                            </label>

                                            {/* Display existing attachments */}
                                            {(formData.existingAttachments || []).map((att, idx) => (
                                                <Flex key={`existing-${att.id || idx}`} align="center" justify="space-between" p={2} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                    <Text fontSize="sm" isTruncated flex={1} title={att.filename}>
                                                        {att.filename}
                                                    </Text>
                                                    <HStack spacing={2}>
                                                        <IconButton
                                                            aria-label="View file"
                                                            icon={<Icon as={MdVisibility} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => handleViewCustomerAttachment(att)}
                                                            isLoading={isLoadingAttachment}
                                                        />
                                                        <IconButton
                                                            aria-label="Delete attachment"
                                                            icon={<Icon as={MdRemove} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => handleDeleteExistingCustomerAttachment(att.id)}
                                                        />
                                                    </HStack>
                                                </Flex>
                                            ))}

                                            {/* Display newly uploaded attachments */}
                                            {(formData.attachments || []).map((att, idx) => (
                                                <Flex key={`new-${idx}`} align="center" justify="space-between" p={2} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                    <Text fontSize="sm" isTruncated flex={1} title={att.filename}>
                                                        {att.filename}
                                                    </Text>
                                                    <IconButton
                                                        aria-label="Remove attachment"
                                                        icon={<Icon as={MdRemove} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={() => handleDeleteCustomerAttachment(idx)}
                                                    />
                                                </Flex>
                                            ))}

                                            {(!formData.existingAttachments || formData.existingAttachments.length === 0) && 
                                             (!formData.attachments || formData.attachments.length === 0) && (
                                                <Text fontSize="sm" color={textColorSecondary} textAlign="center" py={2}>
                                                    No attachments uploaded
                                                </Text>
                                            )}
                                        </VStack>
                                    </Box>
                                </Box>

                                {/* Client People Section (mirrors ClientDetail.jsx) */}
                                <Box>
                                    <Flex justify="space-between" align="center" mb={4}>
                                        <Heading size="md" color={headingColor}>
                                            Client People
                                        </Heading>
                                        <Button colorScheme="blue" onClick={() => {
                                            const required = ["first_name", "email"];
                                            const hasIncomplete = peopleRows.some((row) =>
                                                required.some((f) => !String(row[f] || "").trim())
                                            );
                                            if (hasIncomplete) return;
                                            setPeopleRows((prev) => [
                                                ...prev,
                                                { ...emptyPersonRow, company_name: formData.name || "" },
                                            ]);
                                        }} isDisabled={peopleRows.some((row) => ["first_name", "email"].some((f) => !String(row[f] || "").trim()))}>
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
                                                        <Td colSpan={peopleTableColumns.length + 1} textAlign="center" py={8}>
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
                                                                    ) : column.key === "whatsapp" ? (
                                                                        <Checkbox
                                                                            isChecked={!!row.whatsapp}
                                                                            onChange={(e) => {
                                                                                const checked = e.target.checked;
                                                                                setPeopleRows((prev) => {
                                                                                    const updated = [...prev];
                                                                                    updated[rowIndex] = { ...updated[rowIndex], whatsapp: checked };
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                        >
                                                                            Works via WhatsApp
                                                                        </Checkbox>
                                                                    ) : column.key === "remarks" ? (
                                                                        <Textarea
                                                                            value={row[column.key]}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setPeopleRows((prev) => {
                                                                                    const updated = [...prev];
                                                                                    updated[rowIndex] = { ...updated[rowIndex], [column.key]: value };
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                            onKeyDown={createNumberedListHandler((newValue) => {
                                                                                setPeopleRows((prev) => {
                                                                                    const updated = [...prev];
                                                                                    updated[rowIndex] = { ...updated[rowIndex], [column.key]: newValue };
                                                                                    return updated;
                                                                                });
                                                                            })}
                                                                            size="sm"
                                                                            style={{ backgroundColor: "#f7f7f77a" }}
                                                                            border="1px solid"
                                                                            borderColor={borderColor}
                                                                            borderRadius="md"
                                                                            _focus={{
                                                                                borderColor: "blue.500",
                                                                                boxShadow: "0 0 0 1px rgba(0, 123, 255, 0.2)",
                                                                            }}
                                                                            placeholder="Type and press Enter to create numbered list..."
                                                                            rows={3}
                                                                            resize="vertical"
                                                                            w="auto"
                                                                            minW="24ch"
                                                                            maxW="90ch"
                                                                            cols={getAutoCols(row[column.key], "Type and press Enter to create numbered list...", { min: 24, max: 90 })}
                                                                        />
                                                                    ) : column.key === "attachments" ? (
                                                                        <VStack spacing={2} align="stretch">
                                                                            <Input
                                                                                type="file"
                                                                                multiple
                                                                                accept="application/pdf,image/*,.doc,.docx"
                                                                                onChange={(e) => handleChildFileUpload(rowIndex, e.target.files)}
                                                                                display="none"
                                                                                id={`child-file-upload-${rowIndex}`}
                                                                            />
                                                                            <label htmlFor={`child-file-upload-${rowIndex}`}>
                                                                                <Button
                                                                                    as="span"
                                                                                    leftIcon={<Icon as={MdAttachFile} />}
                                                                                    size="xs"
                                                                                    variant="outline"
                                                                                    colorScheme="blue"
                                                                                    cursor="pointer"
                                                                                    w="100%"
                                                                                >
                                                                                    Upload Files
                                                                                </Button>
                                                                            </label>

                                                                            {/* Display existing attachments */}
                                                                            {(row.existingAttachments || []).map((att, attIdx) => (
                                                                                <Flex key={`existing-${att.id || attIdx}`} align="center" justify="space-between" fontSize="xs" gap={1}>
                                                                                    <Text isTruncated flex={1} title={att.filename}>
                                                                                        {att.filename}
                                                                                    </Text>
                                                                                    <HStack spacing={0}>
                                                                                        <IconButton
                                                                                            aria-label="View file"
                                                                                            icon={<Icon as={MdVisibility} />}
                                                                                            size="xs"
                                                                                            variant="ghost"
                                                                                            colorScheme="blue"
                                                                                            onClick={() => handleViewCustomerAttachment(att)}
                                                                                            isLoading={isLoadingAttachment}
                                                                                        />
                                                                                        <IconButton
                                                                                            aria-label="Delete attachment"
                                                                                            icon={<Icon as={MdRemove} />}
                                                                                            size="xs"
                                                                                            variant="ghost"
                                                                                            colorScheme="red"
                                                                                            onClick={() => handleDeleteExistingChildAttachment(rowIndex, att.id)}
                                                                                        />
                                                                                    </HStack>
                                                                                </Flex>
                                                                            ))}

                                                                            {/* Display newly uploaded attachments */}
                                                                            {(row.attachments || []).map((att, attIdx) => (
                                                                                <Flex key={`new-${attIdx}`} align="center" justify="space-between" fontSize="xs" gap={1}>
                                                                                    <Text isTruncated flex={1} title={att.filename}>
                                                                                        {att.filename}
                                                                                    </Text>
                                                                                    <IconButton
                                                                                        aria-label="Remove attachment"
                                                                                        icon={<Icon as={MdRemove} />}
                                                                                        size="xs"
                                                                                        variant="ghost"
                                                                                        colorScheme="red"
                                                                                        onClick={() => handleDeleteChildAttachment(rowIndex, attIdx)}
                                                                                    />
                                                                                </Flex>
                                                                            ))}

                                                                            {(!row.existingAttachments || row.existingAttachments.length === 0) && 
                                                                             (!row.attachments || row.attachments.length === 0) && (
                                                                                <Text fontSize="xs" color={textColorSecondary} textAlign="center" py={1}>
                                                                                    No files
                                                                                </Text>
                                                                            )}
                                                                        </VStack>
                                                                    ) : (
                                                                        <Tooltip
                                                                            label={row[column.key]}
                                                                            isDisabled={!row[column.key]}
                                                                            hasArrow
                                                                            placement="top"
                                                                            openDelay={200}
                                                                        >
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
                                                                                isRequired={["first_name", "email"].includes(column.key)}
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
                                                                                w="auto"
                                                                                minW="16ch"
                                                                                maxW="60ch"
                                                                                htmlSize={getAutoHtmlSize(row[column.key], peoplePlaceholders[column.key] || "", { min: 12, max: 60 })}
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

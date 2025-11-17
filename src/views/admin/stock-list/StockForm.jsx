import React, { useState, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Button,
    Icon,
    HStack,
    VStack,
    useColorModeValue,
    Input,
    Select,
    Textarea,
    FormControl,
    FormLabel,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useToast,
    Spinner,
} from "@chakra-ui/react";
import {
    MdChevronLeft,
    MdSave,
} from "react-icons/md";
import { createStockItemApi, getStockItemByIdApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";

export default function StockForm() {
    const history = useHistory();
    const { id } = useParams();
    const isEditing = !!id;
    const toast = useToast();
    const { updateStockItem, getStockList, updateLoading } = useStock();
    const [isLoading, setIsLoading] = useState(isEditing);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("white", "navy.900");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    // Form state for all 24 fields
    const [formData, setFormData] = useState({
        client: "",
        vessel: "",
        pic: "",
        stockStatus: "",
        supplier: "",
        poNumber: "",
        warehouseId: "",
        shippingDoc: "",
        items: "",
        weightKgs: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        volumeNoDim: "",
        lwhText: "",
        details: "",
        value: "",
        currency: "",
        origin: "",
        viaHub: "",
        readyAsSupplier: false,
        dateOnStock: "",
        remarks: "",
        clientAccess: false,
    });

    // Load stock item data if editing
    useEffect(() => {
        if (isEditing && id) {
            const loadStockItem = async () => {
                try {
                    setIsLoading(true);
                    const response = await getStockItemByIdApi(id);
                    const stock = response.result || response;

                    setFormData({
                        client: stock.client_id || stock.client || "",
                        vessel: stock.vessel_id || stock.vessel || "",
                        pic: stock.pic || "",
                        stockStatus: stock.stock_status || "",
                        supplier: stock.supplier_id || stock.supplier || "",
                        poNumber: stock.po_number || "",
                        warehouseId: stock.warehouse_id || "",
                        shippingDoc: stock.shipping_doc || "",
                        items: stock.items || stock.item_desc || "",
                        weightKgs: stock.weight_kg || stock.weight_kgs || "",
                        lengthCm: stock.length_cm || "",
                        widthCm: stock.width_cm || "",
                        heightCm: stock.height_cm || "",
                        volumeNoDim: stock.volume_no_dim || stock.volume_cbm || "",
                        lwhText: stock.lwh_text || "",
                        details: stock.details || stock.item_desc || "",
                        value: stock.value || "",
                        currency: stock.currency || "",
                        origin: stock.origin || "",
                        viaHub: stock.via_hub || "",
                        readyAsSupplier: stock.ready_as_supplier || false,
                        dateOnStock: stock.date_on_stock || "",
                        remarks: stock.remarks || "",
                        clientAccess: stock.client_access || false,
                    });
                } catch (error) {
                    toast({
                        title: 'Error',
                        description: 'Failed to load stock item',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    history.push("/admin/stock-list/main-db");
                } finally {
                    setIsLoading(false);
                }
            };
            loadStockItem();
        }
    }, [id, isEditing, history, toast]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveStockItem = async () => {
        try {
            const payload = {
                client_id: formData.client,
                vessel_id: formData.vessel,
                pic: formData.pic,
                stock_status: formData.stockStatus,
                supplier_id: formData.supplier,
                po_number: formData.poNumber,
                warehouse_id: formData.warehouseId,
                shipping_doc: formData.shippingDoc,
                items: formData.items,
                item_desc: formData.items,
                weight_kg: formData.weightKgs,
                length_cm: formData.lengthCm,
                width_cm: formData.widthCm,
                height_cm: formData.heightCm,
                volume_no_dim: formData.volumeNoDim,
                lwh_text: formData.lwhText,
                details: formData.details,
                value: formData.value,
                currency: formData.currency,
                origin: formData.origin,
                via_hub: formData.viaHub,
                ready_as_supplier: formData.readyAsSupplier,
                date_on_stock: formData.dateOnStock,
                remarks: formData.remarks,
                client_access: formData.clientAccess,
            };

            if (isEditing) {
                // Update existing
                const result = await updateStockItem(id, payload, {});
                if (result && result.success) {
                    toast({
                        title: 'Success',
                        description: 'Stock item updated successfully',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error(result?.error || 'Failed to update stock item');
                }
            } else {
                // Create new
                const result = await createStockItemApi(payload);
                if (result && result.result && result.result.status === 'success') {
                    toast({
                        title: 'Success',
                        description: 'Stock item created successfully',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error(result?.result?.message || 'Failed to create stock item');
                }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save stock item',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleBackToStockList = () => {
        history.push("/admin/stock-list/main-db");
    };

    if (isLoading) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Flex justify="center" align="center" h="200px">
                    <VStack spacing="4">
                        <Spinner size="xl" color="#1c4a95" />
                        <Text>Loading stock item...</Text>
                    </VStack>
                </Flex>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
            {/* Header */}
            <Flex
                bg={cardBg}
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
                borderBottom="1px"
                borderColor={borderColor}
            >
                <HStack spacing="4">
                    <Button
                        leftIcon={<Icon as={MdChevronLeft} />}
                        bg="purple.500"
                        color="white"
                        size="sm"
                        px="6"
                        py="3"
                        borderRadius="md"
                        _hover={{ bg: "purple.600" }}
                        onClick={handleBackToStockList}
                    >
                        Back
                    </Button>
                    <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                        {isEditing ? "Edit Stock Item" : "Create New Stock Item"}
                    </Text>
                </HStack>

                {/* Save Button */}
                <Button
                    leftIcon={<Icon as={MdSave} />}
                    bg="green.500"
                    color="white"
                    size="sm"
                    px="6"
                    py="3"
                    borderRadius="md"
                    _hover={{ bg: "green.600" }}
                    onClick={handleSaveStockItem}
                    isLoading={updateLoading}
                    loadingText="Saving..."
                >
                    {isEditing ? "Update Stock Item" : "Create Stock Item"}
                </Button>
            </Flex>

            {/* Main Content Area */}
            <Box bg={cardBg} p={{ base: "4", md: "6" }}>
                <VStack align="flex-start" spacing="6" w="100%">
                    {/* Row 1: Client, Vessel, PIC, Stock Status */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Client</FormLabel>
                            <Input
                                value={formData.client}
                                onChange={(e) => handleInputChange("client", e.target.value)}
                                placeholder="Enter Client"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Vessel</FormLabel>
                            <Input
                                value={formData.vessel}
                                onChange={(e) => handleInputChange("vessel", e.target.value)}
                                placeholder="Enter Vessel"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">PIC</FormLabel>
                            <Input
                                value={formData.pic}
                                onChange={(e) => handleInputChange("pic", e.target.value)}
                                placeholder="Enter PIC"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Stock Status</FormLabel>
                            <Select
                                value={formData.stockStatus}
                                onChange={(e) => handleInputChange("stockStatus", e.target.value)}
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            >
                                <option value="">Select Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_transit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </Select>
                        </FormControl>
                    </HStack>

                    {/* Row 2: Supplier, PO Number, Warehouse ID, Shipping Doc */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Supplier</FormLabel>
                            <Input
                                value={formData.supplier}
                                onChange={(e) => handleInputChange("supplier", e.target.value)}
                                placeholder="Enter Supplier"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">PO Number</FormLabel>
                            <Input
                                value={formData.poNumber}
                                onChange={(e) => handleInputChange("poNumber", e.target.value)}
                                placeholder="Enter PO Number"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Warehouse ID</FormLabel>
                            <Input
                                value={formData.warehouseId}
                                onChange={(e) => handleInputChange("warehouseId", e.target.value)}
                                placeholder="Enter Warehouse ID"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Shipping Doc</FormLabel>
                            <Input
                                value={formData.shippingDoc}
                                onChange={(e) => handleInputChange("shippingDoc", e.target.value)}
                                placeholder="Enter Shipping Doc"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                    </HStack>

                    {/* Row 3: Items, Weight kgs, Length cm, Width cm */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Items</FormLabel>
                            <Input
                                value={formData.items}
                                onChange={(e) => handleInputChange("items", e.target.value)}
                                placeholder="Enter Items"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Weight kgs</FormLabel>
                            <NumberInput
                                value={formData.weightKgs}
                                onChange={(value) => handleInputChange("weightKgs", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Length cm</FormLabel>
                            <NumberInput
                                value={formData.lengthCm}
                                onChange={(value) => handleInputChange("lengthCm", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Width cm</FormLabel>
                            <NumberInput
                                value={formData.widthCm}
                                onChange={(value) => handleInputChange("widthCm", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                    </HStack>

                    {/* Row 4: Height cm, Volume no dim, LWH Text, Details */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Height cm</FormLabel>
                            <NumberInput
                                value={formData.heightCm}
                                onChange={(value) => handleInputChange("heightCm", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Volume no dim</FormLabel>
                            <NumberInput
                                value={formData.volumeNoDim}
                                onChange={(value) => handleInputChange("volumeNoDim", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">LWH Text</FormLabel>
                            <Input
                                value={formData.lwhText}
                                onChange={(e) => handleInputChange("lwhText", e.target.value)}
                                placeholder="Enter LWH Text"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Details</FormLabel>
                            <Input
                                value={formData.details}
                                onChange={(e) => handleInputChange("details", e.target.value)}
                                placeholder="Enter Details"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                    </HStack>

                    {/* Row 5: Value, Currency, Origin, Via HUB */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Value</FormLabel>
                            <NumberInput
                                value={formData.value}
                                onChange={(value) => handleInputChange("value", value)}
                                min={0}
                                precision={2}
                                size="sm"
                            >
                                <NumberInputField bg={inputBg} color={inputText} />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Currency</FormLabel>
                            <Input
                                value={formData.currency}
                                onChange={(e) => handleInputChange("currency", e.target.value)}
                                placeholder="Enter Currency"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Origin</FormLabel>
                            <Input
                                value={formData.origin}
                                onChange={(e) => handleInputChange("origin", e.target.value)}
                                placeholder="Enter Origin"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Via HUB</FormLabel>
                            <Input
                                value={formData.viaHub}
                                onChange={(e) => handleInputChange("viaHub", e.target.value)}
                                placeholder="Enter Via HUB"
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                    </HStack>

                    {/* Row 6: Ready as Supplier, Date on stock, Client Access */}
                    <HStack spacing="4" w="100%" flexWrap="wrap">
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Ready as Supplier</FormLabel>
                            <Select
                                value={formData.readyAsSupplier ? "true" : "false"}
                                onChange={(e) => handleInputChange("readyAsSupplier", e.target.value === "true")}
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </Select>
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Date on stock</FormLabel>
                            <Input
                                type="date"
                                value={formData.dateOnStock}
                                onChange={(e) => handleInputChange("dateOnStock", e.target.value)}
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            />
                        </FormControl>
                        <FormControl flex="1" minW="200px">
                            <FormLabel fontSize="sm" color="gray.600">Client Access</FormLabel>
                            <Select
                                value={formData.clientAccess ? "true" : "false"}
                                onChange={(e) => handleInputChange("clientAccess", e.target.value === "true")}
                                size="sm"
                                bg={inputBg}
                                color={inputText}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </Select>
                        </FormControl>
                    </HStack>

                    {/* Row 7: Remarks */}
                    <FormControl w="100%">
                        <FormLabel fontSize="sm" color="gray.600">Remarks</FormLabel>
                        <Textarea
                            value={formData.remarks}
                            onChange={(e) => handleInputChange("remarks", e.target.value)}
                            placeholder="Enter Remarks"
                            size="sm"
                            rows={3}
                            bg={inputBg}
                            color={inputText}
                        />
                    </FormControl>
                </VStack>
            </Box>
        </Box>
    );
}


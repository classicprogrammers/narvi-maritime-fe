import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    Grid,
    GridItem,
    VStack,
    HStack,
    Switch,
    FormErrorMessage,
    useToast,
    Box,
    Text,
    Divider,
    Badge,
} from '@chakra-ui/react';
import { useShippingOrders } from '../../redux/hooks/useShippingOrders';
import { useLookups } from '../../hooks/useLookups';
import { useEntitySelects } from '../../hooks/useEntitySelects';
import { useUser } from '../../redux/hooks/useUser';
import { createNewShippingOrder, updateExistingShippingOrder } from '../../redux/slices/shippingOrdersSlice';
import SearchableSelect from './SearchableSelect';

const ShippingOrderForm = ({
    isOpen,
    onClose,
    order = null,
    mode = 'create' // 'create' or 'edit'
}) => {
    const { createOrder, updateOrder, isCreating, isUpdating, createError, updateError } = useShippingOrders();
    const { getEntityNamesByIds } = useLookups();
    const { user } = useUser();

    const [formData, setFormData] = useState({
        name: '',
        user_id: user?.id || '',
        partner_id: '',
        vessel_id: '',
        destination_id: '',
        quotation_id: '',
        eta_date: '',
        next_action: '',
        est_to_usd: '',
        est_profit_usd: '',
        internal_remark: '',
        client_case_invoice_ref: '',
        done: false,
    });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
    const {
        customers,
        vessels,
        destinations,
        quotations,
        isLoadingCustomers,
        isLoadingVessels,
        isLoadingDestinations,
        isLoadingQuotations,
        errorCustomers,
        errorVessels,
        errorDestinations,
        errorQuotations,
        searchCustomers,
        searchVessels,
        searchDestinations,
        searchQuotations,
    } = useEntitySelects();
    const toast = useToast();

    // Load existing order data when editing
    useEffect(() => {
        if (mode === 'edit' && order) {
            setFormData({
                name: order.name || '',
                user_id: order.user_id || '',
                partner_id: order.partner_id || '',
                vessel_id: order.vessel_id || '',
                destination_id: order.destination_id || '',
                quotation_id: order.quotation_id || '',
                eta_date: order.eta_date ? order.eta_date.split(' ')[0] : '', // Format date for input
                next_action: order.next_action || '',
                est_to_usd: order.est_to_usd || '',
                est_profit_usd: order.est_profit_usd || '',
                internal_remark: order.internal_remark || '',
                client_case_invoice_ref: order.client_case_invoice_ref || '',
                done: order.done || false,
            });
        } else {
            // Reset form for create mode
            setFormData({
                name: '',
                user_id: user?.id || '',
                partner_id: '',
                vessel_id: '',
                destination_id: '',
                quotation_id: '',
                eta_date: '',
                next_action: '',
                est_to_usd: '',
                est_profit_usd: '',
                internal_remark: '',
                client_case_invoice_ref: '',
                done: false,
            });
        }
        setErrors({});
    }, [mode, order, isOpen, user?.id]);

    // Update user_id when user changes
    useEffect(() => {
        if (user?.id && mode === 'create') {
            setFormData(prev => ({
                ...prev,
                user_id: user.id
            }));
        }
    }, [user?.id, mode]);

    // Display Redux errors as toast messages
    useEffect(() => {
        if (createError) {
            toast({
                title: 'Error',
                description: createError,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [createError, toast]);

    useEffect(() => {
        if (updateError) {
            toast({
                title: 'Error',
                description: updateError,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [updateError, toast]);

    // Display entity loading errors as toast messages
    useEffect(() => {
        if (errorCustomers) {
            toast({
                title: 'Error Loading Clients',
                description: errorCustomers,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [errorCustomers, toast]);

    useEffect(() => {
        if (errorVessels) {
            toast({
                title: 'Error Loading Vessels',
                description: errorVessels,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [errorVessels, toast]);

    useEffect(() => {
        if (errorDestinations) {
            toast({
                title: 'Error Loading Destinations',
                description: errorDestinations,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [errorDestinations, toast]);

    useEffect(() => {
        if (errorQuotations) {
            toast({
                title: 'Error Loading Quotations',
                description: errorQuotations,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    }, [errorQuotations, toast]);

    // Load initial data for searchable selects when form opens (only for edit mode)
    useEffect(() => {
        if (isOpen && mode === 'edit' && order) {
            // Only load lookup data for edit mode when we have existing IDs
            const userIds = formData.user_id ? [formData.user_id] : [];
            const partnerIds = formData.partner_id ? [formData.partner_id] : [];
            const vesselIds = formData.vessel_id ? [formData.vessel_id] : [];
            const destinationIds = formData.destination_id ? [formData.destination_id] : [];

            if (userIds.length > 0) getEntityNamesByIds('users', userIds);
            if (partnerIds.length > 0) getEntityNamesByIds('customers', partnerIds);
            if (vesselIds.length > 0) getEntityNamesByIds('vessels', vesselIds);
            if (destinationIds.length > 0) getEntityNamesByIds('destinations', destinationIds);
        }
    }, [isOpen, mode, order, formData.user_id, formData.partner_id, formData.vessel_id, formData.destination_id, getEntityNamesByIds]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Order name is required';
        }

        // user_id is automatically set from current user, no validation needed

        if (!formData.partner_id) {
            newErrors.partner_id = 'Partner/Client is required';
        }

        if (!formData.vessel_id) {
            newErrors.vessel_id = 'Vessel is required';
        }

        if (!formData.quotation_id) {
            newErrors.quotation_id = 'Quotation ID is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        const orderData = {
            // Only include the fields we want to send
            user_id: user?.id || formData.user_id,
            partner_id: formData.partner_id || null,
            vessel_id: formData.vessel_id || null,
            destination_id: formData.destination_id || null,
            quotation_id: formData.quotation_id || null,
            eta_date: formData.eta_date || null,
            next_action: formData.next_action || null,
            est_to_usd: formData.est_to_usd ? parseFloat(formData.est_to_usd) : null,
            est_profit_usd: formData.est_profit_usd ? parseFloat(formData.est_profit_usd) : null,
            internal_remark: formData.internal_remark || null,
            client_case_invoice_ref: formData.client_case_invoice_ref || null,
            done: formData.done || false,
        };

        if (mode === 'create') {
            const result = await createOrder(orderData);
            // Check if the action was rejected
            if (createNewShippingOrder.rejected.match(result)) {
                // Error will be handled by Redux useEffect
                console.error('Create order error:', result.error);
            } else {
                // Success - show success toast
                toast({
                    title: 'Success',
                    description: 'Shipping order created successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                onClose();
            }
            setIsSubmitting(false);
        } else {
            // Pass original order data for comparison
            const result = await updateOrder(order.id, orderData, order);
            // Check if the action was rejected
            if (updateExistingShippingOrder.rejected.match(result)) {
                // Error will be handled by Redux useEffect
                console.error('Update order error:', result.error);
            } else {
                // Success - show success toast
                toast({
                    title: 'Success',
                    description: 'Shipping order updated successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                onClose();
            }
            setIsSubmitting(false);
        }
    };

    const isLoading = isCreating || isUpdating || isSubmitting;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
            <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
            <ModalContent maxW="1000px" borderRadius="xl" boxShadow="2xl">
                <ModalHeader
                    bg="linear-gradient(135deg, #1c4a95 0%, #2c5aa0 100%)"
                    color="white"
                    borderRadius="xl 0 0 0"
                    py="2"
                >
                    <VStack align="start" spacing="2">
                        <Text fontSize="xl" fontWeight="bold">
                            {mode === 'create' ? 'Create New Shipping Order' : 'Edit Shipping Order'}
                        </Text>
                        {mode === 'edit' && order && (
                            <Text fontSize="lg" opacity="0.9">
                                {order.name}
                            </Text>
                        )}
                    </VStack>
                </ModalHeader>
                <ModalCloseButton color="white" size="lg" />

                <ModalBody p="6">
                    <VStack spacing="6" align="stretch">
                        {/* Basic Information */}
                        <Box>
                            <Text fontSize="md" fontWeight="semibold" color="gray.700" mb="4">
                                Basic Information
                            </Text>
                            <Grid templateColumns="repeat(2, 1fr)" gap="4">
                                <GridItem>
                                    <FormControl isRequired isInvalid={errors.name}>
                                        <FormLabel fontSize="sm" color="gray.600">Order Name</FormLabel>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Enter order name"
                                            size="md"
                                        />
                                        <FormErrorMessage>{errors.name}</FormErrorMessage>
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl isRequired isInvalid={errors.quotation_id}>
                                        <FormLabel fontSize="sm" color="gray.600">Quotation</FormLabel>
                                        <SearchableSelect
                                            value={formData.quotation_id}
                                            onChange={(value) => handleInputChange('quotation_id', value)}
                                            placeholder="Select quotation..."
                                            options={quotations}
                                            isLoading={isLoadingQuotations}
                                            onSearch={searchQuotations}
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => `${option.quotation_number || option.name || `Quotation ${option.id}`}`}
                                            error={errors.quotation_id}
                                            isRequired
                                        />
                                        <FormErrorMessage>{errors.quotation_id}</FormErrorMessage>
                                    </FormControl>
                                </GridItem>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Entity Information */}
                        <Box>
                            <Text fontSize="md" fontWeight="semibold" color="gray.700" mb="4">
                                Entity Information
                            </Text>
                            <Grid templateColumns="repeat(2, 1fr)" gap="4">
                                <GridItem>
                                    <FormControl isRequired isInvalid={errors.partner_id}>
                                        <FormLabel fontSize="sm" color="gray.600">Partner/Client</FormLabel>
                                        <SearchableSelect
                                            value={formData.partner_id}
                                            onChange={(value) => handleInputChange('partner_id', value)}
                                            placeholder="Select client..."
                                            options={customers}
                                            isLoading={isLoadingCustomers}
                                            onSearch={searchCustomers}
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => `${option.name || option.email || `Client ${option.id}`}`}
                                            error={errors.partner_id}
                                            isRequired
                                        />
                                        <FormErrorMessage>{errors.partner_id}</FormErrorMessage>
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl isRequired isInvalid={errors.vessel_id}>
                                        <FormLabel fontSize="sm" color="gray.600">Vessel</FormLabel>
                                        <SearchableSelect
                                            value={formData.vessel_id}
                                            onChange={(value) => handleInputChange('vessel_id', value)}
                                            placeholder="Select vessel..."
                                            options={vessels}
                                            isLoading={isLoadingVessels}
                                            onSearch={searchVessels}
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => `${option.name || option.imo_number || `Vessel ${option.id}`}`}
                                            error={errors.vessel_id}
                                            isRequired
                                        />
                                        <FormErrorMessage>{errors.vessel_id}</FormErrorMessage>
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl isInvalid={errors.destination_id}>
                                        <FormLabel fontSize="sm" color="gray.600">Destination</FormLabel>
                                        <SearchableSelect
                                            value={formData.destination_id}
                                            onChange={(value) => handleInputChange('destination_id', value)}
                                            placeholder="Select destination..."
                                            options={destinations}
                                            isLoading={isLoadingDestinations}
                                            onSearch={searchDestinations}
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => `${option.name || option.country || `Destination ${option.id}`}`}
                                            error={errors.destination_id}
                                        />
                                        <FormErrorMessage>{errors.destination_id}</FormErrorMessage>
                                    </FormControl>
                                </GridItem>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Additional Information */}
                        <Box>
                            <Text fontSize="md" fontWeight="semibold" color="gray.700" mb="4">
                                Additional Information
                            </Text>
                            <Grid templateColumns="repeat(2, 1fr)" gap="4">
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">ETA Date</FormLabel>
                                        <Input
                                            type="date"
                                            value={formData.eta_date}
                                            onChange={(e) => handleInputChange('eta_date', e.target.value)}
                                            size="md"
                                        />
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">Next Action</FormLabel>
                                        <Input
                                            type="date"
                                            value={formData.next_action || ""}
                                            onChange={(e) => handleInputChange('next_action', e.target.value)}
                                            placeholder="Select next action date"
                                            size="md"
                                        />
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">Est. to USD</FormLabel>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.est_to_usd}
                                            onChange={(e) => handleInputChange('est_to_usd', e.target.value)}
                                            placeholder="Enter estimated amount in USD"
                                            size="md"
                                        />
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">Est. Profit USD</FormLabel>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.est_profit_usd}
                                            onChange={(e) => handleInputChange('est_profit_usd', e.target.value)}
                                            placeholder="Enter estimated profit in USD"
                                            size="md"
                                        />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Remarks */}
                        <Box>
                            <Text fontSize="md" fontWeight="semibold" color="gray.700" mb="4">
                                Remarks
                            </Text>
                            <Grid templateColumns="repeat(1, 1fr)" gap="4">
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">Internal Remark</FormLabel>
                                        <Textarea
                                            value={formData.internal_remark}
                                            onChange={(e) => handleInputChange('internal_remark', e.target.value)}
                                            placeholder="Enter internal remarks"
                                            rows={3}
                                            resize="vertical"
                                        />
                                    </FormControl>
                                </GridItem>

                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color="gray.600">Client Case Invoice Ref</FormLabel>
                                        <Textarea
                                            value={formData.client_case_invoice_ref}
                                            onChange={(e) => handleInputChange('client_case_invoice_ref', e.target.value)}
                                            placeholder="Enter client case invoice reference"
                                            rows={3}
                                            resize="vertical"
                                        />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                        </Box>

                        <Divider />

                        {/* Status */}
                        <Box>
                            <Text fontSize="md" fontWeight="semibold" color="gray.700" mb="4">
                                Status
                            </Text>
                            <HStack spacing="4">
                                <FormControl display="flex" alignItems="center">
                                    <FormLabel htmlFor="done" mb="0" fontSize="sm" color="gray.600">
                                        Mark as Done
                                    </FormLabel>
                                    <Switch
                                        id="done"
                                        isChecked={formData.done}
                                        onChange={(e) => handleInputChange('done', e.target.checked)}
                                        colorScheme="green"
                                    />
                                </FormControl>
                                {formData.done && (
                                    <Badge colorScheme="green" size="lg" px="3" py="1" borderRadius="full">
                                        ✓ Completed
                                    </Badge>
                                )}
                            </HStack>
                        </Box>

                        {/* Error Messages */}
                        {(createError || updateError) && (
                            <Box bg="red.50" p="4" borderRadius="md" border="1px solid" borderColor="red.200">
                                <Text color="red.600" fontSize="sm">
                                    {mode === 'create' ? createError : updateError}
                                </Text>
                            </Box>
                        )}
                    </VStack>
                </ModalBody>

                <ModalFooter
                    bg="gray.50"
                    p="6"
                    borderTop="1px solid"
                    borderColor="gray.200"
                    borderRadius="0 0 xl xl"
                >
                    <HStack spacing="3">
                        <Button variant="outline" onClick={onClose} isDisabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleSubmit}
                            isLoading={isLoading}
                            loadingText={mode === 'create' ? 'Creating...' : 'Updating...'}
                        >
                            {mode === 'create' ? 'Create Order' : 'Update Order'}
                        </Button>
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ShippingOrderForm;

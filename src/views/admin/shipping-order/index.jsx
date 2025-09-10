import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Icon,
    HStack,
    IconButton,
    useColorModeValue,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    VStack,
    Grid,
    Divider,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdRefresh,
    MdVisibility,
    MdEdit,
    MdDelete,
} from "react-icons/md";
import { useShippingOrders } from "../../../redux/hooks/useShippingOrders";
import { useLookups } from "../../../hooks/useLookups";
import ShippingOrderForm from "../../../components/forms/ShippingOrderForm";

export default function ShippingOrder() {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [deletingOrder, setDeletingOrder] = useState(null);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isFormOpen,
        onOpen: onFormOpen,
        onClose: onFormClose
    } = useDisclosure();
    const {
        isOpen: isDeleteOpen,
        onOpen: onDeleteOpen,
        onClose: onDeleteClose
    } = useDisclosure();

    const toast = useToast();

    // Redux state and actions
    const {
        orders,
        count,
        isLoading,
        isDeleting,
        error,
        deleteError,
        fetchOrders,
        deleteOrder,
        clearError,
    } = useShippingOrders();

    // Lookup service for getting entity names
    const {
        getCachedName,
        getEntityNameById,
    } = useLookups();

    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");

    // Fetch orders on component mount (only if not already loaded)
    useEffect(() => {
        if (orders.length === 0 && !isLoading) {
            fetchOrders();
        }
    }, [fetchOrders, orders.length, isLoading]);

    // Trigger name lookups when orders are loaded
    useEffect(() => {
        if (orders.length > 0) {
            // Get unique IDs for each entity type
            const userIds = [...new Set(orders.map(order => order.user_id).filter(Boolean))];
            const partnerIds = [...new Set(orders.map(order => order.partner_id).filter(Boolean))];
            const vesselIds = [...new Set(orders.map(order => order.vessel_id).filter(Boolean))];
            const destinationIds = [...new Set(orders.map(order => order.destination_id).filter(Boolean))];

            // Trigger lookups for each entity type
            userIds.forEach(id => getEntityNameById('users', id));
            partnerIds.forEach(id => getEntityNameById('customers', id));
            vesselIds.forEach(id => getEntityNameById('vessels', id));
            destinationIds.forEach(id => getEntityNameById('destinations', id));
        }
    }, [orders, getEntityNameById]);

    const handleRefresh = useCallback(() => {
        fetchOrders();
        clearError();
    }, [fetchOrders, clearError]);

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        onOpen();
    };

    const handleCreateOrder = () => {
        setEditingOrder(null);
        onFormOpen();
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        onFormOpen();
    };

    const handleDeleteOrder = (order) => {
        setDeletingOrder(order);
        onDeleteOpen();
    };

    const confirmDelete = async () => {
        if (!deletingOrder) return;

        try {
            await deleteOrder(deletingOrder.id);
            toast({
                title: 'Success',
                description: 'Shipping order deleted successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onDeleteClose();
            setDeletingOrder(null);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete shipping order',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleFormClose = () => {
        setEditingOrder(null);
        onFormClose();
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString();
    };

    // Show loading state
    if (isLoading && orders.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <VStack spacing="4">
                    <Spinner size="xl" color="#1c4a95" />
                    <Text>Loading shipping orders...</Text>
                </VStack>
            </Box>
        );
    }

    // Show error state
    if (error && orders.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Alert status="error">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Error loading shipping orders!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Box>
                </Alert>
                <Button mt="4" onClick={handleRefresh} leftIcon={<Icon as={MdRefresh} />}>
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="12222">
            {/* Header */}
            <Flex
                bg="gray.100"
                borderBottom="1px"
                borderColor={borderColor}
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
            >
                <HStack spacing="4">
                    <Button
                        leftIcon={<Icon as={MdAdd} />}
                        bg="#1c4a95"
                        color="white"
                        size="sm"
                        px="6"
                        py="3"
                        borderRadius="md"
                        onClick={handleCreateOrder}
                        _hover={{ bg: "#173f7c" }}
                    >
                        New Order
                    </Button>
                        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                        Shipping Orders ({count} orders)
                        </Text>
                </HStack>

                <HStack spacing="2">
                    <IconButton
                        size="sm"
                        icon={<Icon as={MdRefresh} color={textColor} />}
                        variant="ghost"
                        aria-label="Refresh"
                        onClick={handleRefresh}
                        isLoading={isLoading}
                    />
                </HStack>
            </Flex>

            {/* Main Table */}
            <Box bg="white" p="6">
                {orders.length === 0 ? (
                    <Box textAlign="center" py="8">
                        <Text color="gray.500" fontSize="lg">No shipping orders available.</Text>
                    </Box>
                ) : (
                    <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                    <Th>Order Name</Th>
                                    <Th>ID</Th>
                                    <Th>Status</Th>
                                    <Th>User</Th>
                                    <Th>Partner/Customer</Th>
                                    <Th>Vessel</Th>
                                    <Th>Destination</Th>
                                    <Th>Create Date</Th>
                                    <Th>Quotation ID</Th>
                                    <Th>Actions</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                {orders.map((order) => (
                                    <Tr key={order.id} _hover={{ bg: "gray.50" }}>
                                        <Td fontWeight="medium">{order.name}</Td>
                                        <Td>{order.id}</Td>
                                        <Td>
                                            <Badge colorScheme={order.done ? "green" : "orange"}>
                                                {order.done ? "Done" : "Pending"}
                                            </Badge>
                                                    </Td>
                                        <Td>
                                            <Text fontSize="sm" color={getCachedName('users', order.user_id) === 'Loading...' ? 'gray.400' : 'inherit'}>
                                                {getCachedName('users', order.user_id)}
                                            </Text>
                                                    </Td>
                                        <Td>
                                            <Text fontSize="sm" color={getCachedName('customers', order.partner_id) === 'Loading...' ? 'gray.400' : 'inherit'}>
                                                {getCachedName('customers', order.partner_id)}
                                            </Text>
                                                    </Td>
                                        <Td>
                                            <Text fontSize="sm" color={getCachedName('vessels', order.vessel_id) === 'Loading...' ? 'gray.400' : 'inherit'}>
                                                {getCachedName('vessels', order.vessel_id)}
                                            </Text>
                                                    </Td>
                                        <Td>
                                            <Text fontSize="sm" color={getCachedName('destinations', order.destination_id) === 'Loading...' ? 'gray.400' : 'inherit'}>
                                                {getCachedName('destinations', order.destination_id)}
                                            </Text>
                                                    </Td>
                                        <Td>{formatDate(order.create_date)}</Td>
                                        <Td>{order.quotation_id}</Td>
                                        <Td>
                                            <HStack spacing="2">
                                                <span
                                                    onClick={() => handleViewDetails(order)}
                                                >
                                                    <Icon as={MdVisibility} style={{ fontSize: 'large', cursor: 'pointer' }} />
                                                </span>
                                                <span
                                                    onClick={() => handleEditOrder(order)}
                                                >
                                                    <Icon as={MdEdit} style={{ fontSize: 'large', cursor: 'pointer' }} />
                                                </span>
                                                <span
                                                    onClick={() => handleDeleteOrder(order)}
                                                >
                                                    <Icon as={MdDelete} style={{ fontSize: 'large', cursor: 'pointer' }} />
                                                </span>
                                            </HStack>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                )}
            </Box>

            {/* Details Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="4xl">
                <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
                <ModalContent maxW="900px" borderRadius="xl" boxShadow="2xl">
                    <ModalHeader
                        bg="linear-gradient(135deg, #1c4a95 0%, #2c5aa0 100%)"
                        color="white"
                        borderRadius="xl 0 0 0"
                        py="6"
                    >
                        <VStack align="start" spacing="2">
                            <Text fontSize="xl" fontWeight="bold">
                                Order Details
                            </Text>
                            <Text fontSize="lg" opacity="0.9">
                                {selectedOrder?.name}
                            </Text>
                        </VStack>
                    </ModalHeader>
                    <ModalCloseButton color="white" size="lg" />
                    <ModalBody p="0">
                        {selectedOrder && (
                            <Box>
                                {/* Status Banner */}
                                <Box
                                    bg={selectedOrder.done ? "green.50" : "orange.50"}
                                    borderLeft="4px solid"
                                    borderLeftColor={selectedOrder.done ? "green.400" : "orange.400"}
                                    p="4"
                                    mx="6"
                        mt="6"
                                    borderRadius="md"
                                >
                                    <HStack spacing="3">
                                        <Badge
                                            colorScheme={selectedOrder.done ? "green" : "orange"}
                                            size="lg"
                                            px="3"
                                            py="1"
                                            borderRadius="full"
                                        >
                                            {selectedOrder.done ? "✓ Completed" : "⏳ Pending"}
                                        </Badge>
                                        <Text fontSize="sm" color="gray.600">
                                            Order Status
                                        </Text>
                                    </HStack>
                                </Box>

                                {/* Main Content */}
                                <Box p="6">
                                    <Grid templateColumns="repeat(2, 1fr)" gap="8">
                                        {/* Order Information Card */}
                                        <Box
                                            bg="gray.50"
                                            p="6"
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor="gray.200"
                                        >
                                            <VStack align="start" spacing="4">
                                                <HStack spacing="2">
                                                    <Box w="3" h="3" bg="blue.500" borderRadius="full" />
                                                    <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                        Order Information
                                                    </Text>
                                                </HStack>

                                                <VStack align="start" spacing="3" w="full">
                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order ID
                                                        </Text>
                                                        <Text fontSize="lg" fontWeight="medium" color="gray.800">
                                                            #{selectedOrder.id}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order Name
                                                        </Text>
                                                        <Text fontSize="lg" fontWeight="medium" color="gray.800">
                                                            {selectedOrder.name}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Create Date
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700">
                                                            {formatDate(selectedOrder.create_date)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order Date
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700">
                                                            {formatDate(selectedOrder.date_order)}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                            </VStack>
                                        </Box>

                                        {/* Entity Information Card */}
                                        <Box
                                            bg="blue.50"
                                            p="6"
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor="blue.200"
                                        >
                                            <VStack align="start" spacing="4">
                                                <HStack spacing="2">
                                                    <Box w="3" h="3" bg="blue.500" borderRadius="full" />
                                                    <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                        Entity Information
                                                    </Text>
                            </HStack>

                                                <VStack align="start" spacing="3" w="full">
                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            User
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('users', selectedOrder.user_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('users', selectedOrder.user_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Partner/Customer
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('customers', selectedOrder.partner_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('customers', selectedOrder.partner_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Vessel
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('vessels', selectedOrder.vessel_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('vessels', selectedOrder.vessel_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Destination
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('destinations', selectedOrder.destination_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('destinations', selectedOrder.destination_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Quotation ID
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                            #{selectedOrder.quotation_id}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                            </VStack>
                                        </Box>
                                    </Grid>

                                    {/* Additional Information Card */}
                                    <Box
                                        bg="purple.50"
                                        p="6"
                                        borderRadius="lg"
                                        border="1px solid"
                                        borderColor="purple.200"
                                        mt="6"
                                    >
                                        <VStack align="start" spacing="4">
                                            <HStack spacing="2">
                                                <Box w="3" h="3" bg="purple.500" borderRadius="full" />
                                                <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                    Additional Information
                                                </Text>
                                </HStack>

                                            <Grid templateColumns="repeat(3, 1fr)" gap="6" w="full">
                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        ETA Date
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700">
                                                        {formatDate(selectedOrder.eta_date)}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Est. to USD
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                        {selectedOrder.est_to_usd || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Est. Profit USD
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                        {selectedOrder.est_profit_usd || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Deadline Info
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700">
                                                        {selectedOrder.deadline_info || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box colSpan={2}>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Internal Remark
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontStyle={selectedOrder.internal_remark ? "normal" : "italic"}>
                                                        {selectedOrder.internal_remark || 'No internal remarks'}
                                                    </Text>
                                                </Box>

                                                <Box colSpan={3}>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Client Remark
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontStyle={selectedOrder.client_remark ? "normal" : "italic"}>
                                                        {selectedOrder.client_remark || 'No client remarks'}
                                                    </Text>
                                                </Box>
                                            </Grid>
                                        </VStack>
                                    </Box>
                                </Box>

                                {/* Footer Actions */}
                                <Box
                                    bg="gray.50"
                                    p="6"
                                    borderTop="1px solid"
                                    borderColor="gray.200"
                                    borderRadius="0 0 xl xl"
                                >
                        <Flex justify="space-between" align="center">
                            <Text fontSize="sm" color="gray.500">
                                            Last updated: {formatDate(selectedOrder.create_date)}
                            </Text>
                                        <HStack spacing="3">
                                            <Button size="sm" variant="outline" colorScheme="blue">
                                                Edit Order
                                            </Button>
                                            <Button size="sm" colorScheme="blue">
                                                Export Details
                                            </Button>
                                        </HStack>
                        </Flex>
                    </Box>
                </Box>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Shipping Order Form Modal */}
            <ShippingOrderForm
                isOpen={isFormOpen}
                onClose={handleFormClose}
                order={editingOrder}
                mode={editingOrder ? 'edit' : 'create'}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteOpen}
                onClose={onDeleteClose}
                leastDestructiveRef={undefined}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Shipping Order
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete the shipping order "{deletingOrder?.name}"?
                            This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button onClick={onDeleteClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={confirmDelete}
                                ml={3}
                                isLoading={isDeleting}
                                loadingText="Deleting..."
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
} 

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Input,
    InputGroup,
    InputLeftElement,
    InputRightElement,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Icon,
    IconButton,
    useColorModeValue,
    useDisclosure,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    FormControl,
    FormLabel,
    Switch,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    HStack,
} from "@chakra-ui/react";
import {
    MdSearch,
    MdAdd,
    MdEdit,
    MdDelete,
    MdPeople,
    MdVisibility,
    MdVisibilityOff,
} from "react-icons/md";
import Card from "components/card/Card";
import { listUsersApi, signupUserApi, updateUserApi, forgotPasswordApi } from "api/users";

export default function Users() {
    const textColor = useColorModeValue("secondaryGray.900", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputText = useColorModeValue("gray.700", "white");
    const toast = useToast();

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const {
        isOpen: isModalOpen,
        onOpen: openModal,
        onClose: closeModal,
    } = useDisclosure();

    const {
        isOpen: isDeleteOpen,
        onOpen: openDelete,
        onClose: closeDelete,
    } = useDisclosure();
    // no separate reset password modal; using email-based flow

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        active: true,
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return users;
        return users.filter((u) =>
            [u.name, u.email, u.active ? "active" : "inactive"].some((v) =>
                String(v).toLowerCase().includes(term)
            )
        );
    }, [searchTerm, users]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listUsersApi();
            // Try to normalize a few common shapes:
            // - direct array
            // - { users: [...] }
            // - { result: [...] }
            // - { data: [...] }
            const list =
                Array.isArray(data) ? data :
                    Array.isArray(data?.users) ? data.users :
                        Array.isArray(data?.result) ? data.result :
                            Array.isArray(data?.data) ? data.data :
                                [];
            setUsers(list.map((u, idx) => ({
                id: u.id ?? u.user_id ?? idx + 1,
                name: u.name ?? u.full_name ?? "",
                email: u.email ?? u.login ?? "",
                active: typeof u.active === "boolean" ? u.active : (u.status ? String(u.status).toLowerCase() === "active" : true),
                ...u,
            })));
        } catch (e) {
            // handled globally in API layer
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            active: true,
            password: "",
        });
        setEditingUser(null);
    };

    const handleCreateClick = () => {
        resetForm();
        openModal();
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            active: Boolean(user.active),
            password: "",
        });
        openModal();
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        openDelete();
    };

    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        const save = async () => {
            try {
                if (editingUser) {
                    // Do not allow updating email here
                    const payload = { id: editingUser.id, name: formData.name, active: formData.active };
                    const res = await updateUserApi(payload);
                    const successMsg = res?.result?.message || res?.message || "User updated successfully";
                    // refresh list from backend
                    await fetchUsers();
                    toast({
                        title: "Success",
                        description: successMsg,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                } else {
                    // Do not persist password in local users list
                    const payload = { name: formData.name, email: formData.email, active: formData.active, password: formData.password };
                    const res = await signupUserApi(payload);
                    // Try to resolve created id from backend response
                    // refresh list from backend
                    await fetchUsers();
                    const successMsg = res?.result?.message || res?.message || "User created successfully";
                    toast({
                        title: "Success",
                        description: successMsg,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                }
                closeModal();
                resetForm();
            } catch (e) {
                // Error modal shown via API layer
            }
        };
        save();
    };

    const confirmDelete = () => {
        const run = async () => {
            if (!userToDelete) return;
            setIsDeleting(true);
            try {
                // Soft delete -> active: false
                const res = await updateUserApi({ id: userToDelete.id, active: false });
                await fetchUsers();
                const successMsg = res?.result?.message || res?.message || "User deactivated successfully";
                toast({
                    title: "Success",
                    description: successMsg,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            } catch (e) {
                // handled globally
            } finally {
                setIsDeleting(false);
                setUserToDelete(null);
                closeDelete();
            }
        };
        run();
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Card px="24px" pb="24px">
                <Flex align="center" justify="space-between" mb="20px">
                    <HStack spacing="10px">
                        <Icon as={MdPeople} w="22px" h="22px" color={textColor} />
                        <Text color={textColor} fontSize="xl" fontWeight="700">
                            Users
                        </Text>
                    </HStack>
                    <Button leftIcon={<MdAdd />} colorScheme="blue" onClick={handleCreateClick}>
                        New User
                    </Button>
                </Flex>

                <Flex mb="16px" align="center" justify="space-between">
                    <InputGroup maxW="320px">
                        <InputLeftElement pointerEvents="none">
                            <Icon as={MdSearch} color="gray.400" />
                        </InputLeftElement>
                        <Input
                            bg={inputBg}
                            color={inputText}
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </Flex>

                <Box overflowX="auto">
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th borderColor={borderColor}>Name</Th>
                                <Th borderColor={borderColor}>Email</Th>
                                <Th borderColor={borderColor}>Status</Th>
                                <Th borderColor={borderColor} textAlign="right">
                                    Actions
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {isLoading ? (
                                <Tr>
                                    <Td colSpan={4} borderColor={borderColor}>
                                        Loading users...
                                    </Td>
                                </Tr>
                            ) : filteredUsers.length === 0 ? (
                                <Tr>
                                    <Td colSpan={4} borderColor={borderColor}>
                                        No users found.
                                    </Td>
                                </Tr>
                            ) : filteredUsers.map((user) => (
                                <Tr key={user.id}>
                                    <Td borderColor={borderColor}>{user.name}</Td>
                                    <Td borderColor={borderColor}>{user.email}</Td>
                                    <Td borderColor={borderColor}>{user.active ? "Active" : "Inactive"}</Td>
                                    <Td borderColor={borderColor}>
                                        <Flex justify="flex-end" gap="8px">
                                            <IconButton
                                                aria-label="Edit user"
                                                icon={<MdEdit />}
                                                size="sm"
                                                onClick={() => handleEditClick(user)}
                                            />
                                            <IconButton
                                                aria-label="Delete user"
                                                icon={<MdDelete />}
                                                size="sm"
                                                colorScheme="red"
                                                variant="outline"
                                                onClick={() => handleDeleteClick(user)}
                                            />
                                        </Flex>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => { closeModal(); resetForm(); }}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{editingUser ? "Edit User" : "Create User"}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl mb="12px" isRequired>
                            <FormLabel>Name</FormLabel>
                            <Input
                                value={formData.name}
                                onChange={(e) => handleFormChange("name", e.target.value)}
                                placeholder="Enter full name"
                            />
                        </FormControl>
                        <FormControl mb="12px" isRequired>
                            <FormLabel>Email</FormLabel>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleFormChange("email", e.target.value)}
                                placeholder="Enter email address"
                                isDisabled={Boolean(editingUser)}
                            />
                        </FormControl>
                        {editingUser && (
                            <Button
                                size="sm"
                                variant="link"
                                colorScheme="blue"
                                mb="12px"
                                onClick={async () => {
                                    try {
                                        const res = await forgotPasswordApi(formData.email);
                                        const msg = res?.result?.message || res?.message || "A new password has been sent to your email";
                                        toast({
                                            title: "Email Sent",
                                            description: msg,
                                            status: "success",
                                            duration: 4000,
                                            isClosable: true,
                                        });
                                    } catch (e) {
                                        // handled globally by API modal
                                    }
                                }}
                            >
                                Forgot Password
                            </Button>
                        )}
                        {!editingUser && (
                            <FormControl mb="12px" isRequired>
                                <FormLabel>Password</FormLabel>
                                <InputGroup>
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => handleFormChange("password", e.target.value)}
                                        placeholder="Enter a password"
                                    />
                                    <InputRightElement width="3rem">
                                        <IconButton
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowPassword((v) => !v)}
                                            icon={showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                        />
                                    </InputRightElement>
                                </InputGroup>
                            </FormControl>
                        )}
                        <FormControl display="flex" alignItems="center" mb="12px">
                            <FormLabel mb="0">Active</FormLabel>
                            <Switch
                                isChecked={formData.active}
                                onChange={(e) => handleFormChange("active", e.target.checked)}
                                colorScheme="blue"
                            />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={() => { closeModal(); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button colorScheme="blue" onClick={handleSubmit}>
                            {editingUser ? "Update" : "Create"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


            <AlertDialog
                isOpen={isDeleteOpen}
                leastDestructiveRef={undefined}
                onClose={closeDelete}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete User
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure? This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button onClick={closeDelete}>Cancel</Button>
                            <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isDeleting}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}



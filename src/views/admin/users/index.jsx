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
  Select,
  Textarea,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
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
import {
  createClientLoginApi,
  deleteClientLoginApi,
  getClientLoginApi,
  listClientLoginApi,
  updateClientLoginApi,
} from "api/clientLogin";
import { getCustomersForSelect } from "api/entitySelects";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { useUser } from "../../../redux/hooks/useUser";

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
  const [showPassword, setShowPassword] = useState(false);

  const [clientLogins, setClientLogins] = useState([]);
  const [isClientListLoading, setIsClientListLoading] = useState(false);
  const [clientSearchEmail, setClientSearchEmail] = useState("");
  const [clientActiveFilter, setClientActiveFilter] = useState("all");
  const [clientOptions, setClientOptions] = useState([]);
  const [isClientSubmitting, setIsClientSubmitting] = useState(false);
  const [editingClientLogin, setEditingClientLogin] = useState(null);
  const [clientLoginToDelete, setClientLoginToDelete] = useState(null);
  const [viewingClientLogin, setViewingClientLogin] = useState(null);
  const [isClientViewLoading, setIsClientViewLoading] = useState(false);
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    client_id: "",
    email: "",
    password: "",
    confirm_password: "",
    active: true,
  });

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
  const {
    isOpen: isClientModalOpen,
    onOpen: openClientModal,
    onClose: closeClientModal,
  } = useDisclosure();
  const {
    isOpen: isClientDeleteOpen,
    onOpen: openClientDelete,
    onClose: closeClientDelete,
  } = useDisclosure();
  const {
    isOpen: isClientViewOpen,
    onOpen: openClientView,
    onClose: closeClientView,
  } = useDisclosure();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    active: true,
    password: "",
    user_type: "user",
  });

  const { user: currentUser } = useUser();
  const isAdmin = currentUser?.user_type === "admin";

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
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : Array.isArray(data?.result)
            ? data.result
            : Array.isArray(data?.data)
              ? data.data
              : [];
      setUsers(
        list.map((u, idx) => ({
          id: u.id ?? u.user_id ?? idx + 1,
          name: u.name ?? u.full_name ?? "",
          email: u.email ?? u.login ?? "",
          active: typeof u.active === "boolean" ? u.active : (u.status ? String(u.status).toLowerCase() === "active" : true),
          user_type: u.user_type || "user",
          ...u,
        }))
      );
    } catch (e) {
      // handled in API layer
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchClientPartners = useCallback(async () => {
    try {
      const customers = await getCustomersForSelect();
      const normalized = (Array.isArray(customers) ? customers : [])
        .filter((item) => item?.is_client !== false)
        .map((item) => ({
          id: item.id,
          name: item.name || item.display_name || `Client ${item.id}`,
        }));
      setClientOptions(normalized);
    } catch (e) {
      setClientOptions([]);
    }
  }, []);

  const fetchClientLogins = useCallback(async () => {
    setIsClientListLoading(true);
    try {
      const params = {};
      if (clientSearchEmail.trim()) params.email = clientSearchEmail.trim();
      if (clientActiveFilter !== "all") params.active = clientActiveFilter;
      const data = await listClientLoginApi(params);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.result?.data) ? data.result.data : [];
      setClientLogins(list);
    } catch (e) {
      setClientLogins([]);
    } finally {
      setIsClientListLoading(false);
    }
  }, [clientSearchEmail, clientActiveFilter]);

  useEffect(() => {
    fetchUsers();
    fetchClientPartners();
  }, [fetchUsers, fetchClientPartners]);

  useEffect(() => {
    fetchClientLogins();
  }, [fetchClientLogins]);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      active: true,
      password: "",
      user_type: "user",
    });
    setEditingUser(null);
  };

  const resetClientForm = () => {
    setClientFormData({
      client_id: "",
      email: "",
      password: "",
      confirm_password: "",
      active: true,
    });
    setShowClientPassword(false);
    setEditingClientLogin(null);
  };

  const handleCreateClick = () => {
    if (!isAdmin) return;
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
      user_type: user.user_type || "user",
    });
    openModal();
  };

  const handleDeleteClick = (user) => {
    if (!isAdmin) return;
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
          const payload = { id: editingUser.id, name: formData.name, active: formData.active, user_type: formData.user_type };
          const res = await updateUserApi(payload);
          await fetchUsers();
          toast({
            title: "Success",
            description: res?.result?.message || res?.message || "User updated successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          const payload = {
            name: formData.name,
            email: formData.email,
            active: formData.active,
            password: formData.password,
            user_type: formData.user_type,
          };
          const res = await signupUserApi(payload);
          await fetchUsers();
          toast({
            title: "Success",
            description: res?.result?.message || res?.message || "User created successfully",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
        closeModal();
        resetForm();
      } catch (e) {
        // handled in API layer
      }
    };
    save();
  };

  const confirmDelete = () => {
    const run = async () => {
      if (!userToDelete) return;
      setIsDeleting(true);
      try {
        const res = await updateUserApi({ id: userToDelete.id, active: false });
        await fetchUsers();
        toast({
          title: "Success",
          description: res?.result?.message || res?.message || "User deactivated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (e) {
        // handled in API layer
      } finally {
        setIsDeleting(false);
        setUserToDelete(null);
        closeDelete();
      }
    };
    run();
  };

  const openCreateClientLogin = () => {
    if (!isAdmin) return;
    resetClientForm();
    openClientModal();
  };

  const openEditClientLogin = async (item) => {
    if (!isAdmin) return;
    try {
      const res = await getClientLoginApi(item.id);
      const fetched = res?.data || res?.result?.data || item;
      setEditingClientLogin(item);
      setClientFormData({
        client_id: String(fetched?.client_id ?? item.client_id ?? ""),
        email: fetched?.email ?? item.email ?? "",
        password: "",
        confirm_password: "",
        active: typeof fetched?.active === "boolean" ? fetched.active : Boolean(item.active),
      });
      openClientModal();
    } catch (e) {
      // handled in API layer
    }
  };

  const handleClientFormChange = (field, value) => {
    setClientFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openViewClientLogin = async (item) => {
    setIsClientViewLoading(true);
    try {
      const res = await getClientLoginApi(item.id);
      const fetched = res?.data || res?.result?.data || item;
      setViewingClientLogin({
        ...item,
        ...fetched,
      });
      openClientView();
    } catch (_e) {
      // handled in API layer
    } finally {
      setIsClientViewLoading(false);
    }
  };

  const clientAccessDetailsText = useMemo(() => {
    if (!viewingClientLogin) return "";
    return [
      `Name: ${viewingClientLogin?.client_name || "-"}`,
      `Email: ${viewingClientLogin?.email || "-"}`,
      `Password: ${viewingClientLogin?.password || "-"}`,
      "Login Link: https://narvi-maritime-fe.vercel.app/client/login",
    ].join("\n");
  }, [viewingClientLogin]);

  const submitClientLogin = async () => {
    const hasPassword = Boolean(clientFormData.password || clientFormData.confirm_password);
    if (!editingClientLogin && !clientFormData.client_id) {
      toast({ title: "Client is required", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    if (!editingClientLogin && !clientFormData.email.trim()) {
      toast({ title: "Email is required", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    if (!editingClientLogin && !clientFormData.password) {
      toast({ title: "Password is required", status: "warning", duration: 2500, isClosable: true });
      return;
    }
    if (hasPassword && clientFormData.password !== clientFormData.confirm_password) {
      toast({ title: "Passwords do not match", status: "warning", duration: 2500, isClosable: true });
      return;
    }

    setIsClientSubmitting(true);
    try {
      if (editingClientLogin) {
        const payload = { id: editingClientLogin.id };
        if (clientFormData.email.trim()) payload.email = clientFormData.email.trim();
        if (hasPassword) {
          payload.password = clientFormData.password;
          payload.confirm_password = clientFormData.confirm_password;
        }
        payload.active = Boolean(clientFormData.active);
        const res = await updateClientLoginApi(payload);
        toast({
          title: "Success",
          description: res?.result?.message || res?.message || "Client access updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const payload = {
          client_id: Number(clientFormData.client_id),
          email: clientFormData.email.trim(),
          password: clientFormData.password,
          confirm_password: clientFormData.confirm_password,
        };
        const res = await createClientLoginApi(payload);
        toast({
          title: "Success",
          description: res?.result?.message || res?.message || "Client access created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      closeClientModal();
      resetClientForm();
      fetchClientLogins();
    } catch (e) {
      // handled in API layer
    } finally {
      setIsClientSubmitting(false);
    }
  };

  const confirmClientDelete = async () => {
    if (!clientLoginToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteClientLoginApi(clientLoginToDelete.id);
      toast({
        title: "Success",
        description: res?.result?.message || res?.message || "Client access deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchClientLogins();
    } catch (e) {
      // handled in API layer
    } finally {
      setIsDeleting(false);
      setClientLoginToDelete(null);
      closeClientDelete();
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card px="24px" pb="24px">
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab fontWeight="semibold">User</Tab>
            <Tab fontWeight="semibold">Client Access</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={6}>
              <Flex align="center" justify="space-between" mb="20px">
                <HStack spacing="10px">
                  <Icon as={MdPeople} w="22px" h="22px" color={textColor} />
                  <Text color={textColor} fontSize="xl" fontWeight="700">
                    Users
                  </Text>
                </HStack>
                {isAdmin && (
                  <Button leftIcon={<MdAdd />} colorScheme="blue" onClick={handleCreateClick}>
                    New User
                  </Button>
                )}
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
                      <Th borderColor={borderColor}>User Type</Th>
                      <Th borderColor={borderColor}>Status</Th>
                      <Th borderColor={borderColor} textAlign="right">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {isLoading ? (
                      <Tr>
                        <Td colSpan={5} borderColor={borderColor}>Loading users...</Td>
                      </Tr>
                    ) : filteredUsers.length === 0 ? (
                      <Tr>
                        <Td colSpan={5} borderColor={borderColor}>No users found.</Td>
                      </Tr>
                    ) : filteredUsers.map((user) => (
                      <Tr key={user.id}>
                        <Td borderColor={borderColor}>{user.name}</Td>
                        <Td borderColor={borderColor}>{user.email}</Td>
                        <Td borderColor={borderColor}>{user.user_type === "admin" ? "Admin" : "User"}</Td>
                        <Td borderColor={borderColor}>{user.active ? "Active" : "Inactive"}</Td>
                        <Td borderColor={borderColor}>
                          <Flex justify="flex-end" gap="8px">
                            <IconButton
                              aria-label="Edit user"
                              icon={<MdEdit />}
                              size="sm"
                              onClick={() => handleEditClick(user)}
                            />
                            {isAdmin && (
                              <IconButton
                                aria-label="Delete user"
                                icon={<MdDelete />}
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                onClick={() => handleDeleteClick(user)}
                              />
                            )}
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>

            <TabPanel px={0} pt={6}>
              <Flex align="center" justify="space-between" mb="20px">
                <Text color={textColor} fontSize="xl" fontWeight="700">
                  Client Access
                </Text>
                {isAdmin && (
                  <Button leftIcon={<MdAdd />} colorScheme="blue" onClick={openCreateClientLogin}>
                    New Client Access
                  </Button>
                )}
              </Flex>

              <Flex mb="16px" gap="10px" align={{ base: "stretch", md: "center" }} direction={{ base: "column", md: "row" }}>
                <InputGroup maxW={{ base: "100%", md: "320px" }}>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={MdSearch} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    bg={inputBg}
                    color={inputText}
                    placeholder="Search by email..."
                    value={clientSearchEmail}
                    onChange={(e) => setClientSearchEmail(e.target.value)}
                  />
                </InputGroup>
                <Select
                  maxW={{ base: "100%", md: "180px" }}
                  value={clientActiveFilter}
                  onChange={(e) => setClientActiveFilter(e.target.value)}
                  bg={inputBg}
                >
                  <option value="all">All status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
                <Button variant="outline" onClick={fetchClientLogins} isLoading={isClientListLoading}>
                  Refresh
                </Button>
              </Flex>

              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th borderColor={borderColor}>Client</Th>
                      <Th borderColor={borderColor}>Email</Th>
                      <Th borderColor={borderColor}>User ID</Th>
                      <Th borderColor={borderColor}>Status</Th>
                      <Th borderColor={borderColor}>Created</Th>
                      <Th borderColor={borderColor}>Updated</Th>
                      <Th borderColor={borderColor} textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {isClientListLoading ? (
                      <Tr>
                        <Td colSpan={7} borderColor={borderColor}>Loading client access...</Td>
                      </Tr>
                    ) : clientLogins.length === 0 ? (
                      <Tr>
                        <Td colSpan={7} borderColor={borderColor}>No client access records found.</Td>
                      </Tr>
                    ) : clientLogins.map((item) => (
                      <Tr key={item.id}>
                        <Td borderColor={borderColor}>{item.client_name || item.client_id}</Td>
                        <Td borderColor={borderColor}>{item.email || "-"}</Td>
                        <Td borderColor={borderColor}>{item.user_id ?? "-"}</Td>
                        <Td borderColor={borderColor}>{item.active ? "Active" : "Inactive"}</Td>
                        <Td borderColor={borderColor}>{item.create_date || "-"}</Td>
                        <Td borderColor={borderColor}>{item.write_date || "-"}</Td>
                        <Td borderColor={borderColor}>
                          <Flex justify="flex-end" gap="8px">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<MdVisibility />}
                              onClick={() => openViewClientLogin(item)}
                              isLoading={isClientViewLoading && viewingClientLogin?.id === item.id}
                            >
                              View
                            </Button>
                            <IconButton
                              aria-label="Edit client access"
                              icon={<MdEdit />}
                              size="sm"
                              onClick={() => openEditClientLogin(item)}
                            />
                            <IconButton
                              aria-label="Delete client access"
                              icon={<MdDelete />}
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => {
                                setClientLoginToDelete(item);
                                openClientDelete();
                              }}
                            />
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { closeModal(); resetForm(); }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingUser ? "Edit User" : "Create User"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="12px" isRequired>
              <FormLabel>Name</FormLabel>
              <Input value={formData.name} onChange={(e) => handleFormChange("name", e.target.value)} placeholder="Enter full name" />
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
                    toast({
                      title: "Email Sent",
                      description: res?.result?.message || res?.message || "A new password has been sent to your email",
                      status: "success",
                      duration: 4000,
                      isClosable: true,
                    });
                  } catch (e) {
                    // handled in API layer
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
            <FormControl mb="12px" isRequired>
              <FormLabel>User Type</FormLabel>
              <Select value={formData.user_type} onChange={(e) => handleFormChange("user_type", e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            </FormControl>
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

      <Modal isOpen={isClientModalOpen} onClose={() => { closeClientModal(); resetClientForm(); }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingClientLogin ? "Edit Client Access" : "Create Client Access"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="12px" isRequired={!editingClientLogin}>
              <FormLabel>Client</FormLabel>
              <SimpleSearchableSelect
                value={clientFormData.client_id}
                onChange={(value) => handleClientFormChange("client_id", String(value))}
                options={clientOptions}
                placeholder="Select client partner"
                isDisabled={Boolean(editingClientLogin)}
                displayKey="name"
                valueKey="id"
              />
            </FormControl>
            <FormControl mb="12px" isRequired={!editingClientLogin}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={clientFormData.email}
                onChange={(e) => handleClientFormChange("email", e.target.value)}
                placeholder="Enter client email"
              />
            </FormControl>
            <FormControl mb="12px" isRequired={!editingClientLogin}>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  type={showClientPassword ? "text" : "password"}
                  value={clientFormData.password}
                  onChange={(e) => handleClientFormChange("password", e.target.value)}
                  placeholder={editingClientLogin ? "Leave blank to keep current password" : "Enter password"}
                />
                <InputRightElement width="3rem">
                  <IconButton
                    aria-label={showClientPassword ? "Hide password" : "Show password"}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowClientPassword((v) => !v)}
                    icon={showClientPassword ? <MdVisibilityOff /> : <MdVisibility />}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl mb="12px" isRequired={!editingClientLogin}>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type={showClientPassword ? "text" : "password"}
                value={clientFormData.confirm_password}
                onChange={(e) => handleClientFormChange("confirm_password", e.target.value)}
                placeholder={editingClientLogin ? "Leave blank if password unchanged" : "Confirm password"}
              />
            </FormControl>
            {editingClientLogin && (
              <FormControl display="flex" alignItems="center" mb="12px">
                <FormLabel mb="0">Active</FormLabel>
                <Switch
                  isChecked={clientFormData.active}
                  onChange={(e) => handleClientFormChange("active", e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { closeClientModal(); resetClientForm(); }}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={submitClientLogin} isLoading={isClientSubmitting}>
              {editingClientLogin ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isClientViewOpen}
        onClose={() => {
          closeClientView();
          setViewingClientLogin(null);
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Client Access Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isClientViewLoading ? (
              <Text>Loading details...</Text>
            ) : (
              <>
                <FormControl>
                  <FormLabel>Client Access Details</FormLabel>
                  <Textarea value={clientAccessDetailsText} isReadOnly minH="180px" resize="vertical" />
                </FormControl>
                <Button
                  mt="12px"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(clientAccessDetailsText);
                      toast({
                        title: "Copied",
                        description: "Client details copied to clipboard.",
                        status: "success",
                        duration: 2000,
                        isClosable: true,
                      });
                    } catch (_e) {
                      toast({
                        title: "Copy failed",
                        description: "Could not copy details. Please copy manually.",
                        status: "error",
                        duration: 2500,
                        isClosable: true,
                      });
                    }
                  }}
                >
                  Copy All
                </Button>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                closeClientView();
                setViewingClientLogin(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={undefined} onClose={closeDelete}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete User</AlertDialogHeader>
            <AlertDialogBody>Are you sure? This action cannot be undone.</AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={closeDelete}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isDeleting}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog isOpen={isClientDeleteOpen} leastDestructiveRef={undefined} onClose={closeClientDelete}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete Client Access</AlertDialogHeader>
            <AlertDialogBody>
              This will remove the client login and deactivate the linked user. Continue?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={closeClientDelete}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmClientDelete} ml={3} isLoading={isDeleting}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}



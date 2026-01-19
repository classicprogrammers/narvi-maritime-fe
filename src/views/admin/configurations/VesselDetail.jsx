import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  Icon,
  Tooltip,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  Badge,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { MdPrint, MdContentCopy, MdArrowBack, MdEdit, MdVisibility, MdDownload } from "react-icons/md";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Card from "components/card/Card";
import vesselsAPI from "../../../api/vessels";
import { getCustomersApi } from "../../../api/customer";

const prettyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
};

const VesselDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const [vessel, setVessel] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("secondaryGray.900", "white");
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const valueColor = useColorModeValue("gray.800", "white");
  const toast = useToast();

  // Load vessel data
  useEffect(() => {
    const loadVessel = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // First, try to get from location state
        if (location.state?.vessel) {
          setVessel(location.state.vessel);
          setIsLoading(false);
          // Still fetch attachments separately if vessel came from state
          loadVesselAttachments(id);
          return;
        }

        // Fetch from API
        const vesselData = await vesselsAPI.getVessel(id);
        const vesselInfo = vesselData.vessel || vesselData.result?.vessel || vesselData;
        setVessel(vesselInfo);
        
        // Fetch attachments separately to ensure they're loaded
        loadVesselAttachments(id);
      } catch (error) {
        console.error("Error loading vessel:", error);
        toast({
          title: "Error",
          description: `Failed to load vessel: ${error.message}`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    const loadVesselAttachments = async (vesselId) => {
      try {
        setIsLoadingAttachments(true);
        // Fetch vessel details with attachments
        const vesselData = await vesselsAPI.getVessel(vesselId);
        const vesselInfo = vesselData.vessel || vesselData.result?.vessel || vesselData;
        
        // Update vessel with attachments if they exist
        if (vesselInfo) {
          setVessel(prevVessel => {
            if (!prevVessel) {
              return vesselInfo;
            }
            return {
              ...prevVessel,
              attachments: vesselInfo.attachments || prevVessel.attachments || []
            };
          });
        }
      } catch (error) {
        console.error("Error loading vessel attachments:", error);
        toast({
          title: "Warning",
          description: `Failed to load attachments: ${error.message}`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsLoadingAttachments(false);
      }
    };

    loadVessel();
  }, [id, location.state, toast]);

  // Load customers for client name lookup
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersResponse = await getCustomersApi();
        const customersData = customersResponse.customers || customersResponse;
        setCustomers(Array.isArray(customersData) ? customersData : []);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    loadCustomers();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleViewFile = (file) => {
    let fileUrl = null;

    // Case 1: actual uploaded file
    if (file instanceof File || file instanceof Blob) {
      fileUrl = URL.createObjectURL(file);
    }
    // Case 2: backend URL
    else if (file.url) {
      fileUrl = file.url;
    }
    // Case 3: base64 data
    else if (file.datas) {
      const mimeType = file.mimetype || "application/octet-stream";
      fileUrl = `data:${mimeType};base64,${file.datas}`;
    }
    // Case 4: construct URL from attachment ID
    else if (file.id) {
      const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
      fileUrl = `${baseUrl}/web/content/${file.id}`;
    }
    // Case 5: fallback path
    else if (file.path) {
      fileUrl = file.path;
    }

    const fileType =
      file.mimetype ||
      file.type ||
      file.filename?.split(".").pop() ||
      "application/octet-stream";

    if (fileUrl) {
      setPreviewFile({ ...file, fileUrl, fileType });
      onPreviewOpen();
    } else {
      toast({
        title: "Error",
        description: "Unable to preview file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownloadFile = (file) => {
    try {
      let fileUrl = null;
      let fileName = file.filename || file.name || 'download';

      // Case 1: actual uploaded file
      if (file instanceof File || file instanceof Blob) {
        fileUrl = URL.createObjectURL(file);
      }
      // Case 2: backend URL
      else if (file.url) {
        fileUrl = file.url;
      }
      // Case 3: base64 data
      else if (file.datas) {
        const mimeType = file.mimetype || "application/octet-stream";
        fileUrl = `data:${mimeType};base64,${file.datas}`;
      }
      // Case 4: construct URL from attachment ID
      else if (file.id) {
        const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
        fileUrl = `${baseUrl}/web/content/${file.id}?download=true`;
      }
      // Case 5: fallback path
      else if (file.path) {
        fileUrl = file.path;
      }

      if (fileUrl) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast({
          title: 'Error',
          description: 'Unable to download file. File data not available.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEdit = () => {
    history.push(`/admin/configurations/vessels`, { vessel, editMode: true });
  };

  const clientName = useMemo(() => {
    if (!vessel || !vessel.client_id) return "-";
    const customer = customers.find(c => c.id === vessel.client_id);
    return customer ? (customer.name || customer.company_name || `Customer ${customer.id}`) : "-";
  }, [vessel, customers]);

  const attachments = vessel?.attachments || [];

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} className="print-content">
        <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg" color={headingColor}>
            Vessel Details
          </Heading>
          <Flex gap={2} className="no-print">
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrint}>
              Print
            </Button>
            <Button leftIcon={<Icon as={MdEdit} />} onClick={handleEdit} colorScheme="blue">
              Edit
            </Button>
            <Button onClick={() => history.push("/admin/configurations/vessels")}>
              Back to Vessels
            </Button>
          </Flex>
        </Flex>

        <Card p={{ base: 4, md: 6 }} bg={cardBg} border="1px" borderColor={borderColor} mb={8}>
          {isLoading ? (
            <Text color={labelColor}>Loading vessel information...</Text>
          ) : !vessel ? (
            <Text color={labelColor}>Vessel not found.</Text>
          ) : (
            <Stack spacing={6}>
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={0}>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  borderRight={{ base: "none", md: `1px solid ${borderColor}` }}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Text fontSize="sm" color={valueColor} fontWeight="500">
                    {prettyValue(vessel.name)}
                  </Text>
                </GridItem>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Text fontSize="sm" color={valueColor} fontWeight="500">
                    {clientName}
                  </Text>
                </GridItem>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  borderRight={{ base: "none", md: `1px solid ${borderColor}` }}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Text fontSize="sm" color={valueColor} fontWeight="500">
                    {prettyValue(vessel.vessel_type)}
                  </Text>
                </GridItem>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Text fontSize="sm" color={valueColor} fontWeight="500">
                    {prettyValue(vessel.imo)}
                  </Text>
                </GridItem>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  borderRight={{ base: "none", md: `1px solid ${borderColor}` }}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Badge
                    colorScheme={
                      vessel.status === "active" ? "green" :
                      vessel.status === "inactive" ? "red" :
                      vessel.status === "tbn" ? "yellow" :
                      vessel.status === "new_building" ? "green" : "gray"
                    }
                    size="sm"
                    textTransform="capitalize"
                  >
                    {prettyValue(vessel.status)}
                  </Badge>
                </GridItem>
                <GridItem
                  px={4}
                  py={2}
                  borderColor={borderColor}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                >
                  <Text fontSize="sm" color={valueColor} fontWeight="500">
                    {prettyValue(vessel.id)}
                  </Text>
                </GridItem>
              </Grid>

              {/* Attachments Section */}
              <Box>
                <Heading size="md" color={headingColor} mb={4}>
                  Attachments {!isLoadingAttachments && attachments.length > 0 && `(${attachments.length})`}
                </Heading>
                {isLoadingAttachments ? (
                  <Center p={8}>
                    <Flex direction="column" align="center" gap={4}>
                      <Spinner size="xl" color="blue.500" thickness="4px" />
                      <Text color={labelColor} fontSize="sm">
                        Loading attachments...
                      </Text>
                    </Flex>
                  </Center>
                ) : attachments.length > 0 ? (
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
                    {attachments.map((file, index) => (
                      <Card key={index} p={4} border="1px" borderColor={borderColor} _hover={{ borderColor: "blue.400", boxShadow: "md" }}>
                        <Flex direction="column" gap={3}>
                          <Flex justify="space-between" align="center">
                            <Text 
                              fontSize="sm" 
                              fontWeight="600" 
                              color={valueColor} 
                              isTruncated
                              flex={1}
                              title={file.filename || file.name || `File ${index + 1}`}
                            >
                              {file.filename || file.name || `File ${index + 1}`}
                            </Text>
                          </Flex>
                          {file.mimetype && (
                            <Text fontSize="xs" color={labelColor}>
                              Type: {file.mimetype}
                            </Text>
                          )}
                          <Flex gap={2} flexWrap="wrap">
                            <Button
                              size="sm"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleViewFile(file)}
                              leftIcon={<Icon as={MdVisibility} />}
                              flex={1}
                              minW="100px"
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="green"
                              variant="outline"
                              onClick={() => handleDownloadFile(file)}
                              leftIcon={<Icon as={MdDownload} />}
                              flex={1}
                              minW="100px"
                            >
                              Download
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    ))}
                  </Grid>
                ) : (
                  <Box p={6} textAlign="center" border="1px dashed" borderColor={borderColor} borderRadius="md">
                    <Text color={labelColor} fontSize="sm">
                      No attachments available for this vessel
                    </Text>
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </Card>
      </Box>

      {/* File Preview Modal - 65% viewing mode, A4 only when printing */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="full">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent maxW="65vw" maxH="65vh" m="auto" bg="white">
          <ModalHeader bg="gray.100" borderBottom="1px" borderColor={borderColor}>
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="600">
                {previewFile?.filename || "File Preview"}
              </Text>
              <Button
                size="sm"
                leftIcon={<Icon as={MdPrint} />}
                onClick={() => {
                  const printWindow = window.open();
                  if (printWindow && previewFile?.fileUrl) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>${previewFile.filename}</title>
                          <style>
                            @page {
                              size: A4;
                              margin: 0;
                            }
                            body {
                              margin: 0;
                              padding: 0;
                            }
                            img, iframe {
                              width: 100%;
                              height: 100vh;
                              object-fit: contain;
                            }
                          </style>
                        </head>
                        <body>
                          ${previewFile.fileType?.startsWith("image/") 
                            ? `<img src="${previewFile.fileUrl}" alt="${previewFile.filename}" />`
                            : previewFile.fileType === "application/pdf"
                            ? `<iframe src="${previewFile.fileUrl}" style="width: 100%; height: 100vh; border: none;"></iframe>`
                            : `<p>Preview not available. <a href="${previewFile.fileUrl}" download>Download file</a></p>`
                          }
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                  }
                }}
              >
                Print
              </Button>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} bg="gray.50" display="flex" justifyContent="center" alignItems="center" minH="calc(100vh - 120px)">
            {previewFile && (
              previewFile.fileType?.startsWith("image/") ? (
                <Box
                  w="100%"
                  h="100%"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  p={4}
                >
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "calc(100vh - 120px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : previewFile.fileType === "application/pdf" ? (
                <Box
                  w="100%"
                  h="calc(100vh - 120px)"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  bg="gray.100"
                >
                  <iframe
                    src={previewFile.fileUrl}
                    title={previewFile.filename}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : (
                <Box p={8} textAlign="center">
                  <Text mb={4}>File preview not available for this file type.</Text>
                  <Button
                    as="a"
                    href={previewFile.fileUrl}
                    download={previewFile.filename}
                    colorScheme="blue"
                  >
                    Download File
                  </Button>
                </Box>
              )
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default VesselDetail;



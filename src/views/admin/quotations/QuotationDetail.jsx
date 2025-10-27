import React, { useEffect, useState } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import {
    Box, Flex, Grid, VStack, HStack, Text, Badge, Button, Table, Thead, Tbody, Tr, Th, Td, useColorModeValue,
    Icon, Divider, Card, CardBody, CardHeader, Stat, StatLabel, StatNumber, StatHelpText
} from "@chakra-ui/react";
import { MdEdit, MdArrowBack, MdPrint, MdShare, MdInfo, MdAttachMoney, MdLocationOn, MdBusiness, MdDescription } from "react-icons/md";
import quotationsAPI from "../../../api/quotations";
import { getCustomersApi } from "../../../api/customer";
import vesselsAPI from "../../../api/vessels";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import api from "../../../api/axios";

export default function QuotationDetail() {
    const { id } = useParams();
    const history = useHistory();
    const location = useLocation();
    const [quotation, setQuotation] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [rateItems, setRateItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const cardBg = useColorModeValue('gray.50', 'gray.700');
    const cardBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
    const mutedTextColor = useColorModeValue('gray.600', 'gray.300');
    const tableBorderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
    const rowOddBg = useColorModeValue('white', 'gray.800');
    const rowEvenBg = useColorModeValue('gray.50', 'gray.700');
    const theadBg = useColorModeValue('gray.50', 'gray.700');
    const highlightBg = useColorModeValue('yellow.50', 'yellow.900');
    const highlightBorder = useColorModeValue('yellow.200', 'yellow.700');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const stateQ = location && location.state && location.state.quotation;
            if (stateQ) setQuotation(stateQ);
            else {
                try {
                    const data = await quotationsAPI.getQuotationById(id);
                    setQuotation(data.quotation || data);
                } catch (e) {
                    // ignore, simple view
                }
            }
            const [cust, ves, cur, loc, vendorsRes, productsRes] = await Promise.all([
                getCustomersApi(),
                vesselsAPI.getVessels(),
                currenciesAPI.getCurrencies(),
                locationsAPI.getLocations(),
                api.get('/api/vendor/list').then(r => r.data).catch(() => ({ vendors: [] })),
                api.get('/api/products').then(r => r.data).catch(() => ({ products: [] })),
            ]);
            setCustomers(cust.customers || []);
            setVessels(ves.vessels || []);
            setCurrencies(cur.currencies || []);
            setLocations(loc.locations || loc || []);
            setVendors(vendorsRes.vendors || []);
            setRateItems(productsRes.products || []);
            setIsLoading(false);
        })();
    }, [id, location]);

    const getName = (list, id, key = 'name') => list.find(i => i.id === id)?.[key] || '-';

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <Box pt={{ base: "100px", md: "60px", xl: "60px" }}>
                <VStack spacing={6} align="stretch" px={{ base: 3, md: 6 }}>
                    <Flex justify="space-between" align="center">
                        <HStack spacing={3}>
                            <Text fontSize="2xl" fontWeight="bold">Quotation Detail</Text>
                            <Badge colorScheme="blue">ID: {id}</Badge>
                        </HStack>
                        <HStack spacing={3}>
                            <Button colorScheme="blue" leftIcon={<Icon as={MdEdit} />} isLoading>Edit Quotation</Button>
                            <Button leftIcon={<Icon as={MdArrowBack} />} variant="outline">Back to list</Button>
                        </HStack>
                    </Flex>

                    <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={6}>
                        <Card>
                            <CardBody>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                        <Box><Text fontSize="xs" color="gray.500">Client</Text><Text fontWeight="600">Loading...</Text></Box>
                                        <Box><Text fontSize="xs" color="gray.500">Vessel</Text><Text fontWeight="600">Loading...</Text></Box>
                                        <Box><Text fontSize="xs" color="gray.500">QT Number</Text><Text fontWeight="600">Loading...</Text></Box>
                                        <Box><Text fontSize="xs" color="gray.500">SO ID</Text><Text fontWeight="600">Loading...</Text></Box>
                                    </Grid>
                                    <Box>
                                        <Text fontSize="sm" fontWeight="600" mb={1}>Job Description</Text>
                                        <Text fontSize="sm" color="gray.400">Loading...</Text>
                                    </Box>
                                </VStack>
                            </CardBody>
                        </Card>
                        <Card bg="yellow.50" borderColor="yellow.200">
                            <CardBody>
                                <VStack spacing={4} align="stretch">
                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                                        <Box><Text fontSize="xs" color="gray.600">USD ROE</Text><Text fontWeight="700">Loading...</Text></Box>
                                        <Box><Text fontSize="xs" color="gray.600">General MU</Text><Text fontWeight="700">Loading...</Text></Box>
                                        <Box><Text fontSize="xs" color="gray.600">CAF</Text><Text fontWeight="700">Loading...</Text></Box>
                                    </Grid>
                                </VStack>
                            </CardBody>
                        </Card>
                    </Grid>

                    <Card>
                        <CardBody>
                            <Text color="gray.500" textAlign="center" py={8}>Loading quotation details...</Text>
                        </CardBody>
                    </Card>
                </VStack>
            </Box>
        );
    }

    return (
        <>
            <style>{`
                @media print {
                    button, .no-print {
                        display: none !important;
                    }
                    body {
                        print-color-adjust: exact;
                    }
                    .print-page {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
            <Box pt={{ base: "100px", md: "60px", xl: "80px" }}>
                <VStack spacing={6} align="stretch" px={{ base: 3, md: 6 }}>
                    <Flex justify="space-between" align="center" mb={2}>
                        <HStack spacing={4}>
                            <VStack align="start" spacing={1}>
                                <Text fontSize="2xl" fontWeight="bold" color="gray.800">Quotation Details</Text>
                                <HStack spacing={2}>
                                    <Badge colorScheme="blue" variant="solid" px={3} py={1} borderRadius="full">
                                        ID: {id}
                                    </Badge>
                                    <Badge colorScheme={quotation?.status === 'draft' ? 'orange' : 'green'} variant="subtle" px={3} py={1} borderRadius="full">
                                        {quotation?.status || 'Unknown'}
                                    </Badge>
                                </HStack>
                            </VStack>
                        </HStack>
                        <HStack spacing={3}>
                            <Button
                                colorScheme="blue"
                                leftIcon={<Icon as={MdEdit} />}
                                onClick={() => history.push({ pathname: `/admin/quotations/edit/${id}`, state: { quotation } })}
                                size="md"
                            >
                                Edit Quotation
                            </Button>
                            <Button
                                leftIcon={<Icon as={MdPrint} />}
                                variant="outline"
                                size="md"
                                onClick={handlePrint}
                            >
                                Print
                            </Button>
                            <Button
                                leftIcon={<Icon as={MdArrowBack} />}
                                onClick={() => history.push('/admin/quotations/list')}
                                variant="ghost"
                                size="md"
                            >
                                Back to list
                            </Button>
                        </HStack>
                    </Flex>

                    {quotation && (
                        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
                            {/* Main Information Card */}
                            <Card shadow="sm" border="1px" borderColor="gray.200">
                                <CardHeader pb={3}>
                                    <HStack spacing={2}>
                                        <Icon as={MdInfo} color="blue.500" />
                                        <Text fontSize="lg" fontWeight="600">Quotation Information</Text>
                                    </HStack>
                                </CardHeader>
                                <CardBody pt={0}>
                                    <VStack spacing={4} align="stretch">
                                        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">Client</Text>
                                                <HStack spacing={2}>
                                                    <Icon as={MdBusiness} color="gray.400" />
                                                    <Text fontWeight="600" color="gray.800">{getName(customers, quotation.partner_id)}</Text>
                                                </HStack>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">Vessel</Text>
                                                <HStack spacing={2}>
                                                    <Icon as={MdLocationOn} color="gray.400" />
                                                    <Text fontWeight="600" color="gray.800">{getName(vessels, quotation.vessel_id)}</Text>
                                                </HStack>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">QT Number</Text>
                                                <Text fontWeight="600" color="gray.800">{quotation.name || '-'}</Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">SO ID</Text>
                                                <Text fontWeight="600" color="gray.800">{quotation.oc_number || '-'}</Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">Currency</Text>
                                                <HStack spacing={2}>
                                                    <Icon as={MdAttachMoney} color="gray.400" />
                                                    <Text fontWeight="600" color="gray.800">{getName(currencies, quotation.sale_currency || quotation.currency)}</Text>
                                                </HStack>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.5px">Validity Date</Text>
                                                <Text fontWeight="600" color="gray.800">{quotation.eta_date || '-'}</Text>
                                            </Box>
                                        </Grid>
                                        <Divider />
                                        <Box>
                                            <Text fontSize="sm" fontWeight="600" mb={2} color="gray.700">Job Description</Text>
                                            <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap" bg="gray.50" p={3} borderRadius="md">
                                                {quotation.client_remark || 'No description provided'}
                                            </Text>
                                        </Box>
                                    </VStack>
                                </CardBody>
                            </Card>

                            {/* Financial Summary Card */}
                            <Card shadow="sm" border="1px" borderColor="yellow.200" bg="yellow.50">
                                <CardHeader pb={3}>
                                    <HStack spacing={2}>
                                        <Icon as={MdAttachMoney} color="yellow.600" />
                                        <Text fontSize="lg" fontWeight="600" color="yellow.800">Financial Summary</Text>
                                    </HStack>
                                </CardHeader>
                                <CardBody pt={0}>
                                    <VStack spacing={4} align="stretch">
                                        <Stat>
                                            <StatLabel fontSize="xs" color="yellow.700">USD ROE</StatLabel>
                                            <StatNumber fontSize="lg" color="yellow.800">{quotation.usd_roe ?? '-'}</StatNumber>
                                        </Stat>
                                        <Stat>
                                            <StatLabel fontSize="xs" color="yellow.700">General MU</StatLabel>
                                            <StatNumber fontSize="lg" color="yellow.800">{quotation.general_mu ?? '-'}</StatNumber>
                                        </Stat>
                                        <Stat>
                                            <StatLabel fontSize="xs" color="yellow.700">CAF</StatLabel>
                                            <StatNumber fontSize="lg" color="yellow.800">{quotation.caf ?? '-'}</StatNumber>
                                        </Stat>
                                        <Divider borderColor="yellow.300" />
                                        <Stat>
                                            <StatLabel fontSize="xs" color="yellow.700">Estimated TO (USD)</StatLabel>
                                            <StatNumber fontSize="lg" color="yellow.800">{quotation.est_to_usd ?? '-'}</StatNumber>
                                        </Stat>
                                        <Stat>
                                            <StatLabel fontSize="xs" color="yellow.700">Estimated Profit (USD)</StatLabel>
                                            <StatNumber fontSize="lg" color="yellow.800">{quotation.est_profit_usd ?? '-'}</StatNumber>
                                        </Stat>
                                    </VStack>
                                </CardBody>
                            </Card>
                        </Grid>
                    )}

                    <Card shadow="sm" border="1px" borderColor="gray.200">
                        <CardHeader pb={3}>
                            <HStack spacing={2} justify="space-between">
                                <HStack spacing={2}>
                                    <Icon as={MdDescription} color="blue.500" />
                                    <Text fontSize="lg" fontWeight="600">Quotation Line Items</Text>
                                </HStack>
                                <Badge colorScheme="blue" variant="subtle" px={3} py={1} borderRadius="full">
                                    {(quotation?.quotation_lines || quotation?.quotation_line_ids || []).length} items
                                </Badge>
                            </HStack>
                        </CardHeader>
                        <CardBody pt={0}>
                            <Box overflowX="auto" borderRadius="md" border="1px" borderColor="gray.200">
                                <Table size="sm" variant="unstyled" minW="1400px"
                                    sx={{
                                        'th, td': { borderBottom: '1px solid', borderColor: 'gray.200', px: 4, py: 3 },
                                        thead: {
                                            'th': {
                                                bg: 'gray.50',
                                                textTransform: 'uppercase',
                                                fontSize: '11px',
                                                letterSpacing: '0.5px',
                                                fontWeight: '600',
                                                color: 'gray.600'
                                            }
                                        },
                                        'tbody tr:nth-of-type(odd)': { bg: 'white' },
                                        'tbody tr:nth-of-type(even)': { bg: 'gray.50' },
                                        'tbody tr:hover': { bg: 'blue.50' },
                                    }}
                                >
                                    <Thead>
                                        <Tr>
                                            <Th>Location</Th>
                                            <Th>Vendor</Th>
                                            <Th>Rate Item Name</Th>
                                            <Th>Rate Remark</Th>
                                            <Th>Free text</Th>
                                            <Th>Pre-text</Th>
                                            <Th isNumeric>Quantity</Th>
                                            <Th isNumeric>Buy Rate</Th>
                                            <Th>Calculation</Th>
                                            <Th isNumeric>Cost actual</Th>
                                            <Th>Fixed Sale</Th>
                                            <Th>Currency</Th>
                                            <Th isNumeric>Rate to client</Th>
                                            <Th>Group</Th>
                                            <Th>Status</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {(quotation?.quotation_lines || quotation?.quotation_line_ids || []).map((line, idx) => (
                                            <Tr key={idx}>
                                                <Td>
                                                    <Text fontSize="sm" fontWeight="500">
                                                        {getName(locations, line.location_id || line.location)}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" fontWeight="500">
                                                        {vendors.find(v => v.id === line.vendor_id)?.name || line.vendor_name || line.vendor_id || '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" fontWeight="500">
                                                        {rateItems.find(r => r.id === line.item_name)?.name || line.name || '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {line.rate_remark || '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {line.free_text || '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {line.pre_text || '-'}
                                                    </Text>
                                                </Td>
                                                <Td isNumeric>
                                                    <Text fontSize="sm" fontWeight="600">
                                                        {line.quantity ?? '-'}
                                                    </Text>
                                                </Td>
                                                <Td isNumeric>
                                                    <Text fontSize="sm" fontWeight="600" color="blue.600">
                                                        {line.buy_rate_calculation ?? '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        colorScheme={line.buy_rate_calculation ? 'green' : 'red'}
                                                        variant="subtle"
                                                        fontSize="xs"
                                                    >
                                                        {line.buy_rate_calculation ? 'Valid' : 'Invalid'}
                                                    </Badge>
                                                </Td>
                                                <Td isNumeric>
                                                    <Text fontSize="sm" fontWeight="600">
                                                        {line.cost_actual ?? '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        colorScheme={line.fixed ? 'blue' : 'gray'}
                                                        variant="subtle"
                                                        fontSize="xs"
                                                    >
                                                        {line.fixed ? 'Yes' : 'No'}
                                                    </Badge>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {getName(currencies, line.sale_currency || line.currency_override)}
                                                    </Text>
                                                </Td>
                                                <Td isNumeric>
                                                    <Text fontSize="sm" fontWeight="600" color="green.600">
                                                        {line.rate_to_client ?? '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Text fontSize="sm" color="gray.600">
                                                        {line.group_free_text || '-'}
                                                    </Text>
                                                </Td>
                                                <Td>
                                                    <Badge
                                                        colorScheme={line.status === 'current' ? 'green' : 'gray'}
                                                        variant="solid"
                                                        fontSize="xs"
                                                    >
                                                        {line.status || '-'}
                                                    </Badge>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        </CardBody>
                    </Card>
                </VStack>
            </Box>
        </>
    );
}



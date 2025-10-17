import React, { useEffect, useState } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import {
    Box, Flex, Grid, VStack, HStack, Text, Badge, Button, Table, Thead, Tbody, Tr, Th, Td, useColorModeValue, Spinner, Center
} from "@chakra-ui/react";
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

    if (isLoading) {
        return (
            <Box pt={{ base: "100px", md: "60px", xl: "60px" }}>
                <Center minH="50vh">
                    <VStack>
                        <Spinner size="lg" thickness="4px" color="blue.500" />
                        <Text color={mutedTextColor}>Loading quotation…</Text>
                    </VStack>
                </Center>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "100px", md: "60px", xl: "80px" }}>
            <VStack spacing={6} align="stretch" px={{ base: 3, md: 6 }}>
                <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                        <Text fontSize="2xl" fontWeight="bold">Quotation Detail</Text>
                        <Badge colorScheme="blue">ID: {id}</Badge>
                    </HStack>
                    <HStack spacing={3}>
                        <Button colorScheme="blue" onClick={() => history.push({ pathname: `/admin/quotations/edit/${id}`, state: { quotation } })}>Edit Quotation</Button>
                        <Button onClick={() => history.push('/admin/quotations/list')} variant="outline">Back to list</Button>
                    </HStack>
                </Flex>

                {quotation && (
                    <Box border="1px" borderColor={cardBorder} bg={cardBg} borderRadius="md" p={4}>
                        <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={6} alignItems="start">
                            <VStack align="stretch" spacing={2}>
                                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">Client</Text><Text fontWeight="600">{getName(customers, quotation.partner_id)}</Text></VStack>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">Vessel</Text><Text fontWeight="600">{getName(vessels, quotation.vessel_id)}</Text></VStack>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">QT Number</Text><Text fontWeight="600">{quotation.name || '-'}</Text></VStack>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">SO ID</Text><Text fontWeight="600">{quotation.oc_number || '-'}</Text></VStack>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">Currency</Text><Text fontWeight="600">{getName(currencies, quotation.sale_currency || quotation.currency)}</Text></VStack>
                                    <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.500">Destination</Text><Text fontWeight="600">{getName(locations, quotation.destination_id)}</Text></VStack>
                                </Grid>
                                <Box>
                                    <Text fontSize="sm" fontWeight="600" mb={1}>Job Description</Text>
                                    <Text fontSize="sm" whiteSpace="pre-wrap">{quotation.client_remark || '-'}</Text>
                                </Box>
                            </VStack>
                            <Box bg={highlightBg} border="1px" borderColor={highlightBorder} borderRadius="md" p={4}>
                                <VStack align="stretch" spacing={2}>
                                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                                        <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.600">USD ROE</Text><Text fontWeight="700">{quotation.usd_roe ?? '-'}</Text></VStack>
                                        <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.600">General MU</Text><Text fontWeight="700">{quotation.general_mu ?? '-'}</Text></VStack>
                                        <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.600">CAF</Text><Text fontWeight="700">{quotation.caf ?? '-'}</Text></VStack>
                                        <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.600">Estimated TO (USD)</Text><Text fontWeight="700">{quotation.est_to_usd ?? '-'}</Text></VStack>
                                        <VStack align="start" spacing={0}><Text fontSize="xs" color="gray.600">Estimated Profit (USD)</Text><Text fontWeight="700">{quotation.est_profit_usd ?? '-'}</Text></VStack>
                                    </Grid>
                                </VStack>
                            </Box>
                        </Grid>
                    </Box>
                )}

                <Box bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table size="sm" variant="unstyled" minW="1400px"
                        sx={{
                            'th, td': { borderBottom: '1px solid', borderColor: tableBorderColor, px: 4, py: 3 },
                            thead: { 'th': { bg: theadBg, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' } },
                            'tbody tr:nth-of-type(odd)': { bg: rowOddBg },
                            'tbody tr:nth-of-type(even)': { bg: rowEvenBg },
                        }}
                    >
                        <Thead>
                            <Tr>
                                {/* <Th>Client Specific</Th> */}
                                <Th>Location</Th>
                                <Th>Vendor</Th>
                                <Th>Rate Item Name</Th>
                                <Th>Rate Remark</Th>
                                <Th>Free text</Th>
                                <Th>Pre-text</Th>
                                <Th isNumeric>Quantity</Th>
                                <Th isNumeric>Buy Rate</Th>
                                <Th isNumeric>Calculation</Th>
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
                                    {/* <Td>{line.client_specific ? 'Yes' : 'No'}</Td> */}
                                    <Td>{getName(locations, line.location_id || line.location)}</Td>
                                    <Td>{vendors.find(v => v.id === line.vendor_id)?.name || line.vendor_name || line.vendor_id || '-'}</Td>
                                    <Td>{rateItems.find(r => r.id === line.item_name)?.name || line.name || '-'}</Td>
                                    <Td>{line.rate_remark || '-'}</Td>
                                    <Td>{line.free_text || '-'}</Td>
                                    <Td>{line.pre_text || '-'}</Td>
                                    <Td isNumeric>{line.quantity ?? '-'}</Td>
                                    <Td isNumeric>{line.buy_rate_calculation ?? '-'}</Td>
                                    <Td>{line.buy_rate_calculation ? 'Rate valid' : 'Rate invalid'}</Td>
                                    <Td isNumeric>{line.cost_actual ?? '-'}</Td>
                                    <Td>{line.fixed ? 'Yes' : 'No'}</Td>
                                    <Td>{getName(currencies, line.sale_currency || line.currency_override)}</Td>
                                    <Td isNumeric>{line.rate_to_client ?? '-'}</Td>
                                    <Td>{line.group_free_text || '-'}</Td>
                                    <Td><Badge colorScheme={line.status === 'current' ? 'green' : 'gray'}>{line.status || '-'}</Badge></Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            </VStack>
        </Box>
    );
}



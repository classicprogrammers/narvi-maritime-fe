import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
    Box, Flex, Grid, VStack, HStack, Text, Button, ButtonGroup, Input, Icon, Badge,
    NumberInput, NumberInputField,
    FormControl, FormLabel, Select, useToast,
    Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";
import { MdViewModule, MdTableChart, MdDelete } from "react-icons/md";
import api from "../../../api/axios";
import { getCustomersApi } from "../../../api/customer";
import vesselsAPI from "../../../api/vessels";
import currenciesAPI from "../../../api/currencies";
import countriesAPI from "../../../api/countries";
import SearchableSelect from "../../../components/forms/SearchableSelect";


export default function QuotationEditor() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const toast = useToast();
    const history = useHistory();

    const [customers, setCustomers] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [agents, setAgents] = useState([]);
    const [rateItems, setRateItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('table');

    const [customersLoading, setCustomersLoading] = useState(false);
    const [vesselsLoading, setVesselsLoading] = useState(false);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [rateItemsLoading, setRateItemsLoading] = useState(false);
    const [currenciesLoading, setCurrenciesLoading] = useState(false);
    const [countriesLoading, setCountriesLoading] = useState(false);

    const [form, setForm] = useState({
        partner_id: "",
        vessel_id: "",
        oc_number: "",
        client_remark: "",
        sale_currency: "USD",
        usd_roe: "1.00",
        general_mu: "25.00",
        caf: "5.00",
        eta_date: "",
        name: "",
        quotation_lines: Array.from({ length: 1 }).map(() => ({
            is_client_specific: false,
            location: "",
            vendor_id: "",
            item_name: "",
            rate_remark: "",
            free_text: "",
            pre_text: true,
            currency_override: "",
            quantity: 1,
            buy_rate_calculation: "",
            cost_actual: "",
            fixed: false,
            sale_currency: "",
            cost_sum: "",
            roe: "",
            cost_usd: "",
            mu_percent: "",
            mu_amount: "",
            amended_rate: "",
            rate_to_client: "",
            group_free_text: "",
            status: "current",
            rate_text: "",
            rate: "",
            fixed_rate: "",
            product_remarks: "",
            uom_id: "",
            default_code: "",
            qt_rate: "",
        })),
    });

    const updateField = useCallback((field, value) => {
        setForm(prev => {
            const newForm = { ...prev, [field]: value };

            if (field === 'partner_id') {
                newForm.quotation_lines = prev.quotation_lines.map(line => ({
                    ...line,
                    item_name: ""
                }));
            }

            return newForm;
        });
    }, []);

    const updateLine = useCallback((idx, field, value) => {
        setForm(prev => {
            const newForm = {
                ...prev,
                quotation_lines: prev.quotation_lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)
            };

            if (field === 'quantity' || field === 'buy_rate_calculation') {
                const line = newForm.quotation_lines[idx];
                const quantity = parseFloat(line.quantity || 0);
                const buyRate = parseFloat(line.buy_rate_calculation || 0);

                if (quantity && buyRate) {
                    const calculatedCost = quantity * buyRate;
                    newForm.quotation_lines[idx] = {
                        ...line,
                        cost_actual: calculatedCost,
                        cost_sum: calculatedCost,
                        cost_usd: calculatedCost
                    };
                }
            }

            if (field === 'cost_sum' || field === 'roe' || field === 'mu_percent') {
                const line = newForm.quotation_lines[idx];
                const costSum = parseFloat(line.cost_sum || 0);
                const roe = parseFloat(line.roe || form.usd_roe || 1.00);
                const muPercent = parseFloat(line.mu_percent || form.general_mu || 25.00);

                const costUSD = costSum / roe;
                const muAmount = (costUSD * muPercent) / 100;
                const qtRate = costUSD + muAmount;

                const caf = parseFloat(form.caf || 5.00);
                let rateToClient = qtRate;
                if (caf !== 0) {
                    rateToClient = qtRate * (1 + caf / 100);
                }

                if (form.round_up_rate_to_client) {
                    rateToClient = Math.ceil(rateToClient);
                }

                newForm.quotation_lines[idx] = {
                    ...line,
                    cost_usd: costUSD,
                    mu_amount: muAmount,
                    qt_rate: qtRate,
                    rate_to_client: rateToClient
                };
            }

            if (field === 'vendor_id') {
                const line = newForm.quotation_lines[idx];
                newForm.quotation_lines[idx] = {
                    ...line,
                    item_name: "" // Clear the selected rate item when vendor changes
                };
            }

            if (field === 'is_client_specific' && !value) {
                const line = newForm.quotation_lines[idx];
                newForm.quotation_lines[idx] = {
                    ...line,
                    item_name: "" // Clear the selected rate item when Client Specific is unchecked
                };
            }

            if (field === 'item_name' && value) {
                const selectedProduct = rateItems.find(item => item.id === value);
                if (selectedProduct) {
                    const line = newForm.quotation_lines[idx];
                    newForm.quotation_lines[idx] = {
                        ...line,
                        rate_text: selectedProduct.rate_text || "",
                        rate: selectedProduct.rate || "",
                        fixed_rate: selectedProduct.fixed_rate || "",
                        product_remarks: selectedProduct.remarks || "",
                        rate_remark: selectedProduct.remarks || "",
                        uom_id: selectedProduct.uom_id || "",
                        default_code: selectedProduct.default_code || "",
                        buy_rate_calculation: selectedProduct.rate || "",
                    };
                }
            }

            return newForm;
        });
    }, [rateItems, form.caf, form.general_mu, form.round_up_rate_to_client, form.usd_roe]);

    const [expandedLineIdx, setExpandedLineIdx] = useState(0);

    const createEmptyLine = useCallback(() => ({
        is_client_specific: false,
        location: "",
        vendor_id: "",
        item_name: "",
        rate_remark: "",
        free_text: "",
        pre_text: true,
        currency_override: "",
        quantity: 1,
        buy_rate_calculation: "",
        cost_actual: "",
        fixed: false,
        sale_currency: "",
        cost_sum: "",
        roe: "",
        cost_usd: "",
        mu_percent: "",
        mu_amount: "",
        amended_rate: "",
        rate_to_client: "",
        group_free_text: "",
        status: "current",
        rate_text: "",
        rate: "",
        fixed_rate: "",
        product_remarks: "",
        uom_id: "",
        default_code: "",
        qt_rate: "",
    }), []);

    const isLineComplete = useCallback((line) => {
        const hasLocation = Boolean(line.location);
        const hasVendor = Boolean(line.vendor_id);
        const hasQty = Number(line.quantity) > 0;
        const hasBuyRate = line.buy_rate_calculation !== "" && line.buy_rate_calculation !== null && line.buy_rate_calculation !== undefined;
        return hasLocation && hasVendor && hasQty && hasBuyRate;
    }, []);

    const canAddNewLine = useCallback(() => {
        if (!form.quotation_lines || form.quotation_lines.length === 0) return false;
        const last = form.quotation_lines[form.quotation_lines.length - 1];
        return isLineComplete(last);
    }, [form.quotation_lines, isLineComplete]);

    const addNewLine = useCallback(() => {
        setForm(prev => ({ ...prev, quotation_lines: [...prev.quotation_lines, createEmptyLine()] }));
        setExpandedLineIdx(prev => prev + 1);
    }, [createEmptyLine]);

    const removeLine = useCallback((idx) => {
        setForm(prev => {
            const newLines = prev.quotation_lines.filter((_, i) => i !== idx);
            if (newLines.length === 0) {
                return { ...prev, quotation_lines: [createEmptyLine()] };
            }
            return { ...prev, quotation_lines: newLines };
        });
        setExpandedLineIdx(prev => (prev >= idx ? (prev > idx ? prev - 1 : -1) : prev));
    }, [createEmptyLine]);


    const loadMaster = useCallback(async () => {
        setCustomersLoading(true);
        setVesselsLoading(true);
        setCurrenciesLoading(true);
        setCountriesLoading(true);
        setAgentsLoading(true);
        setRateItemsLoading(true);

        try {
            const custData = await getCustomersApi();
            const customers = custData.customers || custData.data || custData || [];
            setCustomers(customers);
        } catch (error) {
            setCustomers([]);
        } finally {
            setCustomersLoading(false);
        }

        try {
            const vesData = await vesselsAPI.getVessels();
            setVessels(vesData.vessels || []);
        } catch (error) {
            setVessels([]);
        } finally {
            setVesselsLoading(false);
        }

        try {
            const curData = await currenciesAPI.getCurrencies();
            setCurrencies(curData.currencies || []);
        } catch (error) {
            setCurrencies([]);
        } finally {
            setCurrenciesLoading(false);
        }

        try {
            const countriesData = await countriesAPI.getCountries();
            const countriesList = countriesData.countries || countriesData || [];
            setCountries(countriesList);
        } catch (error) {
            setCountries([]);
        } finally {
            setCountriesLoading(false);
        }

        try {
            const vendorData = await api.get('/api/vendor/list');
            const vendorsList = vendorData.data.vendors || [];
            setAgents(vendorsList);
        } catch (error) {
            setAgents([]);
        } finally {
            setAgentsLoading(false);
        }

        try {
            const productData = await api.get('/api/products');
            const rateItems = productData.data.products || [];
            setRateItems(rateItems);
        } catch (error) {
            setRateItems([]);
        } finally {
            setRateItemsLoading(false);
        }
    }, []);


    useEffect(() => {
        loadMaster();
    }, [loadMaster]);

    const save = async () => {
        try {
            setIsSaving(true);

            toast({
                title: isEdit ? "Quotation Updated" : "Quotation Created",
                status: "success",
                description: "Quotation saved successfully."
            });

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e) {
            toast({
                title: "Save failed",
                status: "error",
                duration: 8000,
                isClosable: true
            });
        } finally {
            setIsSaving(false);
        }
    };

    const customerOptions = useMemo(() => {
        return customers;
    }, [customers]);
    const vesselOptions = useMemo(() => vessels, [vessels]);
    const currencyOptions = useMemo(() => currencies, [currencies]);
    const countryOptions = useMemo(() => countries, [countries]);
    const vesselCountryId = useMemo(() => {
        const vessel = vessels.find(v => v.id === form.vessel_id);
        const countryId = vessel?.country_id?.id ?? vessel?.country_id ?? null;
        return countryId;
    }, [vessels, form.vessel_id]);

    const getFilteredVendorsForLine = useCallback((line) => {
        const selectedCountryId = line.location || vesselCountryId;

        if (!selectedCountryId) {
            return agents;
        }

        const filteredVendors = agents.filter(a => {
            const vendorCountryId = a?.country_id;
            return vendorCountryId === selectedCountryId;
        });

        return filteredVendors;
    }, [agents, vesselCountryId]);

    // Filter rate items based on selected vendor's seller_ids for each quotation line
    const getRateItemOptionsForLine = useCallback((line) => {
        // Hide rate items until Client Specific checkbox is selected
        if (!line.is_client_specific) {
            return [];
        }

        if (!line.vendor_id || !rateItems.length) {
            return rateItems;
        }

        const filteredRateItems = rateItems.filter(item => {
            if (item.seller_ids && Array.isArray(item.seller_ids)) {
                return item.seller_ids.some(seller =>
                    seller.id === line.vendor_id || seller === line.vendor_id
                );
            }
            return true;
        });

        return filteredRateItems;
    }, [rateItems]);


    // Status-specific calculations based on Excel sheet logic
    const statusCalculations = useMemo(() => {
        const statuses = ['current', 'pending', 'order', 'toinvoice'];
        const calculations = {};

        statuses.forEach(status => {
            const statusLines = form.quotation_lines.filter(line => line.status === status);

            // Calculate totals for this status based on Excel sheet logic
            let totalCostUSD = 0;
            let totalMUAmount = 0;
            let totalQTRate = 0;

            statusLines.forEach(line => {
                const costSum = parseFloat(line.cost_sum || 0);
                const roe = parseFloat(line.roe || form.usd_roe || 1.00);
                const muPercent = parseFloat(line.mu_percent || form.general_mu || 25.00);

                const costUSD = costSum / roe;
                const muAmount = (costUSD * muPercent) / 100;
                const qtRate = costUSD + muAmount;

                totalCostUSD += costUSD;
                totalMUAmount += muAmount;
                totalQTRate += qtRate;
            });

            // Apply CAF to the total sale amount
            const caf = parseFloat(form.caf || 5.00);
            let finalSale = totalQTRate;
            if (caf !== 0) {
                finalSale = totalQTRate * (1 + caf / 100);
            }

            // Round up if specified
            if (form.round_up_rate_to_client) {
                finalSale = Math.ceil(finalSale);
            }

            const profitRate = finalSale === 0 ? 0 : ((finalSale - totalCostUSD) / finalSale) * 100;

            calculations[status] = {
                cost: totalCostUSD.toFixed(2),
                markup: totalMUAmount.toFixed(2),
                sale: finalSale.toFixed(2),
                profitRate: `${profitRate.toFixed(1)}%`
            };
        });

        return calculations;
    }, [form.quotation_lines, form.usd_roe, form.general_mu, form.caf, form.round_up_rate_to_client]);


    return (
        <Box pt={{ base: "100px", md: "60px", xl: "60px" }}>
            <VStack spacing={6} align="stretch" pt='30px'>
                {/* Header bar */}
                <Flex justify="space-between" align="center" ps={'25px'}>
                    <Text fontSize="2xl" fontWeight="bold">{isEdit ? "Update Quotation" : "Create Quotation"}</Text>
                    <HStack spacing={3}>
                        <ButtonGroup isAttached size="sm" variant="outline" borderRadius="full">
                            <Button
                                leftIcon={<Icon as={MdViewModule} />}
                                colorScheme={viewMode === 'form' ? 'blue' : 'gray'}
                                variant={viewMode === 'form' ? 'solid' : 'outline'}
                                onClick={() => setViewMode('form')}
                                aria-pressed={viewMode === 'form'}
                            >
                                Form
                            </Button>
                            <Button
                                leftIcon={<Icon as={MdTableChart} />}
                                colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                                variant={viewMode === 'table' ? 'solid' : 'outline'}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                Table
                            </Button>
                        </ButtonGroup>
                        <Button onClick={() => history.push("/admin/quotations/list")} variant="ghost">Cancel</Button>
                        <Button colorScheme="blue" onClick={save} isLoading={isSaving}>{isEdit ? "Save QT" : "Create NEW"}</Button>
                    </HStack>
                </Flex>

                {/* Main Layout - QT Number/Actions and Summary Panel */}
                <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} mb={3}>

                    <Box bg="white" p={4} borderRadius="md" mb={4}>
                        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={4}>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="bold">Client</FormLabel>
                                <SearchableSelect
                                    value={form.partner_id}
                                    onChange={(v) => {
                                        updateField('partner_id', v);
                                    }}
                                    options={customerOptions}
                                    isLoading={customersLoading}
                                    placeholder="Select client"
                                    displayKey="name"
                                    valueKey="id"
                                    formatOption={(option) => {
                                        return `${option.id} - ${option.name}`;
                                    }}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="bold">Vessel</FormLabel>
                                <SearchableSelect value={form.vessel_id} onChange={(v) => updateField('vessel_id', v)} options={vesselOptions} isLoading={vesselsLoading} placeholder="Select vessel" />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="bold">SO ID</FormLabel>
                                <Input value={form.oc_number} onChange={(e) => updateField('oc_number', e.target.value)} placeholder="SO ID" />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="bold">QT Number</FormLabel>
                                <Input value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="Auto/Manual" />
                            </FormControl>
                            <FormControl size="sm" >
                                <FormLabel fontSize="sm" fontWeight="bold">Validity Date</FormLabel>
                                <Input type="date" value={form.eta_date || ''} onChange={(e) => updateField('eta_date', e.target.value)} />
                            </FormControl>
                        </Grid>
                    </Box>

                    {/* Right: Summary Panel */}
                    <Box>
                        <VStack spacing={4} align="stretch">

                            {/* Configuration Section */}
                            <Box bg="green.50" p={3} borderRadius="md" border="1px" borderColor="green.200">
                                <Grid templateColumns="1fr 1fr" gap={2}>

                                    <Box>
                                        <Text fontSize="xs" fontWeight="bold" mb={1}>Currency</Text>
                                        <Select size="sm" value={form.sale_currency} onChange={(e) => updateField('sale_currency', e.target.value)}>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                            {currencyOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </Select>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" fontWeight="bold" mb={1}>USD RDE</Text>
                                        <NumberInput size="sm" value={form.usd_roe} onChange={(v) => updateField('usd_roe', v)}>
                                            <NumberInputField placeholder="1.00" />
                                        </NumberInput>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" fontWeight="bold" mb={1}>General MU</Text>
                                        <NumberInput size="sm" value={form.general_mu} onChange={(v) => updateField('general_mu', v)}>
                                            <NumberInputField placeholder="25.00" />
                                        </NumberInput>
                                    </Box>
                                    <Box>
                                        <Text fontSize="xs" fontWeight="bold" mb={1}>CAF</Text>
                                        <NumberInput size="sm" value={form.caf} onChange={(v) => updateField('caf', v)}>
                                            <NumberInputField placeholder="5.00" />
                                        </NumberInput>
                                    </Box>
                                </Grid>
                                <Box mt={2}>
                                    <input
                                        type="checkbox"
                                        checked={form.round_up_rate_to_client || false}
                                        onChange={(e) => updateField('round_up_rate_to_client', e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <Text fontSize="xs" fontWeight="bold" as="span">Round up rate to client</Text>
                                </Box>
                            </Box>

                            {/* Financial Summary Section */}
                            <Box bg="blue.50" p={3} borderRadius="md" border="1px" borderColor="blue.200">
                                <Table size="sm" variant="unstyled">
                                    <Thead>
                                        <Tr>
                                            <Th fontSize="xs" fontWeight="bold" textAlign="center" p={1}>Cost</Th>
                                            <Th fontSize="xs" fontWeight="bold" textAlign="center" p={1}>Mark up</Th>
                                            <Th fontSize="xs" fontWeight="bold" textAlign="center" p={1}>Sale</Th>
                                            <Th fontSize="xs" fontWeight="bold" textAlign="center" p={1}>Profit rate</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        <Tr>
                                            <Td fontSize="xs" fontWeight="bold" p={1}>QT Current</Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.current?.cost || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.current?.markup || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.current?.sale || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.current?.profitRate || "0.0%"} isReadOnly bg="blue.100" />
                                            </Td>
                                        </Tr>
                                        <Tr>
                                            <Td fontSize="xs" fontWeight="bold" p={1}>QT Pending</Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.pending?.cost || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.pending?.markup || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.pending?.sale || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.pending?.profitRate || "0.0%"} isReadOnly bg="blue.100" />
                                            </Td>
                                        </Tr>
                                        <Tr>
                                            <Td fontSize="xs" fontWeight="bold" p={1}>Order</Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.order?.cost || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.order?.markup || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.order?.sale || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.order?.profitRate || "0.0%"} isReadOnly bg="blue.100" />
                                            </Td>
                                        </Tr>
                                        <Tr>
                                            <Td fontSize="xs" fontWeight="bold" p={1}>ToInvoice</Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.toinvoice?.cost || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.toinvoice?.markup || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.toinvoice?.sale || "0.00"} isReadOnly bg="blue.100" />
                                            </Td>
                                            <Td p={1}>
                                                <Input size="sm" value={statusCalculations.toinvoice?.profitRate || "0.0%"} isReadOnly bg="blue.100" />
                                            </Td>
                                        </Tr>
                                    </Tbody>
                                </Table>
                            </Box>

                        </VStack>
                    </Box>
                </Grid>

                {viewMode === 'form' && (
                    <HStack style={{ justifyContent: 'end' }}>
                        {!canAddNewLine() && (
                            <Text fontSize="sm" color="gray.500">Fill Location, Vendor, Quantity and Buy Rate to add a new line</Text>
                        )}
                        <Button size="sm" colorScheme="blue" onClick={addNewLine} isDisabled={!canAddNewLine()}>
                            Add another line
                        </Button>
                    </HStack>
                )}

                {/* Lines worksheet - Form view */}
                {viewMode === 'form' && (
                    <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="md" boxShadow="sm">
                        {form.quotation_lines.map((line, idx) => (
                            <VStack key={idx} spacing={5} align="stretch" border="1px" borderColor="gray.200" borderRadius="md" p={4} bg={idx === expandedLineIdx ? 'white' : 'gray.50'} mb={4}>
                                {/* Collapsed summary row */}
                                {idx !== expandedLineIdx && (
                                    <Grid templateColumns={{ base: '1fr', lg: 'repeat(8, 1fr)' }} gap={3} alignItems="center">
                                        <Text fontSize="sm"><b>Location:</b> {countries.find(c => c.id === (line.location || ''))?.name || line.location || '-'}</Text>
                                        <Text fontSize="sm"><b>Vendor:</b> {agents.find(a => a.id === (line.vendor_id || ''))?.name || line.vendor_id || '-'}</Text>
                                        <Text fontSize="sm"><b>Rate Item:</b> {rateItems.find(r => r.id === (line.item_name || ''))?.name || line.item_name || '-'}</Text>
                                        <Text fontSize="sm" isTruncated><b>Qty:</b> {line.quantity ?? '-'}</Text>
                                        <Text fontSize="sm" isTruncated><b>Buy Rate:</b> {line.buy_rate_calculation ?? '-'}</Text>
                                        <Text fontSize="sm"><b>Client Specific:</b> {line.is_client_specific ? 'Yes' : 'No'}</Text>
                                        <HStack>
                                            <Text fontSize="sm"><b>Status:</b></Text>
                                            <Badge colorScheme={line.status === 'current' ? 'green' : 'gray'}>{line.status || '-'}</Badge>
                                        </HStack>
                                        <HStack justify="flex-end" spacing={2}>
                                            <Button size="xs" onClick={() => setExpandedLineIdx(idx)} colorScheme="blue">Edit</Button>
                                            <Button size="xs" onClick={() => removeLine(idx)} colorScheme="red" variant="outline" leftIcon={<Icon as={MdDelete} />}>Delete</Button>
                                        </HStack>
                                    </Grid>
                                )}

                                {/* Expanded editable form for this line */}
                                {idx === expandedLineIdx && (
                                    <>
                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Client Specific</FormLabel>
                                                <Select size="sm" value={line.is_client_specific ? 'true' : 'false'} onChange={(e) => updateLine(idx, 'is_client_specific', e.target.value === 'true')}>
                                                    <option value={'false'}>No</option>
                                                    <option value={'true'}>Yes</option>
                                                </Select>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Location</FormLabel>
                                                <SearchableSelect
                                                    value={line.location}
                                                    onChange={(v) => {
                                                        updateLine(idx, 'location', v);
                                                    }}
                                                    options={countryOptions}
                                                    isLoading={countriesLoading}
                                                    placeholder="Select location"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => {
                                                        return `${option.id} - ${option.name}`;
                                                    }}
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Vendor</FormLabel>
                                                <SearchableSelect value={line.vendor_id} onChange={(v) => updateLine(idx, 'vendor_id', v)} options={getFilteredVendorsForLine(line)} isLoading={agentsLoading} placeholder="Select vendor" />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Rate Item Name</FormLabel>
                                                <SearchableSelect
                                                    value={line.item_name}
                                                    onChange={(v) => updateLine(idx, 'item_name', v)}
                                                    options={getRateItemOptionsForLine(line)}
                                                    isLoading={rateItemsLoading}
                                                    placeholder={!line.vendor_id ? "Please select the vendor first" : (line.is_client_specific ? "Rate item" : "Select Client Specific first")}
                                                    isDisabled={!line.is_client_specific || !line.vendor_id}
                                                />
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Rate Remark</FormLabel>
                                                <Input size="sm" value={line.rate_remark} onChange={(e) => updateLine(idx, 'rate_remark', e.target.value)} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Free text</FormLabel>
                                                <Input size="sm" value={line.free_text} onChange={(e) => updateLine(idx, 'free_text', e.target.value)} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Pre-text Rate Item Name</FormLabel>
                                                <input type="checkbox" checked={line.pre_text} onChange={(e) => updateLine(idx, 'pre_text', e.target.checked)} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Remark</FormLabel>
                                                <Input size="sm" value={line.product_remarks} onChange={(e) => updateLine(idx, 'product_remarks', e.target.value)} />
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Currency override</FormLabel>
                                                <SearchableSelect value={line.currency_override} onChange={(v) => updateLine(idx, 'currency_override', v)} options={currencyOptions} isLoading={currenciesLoading} placeholder="Currency" />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Quantity</FormLabel>
                                                <NumberInput size="sm" value={line.quantity} onChange={(v) => updateLine(idx, 'quantity', v)} min={1}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Buy Rate</FormLabel>
                                                <NumberInput size="sm" value={line.buy_rate_calculation} onChange={(v) => updateLine(idx, 'buy_rate_calculation', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Calculation</FormLabel>
                                                <Input size="sm" isReadOnly value={line.buy_rate_calculation ? 'Rate valid' : 'Rate invalid'} />
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Cost actual</FormLabel>
                                                <NumberInput size="sm" value={line.cost_actual} onChange={(v) => updateLine(idx, 'cost_actual', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Fixed Sale</FormLabel>
                                                <Select size="sm" value={line.fixed} onChange={(e) => updateLine(idx, 'fixed', e.target.value === 'true')}><option value={false}>No</option><option value={true}>Yes</option></Select>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Currency</FormLabel>
                                                <SearchableSelect value={line.sale_currency} onChange={(v) => updateLine(idx, 'sale_currency', v)} options={currencyOptions} isLoading={currenciesLoading} placeholder="Currency" />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Cost sum</FormLabel>
                                                <NumberInput size="sm" value={line.cost_sum} onChange={(v) => updateLine(idx, 'cost_sum', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">ROE</FormLabel>
                                                <NumberInput size="sm" value={line.roe} onChange={(v) => updateLine(idx, 'roe', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Cost USD</FormLabel>
                                                <NumberInput size="sm" value={line.cost_usd} onChange={(v) => updateLine(idx, 'cost_usd', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">MU %</FormLabel>
                                                <NumberInput size="sm" value={line.mu_percent} onChange={(v) => updateLine(idx, 'mu_percent', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">MU Amount</FormLabel>
                                                <NumberInput size="sm" value={line.mu_amount} onChange={(v) => updateLine(idx, 'mu_amount', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Amended Rate</FormLabel>
                                                <NumberInput size="sm" value={line.amended_rate} onChange={(v) => updateLine(idx, 'amended_rate', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Rate to Client</FormLabel>
                                                <NumberInput size="sm" value={line.rate_to_client} onChange={(v) => updateLine(idx, 'rate_to_client', v)}><NumberInputField placeholder="0" /></NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Group Free Text</FormLabel>
                                                <Input size="sm" value={line.group_free_text} onChange={(e) => updateLine(idx, 'group_free_text', e.target.value)} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Status</FormLabel>
                                                <Select size="sm" value={line.status} onChange={(e) => updateLine(idx, 'status', e.target.value)}>
                                                    <option value="current">Quote Current</option>
                                                    <option value="pending">Quote Pending</option>
                                                    <option value="order">Order</option>
                                                    <option value="toinvoice">ToInvoice</option>
                                                    <option value="inactive">Inactive</option>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <HStack justify="flex-end" spacing={2}>
                                            <Button size="xs" colorScheme="red" variant="outline" onClick={() => removeLine(idx)} leftIcon={<Icon as={MdDelete} />}>Delete Line</Button>
                                            <Button size="xs" variant="outline" onClick={() => setExpandedLineIdx(-1)}>Collapse</Button>
                                        </HStack>
                                    </>
                                )}
                            </VStack>
                        ))}
                    </Box>
                )}

                {viewMode === 'table' && (
                    <HStack style={{ justifyContent: 'end' }}>
                        {!canAddNewLine() && (
                            <Text fontSize="sm" color="gray.500">Fill Location, Vendor, Quantity and Buy Rate to add a new line</Text>
                        )}
                        <Button size="sm" colorScheme="blue" onClick={addNewLine} isDisabled={!canAddNewLine()}>
                            Add another line
                        </Button>
                    </HStack>
                )}

                {/* Main Quotation Lines Table */}
                {viewMode === 'table' && (
                    <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="md" boxShadow="sm" overflowX="auto" overflowY="auto" maxH={{ base: 'unset', md: '60vh' }}>
                        <Table
                            size="sm"
                            variant="unstyled"
                            tableLayout="fixed"
                            minW="2500px"
                            sx={{
                                'th, td': { minW: '120px', px: 2, py: 2 },
                                thead: {
                                    'tr': {
                                        'th': {
                                            position: 'sticky', top: 0, zIndex: 3,
                                            bg: 'gray.600',
                                            color: 'white',
                                            textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px',
                                            borderBottom: '1px solid', borderColor: 'gray.400',
                                            textAlign: 'center'
                                        }
                                    }
                                },
                                'tbody tr:nth-of-type(odd)': { bg: 'green.50' },
                                'tbody tr:nth-of-type(even)': { bg: 'white' },
                                'tbody tr:hover td': { bg: 'blue.50' },
                                'tbody td': { borderBottom: '1px solid', borderColor: 'gray.200' },
                                'tbody td:last-of-type, thead th:last-of-type': { borderRight: '0' },
                            }}
                        >
                            <Thead>
                                <Tr>
                                    <Th>Client Specific</Th>
                                    <Th>Location ID</Th>
                                    <Th>Vendor</Th>
                                    <Th>Rate Item Name</Th>
                                    <Th>Rate Remark</Th>
                                    <Th>Free text</Th>
                                    <Th>Pre-text Rate Item Name</Th>
                                    <Th>Remark</Th>
                                    <Th>Currency override</Th>
                                    <Th isNumeric>Quantity</Th>
                                    <Th>Buy Rate</Th>
                                    <Th>Calculation</Th>
                                    <Th isNumeric>Cost actual</Th>
                                    <Th>Fixed Sale</Th>
                                    <Th>Currency</Th>
                                    <Th isNumeric>Cost sum</Th>
                                    <Th isNumeric>ROE</Th>
                                    <Th isNumeric>Cost USD</Th>
                                    <Th isNumeric>MU %</Th>
                                    <Th isNumeric>MU Amount</Th>
                                    <Th isNumeric>QT Rate</Th>
                                    <Th isNumeric>Amended Rate</Th>
                                    <Th>Rate to client</Th>
                                    <Th>Group Free text</Th>
                                    <Th>Status</Th>
                                    <Th>Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {form.quotation_lines.map((line, idx) => (
                                    <Tr key={idx}>
                                        <Td textAlign="center">
                                            <input type="checkbox" checked={line.is_client_specific} onChange={(e) => updateLine(idx, 'is_client_specific', e.target.checked)} style={{ width: '18px', height: '18px', maxHeight: '18px', maxWidth: '18px' }} />
                                        </Td>
                                        <Td>
                                            <SearchableSelect
                                                value={line.location}
                                                onChange={(v) => {
                                                    updateLine(idx, 'location', v);
                                                }}
                                                options={countryOptions}
                                                isLoading={countriesLoading}
                                                placeholder="Location"
                                                displayKey="name"
                                                valueKey="id"
                                                formatOption={(option) => {
                                                    return `${option.id} - ${option.name}`;
                                                }}
                                            />
                                        </Td>
                                        <Td><SearchableSelect value={line.vendor_id} onChange={(v) => updateLine(idx, 'vendor_id', v)} options={getFilteredVendorsForLine(line)} placeholder="Vendor" /></Td>
                                        <Td>
                                            <SearchableSelect
                                                value={line.item_name}
                                                onChange={(v) => updateLine(idx, 'item_name', v)}
                                                options={getRateItemOptionsForLine(line)}
                                                placeholder={!line.vendor_id ? "Please select the vendor first" : (line.is_client_specific ? "Rate item" : "Select Client Specific first")}
                                                isDisabled={!line.is_client_specific || !line.vendor_id}
                                            />
                                        </Td>
                                        <Td><Input size="sm" w="100%" value={line.rate_remark} onChange={(e) => updateLine(idx, 'rate_remark', e.target.value)} placeholder="Remark" /></Td>
                                        <Td><Input size="sm" w="100%" value={line.free_text} onChange={(e) => updateLine(idx, 'free_text', e.target.value)} placeholder="Free text" /></Td>
                                        <Td textAlign="center">
                                            <input type="checkbox" checked={line.pre_text} onChange={(e) => updateLine(idx, 'pre_text', e.target.checked)} style={{ width: '18px', height: '18px', maxHeight: '18px', maxWidth: '18px' }} />
                                        </Td>
                                        <Td><Input size="sm" w="100%" value={line.product_remarks} onChange={(e) => updateLine(idx, 'product_remarks', e.target.value)} placeholder="Remark" /></Td>
                                        <Td><SearchableSelect value={line.currency_override} onChange={(v) => updateLine(idx, 'currency_override', v)} options={currencyOptions} placeholder="Currency" /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.quantity} onChange={(v) => updateLine(idx, 'quantity', v)} min={1}><NumberInputField /></NumberInput></Td>
                                        <Td><NumberInput size="sm" w="100%" value={line.buy_rate_calculation} onChange={(v) => updateLine(idx, 'buy_rate_calculation', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td><Input size="sm" w="100%" value={line.buy_rate_calculation ? 'Rate valid' : 'Rate invalid'} isReadOnly /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_actual} onChange={(v) => updateLine(idx, 'cost_actual', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td><NumberInput size="sm" w="100%" value={line.fixed ? line.cost_actual : ''} onChange={(v) => updateLine(idx, 'fixed', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td><SearchableSelect value={line.sale_currency} onChange={(v) => updateLine(idx, 'sale_currency', v)} options={currencyOptions} placeholder="Currency" /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_sum} onChange={(v) => updateLine(idx, 'cost_sum', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.roe} onChange={(v) => updateLine(idx, 'roe', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_usd} onChange={(v) => updateLine(idx, 'cost_usd', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.mu_percent} onChange={(v) => updateLine(idx, 'mu_percent', v)}><NumberInputField placeholder="0%" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.mu_amount} onChange={(v) => updateLine(idx, 'mu_amount', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.qt_rate} onChange={(v) => updateLine(idx, 'qt_rate', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.amended_rate} onChange={(v) => updateLine(idx, 'amended_rate', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td><NumberInput size="sm" w="100%" value={line.rate_to_client} onChange={(v) => updateLine(idx, 'rate_to_client', v)}><NumberInputField placeholder="0,00" /></NumberInput></Td>
                                        <Td><Input size="sm" w="100%" value={line.group_free_text} onChange={(e) => updateLine(idx, 'group_free_text', e.target.value)} placeholder="Group Free text" /></Td>
                                        <Td>
                                            <Select size="sm" value={line.status} onChange={(e) => updateLine(idx, 'status', e.target.value)}>
                                                <option value="current">Quote Current</option>
                                                <option value="pending">Quote Pending</option>
                                                <option value="order">Order</option>
                                                <option value="toinvoice">ToInvoice</option>
                                                <option value="inactive">Inactive</option>
                                            </Select>
                                        </Td>
                                        <Td textAlign="center">
                                            <Button size="xs" onClick={() => removeLine(idx)} colorScheme="red" variant="outline" leftIcon={<Icon as={MdDelete} />}>
                                                Delete
                                            </Button>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                )}
            </VStack>
        </Box>
    );
}
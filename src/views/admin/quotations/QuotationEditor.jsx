import React, { useEffect, useState, useCallback } from "react";
import { useParams, useHistory, useLocation } from "react-router-dom";
import {
    Box, Flex, Grid, VStack, HStack, Text, Button, ButtonGroup, Input, Textarea, Icon, Badge,
    NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
    FormControl, FormLabel, Select, useToast,
    Table, Thead, Tbody, Tr, Th, Td, useColorModeValue
} from "@chakra-ui/react";
import { MdViewModule, MdTableChart } from "react-icons/md";
import quotationsAPI from "../../../api/quotations";
import api from "../../../api/axios";
import { getCustomersApi } from "../../../api/customer";
import vesselsAPI from "../../../api/vessels";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import SearchableSelect from "../../../components/forms/SearchableSelect";


export default function QuotationEditor() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const toast = useToast();
    const history = useHistory();
    const location = useLocation();

    const [customers, setCustomers] = useState([]);
    const [vessels, setVessels] = useState([]);
    // uoms not used in this editor
    const [currencies, setCurrencies] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [agents, setAgents] = useState([]);
    const [rateItems, setRateItems] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState('form'); // 'form' | 'table'

    const [customersLoading, setCustomersLoading] = useState(false);
    const [vesselsLoading, setVesselsLoading] = useState(false);
    const [destinationsLoading, setDestinationsLoading] = useState(false);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [rateItemsLoading, setRateItemsLoading] = useState(false);
    const [currenciesLoading, setCurrenciesLoading] = useState(false);

    const [form, setForm] = useState({
        partner_id: "",
        vessel_id: "",
        oc_number: "",
        client_remark: "",
        sale_currency: "",
        usd_roe: "",
        general_mu: "",
        caf: "",
        name: "",
        quotation_lines: Array.from({ length: 1 }).map(() => ({
            client_specific: false,
            location_id: "",
            vendor_id: "",
            item_name: "",
            rate_remark: "",
            free_text: "",
            pre_text: "",
            pre_text_auto: false,
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
        })),
    });

    const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const updateLine = (idx, field, value) => setForm(prev => ({
        ...prev,
        quotation_lines: prev.quotation_lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)
    }));

    // Manage which line is expanded in Form view
    const [expandedLineIdx, setExpandedLineIdx] = useState(0);

    const createEmptyLine = () => ({
        client_specific: false,
        location_id: "",
        vendor_id: "",
        item_name: "",
        rate_remark: "",
        free_text: "",
        pre_text: "",
        pre_text_auto: false,
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
    });

    const isLineComplete = (line) => {
        const hasLocation = Boolean(line.location_id);
        const hasVendor = Boolean(line.vendor_id);
        const hasItem = Boolean(line.item_name);
        const hasQty = Number(line.quantity) > 0;
        const hasBuyRate = line.buy_rate_calculation !== "" && line.buy_rate_calculation !== null && line.buy_rate_calculation !== undefined;
        return hasLocation && hasVendor && hasItem && hasQty && hasBuyRate;
    };

    const canAddNewLine = () => {
        if (!form.quotation_lines || form.quotation_lines.length === 0) return false;
        const last = form.quotation_lines[form.quotation_lines.length - 1];
        return isLineComplete(last);
    };

    const addNewLine = () => {
        setForm(prev => ({ ...prev, quotation_lines: [...prev.quotation_lines, createEmptyLine()] }));
        // Collapse previous rows and expand the newly added one
        setExpandedLineIdx(form.quotation_lines.length);
    };

    const loadMaster = useCallback(async () => {
        setCustomersLoading(true);
        setVesselsLoading(true);
        setCurrenciesLoading(true);
        setDestinationsLoading(true);
        setAgentsLoading(true);
        setRateItemsLoading(true);

        getCustomersApi()
            .then(cust => setCustomers(cust.customers || []))
            .finally(() => setCustomersLoading(false));

        vesselsAPI.getVessels()
            .then(ves => setVessels(ves.vessels || []))
            .finally(() => setVesselsLoading(false));

        currenciesAPI.getCurrencies()
            .then(cur => setCurrencies(cur.currencies || []))
            .finally(() => setCurrenciesLoading(false));

        locationsAPI.getLocations()
            .then(dest => setDestinations(dest.locations || dest || []))
            .finally(() => setDestinationsLoading(false));

        api.get('/api/vendor/list').then(r => r.data).catch(() => ({ vendors: [] }))
            .then(vendorsRes => setAgents(vendorsRes.vendors || []))
            .finally(() => setAgentsLoading(false));

        api.get('/api/products').then(r => r.data).catch(() => ({ products: [] }))
            .then(productsRes => setRateItems(productsRes.products || []))
            .finally(() => setRateItemsLoading(false));
    }, []);

    const normalizeServerToForm = useCallback((q) => {
        const header = {
            partner_id: q.partner_id || "",
            vessel_id: q.vessel_id || "",
            oc_number: q.oc_number || "",
            client_remark: q.client_remark || "",
            sale_currency: q.sale_currency || q.currency || "",
            usd_roe: q.usd_roe || "",
            general_mu: q.general_mu || "",
            caf: q.caf || "",
            name: q.name || ""
        };
        const rawLines = (q.quotation_lines || q.quotation_line_ids || []);
        const lines = Array.isArray(rawLines) ? rawLines.map((l) => ({
            client_specific: !!(l && l.client_specific),
            location_id: (l && (l.location_id || l.location)) || "",
            vendor_id: (l && l.vendor_id) || "",
            vendor_rate: (l && l.vendor_rate) || "",
            item_name: (l && l.item_name) || "",
            name: (l && l.name) || "",
            rate_remark: (l && l.rate_remark) || "",
            free_text: (l && l.free_text) || "",
            pre_text: (l && l.pre_text) || "",
            pre_text_auto: !!(l && l.pre_text_auto),
            currency_override: (l && l.currency_override) || "",
            quantity: (l && l.quantity) || 0,
            buy_rate_calculation: (l && l.buy_rate_calculation) || 0,
            uom: (l && l.uom) || "",
            cost_actual: (l && l.cost_actual) || 0,
            fixed: !!(l && l.fixed),
            sale_currency: (l && l.sale_currency) || "",
            cost_sum: (l && l.cost_sum) || 0,
            roe: (l && l.roe) || 0,
            cost_usd: (l && l.cost_usd) || 0,
            mu_percent: (l && l.mu_percent) || 0,
            mu_amount: (l && l.mu_amount) || 0,
            qt_rate: (l && l.qt_rate) || 0,
            amended_rate: (l && l.amended_rate) || 0,
            rate_to_client: (l && l.rate_to_client) || 0,
            group_free_text: (l && l.group_free_text) || "",
            status: (l && l.status) || "current",
        })) : [];
        const defaultLine = {
            client_specific: false,
            location_id: "",
            vendor_id: "",
            item_name: "",
            rate_remark: "",
            free_text: "",
            pre_text: "",
            pre_text_auto: false,
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
        };
        return { ...header, quotation_lines: lines.length ? lines : [defaultLine] };
    }, []);

    const loadExisting = useCallback(async () => {
        if (!isEdit) return;
        // Prefer navigation state when available
        const stateQuotation = location && location.state && location.state.quotation;
        if (stateQuotation) {
            setForm(() => normalizeServerToForm(stateQuotation));
            return;
        }
        // Fallback to API when visiting directly or on refresh
        const data = await quotationsAPI.getQuotationById(id);
        const q = data.quotation || data;
        if (q) setForm(() => normalizeServerToForm(q));
    }, [id, isEdit, location, normalizeServerToForm]);

    useEffect(() => {
        loadMaster();
        loadExisting();
    }, [loadMaster, loadExisting]);

    const save = async () => {
        try {
            setIsSaving(true);
            // Execute request and inspect payload even on HTTP 200 (send all fields)
            const payload = isEdit
                ? await quotationsAPI.updateQuotation({ quotation_id: Number(id), ...form })
                : await quotationsAPI.createQuotation(form);

            const resultNode = (payload && payload.result) || payload;
            const statusNode = (resultNode && (resultNode.status || resultNode.result?.status));
            const messageNode = (resultNode && (resultNode.message || resultNode.result?.message));

            if (String(statusNode).toLowerCase() === 'error') {
                // Normalize to an Error so catch handler shows detailed toast
                const errorObj = new Error(messageNode || 'Operation failed');
                // attach original payload for downstream formatting
                errorObj.response = { data: payload };
                throw errorObj;
            }

            toast({ title: isEdit ? "Updated" : "Created", status: "success" });
            history.push("/admin/quotations/list");
        } catch (e) {
            const original = (e && e.response && e.response.data) || e?.data || e;
            // Extract a human-friendly message if available
            let primaryMessage = '';
            if (original && typeof original === 'object') {
                primaryMessage = original.message
                    || original.error
                    || (original.result && (original.result.message || original.result.error))
                    || '';
            }
            if (!primaryMessage && typeof original === 'string') primaryMessage = original;
            if (!primaryMessage && e && e.message) primaryMessage = e.message;

            console.error('Save failed:', original);
            toast({ title: primaryMessage || "Save failed", status: "error", duration: 8000, isClosable: true });
        } finally {
            setIsSaving(false);
        }
    };

    // Table UI colors (match client/agents tables)
    const headerBg = useColorModeValue('gray.50', 'gray.700');
    const headerColor = useColorModeValue('gray.600', 'gray.300');
    const headerBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
    const rowBg = useColorModeValue('white', 'gray.800');
    const rowBgAlt = useColorModeValue('gray.50', 'gray.700');
    const rowHover = useColorModeValue('blue.50', 'gray.600');


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

                {/* Header worksheet fields (sticky toolbar-style grid) */}
                <Box position="sticky" top={{ base: '70px', md: '60px' }} zIndex={10} bg="white" boxShadow="sm" borderBottom="1px" borderColor="gray.200">
                    <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} p={{ base: 3, md: 4 }} alignItems="start">
                        {/* Left: Client/Vessel/SO + Job Description */}
                        <VStack align="stretch" spacing={2}>
                            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
                                <FormControl isRequired>
                                    <FormLabel fontSize="xs" mb={1}>Client</FormLabel>
                                    <SearchableSelect value={form.partner_id} onChange={(v) => updateField('partner_id', v)} options={customers} isLoading={customersLoading} placeholder="Select client" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs" mb={1}>Vessel</FormLabel>
                                    <SearchableSelect value={form.vessel_id} onChange={(v) => updateField('vessel_id', v)} options={vessels} isLoading={vesselsLoading} placeholder="Select vessel" />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="xs" mb={1}>SO ID</FormLabel>
                                    <Input size="sm" value={form.oc_number} onChange={(e) => updateField('oc_number', e.target.value)} placeholder="SO ID" />
                                </FormControl>
                            </Grid>
                            <FormControl>
                                <FormLabel fontSize="xs" mb={1}>Job Description</FormLabel>
                                <Textarea size="sm" value={form.client_remark} onChange={(e) => updateField('client_remark', e.target.value)} rows={3} />
                            </FormControl>
                        </VStack>
                        {/* Right: Summary panel like the yellow box */}
                        <Box bg="yellow.50" border="1px" borderColor="yellow.200" borderRadius="10px" p={4}>
                            <VStack align="stretch" spacing={3}>
                                <FormControl>
                                    <FormLabel fontSize="xs" mb={1}>QT Number</FormLabel>
                                    <Input size="sm" value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} placeholder="Auto/Manual" />
                                </FormControl>
                                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
                                    <FormControl>
                                        <FormLabel fontSize="xs" mb={1}>Currency</FormLabel>
                                        <Select size="sm" value={form.sale_currency} onChange={(e) => updateField('sale_currency', e.target.value)}>
                                            <option value="">Select</option>
                                            {currencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </Select>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" mb={1}>USD ROE</FormLabel>
                                        <NumberInput size="sm" value={form.usd_roe} onChange={(v) => updateField('usd_roe', v)}>
                                            <NumberInputField placeholder="0" />
                                            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" mb={1}>General MU</FormLabel>
                                        <NumberInput size="sm" value={form.general_mu} onChange={(v) => updateField('general_mu', v)}>
                                            <NumberInputField placeholder="0" />
                                            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="xs" mb={1}>CAF</FormLabel>
                                        <NumberInput size="sm" value={form.caf} onChange={(v) => updateField('caf', v)}>
                                            <NumberInputField placeholder="0" />
                                            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>
                                </Grid>
                            </VStack>
                        </Box>
                    </Grid>
                </Box>

                {viewMode === 'form' && (
                <HStack pt={2} style={{ justifyContent: 'end' }}>
                    {!canAddNewLine() && (
                        <Text fontSize="sm" color="gray.500">Fill Location, Vendor, Rate Item, Quantity and Buy Rate to add a new line</Text>
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
                                        <Text fontSize="sm"><b>Location:</b> {destinations.find(d => d.id === (line.location_id || ''))?.name || line.location_id || '-'}</Text>
                                        <Text fontSize="sm"><b>Vendor:</b> {agents.find(a => a.id === (line.vendor_id || ''))?.name || line.vendor_id || '-'}</Text>
                                        <Text fontSize="sm"><b>Rate Item:</b> {rateItems.find(r => r.id === (line.item_name || ''))?.name || line.item_name || '-'}</Text>
                                        <Text fontSize="sm" isTruncated><b>Qty:</b> {line.quantity ?? '-'}</Text>
                                        <Text fontSize="sm" isTruncated><b>Buy Rate:</b> {line.buy_rate_calculation ?? '-'}</Text>
                                        <Text fontSize="sm"><b>Client Specific:</b> {line.client_specific ? 'Yes' : 'No'}</Text>
                                        <HStack>
                                            <Text fontSize="sm"><b>Status:</b></Text>
                                            <Badge colorScheme={line.status === 'current' ? 'green' : 'gray'}>{line.status || '-'}</Badge>
                                        </HStack>
                                        <HStack justify="flex-end">
                                            <Button size="xs" onClick={() => setExpandedLineIdx(idx)} colorScheme="blue">Edit</Button>
                                        </HStack>
                                    </Grid>
                                )}

                                {/* Expanded editable form for this line */}
                                {idx === expandedLineIdx && (
                                    <>
                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Client Specific</FormLabel>
                                                <Select size="sm" value={line.client_specific ? 'true' : 'false'} onChange={(e) => updateLine(idx, 'client_specific', e.target.value === 'true')}>
                                                    <option value={'false'}>No</option>
                                                    <option value={'true'}>Yes</option>
                                                </Select>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Location</FormLabel>
                                                <SearchableSelect value={line.location_id} onChange={(v) => updateLine(idx, 'location_id', v)} options={destinations} isLoading={destinationsLoading} placeholder="Select location" />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Vendor</FormLabel>
                                                <SearchableSelect value={line.vendor_id} onChange={(v) => updateLine(idx, 'vendor_id', v)} options={agents} isLoading={agentsLoading} placeholder="Select vendor" />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Rate Item Name</FormLabel>
                                                <SearchableSelect value={line.item_name} onChange={(v) => updateLine(idx, 'item_name', v)} options={rateItems} isLoading={rateItemsLoading} placeholder="Rate item" />
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
                                                <FormLabel fontSize="sm">Pre-text</FormLabel>
                                                <Input size="sm" value={line.pre_text} onChange={(e) => updateLine(idx, 'pre_text', e.target.value)} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Use Rate Item Name</FormLabel>
                                                <Select size="sm" value={line.pre_text_auto ? 'true' : 'false'} onChange={(e) => {
                                                    const auto = e.target.value === 'true';
                                                    updateLine(idx, 'pre_text_auto', auto);
                                                    if (auto) {
                                                        const item = rateItems.find(r => r.id === line.item_name);
                                                        updateLine(idx, 'pre_text', item ? (item.name || '') : '');
                                                    }
                                                }}>
                                                    <option value={'false'}>No</option>
                                                    <option value={'true'}>Yes</option>
                                                </Select>
                                            </FormControl>
                                        </Grid>

                                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(4, 1fr)' }} gap={4}>
                                            <FormControl>
                                                <FormLabel fontSize="sm">Currency override</FormLabel>
                                                <SearchableSelect value={line.currency_override} onChange={(v) => updateLine(idx, 'currency_override', v)} options={currencies} isLoading={currenciesLoading} placeholder="Currency" />
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
                                                <SearchableSelect value={line.sale_currency} onChange={(v) => updateLine(idx, 'sale_currency', v)} options={currencies} isLoading={currenciesLoading} placeholder="Currency" />
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
                                                    <option value="inactive">Inactive</option>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <HStack justify="flex-end">
                                            <Button size="xs" variant="outline" onClick={() => setExpandedLineIdx(-1)}>Collapse</Button>
                                        </HStack>
                                    </>
                                )}
                            </VStack>
                        ))}
                    </Box>
                )}

                {viewMode === 'table' && (
                <HStack pt={3} style={{ justifyContent: 'end' }}>
                    {!canAddNewLine() && (
                        <Text fontSize="sm" color="gray.500">Fill Location, Vendor, Rate Item, Quantity and Buy Rate to add a new line</Text>
                    )}
                    <Button size="sm" colorScheme="blue" onClick={addNewLine} isDisabled={!canAddNewLine()}>
                        Add another line
                    </Button>
                </HStack>
                )}

                {/* Lines worksheet - Table view */}
                {viewMode === 'table' && (
                    <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="md" boxShadow="sm" overflowX="auto" overflowY="auto" maxH={{ base: 'unset', md: '60vh' }}>
                        <Table
                            size="sm"
                            variant="unstyled"
                            tableLayout="fixed"
                            minW="2000px"
                            sx={{
                                'th, td': { minW: '130px', px: 4, py: 3 },
                                thead: {
                                    'tr': {
                                        'th': {
                                            position: 'sticky', top: 0, zIndex: 3,
                                            bg: headerBg,
                                            color: headerColor,
                                            textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px',
                                            borderBottom: '1px solid', borderColor: headerBorder
                                        }
                                    }
                                },
                                'tbody tr:nth-of-type(odd)': { bg: rowBg },
                                'tbody tr:nth-of-type(even)': { bg: rowBgAlt },
                                'tbody tr:hover td': { bg: rowHover },
                                'tbody td': { borderBottom: '1px solid', borderColor: headerBorder },
                                'tbody td:last-of-type, thead th:last-of-type': { borderRight: '0' },
                            }}
                        >
                            <Thead>
                                <Tr>
                                    {/* <Th>Client Specific</Th> */}
                                    <Th>Location ID</Th>
                                    <Th>Vendor</Th>
                                    <Th>Rate Item Name</Th>
                                    <Th>Rate Remark</Th>
                                    <Th>Free text</Th>
                                    <Th>Pre-text</Th>
                                    <Th>Rate Item Name</Th>
                                    <Th>Currency override</Th>
                                    <Th isNumeric>Quantity</Th>
                                    <Th isNumeric>Buy Rate</Th>
                                    <Th>Calculation</Th>
                                    <Th isNumeric>Cost actual</Th>
                                    <Th>Fixed Sale</Th>
                                    <Th>Currency</Th>
                                    <Th isNumeric>Cost sum</Th>
                                    <Th isNumeric>ROE</Th>
                                    <Th isNumeric>Cost USD</Th>
                                    <Th isNumeric>MU %</Th>
                                    <Th isNumeric>MU Amount</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {form.quotation_lines.map((line, idx) => (
                                    <Tr key={idx}>
                                        <Td>
                                            <Select size="sm" value={line.client_specific ? 'true' : 'false'} onChange={(e) => updateLine(idx, 'client_specific', e.target.value === 'true')}>
                                                <option value={'false'}>No</option>
                                                <option value={'true'}>Yes</option>
                                            </Select>
                                        </Td>
                                        <Td><Input size="sm" w="100%" value={line.location_id} onChange={(e) => updateLine(idx, 'location_id', e.target.value)} placeholder="Location" /></Td>
                                        <Td><SearchableSelect value={line.vendor_id} onChange={(v) => updateLine(idx, 'vendor_id', v)} options={agents} placeholder="Select vendor" /></Td>
                                        <Td><SearchableSelect value={line.item_name} onChange={(v) => updateLine(idx, 'item_name', v)} options={rateItems} placeholder="Rate item" /></Td>
                                        <Td><Input size="sm" w="100%" value={line.rate_remark} onChange={(e) => updateLine(idx, 'rate_remark', e.target.value)} /></Td>
                                        <Td><Input size="sm" w="100%" value={line.free_text} onChange={(e) => updateLine(idx, 'free_text', e.target.value)} /></Td>
                                        <Td><Input size="sm" w="100%" value={line.pre_text} onChange={(e) => updateLine(idx, 'pre_text', e.target.value)} /></Td>
                                        <Td>
                                            <Select size="sm" value={line.pre_text_auto ? 'true' : 'false'} onChange={(e) => {
                                                const auto = e.target.value === 'true';
                                                updateLine(idx, 'pre_text_auto', auto);
                                                if (auto) {
                                                    const item = rateItems.find(r => r.id === line.item_name);
                                                    updateLine(idx, 'pre_text', item ? (item.name || '') : '');
                                                }
                                            }}>
                                                <option value={'false'}>No</option>
                                                <option value={'true'}>Yes</option>
                                            </Select>
                                        </Td>
                                        <Td><SearchableSelect value={line.currency_override} onChange={(v) => updateLine(idx, 'currency_override', v)} options={currencies} placeholder="Currency" /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.quantity} onChange={(v) => updateLine(idx, 'quantity', v)} min={1}><NumberInputField /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.buy_rate_calculation} onChange={(v) => updateLine(idx, 'buy_rate_calculation', v)}><NumberInputField /></NumberInput></Td>
                                        <Td><Input size="sm" isReadOnly value={line.buy_rate_calculation ? 'Rate valid' : 'Rate invalid'} /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_actual} onChange={(v) => updateLine(idx, 'cost_actual', v)}><NumberInputField /></NumberInput></Td>
                                        <Td><Select size="sm" value={line.fixed} onChange={(e) => updateLine(idx, 'fixed', e.target.value === 'true')}><option value={false}>No</option><option value={true}>Yes</option></Select></Td>
                                        <Td><SearchableSelect value={line.sale_currency} onChange={(v) => updateLine(idx, 'sale_currency', v)} options={currencies} placeholder="Currency" /></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_sum} onChange={(v) => updateLine(idx, 'cost_sum', v)}><NumberInputField /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.roe} onChange={(v) => updateLine(idx, 'roe', v)}><NumberInputField /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.cost_usd} onChange={(v) => updateLine(idx, 'cost_usd', v)}><NumberInputField /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.mu_percent} onChange={(v) => updateLine(idx, 'mu_percent', v)}><NumberInputField /></NumberInput></Td>
                                        <Td isNumeric><NumberInput size="sm" w="100%" value={line.mu_amount} onChange={(v) => updateLine(idx, 'mu_amount', v)}><NumberInputField /></NumberInput></Td>
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




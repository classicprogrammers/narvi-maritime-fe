import React, { useState } from "react";
import {
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    HStack,
    Icon,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    SimpleGrid,
    Stat,
    StatLabel,
    StatNumber,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import {
    MdAltRoute,
    MdArrowForward,
    MdAttachMoney,
    MdInfoOutline,
    MdInventory2,
    MdNotes,
    MdPeople,
    MdPictureAsPdf,
} from "react-icons/md";
import RemoteSearchableSelect from "../forms/RemoteSearchableSelect";
import StockIdNameSearchableSelect from "../forms/StockIdNameSearchableSelect";
import StockOriginCountrySelect from "../forms/StockOriginCountrySelect";
import StockValueInput from "../forms/StockValueInput";
import DmyDateInput, { normalizeToIsoDate } from "../forms/DmyDateInput";
import { formatStatusForPdf } from "../../utils/stockReportPdf";
import { calculateVolumeCbmFromLwhCm } from "../../utils/stockVolume";

const BRAND = "#1c4a95";

const STATUS_OPTIONS = [
    { value: "released", label: "Released" },
    { value: "pending", label: "Pending" },
    { value: "stock", label: "Stock" },
    { value: "on_shipping", label: "On Shipping Instr" },
    { value: "on_delivery", label: "On Delivery Instr" },
    { value: "in_transit", label: "In Transit" },
    { value: "arrived", label: "Arrived Dest" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "irregular", label: "Irregularities" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS = {
    pending: "orange",
    stock: "green",
    in_transit: "purple",
    shipped: "blue",
    delivered: "teal",
    arrived: "cyan",
    cancelled: "red",
    irregular: "red",
};

const fieldInputProps = {
    size: "sm",
    bg: "white",
    borderColor: "gray.300",
    borderRadius: "md",
    _hover: { borderColor: "gray.400" },
    _focus: { borderColor: BRAND, boxShadow: `0 0 0 1px ${BRAND}` },
};

const selectColorProps = {
    bg: "white",
    borderColor: "gray.300",
};

const DIMENSION_COLUMNS = [
    { key: "length_cm", label: "Length (cm)", editable: true },
    { key: "width_cm", label: "Width (cm)", editable: true },
    { key: "height_cm", label: "Height (cm)", editable: true },
    { key: "volume_cbm", label: "CBM", editable: false },
    { key: "cw_air_freight", label: "VW", editable: true },
];

function Field({ label, children, span = 1 }) {
    return (
        <FormControl gridColumn={{ base: "auto", md: span === 2 ? "1 / -1" : "auto" }}>
            <FormLabel fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
                {label}
            </FormLabel>
            {children}
        </FormControl>
    );
}

function Section({ icon, title, children }) {
    return (
        <Box px={5} py={4}>
            <HStack spacing={2} mb={3}>
                <Flex w={7} h={7} align="center" justify="center" borderRadius="md" bg="blue.50" color={BRAND}>
                    <Icon as={icon} boxSize={4} />
                </Flex>
                <Text fontSize="sm" fontWeight="700" color="gray.800">
                    {title}
                </Text>
            </HStack>
            {children}
        </Box>
    );
}

function displayName(options, id) {
    if (id == null || id === "") return "";
    const match = (options || []).find((option) => String(option.id) === String(id));
    return match?.name ? String(match.name) : "";
}

function optionLabel(option, fallbackPrefix) {
    if (!option) return "";
    const code = option.name || option.code || option.symbol || "";
    const fullName = option.full_name || option.description || "";
    return [code, fullName].filter(Boolean).join(" - ") || `${fallbackPrefix} ${option.id}`;
}

function ReportSelect({ value, onChange, options, placeholder, onSearchChange, isLoading, fallbackPrefix = "Option", nameOnly = false }) {
    return (
        <RemoteSearchableSelect
            value={value}
            onChange={onChange}
            options={options || []}
            placeholder={placeholder}
            onSearchChange={onSearchChange}
            isLoading={isLoading}
            displayKey="name"
            valueKey="id"
            formatOption={(option) =>
                nameOnly ? option.name || `${fallbackPrefix} ${option.id}` : optionLabel(option, fallbackPrefix)
            }
            size="sm"
            w="100%"
            {...selectColorProps}
        />
    );
}

function emptyDimension() {
    return {
        id: null,
        calculation_method: "lwh",
        length_cm: "",
        width_cm: "",
        height_cm: "",
        volume_dim: "",
        volume_cbm: 0,
        cw_air_freight: "",
        weight_kg: "",
    };
}

function hasValue(value) {
    if (value == null || value === false) return false;
    if (typeof value === "number") return value !== 0;
    return String(value).trim() !== "";
}

function dimensionHasValue(dim) {
    return DIMENSION_COLUMNS.some(({ key }) => hasValue(dim?.[key]));
}

function formatCbm(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num.toFixed(3) : "—";
}

/**
 * Review form shown before a stock report is generated. Field edits update the form row.
 * Confirm saves first; the PDF is generated only after the API returns an id.
 */
export default function StockReportGenerateModal(props) {
    if (!props.isOpen || !props.row) return null;
    return <StockReportPreview {...props} />;
}

/** Fields shown are the ones filled when the preview opened, so clearing one while editing keeps its input. */
function StockReportPreview({
    onClose,
    onConfirm,
    isSubmitting,
    phase,
    row,
    onFieldChange,
    onOriginChange,
    onHub1Change,
    clients = [],
    vesselOptions = [],
    supplierOptions = [],
    currencies = [],
    originOptions = [],
    hubOptions = [],
    onOriginSearch,
    onHubSearch,
    onClientSearch,
    onSupplierSearch,
    onVesselSearch,
    isLoadingLocations = false,
    pcsField = "items",
    dgField = "details",
    dateField = "dateOnStock",
    statusActorName = "",
}) {
    const [initialRow] = useState(row);
    const shown = (...keys) => keys.some((key) => hasValue(initialRow[key]));

    const loadingText =
        phase === "generating" ? "Generating report..." : "Saving stock item...";
    const vesselName = displayName(vesselOptions, row.vessel);
    const clientName = displayName(clients, row.client);
    const fromLabel = formatStatusForPdf(row.stockStatusPreviousForPayload);
    const toLabel = formatStatusForPdf(row.stockStatus);
    const statusChanged = fromLabel !== "-" && toLabel !== "-" && fromLabel !== toLabel;

    const dimensions = Array.isArray(row.dimensions) && row.dimensions.length
        ? row.dimensions
        : [emptyDimension()];
    const initialDimensions = Array.isArray(initialRow.dimensions) ? initialRow.dimensions : [];
    const visibleDimensionIndexes = initialDimensions
        .map((dim, index) => (dimensionHasValue(dim) ? index : -1))
        .filter((index) => index >= 0 && index < dimensions.length);
    const visibleDimensionColumns = DIMENSION_COLUMNS.filter(({ key }) =>
        visibleDimensionIndexes.some((index) => hasValue(initialDimensions[index]?.[key]))
    );
    const totalCbm = row.volumeCbm || dimensions.reduce((sum, dim) => sum + (Number(dim.volume_cbm) || 0), 0);

    const showGeneral = shown("stockStatus", dateField, "poNumber", "shippingDoc");
    const showParties = shown("client", "vessel", "supplier");
    const showRouting = shown("originId", "origin_text", "narviStockViaHub1");
    const showCommercial = shown("currency", "value", dgField);
    const showRemarks = shown("remarks");
    const showPieces =
        shown(pcsField, "weightKgs", "volumeCbm") || visibleDimensionIndexes.length > 0;
    const hasAnySection =
        showGeneral || showParties || showRouting || showCommercial || showRemarks || showPieces;

    const updateDimension = (index, patch) => {
        const next = dimensions.map((dim, dimIndex) => {
            if (dimIndex !== index) return dim;
            const merged = { ...emptyDimension(), ...dim, ...patch, calculation_method: dim.calculation_method || "lwh" };
            const length = Number(merged.length_cm);
            const width = Number(merged.width_cm);
            const height = Number(merged.height_cm);
            if (length > 0 && width > 0 && height > 0) {
                merged.volume_cbm = calculateVolumeCbmFromLwhCm(length, width, height);
            }
            return merged;
        });
        onFieldChange("dimensions", next);
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            size="4xl"
            scrollBehavior="outside"
            blockScrollOnMount
            closeOnOverlayClick={!isSubmitting}
            closeOnEsc={!isSubmitting}
        >
            <ModalOverlay zIndex={1999999} bg="blackAlpha.500" backdropFilter="blur(2px)" />
            <ModalContent
                containerProps={{ zIndex: 2000000, alignItems: "flex-start", overflowY: "auto", py: 10 }}
                maxW="920px"
                my={0}
                borderRadius="xl"
                overflow="visible"
                boxShadow="2xl"
            >
                <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
                    <HStack spacing={3} align="flex-start">
                        <Flex w={10} h={10} align="center" justify="center" borderRadius="lg" bg={BRAND} color="white" flexShrink={0}>
                            <Icon as={MdPictureAsPdf} boxSize={5} />
                        </Flex>
                        <Box minW={0}>
                            <Text fontSize="lg" fontWeight="700" color="gray.800" lineHeight="short">
                                Review stock report
                            </Text>
                            <Text fontSize="sm" fontWeight="400" color="gray.500" noOfLines={1}>
                                {[vesselName, clientName].filter(Boolean).join(" · ") || "Check the details before generating"}
                            </Text>
                            <HStack spacing={2} mt={2} flexWrap="wrap">
                                <Badge variant="subtle" colorScheme="gray" fontSize="0.7rem" px={2} py={0.5} borderRadius="md">
                                    {hasValue(row.stockItemId) ? row.stockItemId : "New stock item"}
                                </Badge>
                                {toLabel !== "-" ? (
                                    <Badge
                                        variant="subtle"
                                        colorScheme={STATUS_COLORS[row.stockStatus] || "blue"}
                                        fontSize="0.7rem"
                                        px={2}
                                        py={0.5}
                                        borderRadius="md"
                                    >
                                        {toLabel}
                                    </Badge>
                                ) : null}
                            </HStack>
                        </Box>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton isDisabled={isSubmitting} top={4} />

                <ModalBody bg="gray.50" px={6} py={5} overflow="visible">
                    {statusChanged ? (
                        <HStack
                            spacing={2}
                            mb={4}
                            px={3}
                            py={2}
                            bg="blue.50"
                            border="1px solid"
                            borderColor="blue.100"
                            borderRadius="md"
                            fontSize="sm"
                            color="blue.800"
                        >
                            <Icon as={MdInfoOutline} boxSize={4} />
                            <Text>Status changes from</Text>
                            <Text fontWeight="600">{fromLabel}</Text>
                            <Icon as={MdArrowForward} boxSize={3.5} />
                            <Text fontWeight="600">{toLabel}</Text>
                            {statusActorName ? <Text color="blue.600">by {statusActorName}</Text> : null}
                        </HStack>
                    ) : null}

                    <Box
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="lg"
                        sx={{ "& > *:not(:first-of-type)": { borderTop: "1px solid", borderColor: "gray.100" } }}
                    >
                        {!hasAnySection ? (
                            <Box p={6} textAlign="center">
                                <Text fontSize="sm" color="gray.500">
                                    No details filled in yet. Fill in the row first, then generate the report.
                                </Text>
                            </Box>
                        ) : null}

                        {showGeneral ? (
                            <Section icon={MdInventory2} title="General">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacingX={4} spacingY={3}>
                                    {shown("stockStatus") ? (
                                        <Field label="Status">
                                            <Select
                                                {...fieldInputProps}
                                                value={row.stockStatus || ""}
                                                onChange={(e) => onFieldChange("stockStatus", e.target.value)}
                                            >
                                                <option value="">Select status</option>
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>
                                    ) : null}
                                    {shown(dateField) ? (
                                        <Field label="First entry date">
                                            <DmyDateInput
                                                {...fieldInputProps}
                                                value={row[dateField] || ""}
                                                onChange={(next) => onFieldChange(dateField, normalizeToIsoDate(next))}
                                                iconColor="gray.600"
                                                _placeholder={{ color: "gray.400" }}
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("poNumber") ? (
                                        <Field label="PO number">
                                            <Input
                                                {...fieldInputProps}
                                                value={row.poNumber || ""}
                                                onChange={(e) => onFieldChange("poNumber", e.target.value)}
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("shippingDoc") ? (
                                        <Field label="Shipping docs">
                                            <Input
                                                {...fieldInputProps}
                                                value={row.shippingDoc || ""}
                                                onChange={(e) => onFieldChange("shippingDoc", e.target.value)}
                                            />
                                        </Field>
                                    ) : null}
                                </SimpleGrid>
                            </Section>
                        ) : null}

                        {showParties ? (
                            <Section icon={MdPeople} title="Client & supplier">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacingX={4} spacingY={3}>
                                    {shown("client") ? (
                                        <Field label="Client">
                                            <ReportSelect
                                                value={row.client}
                                                onChange={(value) => onFieldChange("client", value)}
                                                options={clients}
                                                onSearchChange={onClientSearch}
                                                fallbackPrefix="Client"
                                                nameOnly
                                                placeholder="Select client"
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("vessel") ? (
                                        <Field label="Vessel">
                                            <ReportSelect
                                                value={row.vessel}
                                                onChange={(value) => onFieldChange("vessel", value)}
                                                options={vesselOptions}
                                                onSearchChange={onVesselSearch}
                                                fallbackPrefix="Vessel"
                                                nameOnly
                                                placeholder="Select vessel"
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("supplier") ? (
                                        <Field label="Supplier">
                                            <ReportSelect
                                                value={row.supplier}
                                                onChange={(value) => onFieldChange("supplier", value)}
                                                options={supplierOptions}
                                                onSearchChange={onSupplierSearch}
                                                fallbackPrefix="Supplier"
                                                nameOnly
                                                placeholder="Select supplier"
                                            />
                                        </Field>
                                    ) : null}
                                </SimpleGrid>
                            </Section>
                        ) : null}

                        {showRouting ? (
                            <Section icon={MdAltRoute} title="Origin & routing">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacingX={4} spacingY={3}>
                                    {shown("originId", "origin_text") ? (
                                        <Field label="Origin">
                                            <StockOriginCountrySelect
                                                value={row.origin_text || ""}
                                                selectedId={row.originId}
                                                options={originOptions}
                                                onSearchChange={onOriginSearch}
                                                isLoading={isLoadingLocations}
                                                autoWidth={false}
                                                w="100%"
                                                minW={0}
                                                {...selectColorProps}
                                                onChange={(name, option) => {
                                                    if (onOriginChange) onOriginChange(name, option);
                                                    else onFieldChange("origin_text", name || "");
                                                }}
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("narviStockViaHub1") ? (
                                        <Field label="Via HUB 1">
                                            <StockIdNameSearchableSelect
                                                value={row.narviStockViaHub1}
                                                selectedName={row.narviStockViaHub1Name}
                                                options={hubOptions}
                                                onSearchChange={onHubSearch}
                                                isLoading={isLoadingLocations}
                                                placeholder="Select hub"
                                                autoWidth={false}
                                                w="100%"
                                                minW={0}
                                                {...selectColorProps}
                                                onChange={(id, name) => {
                                                    if (onHub1Change) onHub1Change(id, name);
                                                    else onFieldChange("narviStockViaHub1", id);
                                                }}
                                            />
                                        </Field>
                                    ) : null}
                                </SimpleGrid>
                            </Section>
                        ) : null}

                        {showCommercial ? (
                            <Section icon={MdAttachMoney} title="Value & compliance">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacingX={4} spacingY={3}>
                                    {shown("currency", "value") ? (
                                        <>
                                            <Field label="Currency">
                                                <ReportSelect
                                                    value={row.currency}
                                                    onChange={(value) => onFieldChange("currency", value)}
                                                    options={currencies}
                                                    fallbackPrefix="Currency"
                                                    placeholder="Select currency"
                                                />
                                            </Field>
                                            <Field label="Value">
                                                <StockValueInput
                                                    value={row.value}
                                                    onChange={(value) => onFieldChange("value", value)}
                                                    size="sm"
                                                    w="100%"
                                                    {...selectColorProps}
                                                />
                                            </Field>
                                        </>
                                    ) : null}
                                    {shown(dgField) ? (
                                        <Field label="DG / UN number">
                                            <Input
                                                {...fieldInputProps}
                                                value={row[dgField] || ""}
                                                onChange={(e) => onFieldChange(dgField, e.target.value)}
                                            />
                                        </Field>
                                    ) : null}
                                </SimpleGrid>
                            </Section>
                        ) : null}

                        {showRemarks ? (
                            <Section icon={MdNotes} title="Remarks">
                                <Textarea
                                    {...fieldInputProps}
                                    value={row.remarks || ""}
                                    onChange={(e) => onFieldChange("remarks", e.target.value)}
                                    rows={3}
                                    resize="vertical"
                                />
                            </Section>
                        ) : null}

                        {showPieces ? (
                            <Section icon={MdInventory2} title="Pieces & dimensions">
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={visibleDimensionIndexes.length ? 4 : 0}>
                                    {shown(pcsField) ? (
                                        <Field label="Pieces">
                                            <Input
                                                {...fieldInputProps}
                                                type="number"
                                                value={row[pcsField] || ""}
                                                onChange={(e) => onFieldChange(pcsField, e.target.value)}
                                            />
                                        </Field>
                                    ) : null}
                                    {shown("weightKgs") ? (
                                        <Field label="Total weight (kg)">
                                            <Input
                                                {...fieldInputProps}
                                                value={row.weightKgs || ""}
                                                onChange={(e) => onFieldChange("weightKgs", e.target.value)}
                                            />
                                        </Field>
                                    ) : null}
                                    <Stat bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="md" px={3} py={1.5}>
                                        <StatLabel fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="600">
                                            Total volume
                                        </StatLabel>
                                        <StatNumber fontSize="md" color="gray.800">
                                            {formatCbm(totalCbm)} <Text as="span" fontSize="xs" color="gray.500">CBM</Text>
                                        </StatNumber>
                                    </Stat>
                                </SimpleGrid>

                                {visibleDimensionIndexes.length ? (
                                    <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflowX="auto">
                                        <Table size="sm">
                                            <Thead bg="gray.50">
                                                <Tr>
                                                    <Th fontSize="xs" color="gray.600" w="60px">#</Th>
                                                    {visibleDimensionColumns.map((col) => (
                                                        <Th key={col.key} fontSize="xs" color="gray.600" isNumeric={!col.editable}>
                                                            {col.label}
                                                        </Th>
                                                    ))}
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {visibleDimensionIndexes.map((index) => {
                                                    const dim = dimensions[index];
                                                    return (
                                                        <Tr key={dim.id || index}>
                                                            <Td fontWeight="600" color="gray.600">{index + 1}</Td>
                                                            {visibleDimensionColumns.map((col) => (
                                                                <Td key={col.key} isNumeric={!col.editable} py={1.5}>
                                                                    {col.editable ? (
                                                                        <Input
                                                                            {...fieldInputProps}
                                                                            value={dim[col.key] || ""}
                                                                            onChange={(e) => updateDimension(index, { [col.key]: e.target.value })}
                                                                            maxW="120px"
                                                                        />
                                                                    ) : (
                                                                        <Text fontSize="sm" fontWeight="600" color="gray.700">
                                                                            {formatCbm(dim[col.key])}
                                                                        </Text>
                                                                    )}
                                                                </Td>
                                                            ))}
                                                        </Tr>
                                                    );
                                                })}
                                            </Tbody>
                                        </Table>
                                    </Box>
                                ) : null}
                            </Section>
                        ) : null}
                    </Box>
                </ModalBody>

                <ModalFooter borderTop="1px solid" borderColor="gray.100" gap={3}>
                    <Button variant="ghost" onClick={onClose} isDisabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        bg={BRAND}
                        color="white"
                        _hover={{ bg: "#163a76" }}
                        _active={{ bg: "#122f60" }}
                        leftIcon={<Icon as={MdPictureAsPdf} boxSize={4} />}
                        onClick={onConfirm}
                        isLoading={isSubmitting}
                        loadingText={loadingText}
                    >
                        Save & generate report
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

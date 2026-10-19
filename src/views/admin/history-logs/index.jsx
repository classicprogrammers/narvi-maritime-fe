import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    useColorModeValue,
    Spinner,
    HStack,
    Select,
    Input,
    InputGroup,
    InputLeftElement,
    Badge,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { fetchTrackingLogs, fetchTrackingLogOptions } from "../../../api/trackingLogs";
import { useUser } from "../../../redux/hooks/useUser";

const EMPTY_FILTERS = {
    search: "",
    user_id: "",
    model: "",
    date_from: "",
    date_to: "",
    sort_order: "desc",
};

const unwrap = (data) => (data && data.result && !data.logs ? data.result : data) || {};

// Flatten whatever shape the backend returns (flat list or nested groups) into entries
const collectEntries = (node, ctx = {}) => {
    if (Array.isArray(node)) {
        return node.flatMap((item) =>
            item && typeof item === "object" && (item.field_changes || item.id !== undefined)
                ? [{ entry: item, ctx }]
                : collectEntries(item, ctx)
        );
    }
    if (!node || typeof node !== "object") return [];
    const nextCtx = { ...ctx, user: node.user || ctx.user };
    return Object.entries(node).flatMap(([key, value]) => {
        if (key === "user") return [];
        return collectEntries(value, { ...nextCtx, groupKey: key });
    });
};

const normalizeLogs = (rawLogs) =>
    collectEntries(rawLogs).flatMap(({ entry, ctx }) => {
        const entryUser = entry.user || ctx.user || {};
        const baseInfo = {
            id: entry.id,
            time: entry.date || entry.timestamp || entry.create_date || entry.datetime || "-",
            userName: entryUser.name || entry.user_name || "-",
            model: entry.model_display_name || entry.model || "-",
            recordId: entry.record_id,
            recordName: entry.record_name,
        };

        if (Array.isArray(entry.field_changes) && entry.field_changes.length > 0) {
            return entry.field_changes.map((change, idx) => ({
                ...baseInfo,
                key: `${entry.id}-${idx}-${change.field}`,
                field: change.field,
                fieldLabel: change.field_description || change.field || "-",
                oldValue: change.old_value,
                newValue: change.new_value,
            }));
        }

        return [{ ...baseInfo, key: `${entry.id}-summary`, field: "", fieldLabel: "", oldValue: "", newValue: "" }];
    });

const display = (value) =>
    value === null || value === undefined || value === "" ? "empty" : String(value);

const HistoryLogs = () => {
    const { user } = useUser();
    const textColor = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const cardBg = useColorModeValue("white", "navy.800");
    const inputBg = useColorModeValue("white", "navy.900");
    const inputText = useColorModeValue("gray.800", "gray.100");

    const [logs, setLogs] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [searchInput, setSearchInput] = useState("");
    const [userOptions, setUserOptions] = useState([]);
    const [modelOptions, setModelOptions] = useState([]);

    const isAdmin = user?.user_type === "admin";

    // Dropdown options
    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            try {
                const opts = unwrap(await fetchTrackingLogOptions());
                setUserOptions(
                    (opts.users || []).map((u) => ({
                        value: u.user_id ?? u.id,
                        label: u.name || u.user_name || String(u.user_id ?? u.id),
                    }))
                );
                setModelOptions(
                    (opts.models || []).map((m) =>
                        typeof m === "string"
                            ? { value: m, label: m }
                            : {
                                  value: m.model,
                                  label: m.model_display_name || m.name || m.label || m.model,
                              }
                    )
                );
            } catch (error) {
                console.error("Failed to fetch log options:", error);
            }
        })();
    }, [isAdmin]);

    // Debounce free-text search
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const loadLogs = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = unwrap(
                await fetchTrackingLogs({
                    search: filters.search.trim(),
                    user_id: filters.user_id ? Number(filters.user_id) : undefined,
                    models: filters.model ? [filters.model] : undefined,
                    date_from: filters.date_from,
                    date_to: filters.date_to,
                    sort_order: filters.sort_order,
                    group_by: "none",
                    page,
                    page_size: pageSize,
                })
            );
            setLogs(normalizeLogs(data.logs));
            setTotalCount(data.total_count ?? 0);
            setHasMore(Boolean(data.has_more));
        } catch (error) {
            console.error("Failed to fetch tracking logs:", error);
            setLogs([]);
            setTotalCount(0);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page, pageSize]);

    useEffect(() => {
        if (isAdmin) loadLogs();
    }, [isAdmin, loadLogs]);

    const updateFilter = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setSearchInput("");
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    const hasActiveFilters = useMemo(
        () =>
            Boolean(
                filters.search ||
                    filters.user_id ||
                    filters.model ||
                    filters.date_from ||
                    filters.date_to ||
                    filters.sort_order !== "desc"
            ),
        [filters]
    );

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const inputProps = {
        size: "sm",
        bg: inputBg,
        color: inputText,
        borderColor,
        borderRadius: "md",
    };

    if (!isAdmin) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="25px">
                <Text color={textColor} fontSize="lg" fontWeight="600">
                    History Logs
                </Text>
                <Text mt={2} color="gray.500">
                    You are not authorized to view this page.
                </Text>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap={3}>
                <Box>
                    <Text fontSize="xl" fontWeight="700" color={textColor}>
                        History Logs
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        System activity and tracking logs
                        {totalCount > 0 && ` • ${totalCount} matching`}
                    </Text>
                </Box>
                <HStack spacing={3}>
                    <HStack spacing={2}>
                        <Text fontSize="sm" color="gray.500">
                            Records per page:
                        </Text>
                        <Select
                            {...inputProps}
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value) || 15);
                                setPage(1);
                            }}
                            width="80px"
                        >
                            <option value={15}>15</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                        </Select>
                    </HStack>
                    <Button size="sm" variant="outline" onClick={loadLogs} isLoading={isLoading}>
                        Refresh
                    </Button>
                </HStack>
            </Flex>

            {/* Filters */}
            <Flex
                mb="4"
                gap={3}
                wrap="wrap"
                align="flex-end"
                bg={cardBg}
                border="1px"
                borderColor={borderColor}
                borderRadius="md"
                p="3"
            >
                <Box flex="1" minW="220px">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        Search
                    </Text>
                    <InputGroup size="sm">
                        <InputLeftElement pointerEvents="none">
                            <SearchIcon color="gray.400" boxSize={3} />
                        </InputLeftElement>
                        <Input
                            {...inputProps}
                            placeholder="Record, user, field, value, model..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </InputGroup>
                </Box>
                <Box minW="160px">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        User
                    </Text>
                    <Select
                        {...inputProps}
                        value={filters.user_id}
                        onChange={(e) => updateFilter("user_id", e.target.value)}
                    >
                        <option value="">All users</option>
                        {userOptions.map((u) => (
                            <option key={u.value} value={u.value}>
                                {u.label}
                            </option>
                        ))}
                    </Select>
                </Box>
                <Box minW="180px">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        Model
                    </Text>
                    <Select
                        {...inputProps}
                        value={filters.model}
                        onChange={(e) => updateFilter("model", e.target.value)}
                    >
                        <option value="">All models</option>
                        {modelOptions.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </Select>
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        From
                    </Text>
                    <Input
                        {...inputProps}
                        type="date"
                        value={filters.date_from}
                        max={filters.date_to || undefined}
                        onChange={(e) => updateFilter("date_from", e.target.value)}
                    />
                </Box>
                <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        To
                    </Text>
                    <Input
                        {...inputProps}
                        type="date"
                        value={filters.date_to}
                        min={filters.date_from || undefined}
                        onChange={(e) => updateFilter("date_to", e.target.value)}
                    />
                </Box>
                <Box minW="130px">
                    <Text fontSize="xs" color="gray.500" mb={1}>
                        Order
                    </Text>
                    <Select
                        {...inputProps}
                        value={filters.sort_order}
                        onChange={(e) => updateFilter("sort_order", e.target.value)}
                    >
                        <option value="desc">Newest first</option>
                        <option value="asc">Oldest first</option>
                    </Select>
                </Box>
                <Button size="sm" variant="ghost" onClick={clearFilters} isDisabled={!hasActiveFilters}>
                    Clear
                </Button>
            </Flex>

            <Box bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor} overflow="hidden">
                {isLoading && logs.length === 0 ? (
                    <Flex justify="center" align="center" py="10">
                        <Spinner size="lg" color="blue.500" mr={3} />
                        <Text color={textColor}>Loading logs...</Text>
                    </Flex>
                ) : logs.length === 0 ? (
                    <Flex justify="center" py="10">
                        <Text color="gray.500">No history logs found.</Text>
                    </Flex>
                ) : (
                    <Box
                        maxH="600px"
                        overflowY="auto"
                        overflowX="hidden"
                        opacity={isLoading ? 0.6 : 1}
                        sx={{
                            "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                            "&::-webkit-scrollbar-track": { background: "gray.100", borderRadius: "4px" },
                            "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
                            "&::-webkit-scrollbar-thumb:hover": { background: "gray.400" },
                        }}
                    >
                        {logs.map((log, idx) => {
                            const fieldLabel = log.fieldLabel || log.field || "a field";
                            const target = log.recordName
                                ? `${log.recordName}`
                                : log.recordId
                                ? `record ${log.recordId}`
                                : "";

                            return (
                                <Box
                                    key={log.key || log.id || idx}
                                    px="4"
                                    py="3"
                                    borderBottom="1px solid"
                                    borderColor={borderColor}
                                >
                                    <Text fontSize="xs" color="gray.500">
                                        {log.time}
                                    </Text>
                                    <Flex align="center" gap={2} mt="1" wrap="wrap">
                                        <Text fontSize="sm" fontWeight="600" color={textColor}>
                                            {log.userName}
                                        </Text>
                                        <Badge colorScheme="blue">{log.model}</Badge>
                                        {target && (
                                            <Text fontSize="sm" fontWeight="600" color={textColor}>
                                                {target}
                                            </Text>
                                        )}
                                    </Flex>
                                    <Text fontSize="sm" mt="1" color={textColor}>
                                        {log.field
                                            ? `Changed ${fieldLabel} from "${display(log.oldValue)}" to "${display(log.newValue)}".`
                                            : "Updated this record."}
                                    </Text>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            <Flex justify="space-between" align="center" mt="4">
                <Text fontSize="sm" color="gray.500">
                    Page {page} of {totalPages} • {totalCount} total
                </Text>
                <HStack spacing={2}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        isDisabled={page === 1 || isLoading}
                    >
                        Previous
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => p + 1)}
                        isDisabled={isLoading || !(hasMore || page < totalPages)}
                    >
                        Next
                    </Button>
                </HStack>
            </Flex>
        </Box>
    );
};

export default HistoryLogs;

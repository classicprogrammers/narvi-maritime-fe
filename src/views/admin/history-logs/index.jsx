import React, { useEffect, useState } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    useColorModeValue,
    Spinner,
    HStack,
    Select,
} from "@chakra-ui/react";
import { fetchTrackingLogs } from "../../../api/trackingLogs";
import { useUser } from "../../../redux/hooks/useUser";

// Backend: fetch up to 100 logs per request
const PAGE_SIZE = 100;

const HistoryLogs = () => {
    const { user } = useUser();
    const textColor = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const cardBg = useColorModeValue("white", "navy.800");
    const inputBg = useColorModeValue("white", "navy.900");
    const inputText = useColorModeValue("gray.800", "gray.100");

    const [logs, setLogs] = useState([]); // normalized, flat list
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1); // frontend page
    const [uiPageSize, setUiPageSize] = useState(15); // how many records to show per page

    const isAdmin = user?.user_type === "admin";

    const loadLogs = async () => {
        if (!user?.id) return;
        try {
            setIsLoading(true);
            // For now always fetch the first 100 logs from backend
            const offset = 0;

            const data = await fetchTrackingLogs({
                current_user: user.id,
                limit: PAGE_SIZE,
                offset,
            });

            const rawLogs =
                (data && data.logs) ||
                (data && data.result && data.result.logs) ||
                {};

            // New structure: logs is keyed by user ID, each user has models keyed by model name
            let normalized = Object.entries(rawLogs).flatMap(([userId, userData]) => {
                if (!userData || typeof userData !== "object") return [];

                const user = userData.user || {};
                const userName = user.name || "-";
                const models = userData.models || {};

                // Iterate over models for this user
                return Object.entries(models).flatMap(([modelKey, entries]) => {
                    if (!Array.isArray(entries)) return [];

                    return entries.flatMap((entry) => {
                        const entryModel = entry.model_display_name || entry.model || modelKey;
                        const entryUser = entry.user || user;
                        const entryUserName = entryUser.name || userName || "-";
                        const time =
                            entry.date ||
                            entry.timestamp ||
                            entry.create_date ||
                            entry.datetime ||
                            "-";

                        const baseInfo = {
                            id: entry.id,
                            time,
                            userName: entryUserName,
                            model: entryModel,
                            recordId: entry.record_id,
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

                        // Fallback when there are no field_changes
                        return [
                            {
                                ...baseInfo,
                                key: `${entry.id}-summary`,
                                field: "",
                                fieldLabel: "",
                                oldValue: "",
                                newValue: "",
                            },
                        ];
                    });
                });
            });

            setLogs(normalized);
        } catch (error) {
            console.error("Failed to fetch tracking logs:", error);
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, user?.id]);

    const handlePageChange = (direction) => {
        const nextPage = page + direction;
        if (nextPage < 1) return;
        const maxPage = Math.max(1, Math.ceil(logs.length / uiPageSize));
        if (nextPage > maxPage) return;
        setPage(nextPage);
    };

    const handlePageSizeChange = (newSize) => {
        const size = Number(newSize) || 15;
        setUiPageSize(size);
        setPage(1); // Reset to first page when changing page size
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
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="25px">
            <Flex justify="space-between" align="center" mb="4">
                <Box>
                    <Text fontSize="xl" fontWeight="700" color={textColor}>
                        History Logs
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        System activity and tracking logs (latest first, {uiPageSize} per page, up to {PAGE_SIZE} loaded)
                    </Text>
                </Box>
                <HStack spacing={3}>
                    <HStack spacing={2}>
                        <Text fontSize="sm" color="gray.500">
                            Records per page:
                        </Text>
                        <Select
                            value={uiPageSize}
                            onChange={(e) => handlePageSizeChange(e.target.value)}
                            size="sm"
                            width="80px"
                            bg={inputBg}
                            color={inputText}
                            borderColor={borderColor}
                        >
                            <option value={15}>15</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </Select>
                    </HStack>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setPage(1);
                            loadLogs();
                        }}
                        isLoading={isLoading}
                    >
                        Refresh
                    </Button>
                </HStack>
            </Flex>

            <Box
                bg={cardBg}
                borderRadius="md"
                border="1px"
                borderColor={borderColor}
                overflow="hidden"
            >
                {isLoading && logs.length === 0 ? (
                    <Flex justify="center" align="center" py="10">
                        <Spinner size="lg" color="blue.500" mr={3} />
                        <Text color={textColor}>Loading logs...</Text>
                    </Flex>
                ) : logs.length === 0 ? (
                    <Box maxH="600px" overflow="auto">
                        {/* Mock data when no logs are present */}
                        <Box
                            px="4"
                            py="3"
                            borderBottom="1px solid"
                            borderColor={borderColor}
                        >
                            <Text fontSize="xs" color="gray.500">
                                {new Date().toLocaleString()}
                            </Text>
                            <Text fontSize="sm" fontWeight="600" color={textColor} mt="1">
                                Administrator • res.partner (record 1)
                            </Text>
                            <Text fontSize="sm" mt="1">
                                Administrator changed Name on res.partner (record 1) from "Old Name" to "New Name".
                            </Text>
                        </Box>
                    </Box>
                ) : (
                    <Box maxH="600px" overflow="auto">
                        {logs
                            .slice((page - 1) * uiPageSize, page * uiPageSize)
                            .map((log, idx) => {
                                const key = log.key || log.id || idx;
                                const time = log.time || "-";
                                const userName = log.userName || "-";
                                const moduleName = log.model || "-";

                                const fieldLabel = log.fieldLabel || log.field || "a field";
                                const oldVal =
                                    log.oldValue === null || log.oldValue === undefined || log.oldValue === ""
                                        ? "empty"
                                        : String(log.oldValue);
                                const newVal =
                                    log.newValue === null || log.newValue === undefined || log.newValue === ""
                                        ? "empty"
                                        : String(log.newValue);

                                const recordPart = log.recordId
                                    ? ` (record ${log.recordId})`
                                    : "";

                                const sentence = log.field
                                    ? `${userName} changed ${fieldLabel} on ${moduleName}${recordPart} from "${oldVal}" to "${newVal}".`
                                    : `${userName} updated ${moduleName}${recordPart}.`;

                                return (
                                    <Box
                                        key={key}
                                        px="4"
                                        py="3"
                                        borderBottom="1px solid"
                                        borderColor={borderColor}
                                    >
                                        <Text fontSize="xs" color="gray.500">
                                            {time}
                                        </Text>
                                        <Text fontSize="sm" fontWeight="600" color={textColor} mt="1">
                                            {userName} • {moduleName}
                                            {recordPart}
                                        </Text>
                                        <Text fontSize="sm" mt="1">
                                            {sentence}
                                        </Text>
                                    </Box>
                                );
                            })}
                    </Box>
                )}
            </Box>

            <Flex justify="space-between" align="center" mt="4">
                <Text fontSize="sm" color="gray.500">
                    Page {page} • Showing up to {uiPageSize} logs per page
                </Text>
                <HStack spacing={2}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange(-1)}
                        isDisabled={page === 1 || isLoading}
                    >
                        Previous
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePageChange(1)}
                        isDisabled={isLoading || page * uiPageSize >= logs.length}
                    >
                        Next
                    </Button>
                </HStack>
            </Flex>
        </Box>
    );
};

export default HistoryLogs;



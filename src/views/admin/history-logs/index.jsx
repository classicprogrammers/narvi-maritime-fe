import React, { useEffect, useState } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    useColorModeValue,
    Spinner,
    HStack,
} from "@chakra-ui/react";
import { fetchTrackingLogs } from "../../../api/trackingLogs";
import { useUser } from "../../../redux/hooks/useUser";

const PAGE_SIZE = 100;

const HistoryLogs = () => {
    const { user } = useUser();
    const textColor = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const cardBg = useColorModeValue("white", "navy.800");

    const [logs, setLogs] = useState([]); // normalized, flat list
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);

    const isAdmin = user?.user_type === "admin";

    const loadLogs = async (pageNumber = 1) => {
        if (!user?.id) return;
        try {
            setIsLoading(true);
            // Backend expects offset as page number (0 for first page, then 1, 2, ...)
            const offset = pageNumber === 1 ? 0 : pageNumber;

            const data = await fetchTrackingLogs({
                current_user: user.id,
                limit: PAGE_SIZE,
                offset,
            });

            const rawLogs =
                (data && data.logs) ||
                (data && data.result && data.result.logs) ||
                {};

            let normalized = Object.entries(rawLogs).flatMap(
                ([modelKey, entries]) => {
                    if (!Array.isArray(entries)) return [];

                    return entries.flatMap((entry) => {
                        const entryModel = entry.model || modelKey;
                        const userName =
                            entry.user?.name ||
                            entry.user_name ||
                            entry.user ||
                            "-";
                        const time =
                            entry.date ||
                            entry.timestamp ||
                            entry.create_date ||
                            entry.datetime ||
                            "-";

                        const baseInfo = {
                            id: entry.id,
                            time,
                            userName,
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
                }
            );

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
            loadLogs(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, user?.id]);

    const handlePageChange = (direction) => {
        const nextPage = page + direction;
        if (nextPage < 1) return;
        if (direction > 0 && logs.length < PAGE_SIZE) return;
        setPage(nextPage);
        loadLogs(nextPage);
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
                        System activity and tracking logs (latest first, {PAGE_SIZE} per page)
                    </Text>
                </Box>
                <HStack spacing={3}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadLogs(page)}
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
                    <Flex justify="center" align="center" py="10">
                        <Text color="gray.500" fontSize="sm">
                            No logs found.
                        </Text>
                    </Flex>
                ) : (
                    <Box maxH="600px" overflow="auto">
                        {logs.map((log, idx) => {
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
                    Page {page} • Showing up to {PAGE_SIZE} logs per page
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
                        isDisabled={isLoading || logs.length < PAGE_SIZE}
                    >
                        Next
                    </Button>
                </HStack>
            </Flex>
        </Box>
    );
};

export default HistoryLogs;



import React from "react";
import {
    Badge,
    Box,
    Button,
    HStack,
    Icon,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useColorModeValue,
} from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";
import { canResumeDraft, canRetryDraft } from "../../../utils/drafts";
import { formatDraftDate } from "../../../utils/draftRetry";

const UNKNOWN_MODULE_LABEL = "Unknown module";
const STRIPPED_TEXT = "Attachments/passwords were not kept. Re-add them before saving.";

const resumeHint = (draft, moduleDef) => {
    if (!moduleDef) return "This draft's module is no longer available.";
    if (moduleDef.category === "D") return "Resume is not available for inline or bulk edits. Use Retry or Delete.";
    return "This draft has no saved form data to resume.";
};

const retryHint = (draft, moduleDef) => {
    if (!moduleDef) return "This draft's module is no longer available.";
    if (!draft.requests?.length) return "Open with Resume to finish and save";
    return "A required password was not kept. Open with Resume and enter it again.";
};

const DraftsTable = ({ drafts, modules, retryingId, onResume, onRetry, onDelete }) => {
    const textColor = useColorModeValue("gray.700", "white");
    const headBg = useColorModeValue("gray.50", "navy.900");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");

    return (
        <Box overflowX="auto">
            <Table size="sm" variant="simple">
                <Thead bg={headBg}>
                    <Tr>
                        <Th>Module</Th>
                        <Th>Record</Th>
                        <Th>Type</Th>
                        <Th>Last updated</Th>
                        <Th>Error</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {drafts.map((draft) => {
                        const moduleDef = modules[draft.module];
                        const resumable = canResumeDraft(draft, moduleDef);
                        const retryable = canRetryDraft(draft, moduleDef);
                        const isRetrying = retryingId === draft.id;
                        const errorText = draft.error?.message || "";
                        return (
                            <Tr key={draft.id} borderColor={borderColor}>
                                <Td color={textColor} fontWeight="600">
                                    <HStack spacing={2}>
                                        <Text>{moduleDef?.label || UNKNOWN_MODULE_LABEL}</Text>
                                        {draft.stripped?.length > 0 && (
                                            <Tooltip label={STRIPPED_TEXT} hasArrow>
                                                <span data-testid="draft-stripped-warning">
                                                    <Icon as={WarningIcon} color="orange.400" aria-label={STRIPPED_TEXT} />
                                                </span>
                                            </Tooltip>
                                        )}
                                    </HStack>
                                </Td>
                                <Td color={textColor} maxW="220px" whiteSpace="normal" wordBreak="break-word">
                                    {draft.label || "New"}
                                </Td>
                                <Td>
                                    <HStack spacing={2}>
                                        <Badge colorScheme={draft.mode === "update" ? "blue" : "green"}>
                                            {draft.mode === "update" ? "Update" : "Create"}
                                        </Badge>
                                        {draft.source === "manual" && <Badge colorScheme="purple">Manual</Badge>}
                                    </HStack>
                                </Td>
                                <Td color={textColor} whiteSpace="nowrap">
                                    {formatDraftDate(draft.updatedAt)}
                                </Td>
                                <Td maxW="260px">
                                    {errorText ? (
                                        <Tooltip label={errorText} hasArrow>
                                            <Text fontSize="sm" color="red.500" noOfLines={1}>
                                                {errorText}
                                            </Text>
                                        </Tooltip>
                                    ) : (
                                        <Text fontSize="sm" color="gray.500">
                                            -
                                        </Text>
                                    )}
                                </Td>
                                <Td>
                                    <HStack spacing={2}>
                                        <Tooltip label={resumable ? "" : resumeHint(draft, moduleDef)} isDisabled={resumable} hasArrow>
                                            <span>
                                                <Button size="xs" colorScheme="blue" variant="outline" isDisabled={!resumable} onClick={() => onResume(draft)}>
                                                    Resume
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Tooltip label={retryHint(draft, moduleDef)} isDisabled={retryable} hasArrow>
                                            <span>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    isDisabled={!retryable || Boolean(retryingId)}
                                                    isLoading={isRetrying}
                                                    onClick={() => onRetry(draft)}
                                                >
                                                    Retry
                                                </Button>
                                            </span>
                                        </Tooltip>
                                        <Button size="xs" colorScheme="red" variant="ghost" isDisabled={isRetrying} onClick={() => onDelete(draft)}>
                                            Delete
                                        </Button>
                                    </HStack>
                                </Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>
        </Box>
    );
};

export default DraftsTable;

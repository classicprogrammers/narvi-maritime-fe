import React, { useMemo, useRef, useState } from "react";
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Box,
    Button,
    Flex,
    Text,
    useColorModeValue,
    useToast,
} from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { useSelector, useStore } from "react-redux";
import { useDrafts } from "../../../redux/hooks/useDrafts";
import DRAFT_MODULES, { defaultIsFailure } from "../../../config/draftModules";
import { sortDraftsNewestFirst } from "../../../utils/drafts";
import { applyRetryFailure, runDraftRequests } from "../../../utils/draftRetry";
import { flushDraftsToStorage } from "../../../utils/saveWithDraftCore";
import { writeDrafts } from "../../../utils/draftStorage";
import DraftsTable from "./DraftsTable";

const Drafts = () => {
    const history = useHistory();
    const toast = useToast();
    const { drafts, upsertDraft, removeDraft } = useDrafts();
    const store = useStore();
    const userId = useSelector((state) => state.user?.user?.id ?? null);
    const textColor = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const cardBg = useColorModeValue("white", "navy.800");

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [retryTarget, setRetryTarget] = useState(null);
    const [retryingId, setRetryingId] = useState(null);
    const retryingRef = useRef(false);
    const cancelRef = useRef();

    const sorted = useMemo(() => sortDraftsNewestFirst(drafts), [drafts]);

    const handleResume = (draft) => {
        const moduleDef = DRAFT_MODULES[draft.module];
        if (!moduleDef?.resumeTo) return;
        history.push(moduleDef.resumeTo(draft));
    };

    const confirmDelete = () => {
        if (deleteTarget) removeDraft(deleteTarget.id);
        setDeleteTarget(null);
    };

    // Write right away so trimmed requests survive a 401 redirect before useDraftsSync runs
    const flush = () =>
        flushDraftsToStorage({
            userId,
            draftsState: store.getState().drafts,
            write: writeDrafts,
            notify: ({ id, title, status }) => toast({ id, title, status, duration: 4000, isClosable: true }),
        });

    const confirmRetry = async () => {
        const draft = retryTarget;
        setRetryTarget(null);
        const moduleDef = draft && DRAFT_MODULES[draft.module];
        if (!draft || !moduleDef || retryingRef.current) return;
        retryingRef.current = true;
        setRetryingId(draft.id);
        try {
            const outcome = await runDraftRequests(draft, moduleDef, defaultIsFailure);
            if (outcome.ok) {
                removeDraft(draft.id);
                flush();
                toast({ title: "Draft saved successfully", status: "success", duration: 4000, isClosable: true });
            } else {
                upsertDraft(applyRetryFailure(draft, outcome));
                flush();
                toast({
                    title: "Retry failed",
                    description: outcome.error?.message,
                    status: "error",
                    duration: 6000,
                    isClosable: true,
                });
            }
        } finally {
            retryingRef.current = false;
            setRetryingId(null);
        }
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Box mb="4">
                <Text fontSize="xl" fontWeight="700" color={textColor}>
                    Drafts
                </Text>
                <Text fontSize="sm" color="gray.500">
                    Data kept when a save failed
                    {sorted.length > 0 && ` • ${sorted.length} saved`}
                </Text>
            </Box>

            <Box bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor} overflow="hidden">
                {sorted.length === 0 ? (
                    <Flex justify="center" py="10" px="4">
                        <Text color="gray.500" textAlign="center">
                            No drafts. Data you enter is saved here automatically if a save fails.
                        </Text>
                    </Flex>
                ) : (
                    <DraftsTable
                        drafts={sorted}
                        modules={DRAFT_MODULES}
                        retryingId={retryingId}
                        onResume={handleResume}
                        onRetry={setRetryTarget}
                        onDelete={setDeleteTarget}
                    />
                )}
            </Box>

            <AlertDialog isOpen={Boolean(deleteTarget)} leastDestructiveRef={cancelRef} onClose={() => setDeleteTarget(null)} isCentered>
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete draft
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Delete this draft? The saved data cannot be recovered.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" ml={3} onClick={confirmDelete}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            <AlertDialog isOpen={Boolean(retryTarget)} leastDestructiveRef={cancelRef} onClose={() => setRetryTarget(null)} isCentered>
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Retry save
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            This sends the saved data again. It may overwrite changes made to the record in between. Continue?
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setRetryTarget(null)}>
                                Cancel
                            </Button>
                            <Button colorScheme="blue" ml={3} onClick={confirmRetry}>
                                Retry
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
};

export default Drafts;

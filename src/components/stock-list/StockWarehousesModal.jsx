import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdAdd, MdContentCopy, MdDelete } from "react-icons/md";

const emptyWarehouse = () => ({ id: null, name: "" });

/** Display string (one name per line) used by validation/export helpers that read row.warehouseId. */
export const warehousesToText = (warehouses) =>
  (Array.isArray(warehouses) ? warehouses : [])
    .map((wh) => String(wh?.name ?? "").trim())
    .filter(Boolean)
    .join("\n");

/**
 * Manage multiple warehouses for a stock row (same pattern as the dimensions modal).
 * `onSave(list)` receives [{ id, name }] — blank names are dropped for new rows.
 */
export default function StockWarehousesModal({ isOpen, onClose, warehouses, onSave }) {
  const [list, setList] = useState([]);
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.800", "white");

  useEffect(() => {
    if (isOpen) {
      setList(Array.isArray(warehouses) ? warehouses.map((wh) => ({ ...wh })) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updateName = (index, name) =>
    setList((prev) => prev.map((wh, i) => (i === index ? { ...wh, name } : wh)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage Warehouses</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {list.map((wh, index) => (
              <Box key={wh.id ?? `new-${index}`} p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="600">Warehouse {index + 1}</Text>
                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Duplicate warehouse"
                      title="Duplicate this warehouse"
                      icon={<Icon as={MdContentCopy} />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() =>
                        setList((prev) => {
                          const next = [...prev];
                          next.splice(index + 1, 0, { id: null, name: wh.name });
                          return next;
                        })
                      }
                    />
                    <IconButton
                      aria-label="Remove warehouse"
                      icon={<Icon as={MdDelete} />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => setList((prev) => prev.filter((_, i) => i !== index))}
                    />
                  </HStack>
                </Flex>
                <FormControl>
                  <FormLabel fontSize="sm">Warehouse ID</FormLabel>
                  <Input
                    value={wh.name || ""}
                    onChange={(e) => updateName(index, e.target.value)}
                    placeholder="Enter Warehouse ID"
                    size="sm"
                    bg={inputBg}
                    color={inputText}
                    borderColor={borderColor}
                  />
                </FormControl>
              </Box>
            ))}
            <Button
              leftIcon={<Icon as={MdAdd} />}
              onClick={() => setList((prev) => [...prev, emptyWarehouse()])}
              colorScheme="blue"
              variant="outline"
            >
              Add Warehouse
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => {
              // Drop blank brand-new rows; keep blank existing rows so the update can delete them.
              onSave(list.filter((wh) => String(wh.name ?? "").trim() !== "" || wh.id != null));
              onClose();
            }}
          >
            Save Warehouses
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

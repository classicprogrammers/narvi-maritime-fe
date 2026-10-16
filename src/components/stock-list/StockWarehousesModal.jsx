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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
import { MdAdd, MdContentCopy, MdDelete, MdMoreVert } from "react-icons/md";

/**
 * Assign warehouse number `position` to the rows after `fromIndex`.
 * If the target row already has a warehouse at that position it is renamed in place (keeps its id,
 * so it saves as an update); otherwise the warehouse is appended as a new row.
 * Skips rows that already have another warehouse with the same name.
 */
export const assignWarehouseToRows = (rows, fromIndex, src, toAll) => {
  const clean = String(src?.name ?? "").trim();
  if (!clean) return rows;
  const lastIndex = toAll ? rows.length - 1 : Math.min(fromIndex + 1, rows.length - 1);
  return rows.map((row, i) => {
    if (i <= fromIndex || i > lastIndex) return row;
    const existing = Array.isArray(row.warehouses) ? row.warehouses : [];
    if (existing.some((wh) => String(wh?.name ?? "").trim() === clean)) return row;
    // Brand-new warehouse (no id yet): always add it on top, never touch the target's existing ones.
    // Existing warehouse that was edited: rename the target's warehouse in the same position
    // counted from the oldest (bottom), so "warehouse 1" stays "warehouse 1" on every row.
    const targetIdx = src?.id == null ? -1 : existing.length - 1 - src.fromEnd;
    let next;
    if (targetIdx >= 0 && existing[targetIdx]) {
      next = existing.map((wh, idx) => (idx === targetIdx ? { ...wh, name: clean } : wh));
    } else {
      next = [{ id: null, name: clean }, ...existing];
    }
    return { ...row, warehouses: next, warehouseId: warehousesToText(next) };
  });
};

let warehouseKeySeq = 0;
const newWarehouseKey = () => `new-${++warehouseKeySeq}`;
const emptyWarehouse = () => ({ id: null, name: "", _key: newWarehouseKey() });

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
export default function StockWarehousesModal({ isOpen, onClose, warehouses, onSave, rowsBelow = 0, onAssign }) {
  const [list, setList] = useState([]);
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.800", "white");

  useEffect(() => {
    if (isOpen) {
      setList(Array.isArray(warehouses) ? warehouses.map((wh) => (wh.id == null ? { ...wh, _key: newWarehouseKey() } : { ...wh })) : []);
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
              <Box key={wh.id ?? wh._key ?? `new-${index}`} p={4} border="1px" borderColor={borderColor} borderRadius="md">
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="600">Warehouse {list.length - index}</Text>
                  <HStack spacing={1}>
                    {onAssign && rowsBelow > 0 ? (
                      <Menu isLazy>
                        <MenuButton
                          as={IconButton}
                          aria-label="Assign this warehouse to other rows"
                          title="Assign this warehouse to other rows"
                          icon={<Icon as={MdMoreVert} />}
                          size="sm"
                          variant="ghost"
                        />
                        <MenuList zIndex={2000000}>
                          <MenuItem onClick={() => onAssign({ id: wh.id, name: wh.name, fromEnd: list.length - 1 - index }, false)}>Assign to row below</MenuItem>
                          {rowsBelow > 1 ? (
                            <MenuItem onClick={() => onAssign({ id: wh.id, name: wh.name, fromEnd: list.length - 1 - index }, true)}>Assign to all rows below</MenuItem>
                          ) : null}
                        </MenuList>
                      </Menu>
                    ) : null}
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
                          next.splice(index + 1, 0, { id: null, name: wh.name, _key: newWarehouseKey() });
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
                    autoFocus={wh.id == null && wh.name === "" && index === 0}
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
              onClick={() => setList((prev) => [emptyWarehouse(), ...prev])}
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
              onSave(
                list
                  .filter((wh) => String(wh.name ?? "").trim() !== "" || wh.id != null)
                  .map(({ _key, ...rest }) => rest)
              );
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

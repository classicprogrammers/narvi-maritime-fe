import React from "react";
import {
    Box,
    Flex,
    Icon,
    IconButton,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Portal,
} from "@chakra-ui/react";
import { MdMoreVert } from "react-icons/md";

export function AssignToRowsBelowMenu({
    rowIndex,
    fields,
    onCopy,
    totalRows,
    isDisabled = false,
}) {
    const canShow = !isDisabled && totalRows > 1 && rowIndex < totalRows - 1;
    if (!canShow) return null;

    return (
        <Menu strategy="fixed" isLazy gutter={4}>
            <MenuButton
                as={IconButton}
                icon={<Icon as={MdMoreVert} />}
                size="xs"
                variant="ghost"
                flexShrink={0}
                aria-label="Assign value to rows below"
            />
            <Portal>
                <MenuList minW="240px" zIndex={9999}>
                    <MenuItem whiteSpace="nowrap" onClick={() => onCopy(rowIndex, fields, false)}>
                        Assign to below row
                    </MenuItem>
                    <MenuItem whiteSpace="nowrap" onClick={() => onCopy(rowIndex, fields, true)}>
                        Assign to all rows below
                    </MenuItem>
                </MenuList>
            </Portal>
        </Menu>
    );
}

export function CellWithAssignMenu({
    rowIndex,
    fields,
    onCopy,
    totalRows,
    children,
    showAssign = true,
    align = "center",
}) {
    return (
        <Flex gap="1" align={align} w="100%">
            <Box flex="1" minW="0">
                {children}
            </Box>
            {showAssign && (
                <AssignToRowsBelowMenu
                    rowIndex={rowIndex}
                    fields={fields}
                    onCopy={onCopy}
                    totalRows={totalRows}
                />
            )}
        </Flex>
    );
}

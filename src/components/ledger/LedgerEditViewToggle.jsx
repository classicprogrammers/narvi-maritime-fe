import React from "react";
import { Button, HStack, Icon } from "@chakra-ui/react";
import { MdTableChart, MdViewList } from "react-icons/md";

// Table view | Form view switch for the ledger cost edit screens.
export default function LedgerEditViewToggle({ view, onChange, isDisabled = false }) {
    return (
        <HStack spacing="2" justifySelf="center">
            <Button
                size="sm"
                leftIcon={<Icon as={MdTableChart} />}
                onClick={() => onChange("table")}
                colorScheme={view === "table" ? "blue" : "gray"}
                variant={view === "table" ? "solid" : "outline"}
                aria-pressed={view === "table"}
                isDisabled={isDisabled}
            >
                Table view
            </Button>
            <Button
                size="sm"
                leftIcon={<Icon as={MdViewList} />}
                onClick={() => onChange("form")}
                colorScheme={view === "form" ? "blue" : "gray"}
                variant={view === "form" ? "solid" : "outline"}
                aria-pressed={view === "form"}
                isDisabled={isDisabled}
            >
                Form view
            </Button>
        </HStack>
    );
}

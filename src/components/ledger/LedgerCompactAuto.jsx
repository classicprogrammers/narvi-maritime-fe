import React from "react";
import { Badge, Flex, Spinner, Tooltip } from "@chakra-ui/react";

// Table-cell wrapper for ROE / due inputs: the input on the left and a small auto / manual tag on the
// right, so every row keeps the same height. Hint, warning and error text moves into the tag tooltip.
// Click the "manual" tag to go back to the automatic value.
const LedgerCompactAuto = ({ children, mode, isLoading = false, hint, warning, error, onUseAutomatic }) => {
  const problem = error || warning;
  const canReset = mode === "manual" && Boolean(onUseAutomatic);
  let tip = problem || hint || "";
  if (canReset) tip = `${tip ? `${tip} ` : ""}Click to use the automatic value.`;
  const showTag = Boolean(mode) || Boolean(problem);
  const colorScheme = problem ? "red" : mode === "manual" ? "orange" : "blue";
  const label = problem ? "no rate" : mode === "manual" ? "manual" : "auto";

  return (
    <Flex align="center" gap="2">
      <Flex flex="1" minW="0" direction="column">
        {children}
      </Flex>
      {showTag ? (
        <Tooltip label={tip} isDisabled={!tip} hasArrow placement="top">
          <Badge
            colorScheme={colorScheme}
            fontSize="2xs"
            borderRadius="md"
            textTransform="lowercase"
            whiteSpace="nowrap"
            cursor={canReset ? "pointer" : "default"}
            role={canReset ? "button" : undefined}
            tabIndex={canReset ? 0 : undefined}
            onClick={canReset ? onUseAutomatic : undefined}
          >
            {isLoading ? <Spinner boxSize="8px" mr="1" /> : null}
            {label}
          </Badge>
        </Tooltip>
      ) : null}
    </Flex>
  );
};

export default LedgerCompactAuto;

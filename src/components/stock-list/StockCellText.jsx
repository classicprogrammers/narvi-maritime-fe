import React from "react";
import { Text, Tooltip } from "@chakra-ui/react";

/**
 * Resolve a plain-string tooltip from cell content.
 * Skips empty / placeholder values so short cells don't show useless tips.
 */
export function getStockCellTooltip(value) {
    if (value == null || value === false) return undefined;
    if (typeof value === "object") return undefined;
    const text = String(value).trim();
    if (!text || text === "-") return undefined;
    return text;
}

/**
 * Truncated table cell text that shows the full value in a tooltip on hover.
 * Pass an explicit `title` to override; otherwise the tooltip is derived from children.
 */
export default function StockCellText({
    children,
    title,
    openDelay = 120,
    closeDelay = 0,
    ...props
}) {
    const resolvedTitle =
        title !== undefined ? title : getStockCellTooltip(children);

    return (
        <Tooltip
            label={resolvedTitle}
            isDisabled={!resolvedTitle}
            openDelay={openDelay}
            closeDelay={closeDelay}
            hasArrow
            placement="top"
            maxW="420px"
            whiteSpace="pre-wrap"
        >
            <Text {...props}>
                {children}
            </Text>
        </Tooltip>
    );
}

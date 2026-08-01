import React from "react";
import { Text } from "@chakra-ui/react";

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
 * Truncated table cell text that shows the full value in a native tooltip on hover.
 * Pass an explicit `title` to override; otherwise the tooltip is derived from children.
 */
export default function StockCellText({ children, title, ...props }) {
    const resolvedTitle =
        title !== undefined ? title : getStockCellTooltip(children);

    return (
        <Text title={resolvedTitle || undefined} {...props}>
            {children}
        </Text>
    );
}

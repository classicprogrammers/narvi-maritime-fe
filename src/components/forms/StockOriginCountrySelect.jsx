import React, { useMemo } from "react";
import DeletableOptionCombobox from "./DeletableOptionCombobox";
import { normalizeStockOriginHubText } from "../../utils/stockOriginHubText";
import { mergeStockIdNameOptions } from "../../utils/stockLocationOptions";

/**
 * Origin combobox backed by `/api/stock/list/options` `origin_text_options`.
 * Supports selecting an option or typing a free-text origin (`origin_text`).
 */
export default function StockOriginCountrySelect({
    value,
    onChange,
    options = [],
    onSearchChange,
    isLoading = false,
    size = "sm",
    bg,
    color,
    borderColor,
    minW = "160px",
    w,
    autoWidth = true,
    autoWidthMin = 18,
    autoWidthMax = 60,
    selectedId = null,
    placeholder = "Select or type origin...",
    ...rest
}) {
    const normalizedValue = value ? normalizeStockOriginHubText(value) : "";

    const selectOptions = useMemo(
        () => mergeStockIdNameOptions(options, selectedId, normalizedValue),
        [options, selectedId, normalizedValue]
    );

    const computedHtmlSize = (() => {
        if (!autoWidth) return undefined;
        const valueLen = String(normalizedValue || "").length;
        const placeholderLen = String(placeholder || "").length;
        const desired = Math.max(valueLen, placeholderLen) + 2;
        const min = Number(autoWidthMin || 0);
        const max = Number(autoWidthMax || 0);
        if (max > 0) return Math.min(max, Math.max(min, desired));
        return Math.max(min, desired);
    })();

    return (
        <DeletableOptionCombobox
            value={normalizedValue}
            onChange={(nextValue, option) => {
                const text = normalizeStockOriginHubText(nextValue || "");
                onChange?.(text, option || null);
            }}
            onSearchChange={onSearchChange}
            options={selectOptions}
            formatOption={(option) => option?.name || ""}
            placeholder={placeholder}
            isLoading={isLoading}
            size={size}
            bg={bg}
            color={color}
            borderColor={borderColor}
            minW={minW}
            w={w}
            htmlSize={computedHtmlSize}
            {...rest}
        />
    );
}

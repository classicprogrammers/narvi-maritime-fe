import React, { useMemo } from "react";
import RemoteSearchableSelect from "./RemoteSearchableSelect";
import { normalizeStockOriginHubText } from "../../utils/stockOriginHubText";
import { mergeStockIdNameOptions } from "../../utils/stockLocationOptions";

/**
 * Origin select backed by `/api/stock/list/options` `origin_text_options`.
 * Value/onChange use the origin name string (`origin_text`).
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
    ...rest
}) {
    const normalizedValue = value ? normalizeStockOriginHubText(value) : "";

    const matched = useMemo(() => {
        if (!normalizedValue) return null;
        return (Array.isArray(options) ? options : []).find(
            (opt) => normalizeStockOriginHubText(opt.name || "") === normalizedValue
        ) || null;
    }, [options, normalizedValue]);

    const selectOptions = useMemo(
        () => mergeStockIdNameOptions(options, matched?.id, normalizedValue),
        [options, matched?.id, normalizedValue]
    );

    const selectValue = matched?.id != null
        ? String(matched.id)
        : (normalizedValue ? `legacy-${normalizedValue}` : null);

    return (
        <RemoteSearchableSelect
            value={selectValue}
            onChange={(id) => {
                if (id == null || id === "") {
                    onChange?.("");
                    onSearchChange?.("");
                    return;
                }
                if (String(id).startsWith("legacy-")) return;
                const match = (Array.isArray(options) ? options : []).find(
                    (opt) => String(opt.id) === String(id)
                );
                onChange?.(normalizeStockOriginHubText(match?.name || ""));
            }}
            options={selectOptions}
            placeholder="Select origin..."
            displayKey="name"
            valueKey="id"
            formatOption={(option) => option.name || ""}
            isLoading={isLoading}
            onSearchChange={onSearchChange}
            size={size}
            bg={bg}
            color={color}
            borderColor={borderColor}
            minW={minW}
            w={w}
            autoWidth={autoWidth}
            autoWidthMin={autoWidthMin}
            autoWidthMax={autoWidthMax}
            {...rest}
        />
    );
}

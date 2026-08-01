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
    selectedId = null,
    ...rest
}) {
    const normalizedValue = value ? normalizeStockOriginHubText(value) : "";

    const matched = useMemo(() => {
        const list = Array.isArray(options) ? options : [];
        if (selectedId != null && selectedId !== "") {
            const byId = list.find((opt) => String(opt.id) === String(selectedId));
            if (byId) return byId;
        }
        if (!normalizedValue) return null;
        return list.find(
            (opt) => normalizeStockOriginHubText(opt.name || "") === normalizedValue
        ) || null;
    }, [options, normalizedValue, selectedId]);

    const selectOptions = useMemo(
        () => mergeStockIdNameOptions(options, matched?.id ?? selectedId, normalizedValue),
        [options, matched?.id, selectedId, normalizedValue]
    );

    const selectValue = matched?.id != null
        ? String(matched.id)
        : (selectedId != null && selectedId !== ""
            ? String(selectedId)
            : (normalizedValue ? `legacy-${normalizedValue}` : null));

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

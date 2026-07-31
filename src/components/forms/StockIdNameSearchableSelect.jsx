import React, { useMemo } from "react";
import RemoteSearchableSelect from "./RemoteSearchableSelect";
import { mergeStockIdNameOptions, resolveStockLocationOptionId } from "../../utils/stockLocationOptions";

export default function StockIdNameSearchableSelect({
    value,
    onChange,
    options = [],
    onSearchChange,
    placeholder = "Select...",
    size = "sm",
    bg,
    color,
    borderColor,
    minW = "160px",
    w,
    autoWidth = true,
    autoWidthMin = 18,
    autoWidthMax = 60,
    isLoading = false,
    selectedName = "",
    ...rest
}) {
    const selectedId = resolveStockLocationOptionId(value);
    const normalizedSelectedName = String(selectedName || "").trim();

    const selectOptions = useMemo(
        () => mergeStockIdNameOptions(options, selectedId, normalizedSelectedName),
        [options, selectedId, normalizedSelectedName]
    );

    const handleChange = (nextId) => {
        if (nextId == null || nextId === "") {
            onChange?.(null);
            onSearchChange?.("");
            return;
        }
        if (String(nextId).startsWith("legacy-")) {
            return;
        }
        const id = Number(nextId);
        onChange?.(Number.isFinite(id) ? id : null);
    };

    return (
        <RemoteSearchableSelect
            value={selectedId != null ? String(selectedId) : null}
            onChange={handleChange}
            options={selectOptions}
            placeholder={placeholder}
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

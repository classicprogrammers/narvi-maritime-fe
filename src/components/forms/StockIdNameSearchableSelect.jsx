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
            onChange?.(null, "");
            onSearchChange?.("");
            return;
        }
        if (String(nextId).startsWith("legacy-")) {
            return;
        }
        const id = Number(nextId);
        if (!Number.isFinite(id)) {
            onChange?.(null, "");
            return;
        }
        const match = selectOptions.find((o) => String(o.id) === String(id));
        onChange?.(id, match?.name ? String(match.name) : "");
    };

    // When API gave us a name but no id yet, bind the legacy option so the input still shows it.
    const selectValue =
        selectedId != null
            ? String(selectedId)
            : (normalizedSelectedName ? `legacy-${normalizedSelectedName}` : null);

    return (
        <RemoteSearchableSelect
            value={selectValue}
            onChange={handleChange}
            options={selectOptions}
            placeholder={placeholder}
            displayKey="name"
            valueKey="id"
            formatOption={(option) => option.name || ""}
            fallbackDisplay={normalizedSelectedName}
            isLoading={isLoading}
            onSearchChange={onSearchChange}
            // Keep selected label visible; don't wipe value when the search box is cleared for filtering
            prefillOnFocus
            clearOnEmptySearch={false}
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

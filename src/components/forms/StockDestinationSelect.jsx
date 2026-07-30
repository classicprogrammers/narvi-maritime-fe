import React, { useMemo } from "react";
import SimpleSearchableSelect from "./SimpleSearchableSelect";
import { getTextOptionIdByValue } from "../../utils/m2oFieldOptions";

/**
 * Searchable destination picker (select-only) backed by stock list options API.
 */
export default function StockDestinationSelect({
    value = "",
    onChange,
    options = [],
    onSearchChange,
    placeholder = "Select destination...",
    listId: _listIdProp,
    size = "sm",
    bg,
    color,
    borderColor,
    htmlSize,
    flex,
    w,
    minW = "160px",
    autoWidth = true,
    autoWidthMin = 18,
    autoWidthMax = 60,
    isLoading = false,
    ...props
}) {
    const normalizedValue = String(value || "").trim();

    const selectOptions = useMemo(() => {
        const list = (Array.isArray(options) ? options : []).map((opt) => ({
            id: opt.key || `${opt.id ?? "txt"}-${opt.name}`,
            name: opt.name || "",
            destinationId: opt.id,
        }));

        if (
            normalizedValue &&
            !list.some((opt) => String(opt.name).toLowerCase() === normalizedValue.toLowerCase())
        ) {
            list.unshift({
                id: `legacy-${normalizedValue}`,
                name: normalizedValue,
                destinationId: getTextOptionIdByValue(options, normalizedValue),
            });
        }

        return list;
    }, [options, normalizedValue]);

    const handleChange = (selectedName) => {
        const name = selectedName ? String(selectedName).trim() : "";
        if (!name) {
            onChange?.({ id: null, name: "" });
            onSearchChange?.("");
            return;
        }

        const match = options.find(
            (opt) => String(opt.name || "").toLowerCase() === name.toLowerCase()
        );
        const id =
            match?.id != null && Number.isFinite(Number(match.id))
                ? Number(match.id)
                : getTextOptionIdByValue(options, name);

        onChange?.({ id, name });
    };

    const resolvedAutoWidthMax = htmlSize
        ? Math.max(autoWidthMin, Math.min(Number(htmlSize) || autoWidthMax, autoWidthMax))
        : autoWidthMax;

    return (
        <SimpleSearchableSelect
            value={normalizedValue || null}
            onChange={handleChange}
            options={selectOptions}
            placeholder={placeholder}
            displayKey="name"
            valueKey="name"
            formatOption={(option) => option.name || ""}
            isLoading={isLoading}
            serverSideSearch
            onSearchChange={onSearchChange}
            size={size}
            bg={bg}
            color={color}
            borderColor={borderColor}
            minW={minW}
            w={w}
            flex={flex}
            autoWidth={autoWidth}
            autoWidthMin={autoWidthMin}
            autoWidthMax={resolvedAutoWidthMax}
            {...props}
        />
    );
}

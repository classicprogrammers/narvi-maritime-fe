import React, { useMemo } from "react";
import SimpleSearchableSelect from "./SimpleSearchableSelect";
import { normalizeStockOriginHubText } from "../../utils/stockOriginHubText";

export default function StockOriginCountrySelect({
    value,
    onChange,
    countries = [],
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

    const options = useMemo(() => {
        const list = countries.map((country) => {
            const text = normalizeStockOriginHubText(country.name || country.code || "");
            return {
                id: country.id || country.country_id || text,
                name: text,
            };
        });

        if (normalizedValue && !list.some((opt) => opt.name === normalizedValue)) {
            list.unshift({
                id: `legacy-${normalizedValue}`,
                name: normalizedValue,
            });
        }

        return list;
    }, [countries, normalizedValue]);

    return (
        <SimpleSearchableSelect
            value={normalizedValue || null}
            onChange={(val) => onChange(val ? normalizeStockOriginHubText(val) : "")}
            options={options}
            placeholder="Select country..."
            displayKey="name"
            valueKey="name"
            formatOption={(option) => option.name || ""}
            isLoading={false}
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

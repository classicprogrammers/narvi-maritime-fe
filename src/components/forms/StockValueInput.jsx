import React, { useState } from "react";
import { Input } from "@chakra-ui/react";
import {
    isEmptyStockValue,
    normalizeStockValueForForm,
} from "../../utils/stockValue";

function formatBlurredDisplay(value) {
    if (isEmptyStockValue(value)) return "";
    const text = String(value).replace(/,/g, "").trim();
    if (text.includes(".")) {
        return normalizeStockValueForForm(text);
    }
    return text;
}

/**
 * Value field input — formats decimals on blur only when user entered them;
 * does not force .00 while typing or after user removes generated decimals.
 */
export default function StockValueInput({
    value,
    onChange,
    size = "sm",
    minW,
    w,
    bg,
    color,
    borderColor,
    onFocus,
    onBlur,
    ...rest
}) {
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState("");

    const blurredDisplay = formatBlurredDisplay(value);
    const displayValue = focused ? draft : blurredDisplay;

    const handleFocus = (e) => {
        setFocused(true);
        setDraft(blurredDisplay);
        onFocus?.(e);
    };

    const handleChange = (e) => {
        const raw = e.target.value.replace(/,/g, "");
        setDraft(raw);
        onChange?.(raw);
    };

    const handleBlur = (e) => {
        setFocused(false);
        const trimmed = String(draft ?? "").trim();
        if (trimmed === "" || trimmed === ".") {
            onChange?.("");
        } else if (trimmed.includes(".")) {
            onChange?.(normalizeStockValueForForm(trimmed));
        } else {
            onChange?.(trimmed);
        }
        onBlur?.(e);
    };

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            size={size}
            minW={minW}
            w={w}
            bg={bg}
            color={color}
            borderColor={borderColor}
            title={displayValue ? String(displayValue) : undefined}
            {...rest}
        />
    );
}

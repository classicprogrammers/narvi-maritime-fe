import React, { useId } from "react";
import { Input } from "@chakra-ui/react";
import { getTextOptionIdByValue } from "../../utils/m2oFieldOptions";

/**
 * Searchable destination picker (Input + datalist) backed by stock list options API.
 */
export default function StockDestinationSelect({
  value = "",
  onChange,
  options = [],
  onSearchChange,
  placeholder = "Select or type destination...",
  listId: listIdProp,
  size = "sm",
  bg,
  color,
  borderColor,
  htmlSize,
  flex,
  w,
  ...props
}) {
  const autoId = useId();
  const listId = listIdProp || `stock-dest-options-${autoId.replace(/:/g, "")}`;

  return (
    <>
      <Input
        list={listId}
        value={value || ""}
        onChange={(e) => {
          const nextVal = e.target.value;
          const nextId = getTextOptionIdByValue(options, nextVal);
          onSearchChange?.(nextVal);
          onChange?.({ id: nextId, name: nextVal });
        }}
        placeholder={placeholder}
        size={size}
        bg={bg}
        color={color}
        borderColor={borderColor}
        htmlSize={htmlSize}
        flex={flex}
        w={w}
        {...props}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option
            key={opt.key || `${opt.id ?? "txt"}-${opt.name}`}
            value={opt.name}
          />
        ))}
      </datalist>
    </>
  );
}

import React, { useId } from "react";
import { Input } from "@chakra-ui/react";
import { getTextOptionIdByValue } from "../../utils/m2oFieldOptions";

/**
 * Searchable job title picker (Input + datalist) backed by POST /api/customers/options.
 */
export default function JobTitleSelect({
  value = "",
  onChange,
  options = [],
  onSearchChange,
  onOpen,
  placeholder = "Select or type job title...",
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
  const listId = listIdProp || `job-title-options-${autoId.replace(/:/g, "")}`;

  return (
    <>
      <Input
        list={listId}
        value={value || ""}
        onFocus={() => onOpen?.(value || "")}
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

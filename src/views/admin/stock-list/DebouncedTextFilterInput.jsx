import React, { useEffect, useRef, useState } from "react";
import {
    HStack,
    Icon,
    IconButton,
    Input,
    InputGroup,
    InputLeftElement,
    InputRightElement,
} from "@chakra-ui/react";
import { MdClose, MdSearch } from "react-icons/md";

/**
 * Text filter that keeps keystrokes local so the parent/table do not re-render
 * on every character. Commits to parent on debounce, blur, or clear.
 */
export default function DebouncedTextFilterInput({
    value = "",
    onChange,
    delay = 400,
    placeholder,
    bg,
    color,
    borderColor,
    size = "sm",
    showSearchIcon = false,
    showAdjacentClear = false,
    clearAriaLabel = "Clear filter",
    groupProps = {},
    ...inputProps
}) {
    const committed = value ?? "";
    const [localValue, setLocalValue] = useState(committed);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const committedRef = useRef(committed);
    committedRef.current = committed;

    useEffect(() => {
        setLocalValue(committed);
    }, [committed]);

    useEffect(() => {
        if (localValue === committed) return undefined;
        const timer = setTimeout(() => {
            if (localValue !== committedRef.current) {
                onChangeRef.current(localValue);
            }
        }, delay);
        return () => clearTimeout(timer);
    }, [localValue, committed, delay]);

    const commitNow = (next) => {
        setLocalValue(next);
        if (next !== committedRef.current) {
            onChangeRef.current(next);
        }
    };

    const input = (
        <InputGroup size={size} {...groupProps}>
            {showSearchIcon && (
                <InputLeftElement pointerEvents="none">
                    <Icon as={MdSearch} color="gray.400" />
                </InputLeftElement>
            )}
            <Input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={() => {
                    if (localValue !== committedRef.current) {
                        onChangeRef.current(localValue);
                    }
                }}
                placeholder={placeholder}
                bg={bg}
                color={color}
                borderColor={borderColor}
                {...inputProps}
                pl={showSearchIcon ? "9" : inputProps.pl}
            />
            {!showAdjacentClear && localValue ? (
                <InputRightElement>
                    <IconButton
                        size="xs"
                        icon={<Icon as={MdClose} />}
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => commitNow("")}
                        aria-label={clearAriaLabel}
                    />
                </InputRightElement>
            ) : null}
        </InputGroup>
    );

    if (!showAdjacentClear) return input;

    return (
        <HStack spacing="1" w="100%">
            {input}
            {localValue ? (
                <IconButton
                    size="sm"
                    icon={<Icon as={MdClose} />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => commitNow("")}
                    aria-label={clearAriaLabel}
                />
            ) : null}
        </HStack>
    );
}

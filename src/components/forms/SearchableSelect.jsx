import React, { useState, useEffect, useRef, useMemo, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Input,
  InputGroup,
  InputRightElement,
  Box,
  Flex,
  IconButton,
  Text,
  List,
  ListItem,
  useColorModeValue,
  Spinner,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { getTextOptionIdByValue } from "../../utils/m2oFieldOptions";
import {
  isBlank,
  filterOptionsByQuery,
  clampIndex,
  stepIndex,
  findSelectedIndex,
  computeAutoSize,
  getListState,
  setUnmatchedSearchField,
} from "../../utils/searchableSelect";

const FOCUS_COLOR = "#1c4a95";

/**
 * The one searchable select for the whole app.
 *
 * - Select mode (default): `value` is an option's `valueKey`; `onChange(valueKey)`.
 * - Free-text mode (`allowFreeText`): `value` is a string the user may type freely;
 *   `onChange(text, option)` (option is the picked/matching option or `{ id, name }`).
 * - Local filtering by label unless `serverSideSearch` (the server already filtered `options`).
 * - Empty results always show "No options found"; the full list is never shown as a fallback.
 * - `onSearchChange(text)` fires as the user types and with "" when the list closes.
 *   Async loaders behind it must ignore stale responses (see createLatestGuard).
 */
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  onSearchChange,
  // Alias kept for the older `onSearch` prop name.
  onSearch,
  // Show the current label in the search box while open (and filter by it).
  prefillOnFocus = false,
  // Empty the value as soon as the search box is emptied. Off: use the clear (x) button.
  clearOnEmptySearch = false,
  serverSideSearch = false,
  allowFreeText = false,
  displayKey = "name",
  valueKey = "id",
  formatOption = (option) => option[displayKey] || option.name || `Option ${option[valueKey]}`,
  // Optional custom dropdown row; formatOption still drives filtering and the selected label
  renderOption,
  noOptionsText = "No options found",
  isLoading = false,
  isDisabled = false,
  isClearable = true,
  canDeleteOption,
  onDeleteOption,
  isDeletingOptionId = null,
  bg,
  color,
  borderColor,
  size = "sm",
  // When enabled, the input auto-sizes to its content (selected label / search text)
  autoWidth = false,
  autoWidthMin = 12,
  autoWidthMax = 60,
  autoWidthPadding = 2,
  // Shown when value is set but the matching option is not in the current options list
  fallbackDisplay = "",
  error,
  ...props
}) => {
  const fieldName = useId();
  const listboxId = `${fieldName}-listbox`;
  const optionId = (index) => `${fieldName}-opt-${index}`;
  const searchCallback = onSearchChange || onSearch;

  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  // True once the user moved the highlight with the arrow keys (or the mouse) in this open session
  const pickedByNavRef = useRef(false);
  const dropdownRef = useRef(null);
  const highlightedItemRef = useRef(null);
  // Always call the latest callback without re-subscribing effects
  const searchCallbackRef = useRef(searchCallback);
  searchCallbackRef.current = searchCallback;

  const defaultBg = useColorModeValue("gray.100", "gray.800");
  const defaultColor = useColorModeValue("gray.700", "gray.100");
  const defaultBorderColor = useColorModeValue("gray.200", "gray.700");
  const dropdownBg = useColorModeValue("white", "gray.800");
  const highlightBg = useColorModeValue("blue.50", "blue.900");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const notifySearch = useCallback((text) => {
    if (typeof searchCallbackRef.current === "function") searchCallbackRef.current(text);
  }, []);

  const getLabel = (option) => String(formatOption(option) ?? "");

  const selectedOption =
    !allowFreeText && !isBlank(value)
      ? options.find((option) => String(option[valueKey]) === String(value))
      : null;
  const fallbackLabel = String(fallbackDisplay || "").trim();
  const displayValue = allowFreeText
    ? (isBlank(value) ? "" : String(value))
    : selectedOption
      ? getLabel(selectedOption)
      : (!isBlank(value) && fallbackLabel ? fallbackLabel : "");

  // A pending search stays visible after closing until the user removes it or picks an option
  const inputValue = isOpen ? searchValue : (searchValue || displayValue);
  // Without prefill the box is empty while open, so keep the current label visible as a hint
  const inputPlaceholder = isOpen && !searchValue && displayValue ? displayValue : placeholder;

  const {
    w,
    minW,
    maxW,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    id: inputId,
    list: _ignoredList,
    autoComplete: _ignoredAutoComplete,
    name: nameProp,
    htmlSize: htmlSizeProp,
    ...inputProps
  } = props;

  const computedHtmlSize = autoWidth
    ? computeAutoSize({
        text: inputValue,
        placeholder: inputPlaceholder,
        padding: autoWidthPadding,
        min: autoWidthMin,
        max: autoWidthMax,
      })
    : undefined;

  // Local filtering always keyed off what is typed. Never falls back to the full list.
  const filteredOptions = useMemo(() => {
    if (serverSideSearch || !isOpen) return options;
    return filterOptionsByQuery(options, searchValue, getLabel);
    // formatOption is intentionally not a dependency: callers pass a new function each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, options, isOpen, serverSideSearch]);

  const count = filteredOptions.length;
  const activeIndex = clampIndex(highlightedIndex, count);
  // After the user types (or resets) a search, the options still on screen belong to the previous
  // query. For server-side lists show the loading state until the new results arrive (local lists
  // are already filtered instantly, so they never wait).
  const [awaitingResults, setAwaitingResults] = useState(false);
  // Typed text left in an id-based field is only a search, not a value: flag it until an option is picked
  const hasUnmatchedText = !isOpen && !allowFreeText && searchValue.trim() !== "";
  useEffect(() => {
    setUnmatchedSearchField(fieldName, hasUnmatchedText);
    return () => setUnmatchedSearchField(fieldName, false);
  }, [fieldName, hasUnmatchedText]);

  const optionsSignature = useMemo(
    () => options.map((o) => String(o?.[valueKey] ?? o?.key ?? o?.id ?? formatOption(o))).join("|"),
    // formatOption intentionally omitted: callers pass a new function each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, valueKey]
  );
  const prevSignatureRef = useRef(optionsSignature);
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    const signatureChanged = prevSignatureRef.current !== optionsSignature;
    const loadingFinished = prevLoadingRef.current && !isLoading;
    prevSignatureRef.current = optionsSignature;
    prevLoadingRef.current = isLoading;
    if (signatureChanged || loadingFinished) setAwaitingResults(false);
  }, [optionsSignature, isLoading]);
  useEffect(() => {
    if (!awaitingResults) return undefined;
    // Safety net for callers that never answer a query (e.g. they skip the request)
    const timer = setTimeout(() => setAwaitingResults(false), 4000);
    return () => clearTimeout(timer);
  }, [awaitingResults]);

  const listState = getListState({ isLoading: isLoading || awaitingResults, count });

  // Opening: highlight the selected option. Typing: highlight the first match.
  useEffect(() => {
    if (isOpen) setHighlightedIndex(findSelectedIndex(filteredOptions, value, valueKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSearchValue("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const prevSearchRef = useRef("");
  useEffect(() => {
    const changed = prevSearchRef.current !== searchValue;
    prevSearchRef.current = searchValue;
    if (isOpen && changed && searchValue !== "") setHighlightedIndex(0);
  }, [searchValue, isOpen]);

  // Scroll highlighted item into view inside the dropdown only (not the page)
  useEffect(() => {
    if (!isOpen || !dropdownRef.current || !highlightedItemRef.current) return;
    const container = dropdownRef.current;
    const item = highlightedItemRef.current;
    const cRect = container.getBoundingClientRect();
    const iRect = item.getBoundingClientRect();
    const itemTop = iRect.top - cRect.top + container.scrollTop;
    const itemHeight = item.offsetHeight;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    if (itemTop < scrollTop) {
      container.scrollTo({ top: itemTop, behavior: "smooth" });
    } else if (itemTop + itemHeight > scrollTop + containerHeight) {
      container.scrollTo({ top: itemTop + itemHeight - containerHeight, behavior: "smooth" });
    }
  }, [activeIndex, isOpen]);

  // Closing (outside click, Esc, Tab, Enter on no match) keeps the typed search text and the
  // server-side query until the user picks an option or clears the field.
  const closeDropdown = useCallback(() => {
    pickedByNavRef.current = false;
    setIsOpen(false);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchValue("");
    notifySearch("");
  }, [notifySearch]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      const insideContainer = containerRef.current?.contains(event.target);
      const insideDropdown = dropdownRef.current?.contains(event.target);
      if (!insideContainer && !insideDropdown) closeDropdown();
    };
    const timeoutId = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const commitOption = (option) => {
    if (!option) return;
    if (allowFreeText) {
      onChange?.(getLabel(option), option);
    } else {
      onChange?.(option[valueKey]);
    }
    closeDropdown();
    resetSearch();
  };

  const openDropdown = (prefill = "") => {
    setIsOpen(true);
    // Reopening resumes the pending search instead of discarding it
    const query = searchValue !== "" ? searchValue : prefill;
    setSearchValue(query);
    // A server-side list is already loaded for ""; only fetch when there is a query
    if (!serverSideSearch || String(query).trim() !== "") notifySearch(query);
  };

  const prefillLabel = prefillOnFocus ? (displayValue || fallbackLabel) : "";

  const handleInputChange = (e) => {
    if (isDisabled) return;
    const next = e.target.value;
    setSearchValue(next);
    if (!isOpen) setIsOpen(true);
    if (allowFreeText) {
      onChange?.(next, { id: getTextOptionIdByValue(options, next), name: next });
    } else if (clearOnEmptySearch && next === "" && !isBlank(value)) {
      onChange?.("");
    }
    if (serverSideSearch && typeof searchCallbackRef.current === "function") setAwaitingResults(true);
    notifySearch(next);
  };

  const handleFocus = (e) => {
    if (isDisabled) return;
    onFocusProp?.(e);
    if (!isOpen) openDropdown(prefillLabel);
  };

  const handleClick = () => {
    if (isDisabled || isOpen) return;
    openDropdown(prefillLabel);
  };

  const handleBlur = (e) => {
    onBlurProp?.(e);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openDropdown(prefillLabel);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        pickedByNavRef.current = true;
        setHighlightedIndex(stepIndex(activeIndex, 1, count));
        break;
      case "ArrowUp":
        e.preventDefault();
        pickedByNavRef.current = true;
        setHighlightedIndex(stepIndex(activeIndex, -1, count));
        break;
      case "Enter":
        // Never submit the surrounding form from an open list; only select a real option
        e.preventDefault();
        if (activeIndex >= 0) commitOption(filteredOptions[activeIndex]);
        else closeDropdown();
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        // After typing a search, Tab picks the highlighted match and moves on (focus continues).
        // Tab without typing, or with no match, leaves the value untouched.
        if (
          !allowFreeText &&
          (searchValue.trim() !== "" || pickedByNavRef.current) &&
          activeIndex >= 0 &&
          listState === "options"
        ) {
          commitOption(filteredOptions[activeIndex]);
        } else {
          closeDropdown();
        }
        break;
      default:
        break;
    }
  };

  // Inside a Chakra modal the list renders under the input; a body portal sits behind the modal's scroll lock
  const [isInModal, setIsInModal] = useState(false);
  useEffect(() => {
    setIsInModal(Boolean(containerRef.current?.closest(".chakra-modal__content")));
  }, []);

  const showDropdown = isOpen;
  useEffect(() => {
    if (isInModal || !showDropdown || !containerRef.current || !dropdownRef.current) return undefined;

    const updatePosition = () => {
      if (!containerRef.current || !dropdownRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;
      const height = Math.min(dropdown.scrollHeight, 200);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < height + 8 && rect.top > spaceBelow;
      dropdown.style.position = "fixed";
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.width = `${rect.width}px`;
      dropdown.style.minWidth = "180px";
      dropdown.style.zIndex = "9999";
      if (openUp) {
        dropdown.style.top = "auto";
        dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      } else {
        dropdown.style.bottom = "auto";
        dropdown.style.top = `${rect.bottom + 4}px`;
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isInModal, showDropdown, count, isLoading]);

  const hasClearableContent = String(inputValue ?? "").trim().length > 0 || (!allowFreeText && !isBlank(value));

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (allowFreeText) onChange?.("", null);
    else onChange?.("");
    setSearchValue("");
    setHighlightedIndex(0);
    setIsOpen(true);
    if (serverSideSearch && typeof searchCallbackRef.current === "function") setAwaitingResults(true);
    notifySearch("");
    // Keep typing possible right after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const dropdownContent = showDropdown ? (
    <Box
      ref={dropdownRef}
      bg={dropdownBg}
      border="1px"
      borderColor={defaultBorderColor}
      borderRadius="md"
      boxShadow="lg"
      maxH="200px"
      overflowY="auto"
      zIndex={9999}
      {...(isInModal ? { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, minW: "180px" } : {})}
    >
      {listState === "loading" ? (
        <Box p={3} textAlign="center" role="status" aria-live="polite">
          <Spinner size="sm" />
        </Box>
      ) : listState === "empty" ? (
        <Box px={3} py={2} fontSize="sm" color={mutedColor} role="status" aria-live="polite">
          {noOptionsText}
        </Box>
      ) : (
        <List spacing={0} id={listboxId} role="listbox">
          {filteredOptions.map((option, index) => {
            const deletable = Boolean(canDeleteOption?.(option));
            const isActive = index === activeIndex;
            return (
              <ListItem
                key={option.key ?? option.id ?? `${getLabel(option)}-${index}`}
                id={optionId(index)}
                role="option"
                aria-selected={!allowFreeText && String(option[valueKey]) === String(value)}
                ref={isActive ? highlightedItemRef : null}
                px={deletable ? 2 : 3}
                py={deletable ? 1 : 2}
                bg={isActive ? highlightBg : undefined}
                outline={isActive ? "2px solid" : undefined}
                outlineColor={isActive ? FOCUS_COLOR : undefined}
                outlineOffset="-2px"
                fontWeight={!allowFreeText && String(option[valueKey]) === String(value) ? "semibold" : undefined}
                borderBottom="1px"
                borderColor={defaultBorderColor}
                fontSize="sm"
                onMouseMove={() => {
                  if (index !== highlightedIndex) {
                    pickedByNavRef.current = true;
                    setHighlightedIndex(index);
                  }
                }}
              >
                <Flex align="center" gap={1}>
                  <Box
                    flex="1"
                    px={deletable ? 1 : 0}
                    py={deletable ? 1 : 0}
                    cursor="pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      commitOption(option);
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {renderOption ? renderOption(option) : getLabel(option)}
                  </Box>
                  {deletable ? (
                    <IconButton
                      aria-label={`Delete ${getLabel(option)}`}
                      icon={<CloseIcon boxSize={2.5} />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      isLoading={String(isDeletingOptionId) === String(option.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteOption?.(option, e);
                      }}
                    />
                  ) : null}
                </Flex>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  ) : null;

  return (
    <>
      <Box
        position="relative"
        ref={containerRef}
        w={autoWidth ? (w || "auto") : (w || "100%")}
        minW={minW}
        maxW={maxW}
      >
        <InputGroup size={size} w={autoWidth ? "auto" : (w || "100%")} minW={minW} maxW={maxW}>
          <Input
            ref={inputRef}
            id={inputId}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onClick={handleClick}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            size={size}
            bg={bg || defaultBg}
            color={color || defaultColor}
            borderColor={error || hasUnmatchedText ? "red.400" : (borderColor || defaultBorderColor)}
            title={hasUnmatchedText ? "No match selected. Pick an option from the list or clear the field." : displayValue}
            w={autoWidth ? "auto" : w}
            minW={minW}
            maxW={maxW}
            pr={isClearable && hasClearableContent ? "2rem" : undefined}
            htmlSize={htmlSizeProp ?? computedHtmlSize}
            _focus={{
              borderColor: FOCUS_COLOR,
              boxShadow: `0 0 0 1px ${FOCUS_COLOR}`,
            }}
            {...inputProps}
            isDisabled={isDisabled}
            name={nameProp || fieldName}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={isOpen && listState === "options" ? listboxId : undefined}
            aria-activedescendant={isOpen && listState === "options" && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-invalid={error || hasUnmatchedText ? true : undefined}
          />
          {isClearable && hasClearableContent && !isDisabled ? (
            <InputRightElement width="2rem" h="100%">
              <IconButton
                aria-label="Clear selection"
                icon={<CloseIcon boxSize={2.5} />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
              />
            </InputRightElement>
          ) : null}
        </InputGroup>
        {hasUnmatchedText ? (
          <Text
            position="absolute"
            top="100%"
            left={0}
            mt="1px"
            fontSize="10px"
            lineHeight="1.2"
            color="red.500"
            whiteSpace="nowrap"
            role="alert"
            zIndex={1}
          >
            No match. Pick an option or clear.
          </Text>
        ) : null}
        {isInModal ? dropdownContent : null}
      </Box>
      {!isInModal && typeof document !== "undefined" && dropdownContent
        ? createPortal(dropdownContent, document.body)
        : null}
    </>
  );
};

export default SearchableSelect;

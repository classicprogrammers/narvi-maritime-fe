import React from "react";
import { Flex, FormControl, FormErrorMessage, FormLabel, Select, Text, useColorModeValue } from "@chakra-ui/react";
import Card from "components/card/Card";
import DateField from "components/forms/DateField";
import { FIRST_DASHBOARD_FY, fyLabel, fyOptions, resolvePeriod, validatePeriod } from "utils/ledgerDashboardPeriod";

export const DEFAULT_DASHBOARD_PERIOD = { preset: "current", fyStartYear: "", from: "", to: "" };

const INTERVAL_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "total", label: "Total" },
];

// "fy:2025" style values keep the preset and the FY in one select.
const PRESET_CURRENT = "current";
const PRESET_PREVIOUS = "previous";
const PRESET_CUSTOM = "custom";
const FY_PREFIX = "fy:";

const presetSelectValue = (period) =>
  period.preset === "fy" ? `${FY_PREFIX}${period.fyStartYear}` : period.preset || PRESET_CURRENT;

/**
 * Period + interval filter shared by the dashboard tabs (B1-B4).
 * Controlled: `value` is { period: { preset, fyStartYear, from, to }, interval }, `onChange(nextValue)`.
 */
export default function DashboardPeriodFilter({
  value,
  onChange,
  showInterval = true,
  extra = null,
  today = new Date(),
  firstFy = FIRST_DASHBOARD_FY,
  lastFy = null,
}) {
  const inputBg = useColorModeValue("white", "navy.900");
  const mutedColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");

  const period = value?.period || DEFAULT_DASHBOARD_PERIOD;
  const interval = value?.interval || "month";
  const errors = validatePeriod({ period, interval });
  const resolved = resolvePeriod({ period }, today, { firstFy, lastFy });
  const fyChoices = fyOptions(firstFy, today, lastFy);

  const controlProps = { size: "md", h: "40px", bg: inputBg };
  const labelProps = { fontSize: "sm", fontWeight: "600", mb: 2, lineHeight: 5 };

  const update = (patch) => onChange?.({ period, interval, ...patch });
  const updatePeriod = (patch) => update({ period: { ...period, ...patch } });

  const handlePresetChange = (event) => {
    const next = event.target.value;
    if (next.startsWith(FY_PREFIX)) {
      updatePeriod({ preset: "fy", fyStartYear: Number(next.slice(FY_PREFIX.length)) });
    } else {
      updatePeriod({ preset: next });
    }
  };

  const isCustom = period.preset === PRESET_CUSTOM;

  return (
    <Card p={{ base: "16px", md: "20px" }} mb={5}>
      <Flex gap={4} align="flex-start" wrap="wrap">
        <FormControl w={{ base: "100%", sm: "auto" }} minW="200px" flex={{ md: "0 0 220px" }}>
          <FormLabel {...labelProps}>Period</FormLabel>
          <Select value={presetSelectValue(period)} onChange={handlePresetChange} {...controlProps}>
            <option value={PRESET_CURRENT}>Current FY</option>
            <option value={PRESET_PREVIOUS}>Previous FY</option>
            {fyChoices.map((year) => (
              <option key={year} value={`${FY_PREFIX}${year}`}>
                FY {fyLabel(year)}
              </option>
            ))}
            <option value={PRESET_CUSTOM}>Custom range</option>
          </Select>
        </FormControl>

        {isCustom && (
          <>
            <FormControl isInvalid={Boolean(errors.from || errors.range)} w={{ base: "100%", sm: "auto" }} minW="180px">
              <FormLabel {...labelProps}>From</FormLabel>
              <DateField
                value={period.from || ""}
                onChange={(event) => updatePeriod({ from: event.target.value })}
                {...controlProps}
              />
              {errors.from && <FormErrorMessage>{errors.from}</FormErrorMessage>}
            </FormControl>
            <FormControl isInvalid={Boolean(errors.to || errors.range)} w={{ base: "100%", sm: "auto" }} minW="180px">
              <FormLabel {...labelProps}>To</FormLabel>
              <DateField
                value={period.to || ""}
                onChange={(event) => updatePeriod({ to: event.target.value })}
                {...controlProps}
              />
              {errors.to && <FormErrorMessage>{errors.to}</FormErrorMessage>}
            </FormControl>
          </>
        )}

        {showInterval && (
          <FormControl w={{ base: "100%", sm: "auto" }} minW="160px" flex={{ md: "0 0 180px" }}>
            <FormLabel {...labelProps}>Breakdown</FormLabel>
            <Select value={interval} onChange={(event) => update({ interval: event.target.value })} {...controlProps}>
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>
        )}

        {extra}
      </Flex>

      {isCustom && errors.range && (
        <FormControl isInvalid mt={3}>
          <FormErrorMessage mt={0}>{errors.range}</FormErrorMessage>
        </FormControl>
      )}

      {resolved.label && (
        <Text fontSize="sm" color={mutedColor} mt={3}>
          {resolved.label}
        </Text>
      )}
    </Card>
  );
}

import React, { useMemo } from "react";
import { Box, FormControl, FormLabel, Input, Text } from "@chakra-ui/react";
import SearchableSelect from "../../../../components/forms/SearchableSelect";
import { getMasterData } from "../../../../hooks/useMasterData";
import { MASTER_KEYS } from "../../../../utils/masterDataCache";

/**
 * Header rows for the CI/PL Manual tab. Renders grid rows (label + field) meant to sit inside the
 * orange header Grid (`templateColumns="1fr 2fr"`) of CiPlDetail, in place of the SI/SIC/DI selects.
 *
 * Props:
 * - value: { jobNo, vesselId, vesselName, ciplNumber }
 * - onChange(patch): patch is { jobNo } or { vesselId } (id only, `null` when cleared)
 * - isLoading: shows the loading state on the vessel select
 * - isReadOnly: disables Job No and Vessel (archived view)
 */
const CiPlManualHeaderFields = ({ value = {}, onChange, isLoading = false, isReadOnly = false }) => {
  const { jobNo = "", vesselId = null, vesselName = "", ciplNumber = "" } = value || {};
  const vesselOptions = useMemo(() => getMasterData(MASTER_KEYS.VESSELS), []);

  const fieldProps = {
    size: "sm",
    bg: "transparent",
    borderColor: "transparent",
    variant: "unstyled",
    px: 0,
    py: 0,
    _focus: { boxShadow: "none", outline: "none" },
    _focusVisible: { boxShadow: "none", outline: "none" },
    style: { color: "white" },
    _placeholder: { color: "whiteAlpha.800" },
  };

  return (
    <>
      <FormControl display="contents">
        <FormLabel fontWeight="bold" textTransform="uppercase" m={0}>
          CI/PL NO:
        </FormLabel>
        <Box bg="orange.200" px={2} py={1} borderRadius="sm">
          <Text size="sm" fontWeight="medium" color="gray.800">
            {ciplNumber || "—"}
          </Text>
        </Box>
      </FormControl>

      <FormControl display="contents">
        <FormLabel htmlFor="manualJobNo" fontWeight="bold" textTransform="uppercase" m={0}>
          JOB NO:
        </FormLabel>
        <Input
          id="manualJobNo"
          value={jobNo ?? ""}
          onChange={(e) => onChange?.({ jobNo: e.target.value })}
          placeholder="Enter job no..."
          isDisabled={isReadOnly}
          {...fieldProps}
        />
      </FormControl>

      <FormControl display="contents">
        <FormLabel htmlFor="manualVessel" fontWeight="bold" textTransform="uppercase" m={0}>
          VESSEL:
        </FormLabel>
        <SearchableSelect
          id="manualVessel"
          value={vesselId ?? ""}
          onChange={(val) => onChange?.({ vesselId: val === "" || val == null ? null : val })}
          options={vesselOptions}
          displayKey="name"
          valueKey="id"
          fallbackDisplay={vesselName}
          prefillOnFocus={false}
          isLoading={isLoading}
          isDisabled={isReadOnly}
          placeholder="Select vessel..."
          {...fieldProps}
        />
      </FormControl>
    </>
  );
};

export default CiPlManualHeaderFields;

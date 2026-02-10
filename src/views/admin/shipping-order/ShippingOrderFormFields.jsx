import React from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

/**
 * Shared form body for shipping order (used in modal and edit page).
 * Parent owns formData state and passes onOpenVslsAgentDtlsModal to open the VSLS editor modal.
 */
export default function ShippingOrderFormFields({
  formData,
  setFormData,
  isEditMode,
  clients,
  vessels,
  countries,
  pics,
  quotations,
  isLoadingQuotations,
  onOpenVslsAgentDtlsModal,
  showVesselDbLink = true,
}) {
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const readOnlyBg = useColorModeValue("gray.50", "gray.700");

  if (!formData) return null;

  const etbVal = formData.etb && formData.etb !== false
    ? (typeof formData.etb === "string" ? formData.etb.split(" ")[0] : formData.etb)
    : "";
  const etdVal = formData.etd && formData.etd !== false
    ? (typeof formData.etd === "string" ? formData.etd.split(" ")[0] : formData.etd)
    : "";

  return (
    <VStack spacing="6" align="stretch">
      {/* Basic Information */}
      <Box>
        <Flex gap="4" flexWrap="wrap">
          {isEditMode && (
            <FormControl flex="1">
              <FormLabel>SO Number</FormLabel>
              <Input
                value={formData.so_number || "-"}
                isReadOnly
                bg={readOnlyBg}
                cursor="not-allowed"
              />
            </FormControl>
          )}
          <FormControl flex="1" minW="220px">
            <FormLabel>Date Created</FormLabel>
            <Input
              type="date"
              value={formData.date_created || ""}
              isReadOnly={!!isEditMode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date_created: e.target.value }))
              }
            />
          </FormControl>
          <FormControl flex="1" minW="220px">
            <FormLabel>Status</FormLabel>
            <Select
              size="sm"
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              value={formData.done || "active"}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, done: e.target.value }))
              }
            >
              <option value="active">Active</option>
              <option value="archive">Archive</option>
              <option value="cancelled">Cancelled</option>
              <option value="done">Done</option>
              <option value="pending_pod">Pending POD</option>
              <option value="ready_for_invoice">Ready for Invoice</option>
            </Select>
          </FormControl>
        </Flex>
      </Box>

      {/* Party & Vessel */}
      <Box>
        <Flex gap="4" flexWrap="wrap">
          <FormControl flex="1" minW="220px">
            <FormLabel>Person in Charge</FormLabel>
            <SimpleSearchableSelect
              value={formData.pic_new}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, pic_new: value }))
              }
              options={pics}
              placeholder="Select person in charge"
              displayKey="name"
              valueKey="id"
              isLoading={false}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
          </FormControl>
          <FormControl flex="1" isRequired minW="260px">
            <FormLabel>Client</FormLabel>
            <SimpleSearchableSelect
              value={formData.client_id}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, client_id: value }))
              }
              options={clients}
              placeholder="Select client"
              displayKey="name"
              valueKey="id"
              isLoading={false}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
          </FormControl>
          <FormControl flex="1" isRequired minW="260px">
            <Flex justify="space-between" align="center" mb={1}>
              <FormLabel mb={0}>Vessel</FormLabel>
              {showVesselDbLink && !isEditMode && (
                <Button
                  as={Link}
                  to="/admin/configurations/vessels"
                  target="_blank"
                  size="xs"
                  variant="link"
                  colorScheme="blue"
                  onClick={() => {}}
                >
                  Open Vessel DB →
                </Button>
              )}
            </Flex>
            <SimpleSearchableSelect
              value={formData.vessel_id}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, vessel_id: value }))
              }
              options={vessels}
              placeholder="Select vessel"
              displayKey="name"
              valueKey="id"
              isLoading={false}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
          </FormControl>
        </Flex>
        <Flex gap="4" flexWrap="wrap" mt="4">
          <FormControl flex="1" minW="260px">
            <FormLabel>Destination Type</FormLabel>
            <Select
              size="sm"
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              value={formData.destination_type || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  destination_type: e.target.value,
                  destination: "",
                  country_id: null,
                }))
              }
              placeholder="Select destination type"
            >
              <option value="port_country">Port Name + Country</option>
              <option value="city_country">City + Country</option>
              <option value="airport_country">Airport + Country</option>
              <option value="country">Country</option>
            </Select>
          </FormControl>
          {formData.destination_type && formData.destination_type !== "country" && (
            <FormControl flex="1" minW="260px">
              <FormLabel>
                {formData.destination_type === "port_country"
                  ? "Port Name"
                  : formData.destination_type === "city_country"
                    ? "City"
                    : formData.destination_type === "airport_country"
                      ? "Airport"
                      : "Destination"}
              </FormLabel>
              <Input
                size="sm"
                bg={inputBg}
                color={inputText}
                borderColor={borderColor}
                value={formData.destination || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, destination: e.target.value }))
                }
                placeholder={
                  formData.destination_type === "port_country"
                    ? "Enter port name"
                    : formData.destination_type === "city_country"
                      ? "Enter city name"
                      : formData.destination_type === "airport_country"
                        ? "Enter airport name"
                        : "Enter destination"
                }
              />
            </FormControl>
          )}
          {formData.destination_type && (
            <FormControl flex="1" minW="260px">
              <FormLabel>Country</FormLabel>
              <SimpleSearchableSelect
                value={formData.country_id}
                onChange={(value) => {
                  const selectedCountry = countries.find((c) => c.id === value);
                  setFormData((prev) => ({
                    ...prev,
                    country_id: value,
                    ...(prev.destination_type === "country" && selectedCountry
                      ? { destination: selectedCountry.name }
                      : {}),
                  }));
                }}
                options={countries}
                placeholder="Select country"
                displayKey="name"
                valueKey="id"
                isLoading={false}
                bg={inputBg}
                color={inputText}
                borderColor={borderColor}
                size="sm"
              />
            </FormControl>
          )}
        </Flex>
      </Box>

      {/* Next Action */}
      <Box>
        <Flex gap="4" flexWrap="wrap">
          <FormControl flex="1" minW="180px">
            <FormLabel>Next Action</FormLabel>
            <Input
              type="date"
              value={formData.next_action || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, next_action: e.target.value }))
              }
            />
          </FormControl>
        </Flex>
      </Box>

      {/* Schedule */}
      <Box>
        <Flex gap="4" flexWrap="wrap">
          <FormControl flex="1" minW="180px">
            <FormLabel>ETA</FormLabel>
            <Input
              type="date"
              value={formData.eta_date || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, eta_date: e.target.value }))
              }
            />
          </FormControl>
          <FormControl flex="1" minW="180px">
            <FormLabel>ETB</FormLabel>
            <Input
              type="date"
              value={etbVal}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, etb: e.target.value || false }))
              }
            />
          </FormControl>
          <FormControl flex="1" minW="180px">
            <FormLabel>ETD</FormLabel>
            <Input
              type="date"
              value={etdVal}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, etd: e.target.value || false }))
              }
            />
          </FormControl>
        </Flex>
      </Box>

      {/* Remarks */}
      <Box>
        <FormControl mb="3">
          <FormLabel>Internal Remark</FormLabel>
          <Textarea
            value={formData.internal_remark}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, internal_remark: e.target.value }))
            }
          />
        </FormControl>
        <FormControl mb="3">
          <FormLabel>VSLS Agent Details</FormLabel>
          <VStack align="stretch" spacing="2">
            <Textarea
              value={formData.vsls_agent_dtls || ""}
              isReadOnly
              rows={2}
              cursor="pointer"
              onClick={() =>
                onOpenVslsAgentDtlsModal?.(
                  formData.vsls_agent_dtls || "",
                  "edit",
                  `Edit VSLS Agent Details — ${formData.so_number || "SO"}`,
                  "vsls_agent_dtls"
                )
              }
            />
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                onOpenVslsAgentDtlsModal?.(
                  formData.vsls_agent_dtls || "",
                  "edit",
                  `Edit VSLS Agent Details — ${formData.so_number || "SO"}`,
                  "vsls_agent_dtls"
                )
              }
              alignSelf="flex-start"
            >
              Open editor
            </Button>
          </VStack>
        </FormControl>
        <FormControl>
          <FormLabel>Client Case Invoice Ref</FormLabel>
          <Textarea
            value={formData.client_case_invoice_ref}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, client_case_invoice_ref: e.target.value }))
            }
          />
        </FormControl>
      </Box>

      {/* Quotation & Timestamp */}
      <Box>
        <Flex gap="4" flexWrap="wrap">
          <FormControl flex="1" minW="260px" isDisabled>
            <FormLabel>Quotation</FormLabel>
            <SimpleSearchableSelect
              value={formData.quotation_id}
              onChange={(value) =>
                setFormData((prev) => {
                  const selected = quotations.find((q) => q.id === value);
                  return {
                    ...prev,
                    quotation_id: value,
                    quotation: selected ? selected.name : "",
                  };
                })
              }
              options={quotations}
              placeholder="Select quotation"
              displayKey="name"
              valueKey="id"
              isLoading={isLoadingQuotations}
              isDisabled
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
          </FormControl>
          <FormControl flex="1" minW="260px">
            <FormLabel>SO Timestamp</FormLabel>
            <Input
              value={formData.timestamp}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timestamp: e.target.value }))
              }
              placeholder="13/06/2025 12:44:22"
            />
          </FormControl>
        </Flex>
      </Box>
    </VStack>
  );
}

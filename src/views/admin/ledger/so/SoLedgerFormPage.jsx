import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdArrowBack } from "react-icons/md";
import { useHistory, useParams } from "react-router-dom";
import { getLedgerSoById } from "api/ledgerSo";
import {
  displayOrDash,
  displaySoNumber,
  emptySoLedgerForm,
  etaDisplay,
  extractApiMessage,
  formatCostNumber,
  formatProfitPercent,
  prettySoDate,
  recordToForm,
  soLedgerBizCategoryDisplay,
} from "./ledgerSoUtils";

const LIST_PATH = "/admin/ledger/so";

export default function SoLedgerFormPage() {
  const { id } = useParams();
  const history = useHistory();
  const toast = useToast();
  const [form, setForm] = useState(emptySoLedgerForm());
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const readonlyBg = useColorModeValue("gray.50", "gray.700");
  const labelColor = useColorModeValue("gray.700", "gray.200");

  const goBackToList = useCallback(() => {
    history.push(LIST_PATH);
  }, [history]);

  useEffect(() => {
    if (!id) {
      history.replace(LIST_PATH);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingRecord(true);
    getLedgerSoById(id)
      .then((record) => {
        if (cancelled) return;
        setForm(recordToForm(record));
      })
      .catch((error) => {
        if (cancelled) return;
        toast({
          title: "Error",
          description: extractApiMessage(error, "Failed to load SO ledger record."),
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        history.replace(LIST_PATH);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, history, toast]);

  const fieldLabelProps = {
    fontSize: "sm",
    fontWeight: "600",
    color: labelColor,
    mb: 1,
    lineHeight: "1.25",
  };
  const controlProps = {
    size: "md",
    h: "40px",
    bg: readonlyBg,
  };

  const profitValue = Number(form.actual_profit);
  const profitColor = Number.isFinite(profitValue)
    ? profitValue > 0
      ? "green.600"
      : profitValue < 0
        ? "red.500"
        : undefined
    : undefined;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Flex align="center" gap={3}>
            <Button leftIcon={<Icon as={MdArrowBack} />} variant="ghost" onClick={goBackToList}>
              Back
            </Button>
            <Box>
              <Heading size="lg" mb={1}>
                SO Ledger
              </Heading>
              <Text fontSize="sm" color="gray.500">
                SO Ledger is auto-generated from Cost DB and Invoices DB.
              </Text>
            </Box>
          </Flex>
        </Flex>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={{ base: 4, md: 6 }}>
          {isLoadingRecord ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner />
            </Flex>
          ) : (
            <>
              <SimpleGrid
                columns={{ base: 1, md: 2 }}
                columnGap={{ base: 0, md: 5 }}
                rowGap={3}
                alignItems="start"
              >
                <FormControl>
                  <FormLabel {...fieldLabelProps}>SO Number</FormLabel>
                  <Input isReadOnly value={displaySoNumber(form) || "—"} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Date Created</FormLabel>
                  <Input isReadOnly value={prettySoDate(form.so_create_date) || "—"} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Status</FormLabel>
                  <Input isReadOnly value={displayOrDash(form.so_status_label || form.so_status)} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Person In Charge</FormLabel>
                  <Input isReadOnly value={displayOrDash(form.pic)} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Client</FormLabel>
                  <Input isReadOnly value={displayOrDash(form.client)} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Vessel Name</FormLabel>
                  <Input isReadOnly value={displayOrDash(form.vessel_name)} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Destination</FormLabel>
                  <Input isReadOnly value={displayOrDash(form.destination)} {...controlProps} />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>ETA</FormLabel>
                  <Input
                    isReadOnly
                    value={prettySoDate(form.eta_date) || etaDisplay(form.eta_date, form.eta) || "—"}
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Biz Category</FormLabel>
                  <Input
                    isReadOnly
                    value={
                      soLedgerBizCategoryDisplay(form.biz_category, form.biz_category_label) || "—"
                    }
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Actual Sale</FormLabel>
                  <Input
                    isReadOnly
                    value={form.actual_sale === "" ? "—" : formatCostNumber(form.actual_sale, 2)}
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Actual Cost</FormLabel>
                  <Input
                    isReadOnly
                    value={form.actual_cost === "" ? "—" : formatCostNumber(form.actual_cost, 2)}
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Actual Profit</FormLabel>
                  <Input
                    isReadOnly
                    value={form.actual_profit === "" ? "—" : formatCostNumber(form.actual_profit, 2)}
                    {...controlProps}
                    color={profitColor}
                    fontWeight={profitColor ? "700" : undefined}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Actual Profit %</FormLabel>
                  <Input
                    isReadOnly
                    value={
                      form.actual_profit_percentage === ""
                        ? "—"
                        : formatProfitPercent(form.actual_profit_percentage)
                    }
                    {...controlProps}
                    color={profitColor}
                    fontWeight={profitColor ? "700" : undefined}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...fieldLabelProps}>Invoice Balance</FormLabel>
                  <Input
                    isReadOnly
                    value={form.invoice_balance === "" ? "—" : formatCostNumber(form.invoice_balance, 2)}
                    {...controlProps}
                  />
                </FormControl>
                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel {...fieldLabelProps}>SO Remark</FormLabel>
                  <Textarea isReadOnly value={displayOrDash(form.so_remark)} bg={readonlyBg} minH="80px" rows={3} />
                </FormControl>
              </SimpleGrid>
              <Text fontSize="xs" color="gray.500" mt={5}>
                Totals refresh from Cost DB and Invoices DB. Add or edit those records, then return here to
                see updated sale, cost, profit, and invoice balance.
              </Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

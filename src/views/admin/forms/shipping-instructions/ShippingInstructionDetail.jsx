import React, { useEffect, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  GridItem,
  Badge,
  Progress,
  IconButton,
  useColorModeValue,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  FormControl,
  FormLabel,
  Select,
  Textarea,
} from "@chakra-ui/react";
import { MdPrint, MdSettings, MdHelpOutline } from "react-icons/md";
import SimpleSearchableSelect from "../../../../components/forms/SimpleSearchableSelect";
import { useMasterData } from "../../../../hooks/useMasterData";
import narviLogo from "../../../../assets/img/Narvi Maritime Logo2-01 (3).jpg";
import narviLetterhead from "../../../../assets/letterHead/Letterhead-sidebar.png";
import narviLetterheadWatermark from "../../../../assets/letterHead/letterhead-watermark.png";
import { getSiFormOptionsApi, postSiFormApi, postSiFormUpdateApi } from "../../../../api/shippingInstructions";

export default function ShippingInstructionDetail() {
  const history = useHistory();
  const { id } = useParams();
  const { countries: countryList = [] } = useMasterData();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingInstruction, setShippingInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(false);
  const [siOptions, setSiOptions] = useState([]);
  const [consigneeOptions, setConsigneeOptions] = useState([]);
  const [isSiFormLoading, setIsSiFormLoading] = useState(false);
  const [selectedSiName, setSelectedSiName] = useState("");
  const [siFormId, setSiFormId] = useState(null);
  // Backend requires agent_cnee_id; keep last valid id even if UI is cleared
  const [requiredAgentCneeId, setRequiredAgentCneeId] = useState(null);
  const isApplyingFormRef = useRef(false);
  const headerUserEditedRef = useRef(false);

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");
  const bgColor = useColorModeValue("white", "gray.800");

  // Form state
  const [formData, setFormData] = useState({
    vessel: "",
    consignBlock: "",
    siNo: "", // stores selected option id
    jobNo: "",
    shippedBy: "",
    from: "",
    to: "", // display name (used for print)
    toCountryId: "", // stores selected country id
    deadline: "",
    pic: "",
    date: "",
    selectConsignee: "", // stores selected option id
    company: "",
    consigneeAddress1: "",
    consigneeAddress2: "",
    consigneePostcode: "",
    consigneeCity: "",
    consigneeCountry: "",
    regNo: "",
    consigneeEmail: "",
    consigneePhone: "",
    consigneePhone2: "",
    web: "",
    cneeText: "",
    agentsPIC: "",
    warnings: "",
  });

  // Cargo items
  const [cargoItems, setCargoItems] = useState([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
  ]);

  // Calculate totals
  const totals = {
    boxes: cargoItems.reduce((sum, item) => sum + item.boxes, 0),
    kg: cargoItems.reduce((sum, item) => sum + item.kg, 0),
    cbm: cargoItems.reduce((sum, item) => sum + item.cbm, 0),
    ww: cargoItems.reduce((sum, item) => sum + item.ww, 0),
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [qSi, setQSi] = useState("");
  const [qCnee, setQCnee] = useState("");
  const getOptionNameById = (list, id) => {
    const match = Array.isArray(list) ? list.find((o) => Number(o.id) === Number(id)) : null;
    return match?.name ? String(match.name) : "";
  };

  const blankCargoRows = () => ([
    {
      id: 1,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
    {
      id: 2,
      origin: "",
      warehouseId: "",
      supplier: "",
      poNumber: "",
      details: "",
      boxes: 0,
      kg: 0,
      cbm: 0,
      lwh: "",
      ww: 0,
      stockItemId: "",
    },
  ]);

  const applySiFormResponse = (form, { lockedConsigneeId, lockedSiId } = {}) => {
    if (!form) return;
    isApplyingFormRef.current = true;
    setSiFormId(form.id ?? null);

    const countryName =
      form.country_id && typeof form.country_id === "object" ? (form.country_id.name || "") : "";

    const consigneeId =
      form.agent_cnee_id && typeof form.agent_cnee_id === "object" ? form.agent_cnee_id.id : "";

    const siId =
      form.si_number_id && typeof form.si_number_id === "object" ? form.si_number_id.id : "";
    const siName =
      form.si_number_id && typeof form.si_number_id === "object" ? (form.si_number_id.name || "") : "";

    // Build CONSIGN TO text block from cnee lines if present, otherwise from address fields
    const cneeLines = [
      form.cnee2,
      form.cnee3,
      form.cnee4,
      form.cnee5,
      form.cnee6,
      form.cnee7,
      form.cnee8,
    ].filter((v) => v && v !== false).map((v) => String(v));

    const fallbackLines = [
      form.company,
      form.address1,
      form.address2,
      [form.postcode, form.city].filter(Boolean).join(" ").trim(),
      countryName,
      form.phone1 ? `Phone: ${form.phone1}` : "",
      form.email1 ? `E-mail: ${form.email1}` : "",
    ].filter((v) => v && v !== false).map((v) => String(v));

    setFormData((prev) => ({
      ...prev,
      // header card
      siNo: (lockedSiId ?? siId) ?? "",
      jobNo: form.job_no && form.job_no !== false ? String(form.job_no) : "",
      shippedBy: form.to_be_shipped_by && form.to_be_shipped_by !== false ? String(form.to_be_shipped_by) : "",
      from: form.from_text && form.from_text !== false ? String(form.from_text) : "",
      to: (form.to_country_id && typeof form.to_country_id === "object" && form.to_country_id.name)
        ? String(form.to_country_id.name)
        : "",
      toCountryId: (form.to_country_id && typeof form.to_country_id === "object" && form.to_country_id.id != null)
        ? Number(form.to_country_id.id)
        : "",
      deadline: form.deadline_date && form.deadline_date !== false ? String(form.deadline_date) : "",
      pic: form.header_pic && form.header_pic !== false ? String(form.header_pic) : "",
      date: form.header_date && form.header_date !== false ? String(form.header_date) : "",

      // consign block + consignee id
      consignBlock: (cneeLines.length ? cneeLines : fallbackLines).join("\n"),
      selectConsignee: (lockedConsigneeId ?? consigneeId) ?? "",

      // consignee detail fields
      company: form.company && form.company !== false ? String(form.company) : "",
      consigneeAddress1: form.address1 && form.address1 !== false ? String(form.address1) : "",
      consigneeAddress2: form.address2 && form.address2 !== false ? String(form.address2) : "",
      consigneePostcode: form.postcode && form.postcode !== false ? String(form.postcode) : "",
      consigneeCity: form.city && form.city !== false ? String(form.city) : "",
      consigneeCountry: countryName,
      regNo: form.reg_no && form.reg_no !== false ? String(form.reg_no) : "",
      consigneeEmail: form.email1 && form.email1 !== false ? String(form.email1) : "",
      consigneePhone: form.phone1 && form.phone1 !== false ? String(form.phone1) : "",
      consigneePhone2: form.phone2 && form.phone2 !== false ? String(form.phone2) : "",
      web: form.web && form.web !== false ? String(form.web) : "",
      cneeText: form.cnee_text && form.cnee_text !== false ? String(form.cnee_text) : "",
      agentsPIC: form.agents_pic && form.agents_pic !== false ? String(form.agents_pic) : "",
      warnings: form.warnings && form.warnings !== false ? String(form.warnings) : "",
    }));

    setSelectedSiName(siName ? String(siName) : "");
    if (consigneeId) setRequiredAgentCneeId(Number(consigneeId));

    const stockList = Array.isArray(form.stock_list) ? form.stock_list : [];
    const mapped = stockList.map((it, idx) => ({
      id: it.id ?? idx + 1,
      origin: it.origin || "",
      warehouseId: it.warehouse_id || "",
      supplier: it.supplier_id && typeof it.supplier_id === "object" ? (it.supplier_id.name || "") : "",
      poNumber: it.po_number || "",
      details: it.details && it.details !== false ? String(it.details) : "",
      boxes: Number(it.boxes || 0),
      kg: Number(it.kg || 0),
      cbm: Number(it.cbm || 0),
      lwh: it.lwh && it.lwh !== false ? String(it.lwh) : "",
      ww: Number(it.vw || 0),
      stockItemId: it.stock_item_id || "",
    }));

    setCargoItems(mapped.length ? mapped : blankCargoRows());
    // allow autosave effects after this render flushes
    setTimeout(() => {
      isApplyingFormRef.current = false;
    }, 0);
  };

  const ensureFormId = async () => {
    if (siFormId) return siFormId;
    const latest = await postSiFormApi({ latest_only: true });
    const id = latest?.id ?? null;
    if (id) setSiFormId(id);
    return id;
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setIsOptionsLoading(true);
        const data = await getSiFormOptionsApi({ page: 1, page_size: 20, q_cnee: qCnee, q_si: qSi });
        if (cancelled) return;

        const result = data?.result;
        const siNos = Array.isArray(result?.si_number_options) ? result.si_number_options : [];
        const consignees = Array.isArray(result?.cnee_options) ? result.cnee_options : [];

        const normalizeOptions = (arr) =>
          arr
            .filter((x) => x && x.name) // filters out name:false and empty
            .map((x) => ({ id: Number(x.id), name: String(x.name) }))
            .filter((x) => Number.isFinite(x.id));

        setSiOptions(normalizeOptions(siNos));
        setConsigneeOptions(normalizeOptions(consignees));
      } catch (e) {
        console.error("Failed to load SI form options:", e);
      } finally {
        if (!cancelled) setIsOptionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [qCnee, qSi]);

  // On page load: fetch latest saved SI form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsSiFormLoading(true);
        const form = await postSiFormApi({ latest_only: true });
        if (cancelled) return;
        applySiFormResponse(form);
      } catch (e) {
        // If backend has no "latest" yet or rejects, keep page usable
        console.error("Failed to load latest SI form:", e);
      } finally {
        if (!cancelled) setIsSiFormLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave centered header fields (debounced)
  useEffect(() => {
    if (isApplyingFormRef.current) return;
    // Don't call update on page load / initial fill. Only after user edits.
    if (!headerUserEditedRef.current) return;
    // don't autosave while initial latest record is still loading
    // (prevents racing user edits vs initial load)
    const timeoutId = setTimeout(async () => {
      try {
        const currentId = await ensureFormId();
        if (!currentId) return;

        setIsSiFormLoading(true);
        const updated = await postSiFormUpdateApi({
          id: currentId,
          to_be_shipped_by: formData.shippedBy ?? "",
          from_text: formData.from ?? "",
          to_country_id:
            formData.toCountryId != null && formData.toCountryId !== ""
              ? Number(formData.toCountryId)
              : null,
          deadline_date: formData.deadline ?? "",
          header_pic: formData.pic ?? "",
          header_date: formData.date ?? "",
        });
        applySiFormResponse(updated, {
          lockedConsigneeId: formData.selectConsignee,
          lockedSiId: formData.siNo,
        });
      } catch (e) {
        console.error("Failed to autosave SI header fields:", e);
      } finally {
        setIsSiFormLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    formData.shippedBy,
    formData.from,
    formData.toCountryId,
    formData.deadline,
    formData.pic,
    formData.date,
  ]);

  // Build printable HTML document for Shipping Instruction
  const buildShippingInstructionPrintHtml = (data, items, totals) => {
    const consignHtml = (data.consignBlock || "")
      .split("\n")
      .map(line => line || "&nbsp;")
      .join("<br/>");

    const rowsHtml = (items && items.length
      ? items
      : [
        { origin: "", warehouseId: "", supplier: "", poNumber: "", boxes: "", kg: "", cbm: "", lwh: "" },
        { origin: "", warehouseId: "", supplier: "", poNumber: "", boxes: "", kg: "", cbm: "", lwh: "" },
      ]
    )
      .map(item => {
        const safeKg = item.kg != null && item.kg !== "" ? Number(item.kg).toFixed(2) : "";
        const safeCbm = item.cbm != null && item.cbm !== "" ? Number(item.cbm).toFixed(2) : "";
        return `<tr>
  <td>${item.origin || ""}</td>
  <td>${item.warehouseId || ""}</td>
  <td>${item.supplier || ""}</td>
  <td>${item.poNumber || ""}</td>
  <td>${item.boxes ?? ""}</td>
  <td>${safeKg}</td>
  <td>${safeCbm}</td>
  <td>${item.lwh || ""}</td>
</tr>`;
      })
      .join("");

    const totalsHtml = `<tr class="summary-row">
  <td colspan="4" class="summary-label">CARGO TO BE SHIPPED:</td>
  <td>${totals.boxes}</td>
  <td>${totals.kg.toFixed(2)}</td>
  <td></td>
  <td></td>
</tr>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shipping Instruction</title>
<style>
  body{
    margin: 18px;
  }
  .letterhead-wrapper{
    position: fixed;
    inset: 0;
    z-index: 1;
    display: flex;
    justify-content: flex-start;
    pointer-events: none;
  }
  .letterhead-wrapper img{
    max-width: 100%;
    height: auto;
    margin-left: -85px;
  }
  .container{
    position: relative;
    margin: auto;
    padding-left: 30px;
  }
  .logo-header{
    text-align: center;
    margin-bottom: 12px;
  }
  .logo-header img{
    height: 250px;
  }
  .header-title{
    margin-top: 8px;
    margin-bottom: 12px;
    font-size: 18px;
    font-weight: bold;
  }
  .si-grid{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }
  .consign-box{
    background: #f5f5f5;
    padding: 8px 10px;
    font-size: 14px;
    min-height: 120px;
    line-height: 1.4rem;
  }
  .si-card-section{
    display: flex;
    justify-content: center;
  }
  .si-card{
    padding: 8px 10px;
    font-size: 12px;
    min-height: 120px;
    margin-top: 17px;
  }
  .si-card-table{
    width: max-content;
    border-collapse: collapse;
  }
  .si-card-table td{
    padding: 4px 10px;
  }
  .si-card-table td:first-child{
    font-weight: 800;
    text-transform: uppercase;
    width: 55%;
  }
  .si-card-table td:last-child{
    text-align: left;
  }
  .si-card-job{
    background: #fcd29a;
    padding: 2px 4px;
    border-radius: 2px;
    color: #333;
    display: inline-block;
  }
  .cargo-section-title{
    font-size: 12px;
    font-weight: bold;
    margin: 12px 0 4px;
  }
  .cargo-wrapper{
    position: relative;
  }
  .watermark-wrapper{
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  }
  .watermark-wrapper img{
    max-width: 70%;
    height: auto;
    opacity: 0.12;
  }
  table.cargo-table{
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  table.cargo-table th,
  table.cargo-table td{
    border: 1px solid #bfbfbf;
    padding: 4px 4px;
    text-align: left;
  }
  table.cargo-table th{
    background: #f0f0f0;
    font-weight: bold;
  }
  table.cargo-table th.ww{
    background: #ffe699;
  }
  table.cargo-table td.ww{
    background: #fff9cc;
  }
  tr.summary-row{
    background: #f0f0f0;
    font-weight: bold;
  }
  .summary-label{
    text-align: left;
  }
  @media print{
    body{margin:6mm;background:#fff;}
  }
</style>
</head>
<body>
  <div class="letterhead-wrapper">
    <img src="${narviLetterhead}" alt="Narvi Maritime Letterhead" />
  </div>
  <div class="container">
    <div class="logo-header">
      <img src="${narviLogo}" alt="Narvi Maritime" />
    </div>
    <div class="header-title">
      INSTRUCTION / CARGO MANIFEST FOR ${data.vessel || ""}
    </div>
    <div class="si-grid">
      <div>
        <div style="font-size: 11px; font-weight:bold; margin-bottom:4px;">CONSIGN TO :</div>
        <div class="consign-box">
          ${consignHtml || "&nbsp;"}
        </div>
      </div>
      <div class="si-card-section">
        <table class="si-card-table si-card">
          <tr><td>SI NO:</td><td>${data.siNo || ""}</td></tr>
          <tr><td>JOB NO:</td><td><span class="si-card-job">${data.jobNo || ""}</span></td></tr>
          <tr><td>TO BE SHIPPED BY:</td><td>${data.shippedBy || ""}</td></tr>
          <tr><td>FROM:</td><td>${data.from || ""}</td></tr>
          <tr><td>TO:</td><td>${data.to || ""}</td></tr>
          <tr><td>DEADLINE:</td><td>${data.deadline || ""}</td></tr>
          <tr><td>PIC:</td><td>${data.pic || ""}</td></tr>
          <tr><td>DATE:</td><td>${data.date || ""}</td></tr>
        </table>
      </div>
    </div>

    <div class="cargo-section-title">
      CARGO TO BE INCLUDED IN THIS SHIPPING INSTRUCTION :
    </div>
    <div class="cargo-wrapper">
      <div class="watermark-wrapper">
        <img src="${narviLetterheadWatermark}" alt="Narvi Maritime Watermark" />
      </div>
      <table class="cargo-table">
        <thead>
          <tr>
            <th>ORIGIN</th>
            <th>WAREHOUSE ID</th>
            <th>SUPPLIER</th>
            <th>PO NUMBER</th>
            <th>BOXES</th>
            <th>KG</th>
            <th>CBM</th>
            <th>LWH</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          ${totalsHtml}
        </tbody>
      </table>
    </div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;
  };

  // Button handlers
  const handleResetShippingInstruction = async () => {
    try {
      setIsSiFormLoading(true);
      // Ensure we have a record id to update
      let currentId = siFormId;
      if (!currentId) {
        const latestBefore = await postSiFormApi({ latest_only: true });
        currentId = latestBefore?.id ?? null;
        if (currentId) setSiFormId(currentId);
      }
      if (!currentId) return;

      // Full reset: send explicit empty/null keys (as requested)
      const updated = await postSiFormUpdateApi({
        id: currentId,

        agent_cnee_id: null,
        agent_contact_id: null,
        agent_partner_id: null,

        to_be_shipped_by: null,
        from_text: null,
        to_country_id: null,
        deadline_date: null,
        header_pic: null,
        header_date: null,

        company: "",
        address1: "",
        address2: "",
        postcode: "",
        city: "",
        country_id: null,
        reg_no: "",
        email1: "",
        phone1: "",
        phone2: "",
        web: "",

        cnee1: null,
        cnee2: null,
        cnee3: null,
        cnee4: null,
        cnee5: null,
        cnee6: null,
        cnee7: null,
        cnee8: null,
        cnee9: null,
        cnee10: null,
        cnee11: null,
        cnee12: null,
        cnee_text: "",

        agents_pic: null,
        warnings: "",

        si_number_id: null,
        job_no: "",

        stock_list: [],
      });
      applySiFormResponse(updated);
    } catch (e) {
      console.error("Failed to reset SI form:", e);
    } finally {
      setIsSiFormLoading(false);
    }
  };

  const handleSaveShippingInstruction = () => {
    // Save logic here
    alert("Shipping instruction saved successfully!");
  };

  const handlePrintShippingInstruction = () => {
    const siNoLabel =
      siOptions.find((o) => Number(o.id) === Number(formData.siNo))?.name ||
      selectedSiName ||
      "";
    const printHtml = buildShippingInstructionPrintHtml(
      { ...formData, siNo: siNoLabel },
      cargoItems,
      totals
    );
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocked. Please allow popups to print.");
      return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={bgColor} minH="100vh">
      <Box px={{ base: "4", md: "6", lg: "8" }} pt={0} pb={6} mx="auto">
        {/* Header with actions */}
        <Flex justify="end" align="center" mb={1}>
          <HStack spacing={3}>
            <Button
              variant="outline"
              size="sm"
              isLoading={isSiFormLoading}
              onClick={handleResetShippingInstruction}
            >
              Reset
            </Button>
            <Button
              leftIcon={<Icon as={MdPrint} />}
              variant="outline"
              size="sm"
              onClick={handlePrintShippingInstruction}
            >
              Print
            </Button>
          </HStack>
        </Flex>

        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          INSTRUCTION / CARGO MANIFEST FOR {formData.vessel}
        </Text>

        <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={4} mb={6}>
          <Box>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={4}>
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={2}>CONSIGN TO:</Text>
                <Textarea
                  value={formData.consignBlock || ""}
                  onChange={(e) => handleInputChange("consignBlock", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  rows={8}
                  placeholder="Consignee Text will show here after you select the consignee."
                  style={{
                    background: "#cdd0d3b5",
                    borderRadius: "6px",
                    padding: "15px",
                    minHeight: "255px",
                    lineHeight: "1.4rem",
                  }}
                />
              </Box>

              <Box bg="orange.400" p={3} borderRadius="md">
                <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="siNo"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      SI NO:
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="siNo"
                      value={formData.siNo}
                      onChange={async (val) => {
                        const v = val ?? "";
                        handleInputChange("siNo", v);
                        const selectedName = v !== "" ? getOptionNameById(siOptions, v) : "";
                        setQSi(selectedName);
                        setQCnee("");

                        // When an SI number is chosen: update SI form, then render returned form
                        if (v === "") return;
                        try {
                          setIsSiFormLoading(true);
                          if (!siFormId) {
                            const latestBefore = await postSiFormApi({ latest_only: true });
                            if (latestBefore?.id) setSiFormId(latestBefore.id);
                          }
                          const currentId = siFormId ?? (await postSiFormApi({ latest_only: true }))?.id;
                          if (!currentId) return;
                          const updated = await postSiFormUpdateApi({ id: currentId, si_number_id: Number(v) });
                          applySiFormResponse(updated, { lockedSiId: v });
                        } catch (e) {
                          console.error("Failed to load SI form by SI number:", e);
                        } finally {
                          setIsSiFormLoading(false);
                        }
                      }}
                      onSearchChange={(txt) => {
                        setQSi(txt ?? "");
                        setQCnee("");
                      }}
                      prefillOnFocus={false}
                      options={siOptions}
                      displayKey="name"
                      valueKey="id"
                      size="sm"
                      bg="transparent"
                      borderColor="transparent"
                      variant="unstyled"
                      px={0}
                      py={0}
                      _focus={{ boxShadow: "none", outline: "none" }}
                      _focusVisible={{ boxShadow: "none", outline: "none" }}
                      isLoading={isOptionsLoading || isSiFormLoading}
                      style={{
                        color: "white",
                      }}
                      placeholder="Select SI number..."
                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="jobNo"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      JOB NO:
                    </FormLabel>
                    <Box bg="orange.200" px={2} py={1} borderRadius="sm">
                      <Input
                        id="jobNo"
                        value={formData.jobNo}
                        onChange={(e) => handleInputChange("jobNo", e.target.value)}
                        size="sm"
                        fontWeight="medium"
                        variant="unstyled"
                        bg="transparent"
                        color="gray.800"

                      />
                    </Box>
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="shippedBy"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      TO BE SHIPPED BY:
                    </FormLabel>
                    <Input
                      id="shippedBy"
                      value={formData.shippedBy}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("shippedBy", e.target.value);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="from"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      FROM:
                    </FormLabel>
                    <Input
                      id="from"
                      value={formData.from}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("from", e.target.value);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="to"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      TO:
                    </FormLabel>
                    <SimpleSearchableSelect
                      id="toCountryId"
                      value={formData.toCountryId}
                      onChange={(val) => {
                        const v = val ?? "";
                        headerUserEditedRef.current = true;
                        handleInputChange("toCountryId", v);
                        const selectedName =
                          Array.isArray(countryList)
                            ? (countryList.find((c) => Number(c.id) === Number(v))?.name ?? "")
                            : "";
                        handleInputChange("to", selectedName ? String(selectedName) : "");
                      }}
                      options={Array.isArray(countryList) ? countryList : []}
                      displayKey="name"
                      valueKey="id"
                      prefillOnFocus={false}
                      size="sm"
                      bg="transparent"
                      borderColor="transparent"
                      variant="unstyled"
                      px={0}
                      py={0}
                      _focus={{ boxShadow: "none", outline: "none" }}
                      _focusVisible={{ boxShadow: "none", outline: "none" }}
                      isLoading={false}
                      placeholder="Select country..."
                      style={{ color: "white" }}
                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="deadline"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      DEADLINE:
                    </FormLabel>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("deadline", e.target.value);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="pic"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      PIC:
                    </FormLabel>
                    <Input
                      id="pic"
                      value={formData.pic}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("pic", e.target.value);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"

                    />
                  </FormControl>

                  <FormControl display="contents">
                    <FormLabel
                      htmlFor="date"
                      fontWeight="bold"
                      textTransform="uppercase"
                      m={0}
                    >
                      DATE:
                    </FormLabel>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        headerUserEditedRef.current = true;
                        handleInputChange("date", e.target.value);
                      }}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                    />
                  </FormControl>
                </Grid>
              </Box>
            </Grid>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                CARGO TO BE INCLUDED IN THIS SHIPPING INSTRUCTION:
              </Text>
              <Box overflowX="auto">
                <Table variant="simple" size="sm" border="1px" borderColor="gray.300">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">ORIGIN</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">WAREHOUSE ID</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">SUPPLIER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PO NUMBER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">DG/UN NUMBER</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">PCS</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">KG</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">CBM</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">LWH</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold" bg="yellow.200">WW</Th>
                      <Th borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" fontWeight="bold">StockItemID</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {cargoItems.map((item, index) => (
                      <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.origin}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">
                          {item.warehouseId || ""}
                        </Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.supplier}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.poNumber}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.details || ""}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.boxes}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.kg.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.cbm.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.lwh}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100">{item.ww.toFixed(2)}</Td>
                        <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{item.stockItemId}</Td>
                      </Tr>
                    ))}
                    <Tr bg="gray.100" fontWeight="bold">
                      <Td colSpan={5} borderRight="1px" borderColor="gray.300" py={4} px={4} fontSize="xs">
                        CARGO TO BE SHIPPED:
                      </Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.boxes}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs">{totals.kg.toFixed(2)}</Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs"></Td>
                      <Td borderRight="1px" borderColor="gray.300" py={2} px={2} fontSize="xs" bg="yellow.100"></Td>
                      <Td py={2} px={2} fontSize="xs" borderRight="1px" borderColor="gray.300"></Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </Box>

          {/* Right Section: Select Consignee */}
          <Box bg="orange.50" p={3} border="1px" borderColor="orange.200">
            <Grid templateColumns="1fr 2fr" gap={2} fontSize="sm">
              <FormControl display="contents">
                <FormLabel htmlFor="selectConsignee" fontWeight="bold" m={0}>
                  Select Consignee:
                </FormLabel>
                <SimpleSearchableSelect
                  id="selectConsignee"
                  value={formData.selectConsignee}
                  onChange={async (val) => {
                    const v = val ?? "";
                    handleInputChange("selectConsignee", v);
                    const selectedName = v !== "" ? getOptionNameById(consigneeOptions, v) : "";
                    setQCnee(selectedName);
                    setQSi("");

                    // When a consignee is chosen: update SI form, then render returned form
                    if (v === "") return;
                    try {
                      setIsSiFormLoading(true);
                      setRequiredAgentCneeId(Number(v));

                      // Ensure we have a record id to update (latest record flow)
                      let currentId = siFormId;
                      if (!currentId) {
                        const latestBefore = await postSiFormApi({ latest_only: true });
                        currentId = latestBefore?.id ?? null;
                        if (currentId) setSiFormId(currentId);
                      }
                      if (!currentId) return;

                      const updated = await postSiFormUpdateApi({ id: currentId, agent_cnee_id: Number(v) });
                      applySiFormResponse(updated, { lockedConsigneeId: v });
                    } catch (e) {
                      console.error("Failed to load SI form by consignee:", e);
                    } finally {
                      setIsSiFormLoading(false);
                    }
                  }}
                  onSearchChange={(txt) => {
                    setQCnee(txt ?? "");
                    setQSi("");
                  }}
                  prefillOnFocus={false}
                  options={consigneeOptions}
                  displayKey="name"
                  valueKey="id"
                  size="sm"
                  bg="transparent"
                  borderColor="transparent"
                  variant="unstyled"
                  px={0}
                  py={0}
                  _focus={{ boxShadow: "none", outline: "none" }}
                  _focusVisible={{ boxShadow: "none", outline: "none" }}
                  isLoading={isOptionsLoading || isSiFormLoading}
                  placeholder="Select consignee..."
                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="company" fontWeight="bold" m={0} fontSize="sm">
                  Company:
                </FormLabel>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneeAddress1" fontWeight="bold" m={0} fontSize="sm">
                  Address 1:
                </FormLabel>
                <Input
                  id="consigneeAddress1"
                  value={formData.consigneeAddress1}
                  onChange={(e) => handleInputChange("consigneeAddress1", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneeAddress2" fontWeight="bold" m={0} fontSize="sm">
                  Address 2:
                </FormLabel>
                <Input
                  id="consigneeAddress2"
                  value={formData.consigneeAddress2}
                  onChange={(e) => handleInputChange("consigneeAddress2", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneePostcode" fontWeight="bold" m={0} fontSize="sm">
                  Post code:
                </FormLabel>
                <Input
                  id="consigneePostcode"
                  value={formData.consigneePostcode}
                  onChange={(e) => handleInputChange("consigneePostcode", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneeCity" fontWeight="bold" m={0} fontSize="sm">
                  City:
                </FormLabel>
                <Input
                  id="consigneeCity"
                  value={formData.consigneeCity}
                  onChange={(e) => handleInputChange("consigneeCity", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneeCountry" fontWeight="bold" m={0} fontSize="sm">
                  Country:
                </FormLabel>
                <Input
                  id="consigneeCountry"
                  value={formData.consigneeCountry}
                  onChange={(e) => handleInputChange("consigneeCountry", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="regNo" fontWeight="bold" m={0} fontSize="sm">
                  RegNo:
                </FormLabel>
                <Input
                  id="regNo"
                  value={formData.regNo}
                  onChange={(e) => handleInputChange("regNo", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneeEmail" fontWeight="bold" m={0} fontSize="sm">
                  E-mail 1:
                </FormLabel>
                <Input
                  id="consigneeEmail"
                  value={formData.consigneeEmail}
                  onChange={(e) => handleInputChange("consigneeEmail", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneePhone" fontWeight="bold" m={0} fontSize="sm">
                  Phone 1:
                </FormLabel>
                <Input
                  id="consigneePhone"
                  value={formData.consigneePhone}
                  onChange={(e) => handleInputChange("consigneePhone", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="consigneePhone2" fontWeight="bold" m={0} fontSize="sm">
                  Phone 2:
                </FormLabel>
                <Input
                  id="consigneePhone2"
                  value={formData.consigneePhone2 || ""}
                  onChange={(e) => handleInputChange("consigneePhone2", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="web" fontWeight="bold" m={0} fontSize="sm">
                  Web:
                </FormLabel>
                <Input
                  id="web"
                  value={formData.web}
                  onChange={(e) => handleInputChange("web", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="cneeText" fontWeight="bold" m={0} fontSize="sm" >
                  CNEE Text:
                </FormLabel>
                <Input
                  id="cneeText"
                  value={formData.cneeText}
                  onChange={(e) => handleInputChange("cneeText", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="agentsPIC" fontWeight="bold" m={0} fontSize="sm" >
                  Agents PIC:
                </FormLabel>
                <Input
                  id="agentsPIC"
                  value={formData.agentsPIC}
                  onChange={(e) => handleInputChange("agentsPIC", e.target.value)}
                  size="sm"
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>

              <FormControl display="contents">
                <FormLabel htmlFor="warnings" fontWeight="bold" m={0} fontSize="sm" >
                  Warnings:
                </FormLabel>
                <Textarea
                  id="warnings"
                  value={formData.warnings || ""}
                  onChange={(e) => handleInputChange("warnings", e.target.value)}
                  size="sm"
                  rows={2}
                  variant="unstyled"
                  bg="transparent"

                />
              </FormControl>
            </Grid>
          </Box>
        </Grid>

      </Box>
    </Box>
  );
}

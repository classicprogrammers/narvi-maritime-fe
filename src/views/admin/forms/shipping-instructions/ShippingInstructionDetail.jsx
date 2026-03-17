import React, { useEffect, useState } from "react";
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
import { MdPrint, MdSettings, MdHelpOutline, MdSave } from "react-icons/md";
import SimpleSearchableSelect from "../../../../components/forms/SimpleSearchableSelect";
import narviLogo from "../../../../assets/img/Narvi Maritime Logo2-01 (3).jpg";
import narviLetterhead from "../../../../assets/letterHead/Letterhead-sidebar.png";
import narviLetterheadWatermark from "../../../../assets/letterHead/letterhead-watermark.png";

export default function ShippingInstructionDetail() {
  const history = useHistory();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingInstruction, setShippingInstruction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");
  const bgColor = useColorModeValue("white", "gray.800");

  // Form state
  const [formData, setFormData] = useState({
    vessel: "M/V ANTHOS",
    consignBlock:
      "M/V ANTHOS\n" +
      "C/o Narvi Maritime Pte. Ltd.\n" +
      "119 Airport Cargo Road #01-03/04\n" +
      "Changi Cargo Megaplex 1\n" +
      "819454 Singapore\n" +
      "Att.: Zhi Lin GOH\n" +
      "Phone: (+65) 6542 0626\n" +
      "E-mail: spares@narvimaritime.com",
    siNo: "SI 2849 1.2",
    jobNo: "SO 2849",
    shippedBy: "AIR",
    from: "ROTTERDAM (RTM)",
    to: "SINGAPORE (SIN)",
    deadline: "27/04/25",
    pic: "IPN",
    date: "24/04/2025",
    selectConsignee: "Narvi SIN (A/F, C/F, O/F)",
    company: "C/o Narvi Maritime Pte. Ltd.",
    consigneeAddress1: "119 Airport Cargo Road #01-03/04",
    consigneeAddress2: "Changi Cargo Megaplex 1",
    consigneePostcode: "819454",
    consigneeCity: "Singapore",
    consigneeCountry: "Singapore",
    regNo: "2020082582",
    consigneeEmail: "spares@narvimaritime.com",
    consigneePhone: "(+65) 6542 0626",
    consigneePhone2: "",
    web: "www.narvimaritime.com",
    cneeText: "Ships Spares in transit for:",
    agentsPIC: "Zhi Lin GOH",
    warnings: "",
  });

  // Cargo items
  const [cargoItems, setCargoItems] = useState([
    {
      id: 1,
      origin: "PVG",
      warehouseId: "PVG-45778",
      supplier: "ATLANTIC ENG",
      poNumber: "07/1U",
      details: "",
      boxes: 1,
      kg: 1.00,
      cbm: 0.00,
      lwh: "20x13x16",
      ww: 0.69,
      stockItemId: "SL218224",
    },
    {
      id: 2,
      origin: "PVG",
      warehouseId: "PVG-45779",
      supplier: "ATLANTIC ENG",
      poNumber: "02/1U",
      details: "",
      boxes: 1,
      kg: 138.00,
      cbm: 0.16,
      lwh: "66x65x37",
      ww: 26.92,
      stockItemId: "SL218223",
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
  const handleResetShippingInstruction = () => {
    // Reset all editable fields to blank values
    setFormData({
      vessel: "",
      consignBlock: "",
      siNo: "",
      jobNo: "",
      shippedBy: "",
      from: "",
      to: "",
      deadline: "",
      pic: "",
      date: "",
      selectConsignee: "",
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
    // Reset cargo items to two empty rows so the table layout stays consistent
    setCargoItems([
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
  };

  const handleSaveShippingInstruction = () => {
    // Save logic here
    alert("Shipping instruction saved successfully!");
  };

  const handlePrintShippingInstruction = () => {
    const printHtml = buildShippingInstructionPrintHtml(formData, cargoItems, totals);
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
                      onChange={(val) => handleInputChange("siNo", val || "")}
                      options={[
                        { id: "SI 2849 1.2", name: "SI 2849 1.2" },
                        { id: "SI 2849 1.1", name: "SI 2849 1.1" },
                        { id: "SI 2850 1.0", name: "SI 2850 1.0" },
                      ]}
                      displayKey="name"
                      valueKey="name"
                      size="sm"
                      bg="transparent"
                      borderColor="transparent"
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
                        placeholder="Job number..."
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
                      onChange={(e) => handleInputChange("shippedBy", e.target.value)}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Mode of transport..."
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
                      onChange={(e) => handleInputChange("from", e.target.value)}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Origin..."
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
                    <Input
                      id="to"
                      value={formData.to}
                      onChange={(e) => handleInputChange("to", e.target.value)}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="Destination..."
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
                      onChange={(e) => handleInputChange("deadline", e.target.value)}
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
                      onChange={(e) => handleInputChange("pic", e.target.value)}
                      size="sm"
                      fontWeight="medium"
                      variant="unstyled"
                      bg="transparent"
                      color="white"
                      placeholder="PIC..."
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
                      onChange={(e) => handleInputChange("date", e.target.value)}
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
                  onChange={(val) => handleInputChange("selectConsignee", val || "")}
                  options={[
                    { id: "narvi_sin", name: "Narvi SIN (A/F, C/F, O/F)" },
                    { id: "narvi_rtm", name: "Narvi RTM (Ocean Freight)" },
                    { id: "narvi_sgn", name: "Narvi SGN (Air Freight)" },
                  ]}
                  displayKey="name"
                  valueKey="name"
                  size="sm"
                  bg="transparent"
                  borderColor="transparent"
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
                  placeholder="Company name..."
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
                  placeholder="Address line 1..."
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
                  placeholder="Address line 2..."
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
                  placeholder="Post code..."
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
                  placeholder="City..."
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
                  placeholder="Country..."
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
                  placeholder="Registration number..."
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
                  placeholder="Email..."
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
                  placeholder="Phone..."
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
                  placeholder="Phone 2..."
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
                  placeholder="Website..."
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
                  placeholder="CNEE text..."
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
                  placeholder="Agent PIC..."
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
                  placeholder="Warnings..."
                />
              </FormControl>
            </Grid>
          </Box>
        </Grid>

      </Box>
    </Box>
  );
}

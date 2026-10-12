export function isBlankStockRelation(value) {
    return value == null || value === false || String(value).trim() === "";
}

export function describeMissingClientVessel(rows) {
    const problems = [];
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
        const missingClient = isBlankStockRelation(row?.client);
        const missingVessel = isBlankStockRelation(row?.vessel);
        if (!missingClient && !missingVessel) return;
        const fields = [missingClient ? "Client" : null, missingVessel ? "Vessel" : null].filter(Boolean);
        problems.push(
            `Row ${index + 1}: ${fields.join(" and ")} ${fields.length > 1 ? "are" : "is"} required`
        );
    });
    return problems;
}

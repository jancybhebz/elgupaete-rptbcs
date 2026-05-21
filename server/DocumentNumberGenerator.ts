import { loadDatabase } from "./dbService";

export class DocumentNumberGenerator {
  /**
   * Generates a unique serial number for the designated document type category.
   * Format: PREFIX-YYYY-NUMBER (e.g. SOA-2026-00041)
   */
  static generate(documentType: string): string {
    const currentYear = new Date().getFullYear();
    let prefix = "DOC";
    
    const typeLower = documentType.toLowerCase();
    if (typeLower.includes("statement of account") || typeLower === "soa") {
      prefix = "SOA";
    } else if (typeLower.includes("receipt") || typeLower === "or") {
      prefix = "OR";
    } else if (typeLower.includes("payment order") || typeLower.includes("tax order")) {
      prefix = "TOP";
    } else if (typeLower.includes("delinquency")) {
      prefix = "DLQ";
    } else if (typeLower.includes("clearance")) {
      prefix = "TXC";
    } else if (typeLower.includes("faas")) {
      prefix = "FAA";
    } else if (typeLower.includes("declaration")) {
      prefix = "TDX";
    } else if (typeLower.includes("mutation") || typeLower.includes("transfer")) {
      prefix = "MUT";
    } else if (typeLower.includes("ledger")) {
      prefix = "LDG";
    } else if (typeLower.includes("report")) {
      prefix = "REP";
    } else if (typeLower.includes("verification")) {
      prefix = "VER";
    }

    try {
      const db = loadDatabase();
      const docs = db.generatedDocuments || [];
      
      // Filter existing docs of same type and year
      const prefixYear = `${prefix}-${currentYear}-`;
      const sameTypeDocs = docs.filter(
        (d) => d.documentNumber && d.documentNumber.startsWith(prefixYear)
      );

      let nextIndex = 1;
      if (sameTypeDocs.length > 0) {
        const indices = sameTypeDocs.map((d) => {
          const parts = d.documentNumber.split("-");
          const idxStr = parts[parts.length - 1];
          const parsed = parseInt(idxStr, 10);
          return isNaN(parsed) ? 0 : parsed;
        });
        const maxIdx = Math.max(...indices);
        nextIndex = maxIdx + 1;
      }

      const paddedNum = String(nextIndex).padStart(5, "0");
      return `${prefix}-${currentYear}-${paddedNum}`;
    } catch (err) {
      // Fallback in case of database files read conflict
      const rand = Math.floor(10000 + Math.random() * 90000);
      return `${prefix}-${currentYear}-${rand}`;
    }
  }
}

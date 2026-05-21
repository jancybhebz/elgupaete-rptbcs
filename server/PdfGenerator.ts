import fs from "fs";
import path from "path";
import crypto from "crypto";

export class PdfGenerator {
  /**
   * Render compiled HTML template and save as a persistent web-printable representation
   * on the server workspace filesystem. Calculates verification hashes to prevent falsification.
   */
  static generateFile(
    htmlContent: string,
    documentNumber: string
  ): { filePath: string; fileHash: string; fileSize: number } {
    const dirPath = path.join(process.cwd(), "writable", "documents");
    
    // Ensure parent directories exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Replace documentNumber special characters to avoid path problems
    const safeDocNumber = documentNumber.replace(/[^a-zA-Z0-9-]/g, "_");
    const fileName = `${safeDocNumber}.html`; // Web-Printable HTML Document Layout file
    const filePath = path.join(dirPath, fileName);

    // Compute cryptographic signature hash
    const hash = crypto.createHash("sha256");
    hash.update(htmlContent);
    const fileHash = hash.digest("hex");

    // Persist file definition to the workspace
    fs.writeFileSync(filePath, htmlContent, "utf-8");
    const stats = fs.statSync(filePath);

    // Return reference paths
    const relativePath = `/writable/documents/${fileName}`;

    return {
      filePath: relativePath,
      fileHash,
      fileSize: stats.size
    };
  }
}

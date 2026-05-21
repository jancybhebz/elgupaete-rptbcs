import { DocumentTemplate } from "./dbService";
import { TemplateVariableResolver } from "./TemplateVariableResolver";
import { TemplateSanitizer } from "./TemplateSanitizer";

export class TemplateRenderer {
  /**
   * Safe render assemblies combining CSS styles, headers, body, footers, custom margins,
   * orientation specs, and injecting appropriate visual watermarks.
   */
  static render(
    template: DocumentTemplate,
    variables: Record<string, any>,
    documentStatus: "draft" | "final" | "voided" | "cancelled" = "draft"
  ): string {
    // 1. Sanitize template structures
    const headerSafe = TemplateSanitizer.sanitize(template.headerHtml || "");
    const bodySafe = TemplateSanitizer.sanitize(template.bodyHtml || "");
    const footerSafe = TemplateSanitizer.sanitize(template.footerHtml || "");
    const cssSafe = template.cssStyles || "";

    // 2. Resolve variables dynamically with TemplateVariableResolver
    const headerResolved = TemplateVariableResolver.resolve(headerSafe, variables);
    const bodyResolved = TemplateVariableResolver.resolve(bodySafe, variables);
    const footerResolved = TemplateVariableResolver.resolve(footerSafe, variables);

    // 3. Inject Watermark styling if status is draft/voided/cancelled
    let watermarkHtml = "";
    if (documentStatus === "draft") {
      watermarkHtml = `
        <div style="position: fixed; top: 40%; left: 0; right: 0; font-size: 80px; font-weight: 800; font-family: sans-serif; color: rgba(239, 68, 68, 0.12); text-transform: uppercase; transform: rotate(-30deg); text-align: center; pointer-events: none; z-index: 9999;">
          DRAFT COPY
        </div>
      `;
    } else if (documentStatus === "voided") {
      watermarkHtml = `
        <div style="position: fixed; top: 40%; left: 0; right: 0; font-size: 80px; font-weight: 800; font-family: sans-serif; color: rgba(220, 38, 38, 0.16); text-transform: uppercase; transform: rotate(-30deg); text-align: center; pointer-events: none; z-index: 9999;">
          VOID / INVALID
        </div>
      `;
    } else if (documentStatus === "cancelled") {
      watermarkHtml = `
        <div style="position: fixed; top: 40%; left: 0; right: 0; font-size: 80px; font-weight: 800; font-family: sans-serif; color: rgba(100, 116, 139, 0.15); text-transform: uppercase; transform: rotate(-30deg); text-align: center; pointer-events: none; z-index: 9999;">
          CANCELLED
        </div>
      `;
    }

    // 4. Combine into single printable document with standard margin styling
    const sizeMap = {
      A4: { width: "210mm", height: "297mm" },
      Letter: { width: "215.9mm", height: "279.4mm" },
      Legal: { width: "215.9mm", height: "355.6mm" },
      Custom: { width: "215.9mm", height: "279.4mm" }
    };

    const paper = sizeMap[template.paperSize || "Letter"];
    const width = template.orientation === "landscape" ? paper.height : paper.width;
    const height = template.orientation === "landscape" ? paper.width : paper.height;

    const assembledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${template.templateName}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
      }
      .page-container {
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        height: auto !important;
        page-break-after: always;
      }
    }
    
    body {
      background-color: #f1f5f9;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      -webkit-print-color-adjust: exact;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .page-container {
      background-color: #ffffff;
      width: ${width};
      min-height: ${height};
      box-sizing: border-box;
      position: relative;
      padding: ${template.marginTop || 10}mm ${template.marginRight || 10}mm ${template.marginBottom || 10}mm ${template.marginLeft || 10}mm;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      display: flex;
      flex-direction: column;
    }

    .document-header {
      margin-bottom: 10px;
    }

    .document-body {
      flex-grow: 1;
    }

    .document-footer {
      margin-top: 15px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
    }

    ${cssSafe}
  </style>
</head>
<body>
  <div class="page-container">
    ${watermarkHtml}
    
    <div class="document-header">
      ${headerResolved}
    </div>
    
    <div class="document-body">
      ${bodyResolved}
    </div>
    
    <div class="document-footer">
      ${footerResolved}
    </div>
  </div>
</body>
</html>`;

    return assembledHtml;
  }
}

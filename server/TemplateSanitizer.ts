export class TemplateSanitizer {
  /**
   * Sanitizes template source HTML. Removes potential script injection, onload/onerror events,
   * while preserving table structures, styles, head, and custom layout styling labels.
   */
  static sanitize(html: string): string {
    if (!html) return "";

    let sanitized = html;

    // 1. Remove script tags and their inner contents
    sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");

    // 2. Remove iframe and object elements
    sanitized = sanitized.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
    sanitized = sanitized.replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "");
    sanitized = sanitized.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");

    // 3. Remove javascript: protocols inside href attributes
    sanitized = sanitized.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');

    // 4. Remove active event handlers (e.g. onload, onclick, onerror, mouseover)
    sanitized = sanitized.replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, "");
    sanitized = sanitized.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

    return sanitized;
  }

  /**
   * Encodes simple characters in user strings to safeguard against HTML disruption.
   */
  static escapeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

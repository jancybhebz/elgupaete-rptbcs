export class TemplateVariableResolver {
  /**
   * Resolves double curly brace placeholders in HTML template.
   * Supports block list loops like {{#billing_items}}...{{/billing_items}}
   */
  static resolve(templateHtml: string, data: Record<string, any>): string {
    let resolved = templateHtml;

    // 1. Process block array sections first, e.g., {{#billing_items}} ... {{/billing_items}}
    const blockRegex = /\{\{#([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    resolved = resolved.replace(blockRegex, (match, blockName, blockInnerContent) => {
      const list = data[blockName];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => {
          let itemResolved = blockInnerContent;
          // Resolve simple variables from the specific list item first
          const itemVarRegex = /\{\{([A-Za-z0-9_]+)\}\}/g;
          itemResolved = itemResolved.replace(itemVarRegex, (subMatch: string, key: string) => {
            if (key in item) {
              return String(item[key] === null || item[key] === undefined ? "" : item[key]);
            }
            // Fall back to root data if not in item
            if (key in data) {
              return String(data[key] === null || data[key] === undefined ? "" : data[key]);
            }
            return subMatch;
          });
          return itemResolved;
        }).join("\n");
      }
      return ""; // Render nothing if property is empty/not an array
    });

    // 2. Process any single variables remaining
    const singleVarRegex = /\{\{([A-Za-z0-9_]+)\}\}/g;
    resolved = resolved.replace(singleVarRegex, (match, key) => {
      if (key in data) {
        const val = data[key];
        return String(val === null || val === undefined ? "" : val);
      }
      return match; // Keep the placeholder if variable was not resolved
    });

    return resolved;
  }
}

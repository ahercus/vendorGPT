export function formatMessage(text) {
  console.log("[formatMessage] Input:", text);
  console.log("[formatMessage] Contains asterisks:", text.includes('**'));
  
  if (!text) return '';
  
  // First escape any HTML characters to prevent injection
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Use a more reliable approach for bold text
  while (formatted.includes('**')) {
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  
  // CONTACT INFORMATION FORMATTING
  // Bold names in contact lists with numbered items
  formatted = formatted.replace(/(\d+\.\s*)([^-\n]*?)(\s*-\s*Email:)/gi, '$1<b>$2</b>$3');
  
  // Bold names in various contact formats
  formatted = formatted.replace(/([A-Z][a-z]+ [A-Z][a-z]+)(\s*-\s*Email:)/g, '<b>$1</b>$2');
  
  // GENERAL MARKDOWN FORMATTING
  // LISTS FORMATTING
  // Process numbered lists (1. text)
  formatted = formatted.replace(/(\d+\.\s+[^\n]+)(\n|$)/g, '<li>$1</li>');
  
  // If we found list items, wrap them in an ordered list
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, '<ol>$&</ol>');
  }
  
  // Process bullet lists (• text)
  formatted = formatted.replace(/(•\s+[^\n]+)(\n|$)/g, '<li class="bullet">$1</li>');
  
  // If we found bullet list items, wrap them in an unordered list
  if (formatted.includes('class="bullet"')) {
    formatted = formatted.replace(/(<li class="bullet">.*?<\/li>)+/gs, '<ul>$&</ul>');
    formatted = formatted.replace(/class="bullet"/g, '');
  }
  
  // LINKS FORMATTING
  // Markdown links [text](url)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Handle direct URLs not already in a tag
  const urlPattern = /(?<!["'=])(https?:\/\/[^\s<]+)(?![^<]*>)/g;
  formatted = formatted.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // LINE BREAKS
  // Convert remaining line breaks to <br> (but not inside list items)
  formatted = formatted.replace(/\n(?!<\/?[uo]l>|<\/?li>)/g, '<br>');
  
  console.log("[formatMessage] Final output:", formatted);
  return formatted;
}
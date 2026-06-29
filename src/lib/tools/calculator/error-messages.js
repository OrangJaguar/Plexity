const PARSE_PATTERNS = [
  [/Unexpected token/i, 'Check for a missing operator, extra symbol, or unmatched parenthesis.'],
  [/Expected/i, 'Something is missing — try adding an operator, value, or closing parenthesis.'],
  [/Unexpected character/i, 'That character isn\'t allowed here. Use numbers, variables, and math symbols only.'],
  [/Unexpected token after expression/i, 'Remove extra text after the expression.'],
];

const EVAL_MAP = {
  'Division by zero': 'Cannot divide by zero.',
  'Square root of negative number': 'Square root is not defined for negative values here.',
  'Undefined variable': 'This variable hasn\'t been defined yet.',
  'Unknown function': 'That function name isn\'t recognized.',
  'Unknown identifier': 'That name isn\'t defined yet.',
};

export function humanizeError(error) {
  if (!error) return '';
  const text = String(error);

  for (const [pattern, message] of PARSE_PATTERNS) {
    if (pattern.test(text)) return message;
  }

  if (EVAL_MAP[text]) return EVAL_MAP[text];

  if (text.includes('undefined') || text.includes('Undefined')) {
    return 'Something in this expression isn\'t defined yet.';
  }

  return text.replace(/^Error:\s*/i, '').replace(/ParseError:\s*/i, '');
}

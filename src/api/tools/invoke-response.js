/**
 * Unwrap Base44 functions.invoke() — the functions axios client returns the raw
 * Axios response (interceptResponses: false), not response.data.
 */
export function unwrapFunctionInvoke(response) {
  const body = response?.data ?? response;
  if (body?.error) {
    const msg = body.error?.message ?? body.error;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }
  return body;
}

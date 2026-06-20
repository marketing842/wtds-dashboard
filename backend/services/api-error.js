/**
 * Translate an upstream/axios error into a clear, human-readable message.
 *
 * Handles the three error shapes we see from our providers:
 *   - OAuth token endpoint:  { error: "invalid_grant", error_description: "..." }
 *   - Google REST APIs:      { error: { code, message, status } }
 *   - Meta Graph API:        { error: { message, code, type } }
 *
 * Returns { error, code, detail } — `error` is safe to show to the user,
 * `code` is a stable machine token, `detail` is the raw upstream payload for logs.
 */
export function describeApiError(err, provider = 'API') {
  const resp = err.response;
  const data = resp?.data;
  const httpStatus = resp?.status;

  // OAuth token-endpoint errors come back as a plain string in `error`
  const oauthErr = typeof data?.error === 'string' ? data.error : null;
  const oauthDesc = data?.error_description;

  // Google/Meta REST errors come back as an object in `error`
  const apiErr = data?.error && typeof data.error === 'object' ? data.error : null;

  let code = 'error';
  let message;

  if (oauthErr === 'invalid_grant') {
    code = 'auth_expired';
    message = `${provider} authorization expired or was revoked — reconnect required`;
  } else if (oauthErr) {
    code = oauthErr;
    message = oauthDesc || oauthErr;
  } else if (httpStatus === 401) {
    code = 'unauthorized';
    message = apiErr?.message || `${provider} access token is invalid or expired — reconnect required`;
  } else if (httpStatus === 403) {
    code = 'forbidden';
    message = apiErr?.message || `No access to this ${provider} account — check that the connected login still has permission`;
  } else if (httpStatus === 429) {
    code = 'rate_limited';
    message = `${provider} rate limit reached — please try again in a moment`;
  } else if (apiErr?.message) {
    code = apiErr.code ?? apiErr.status ?? code;
    message = apiErr.message;
  } else if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    code = 'timeout';
    message = `${provider} request timed out — please try again`;
  } else if (httpStatus >= 500) {
    code = 'upstream_error';
    message = `${provider} is temporarily unavailable (status ${httpStatus})`;
  } else {
    message = err.message;
  }

  return { error: `${message}`, code, detail: data ?? err.message };
}

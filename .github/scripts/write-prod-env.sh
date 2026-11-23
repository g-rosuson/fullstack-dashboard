#!/usr/bin/env bash
# Write production env files from base64 secrets forwarded by the deploy workflow.
# Runs on the server, from any cwd, after git reset. Plaintext secrets stay out of git.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

backend_tmp=""
root_tmp=""
mcp_decoded_tmp=""
mcp_final_tmp=""

cleanup() {
    local path
    for path in "${backend_tmp}" "${root_tmp}" "${mcp_decoded_tmp}" "${mcp_final_tmp}"; do
        if [[ -n "${path}" && -f "${path}" ]]; then
            rm -f "${path}"
        fi
    done
}
trap cleanup EXIT

require_b64() {
    local name="$1"
    local value="$2"
    if [[ -z "${value}" ]]; then
        echo "Missing required secret ${name}" >&2
        exit 1
    fi
}

# Decode into a temp file named by $3 (a global variable). Leaves the destination untouched.
decode_b64() {
    local b64="$1"
    local label="$2"
    local holder="$3"
    local tmp
    tmp="$(mktemp)"
    printf -v "${holder}" '%s' "${tmp}"
    if ! printf '%s' "${b64}" | base64 -d > "${tmp}"; then
        echo "Failed to decode ${label}" >&2
        exit 1
    fi
    if [[ ! -s "${tmp}" ]]; then
        echo "Decoded ${label} is empty" >&2
        exit 1
    fi
    chmod 600 "${tmp}"
}

# Rewrite FPL_REFRESH_TOKEN into mcp_final_tmp. Leaves the destination untouched.
restore_refresh_token() {
    local src="$1"
    local token="$2"
    local tmp
    local line
    local found=0
    tmp="$(mktemp)"
    mcp_final_tmp="${tmp}"
    while IFS= read -r line || [[ -n "${line}" ]]; do
        if [[ "${line}" == FPL_REFRESH_TOKEN=* ]]; then
            printf 'FPL_REFRESH_TOKEN=%s\n' "${token}" >> "${tmp}"
            found=1
        else
            printf '%s\n' "${line}" >> "${tmp}"
        fi
    done < "${src}"
    if [[ "${found}" -eq 0 ]]; then
        printf 'FPL_REFRESH_TOKEN=%s\n' "${token}" >> "${tmp}"
    fi
    chmod 600 "${tmp}"
}

install_env() {
    local src="$1"
    local dest="$2"
    chmod 600 "${src}"
    mv "${src}" "${dest}"
    chmod 600 "${dest}"
}

require_b64 BACKEND_ENV_PROD_B64 "${BACKEND_ENV_PROD_B64:-}"
require_b64 ROOT_ENV_B64 "${ROOT_ENV_B64:-}"

decode_b64 "${BACKEND_ENV_PROD_B64}" "backend/.env.prod" backend_tmp
decode_b64 "${ROOT_ENV_B64}" ".env" root_tmp

if [[ -n "${MCP_ENV_B64:-}" ]]; then
    token=""
    if [[ -f mcp-backend/.env ]]; then
        while IFS= read -r line || [[ -n "${line}" ]]; do
            if [[ "${line}" == FPL_REFRESH_TOKEN=* ]]; then
                token="${line#FPL_REFRESH_TOKEN=}"
                token="${token%$'\r'}"
                break
            fi
        done < mcp-backend/.env
    fi
    decode_b64 "${MCP_ENV_B64}" "mcp-backend/.env" mcp_decoded_tmp
    if [[ -n "${token}" ]]; then
        restore_refresh_token "${mcp_decoded_tmp}" "${token}"
    fi
fi

install_env "${backend_tmp}" backend/.env.prod
backend_tmp=""
install_env "${root_tmp}" .env
root_tmp=""

if [[ -n "${MCP_ENV_B64:-}" ]]; then
    if [[ -n "${mcp_final_tmp}" ]]; then
        install_env "${mcp_final_tmp}" mcp-backend/.env
        mcp_final_tmp=""
    else
        install_env "${mcp_decoded_tmp}" mcp-backend/.env
        mcp_decoded_tmp=""
    fi
    echo "Wrote backend/.env.prod, .env, and mcp-backend/.env"
else
    echo "Wrote backend/.env.prod and .env"
fi

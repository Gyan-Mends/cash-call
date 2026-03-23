/**
 * Extracts a descriptive error message from an axios error response.
 * Avoids the generic "Request failed with status code 400" from axios.
 */
export function getErrorMessage(error: any, fallback = "An unexpected error occurred"): string {
    return (
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        (error?.message && !error?.message?.startsWith("Request failed with status")
            ? error.message
            : null) ||
        fallback
    )
}

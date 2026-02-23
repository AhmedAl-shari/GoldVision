/**
 * Shared clipboard utilities
 */

/**
 * Copy text to clipboard with error handling
 */
export async function copyToClipboard(
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to copy to clipboard";
    console.error("Failed to copy:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Copy text to clipboard with toast notification callback
 */
export async function copyToClipboardWithFeedback(
  text: string,
  onSuccess?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  const result = await copyToClipboard(text);
  if (result.success) {
    onSuccess?.();
  } else {
    onError?.(result.error || "Failed to copy");
  }
}


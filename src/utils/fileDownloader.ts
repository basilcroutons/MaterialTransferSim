/**
 * Utility to reliably download files client-side using fetch and Blob URLs.
 * This avoids cross-origin iframe cookie issues and prevents browsers like Microsoft Edge
 * from hijacking the PDF into an internal viewer instead of saving it for desktop viewers
 * like PDF-XChange Editor.
 */

export async function downloadFileBlob(url: string, filename: string, mimeType?: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': mimeType || '*/*',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawBlob = await response.blob();
    const finalBlob = mimeType ? new Blob([rawBlob], { type: mimeType }) : rawBlob;

    const objectUrl = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after a short timeout to ensure download starts
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 2000);

    return true;
  } catch (error) {
    console.error(`Failed to download ${filename} via blob:`, error);
    
    // Fallback: direct navigation download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return false;
  }
}

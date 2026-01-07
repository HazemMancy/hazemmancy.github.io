
export const saveBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;

    // Append to body to ensure it works in all browsers (e.g. Firefox requires this)
    document.body.appendChild(anchor);

    // Trigger download
    anchor.click();

    // Cleanup
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
};

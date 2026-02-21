async function exportData() {
    const data = localStorage.getItem(Storage.KEY);

    if (!data) {
        alert('No data to export');
        return;
    }

    // 1. Check if we are running on a mobile device
    if (window.Capacitor && Capacitor.isNativePlatform()) {
        try {
            const { Filesystem } = Capacitor.Plugins;

            // 2. Save the file to the Documents folder
            await Filesystem.writeFile({
                path: 'bullion_pro_backup.json',
                data: data, // JSON string
                directory: 'DOCUMENTS',
                encoding: 'utf8'
            });

            alert('Backup saved successfully to your Documents folder!');
        } catch (error) {
            console.error('Export failed', error);
            alert('Export failed: ' + error.message);
        }
    } else {
        // 3. Fallback for Web Browser (Your original code)
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bullion_pro_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

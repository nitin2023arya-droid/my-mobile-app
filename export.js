// export.js
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

async function exportData() {
    const data = localStorage.getItem(Storage.KEY);

    if (!data) {
        alert('No data to export');
        return;
    }

    const filename = 'bullion_pro_backup.json';

    if (Capacitor.isNativePlatform()) {
        try {
            await saveAndShareNative(data, filename);
            alert('Backup saved and shared successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data. Please try again.');
        }
    } else {
        // Web: trigger download via blob and anchor
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

async function saveAndShareNative(data, filename) {
    // Write the file to the device's Documents directory
    const result = await Filesystem.writeFile({
        path: filename,
        data: data,               // data is already a JSON string
        directory: Directory.Documents,
        encoding: 'utf8',          // explicitly set encoding for text
    });

    // Share the file using the native share sheet
    await Share.share({
        title: 'Export Backup',
        text: 'Your backup file is ready',
        url: result.uri,           // content:// URI that other apps can open
        dialogTitle: 'Share backup file',
    });
}

export { exportData };

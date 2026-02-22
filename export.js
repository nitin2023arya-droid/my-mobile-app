import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

async function exportData() {
    const data = localStorage.getItem(Storage.KEY);

    if (!data) {
        alert('No data to export');
        return;
    }

    if (Capacitor.isNativePlatform()) {
        try {
            const fileName = `bullion_pro_backup_${Date.now()}.json`;

            // Save file safely
            await Filesystem.writeFile({
                path: fileName,
                data: data,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
                recursive: true
            });

            const uri = await Filesystem.getUri({
                path: fileName,
                directory: Directory.Documents
            });

            // Optional: open share sheet
            await Share.share({
                title: 'Backup File',
                url: uri.uri
            });

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }

    } else {
        // Web fallback
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

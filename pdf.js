/**
 * Resolves the ledger particular string based on entry nature and action.
 */
function resolveLedgerParticular(e) {
    const metal = e.metal || '';

    if (e.nature === 'Round-off') return 'Round-off Adjustment';

    if (e.nature === 'Sauda') {
        if (e.action === 'Purchase (IN)') return `${metal} Purchase – Booked`;
        if (e.action === 'Sale (OUT)') return `${metal} Sale – Booked`;
    }

    if (e.nature === 'Physical' && (!e.amount || Number(e.amount) === 0)) {
        if (e.action === 'Purchase (IN)') return `${metal} Received – Weight`;
        if (e.action === 'Sale (OUT)') return `${metal} Paid – Weight`;
    }

    if (e.nature === 'Physical' && Number(e.amount) > 0) {
        if (e.action === 'Purchase (IN)') return `${metal} Purchase`;
        if (e.action === 'Sale (OUT)') return `${metal} Sale`;
    }

    if (e.nature === 'Paid') {
        if (e.action === 'Purchase (IN)') return `${metal} Purchase – Booked Paid`;
        if (e.action === 'Sale (OUT)') return `${metal} Sale – Booked Paid`;
    }

    if (e.nature === 'Settle') return 'Sauda Settlement';

    if (e.nature === 'Cash') {
        return e.type === 'Cash Paid' ? 'Cash Paid' : 'Cash Received';
    }

    return `${metal} ${e.action || e.type || ''}`.trim();
}

/**
 * Generates the PDF and handles Native Sharing (Android) or Browser Download.
 */
async function exportCustomerPDF(customerId) {
    const fromDate = document.getElementById('pdf-from')?.value;
    const toDate = document.getElementById('pdf-to')?.value;

    if (!toDate) {
        alert('Please select end date');
        return;
    }

    const from = fromDate ? new Date(fromDate) : null;
    const to = new Date(toDate);
    to.setHours(23, 59, 59);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const db = Storage.get();
    const customer = db.find(c => c.id === customerId);
    if (!customer) return;

    const filteredEntries = customer.entries.filter(e => {
        const d = new Date(e.date.split('/').reverse().join('-'));
        if (from && d < from) return false;
        return d <= to;
    });

    const snapshotCustomer = { ...customer, entries: filteredEntries };
    const bal = Engine.calculate(snapshotCustomer);

    let y = 10;

    /* ================= HEADER ================= */
    doc.setFontSize(12);
    doc.text('FIRM NAME', 105, y, { align: 'center' });
    y += 6;
    doc.setFontSize(14);
    doc.text('Bullion Account Statement', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Customer : ${customer.name}`, 10, y);
    doc.text(`Period   : ${fromDate || 'Start'} to ${toDate}`, 120, y);
    y += 6;
    doc.line(10, y, 200, y);
    y += 6;

    /* ================= ACCOUNT SUMMARY ================= */
    let openingCash = 0;
    if (fromDate && from) {
        const entriesBeforePeriod = customer.entries.filter(e => {
            const d = new Date(e.date.split('/').reverse().join('-'));
            return d < from;
        });
        const balBeforePeriod = Engine.calculate({ ...customer, entries: entriesBeforePeriod });
        openingCash = balBeforePeriod.cash;
    }

    doc.setFontSize(12);
    doc.text('ACCOUNT SUMMARY', 10, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Opening Cash Balance : Rs. ${Math.abs(openingCash).toLocaleString()} ${openingCash >= 0 ? 'Cr' : 'Dr'}`, 10, y);
    y += 5;
    doc.text(`Gold Balance   : ${(bal.gold.Premium + bal.gold.Mcx + bal.gold.Weight).toFixed(3)} gms`, 10, y);
    y += 5;
    doc.text(`Silver Balance : ${(bal.silver.Premium + bal.silver.Mcx + bal.silver.Weight).toFixed(3)} gms`, 10, y);
    y += 8;

    /* ================= PENDING SAUDA ================= */
    doc.setFontSize(12);
    doc.text('PENDING SAUDA', 10, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('Date', 10, y);
    doc.text('Metal', 35, y);
    doc.text('Type', 65, y);
    doc.text('Booked (gms)', 95, y);
    doc.text('Pending (gms)', 130, y);
    doc.text('Bhav', 170, y);
    y += 4;
    doc.line(10, y, 200, y);
    y += 4;

    const pendingSauda = filteredEntries.filter(e => e.nature === 'Sauda' && ui.getSaudaPendingWeight(customer, e.id) > 0);
    if (!pendingSauda.length) {
        doc.text('No pending sauda', 10, y);
        y += 6;
    } else {
        pendingSauda.forEach(s => {
            const pending = ui.getSaudaPendingWeight(customer, s.id);
            doc.text(s.date, 10, y);
            doc.text(s.metal, 35, y);
            doc.text(s.action, 65, y);
            doc.text(`${Number(s.weight).toFixed(3)} gms`, 95, y);
            doc.text(`${pending.toFixed(3)} gms`, 130, y);
            doc.text(`Rs. ${s.bhav.toLocaleString()}`, 170, y);
            y += 5;
        });
    }
    y += 6;

    /* ================= LEDGER DETAILS ================= */
    doc.setFontSize(12);
    doc.text('LEDGER DETAILS', 10, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('Date', 10, y);
    doc.text('Particulars', 32, y);
    doc.text('Weight', 78, y);
    doc.text('Final Bhav', 102, y);
    doc.text('Dr (Rs.)', 130, y);
    doc.text('Cr (Rs.)', 150, y);
    doc.text('Balance', 172, y);
    y += 4;
    doc.line(10, y, 200, y);
    y += 4;

    let runningCash = openingCash;
    doc.text(fromDate || '-', 10, y);
    doc.text('Opening Balance', 32, y);
    doc.text(`Rs. ${Math.abs(runningCash).toLocaleString()} ${runningCash >= 0 ? 'Cr' : 'Dr'}`, 172, y);
    y += 5;

    const sortedEntries = [...filteredEntries].sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
    });

    sortedEntries.forEach(e => {
        let dr = '', cr = '', amount = 0;
        
        if (e.nature === 'Cash') {
            amount = Number(e.amount) || 0;
            if (e.type === 'Cash Paid') { cr = amount; runningCash += amount; }
            else { dr = amount; runningCash -= amount; }
        } else if (e.nature === 'Physical' || e.nature === 'Paid') {
            amount = Number(e.amount) || 0;
            if (e.action === 'Sale (OUT)') { cr = amount; runningCash += amount; }
            else { dr = amount; runningCash -= amount; }
        } else if (e.nature === 'Settle') {
            amount = Number(e.amount) || 0;
            if (e.cashEffect?.includes('Cash CR')) { cr = amount; runningCash += amount; }
            else { dr = amount; runningCash -= amount; }
        }

        doc.text(e.date, 10, y);
        doc.text(resolveLedgerParticular(e), 32, y);
        doc.text(e.weight ? `${Number(e.weight).toFixed(3)}` : '', 78, y);
        doc.text(e.bhav ? e.bhav.toString() : '', 102, y);
        doc.text(dr ? dr.toLocaleString() : '', 130, y);
        doc.text(cr ? cr.toLocaleString() : '', 150, y);
        doc.text(`Rs. ${Math.abs(runningCash).toLocaleString()} ${runningCash >= 0 ? 'Cr' : 'Dr'}`, 172, y);
        
        y += 5;
        if (y > 270) { doc.addPage(); y = 10; }
    });

    /* ================= CLOSING POSITION ================= */
    y += 10;
    doc.setFontSize(12);
    doc.text(`CLOSING POSITION`, 10, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Cash Balance   : Rs. ${Math.abs(runningCash).toLocaleString()} ${runningCash >= 0 ? 'Cr' : 'Dr'}`, 10, y);
    y += 5;
    doc.text(`Gold Balance   : ${(bal.gold.Premium + bal.gold.Mcx + bal.gold.Weight).toFixed(3)} gms`, 10, y);
    y += 5;
    doc.text(`Silver Balance : ${(bal.silver.Premium + bal.silver.Mcx + bal.silver.Weight).toFixed(3)} gms`, 10, y);

    /* ================= FINAL ACTION: SHARE OR SAVE ================= */
    const fileName = `${customer.name.replace(/\s+/g, '_')}_Account.pdf`;

    if (window.Capacitor && Capacitor.isNativePlatform()) {
        try {
            const { Filesystem, Share } = Capacitor.Plugins;
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: 'CACHE'
            });

            await Share.share({
                title: 'Account Statement',
                text: `Bullion statement for ${customer.name}`,
                url: savedFile.uri,
                dialogTitle: 'Share PDF via...'
            });
        } catch (err) {
            alert("Native Export Error: " + err.message);
        }
    } else {
        doc.save(fileName);
    }

    ui.closeModal();
}

Ui.openPdfModal = function (customerId) {
    const m = document.getElementById('modal-container');
    m.classList.remove('hidden');

    const today = new Date().toISOString().split('T')[0];

    m.innerHTML = `
        <div class="modal" style="max-width:350px; padding: 20px; border-radius: 12px; background: white;">
            <h3 style="margin-top:0">Account Report</h3>
            
            <div style="margin-bottom:10px">
                <label style="display:block; font-size:12px; color:#666">From Date</label>
                <input type="date" id="pdf-from" style="width:100%; padding:8px; margin-top:4px">
            </div>

            <div style="margin-bottom:10px">
                <label style="display:block; font-size:12px; color:#666">To Date</label>
                <input type="date" id="pdf-to" value="${today}" style="width:100%; padding:8px; margin-top:4px">
            </div>

            <div class="flex gap-1" style="margin-top:20px; display:flex; justify-content: flex-end;">
                <button class="btn" style="background:#eee; margin-right:8px" onclick="ui.closeModal()">Cancel</button>
                <button class="btn" style="background:#3880ff; color:white" onclick="generateAndSharePDF('${customerId}')">
                    Generate & Share
                </button>
            </div>
        </div>
    `;
};

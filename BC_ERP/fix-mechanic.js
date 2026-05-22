const fs = require('fs');

const logicFile = 'Management/src/pages/mechanic/logic.js';
let original = fs.readFileSync(logicFile, 'utf8');

const buildJobCardTop = `function buildJobCard(job, myId, canApproveQC) {
    const isLead = job.lead_mechanic_id === myId
    const statusInfo = getStatusInfo(job.status)
    const qcStatus = getQcStatus(job)

    // QC images (parse if stored as JSON array or comma-separated URLs)
    const qcImages = parseQcImages(job.qc_images)
    const qcImagesHtml = qcImages.length > 0
        ? \`<div class="qc-images-preview">\${qcImages.map(url => \`<img src="\${escHtml(url)}" alt="QC" onclick="viewImage('\${escHtml(url)}')">\`).join('')}</div>\`
        : ''

    const qcApprovalBtn = (canApproveQC || isLead) && qcImages.length > 0 && !job.qc_approved_by
        ? \`<button class="btn-qc btn-qc-approve" data-jobid="\${job.id}" data-action="approve-qc">
               <span class="material-icons-outlined" style="font-size:0.9rem;">verified</span> อนุมัติ QC
           </button>\`
        : ''

    const qcSubmitBtn = \`<button class="btn-qc btn-qc-submit" data-jobid="\${job.id}" data-action="open-qc">
        <span class="material-icons-outlined" style="font-size:0.9rem;">photo_camera</span>
        \${qcImages.length > 0 ? 'ดู/เพิ่มรูป QC' : 'ส่ง QC'}
    </button>\`

    return \`
    <div class="job-card" id="job-card-\${job.id}">
        <div class="job-card-top">
            <div>
                <div class="job-no">\${escHtml(job.job_no || job.id)}</div>
                <div class="job-customer">
                    <span class="material-icons-outlined" style="font-size:0.8rem;vertical-align:text-bottom;">person</span>
                    \${escHtml(job.customer_name || '(ไม่ระบุลูกค้า)')}
                </div>
            </div>
            <div class="job-plate">\${escHtml(job.plate || '—')}</div>
        </div>`;

const startIndex = original.indexOf("function buildJobCard(job, myId, canApproveQC) {");
const endIndex = original.indexOf('<div class="job-plate">', startIndex);

if (startIndex >= 0 && endIndex >= 0) {
    const before = original.substring(0, startIndex);
    const after = original.substring(endIndex + '<div class="job-plate">${escHtml(job.plate || \'—\')}</div>\n        </div>'.length);
    const newContent = before + buildJobCardTop + after;
    fs.writeFileSync(logicFile, newContent, 'utf8');
    console.log("Fixed logic.js!");
} else {
    console.log("Could not find boundaries.");
}

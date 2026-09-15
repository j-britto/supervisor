import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports the Review Data Table into a beautifully formatted, high-readability PDF
 * respecting the batch grouping structure and enlarged typography.
 */
export function exportReviewsToPDF({
  reviewNumber = 1,
  reviewName = 'Title & Abstract',
  batchList = [],
  getBatchData,
  searchQuery = '',
  statusFilter = 'ALL',
  batchFilter = 'ALL'
}) {
  // Initialize PDF in landscape mode for maximum horizontal column readability
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner & Institution Title
  doc.setFillColor(30, 63, 166); // Royal Blue #1E3FA6
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Institution & Department Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING', 14, 11);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 230, 255);
  doc.text('PROJECT SUPERVISION & REVIEW MANAGEMENT SYSTEM (PSMS)', 14, 18);

  // Review & Date Sub-header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  const reviewHeading = `REVIEW ${reviewNumber}: ${reviewName.toUpperCase()}`;
  doc.text(reviewHeading, pageWidth - 14, 12, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  const dateStr = `Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  doc.text(dateStr, pageWidth - 14, 19, { align: 'right' });

  // 2. Summary Filter Chips Bar
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Batches: ${batchList.length}`, 14, 34);

  doc.setFont('helvetica', 'normal');
  const filterSummary = `Filter: Status [${statusFilter}] • Batch [${batchFilter}] ${searchQuery ? `• Search: "${searchQuery}"` : ''}`;
  doc.text(filterSummary, pageWidth - 14, 34, { align: 'right' });

  // 3. Prepare Table Rows Respecting Batch Grouping
  const tableData = batchList.map(batch => {
    const { batchNumber, student1, student2, project } = batch;
    const {
      projectStatus,
      reviewStatus,
      evalDate,
      teamMark,
      isOver
    } = getBatchData(batch);

    // Format students with stacked clean names (Enlarged & Bold)
    const studentsNames = [student1?.name, student2?.name].filter(Boolean).join('\n');

    const projectTitle = project?.project_title || 'No Project Assigned';
    const markDisplay = `${teamMark !== undefined ? teamMark : '-'} / 10`;
    const overDisplay = isOver ? 'OVER (Done)' : 'Pending';

    return [
      `Batch ${batchNumber}`,
      studentsNames || 'No Students',
      projectTitle,
      projectStatus || 'In Progress',
      reviewStatus || 'Pending',
      evalDate || '-',
      markDisplay,
      overDisplay
    ];
  });

  // 4. Generate AutoTable with Enhanced Font Readability
  autoTable(doc, {
    startY: 38,
    margin: { left: 14, right: 14, bottom: 25 },
    head: [[
      'Batch',
      'Students (Batch Team)',
      'Project Title',
      'Project Status',
      'Review Status',
      'Evaluate Date',
      'Team Mark',
      'Evaluation Status'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10.5,
      cellPadding: 4,
      halign: 'left',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 10, // Enlarged readability
      textColor: [30, 41, 59], // Slate 800
      fontStyle: 'normal',
      cellPadding: 4,
      valign: 'middle',
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate 50
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 26, textColor: [30, 63, 166] }, // Batch
      1: { fontStyle: 'bold', cellWidth: 50, textColor: [15, 23, 42] }, // Students
      2: { cellWidth: 62 }, // Project Title
      3: { cellWidth: 30, halign: 'center' }, // Project Status
      4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, // Review Status
      5: { cellWidth: 28, halign: 'center' }, // Evaluate Date
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, // Mark
      7: { cellWidth: 28, halign: 'center', fontStyle: 'bold' } // Over / Done
    },
    didParseCell: function(data) {
      // Custom styling for status columns
      if (data.section === 'body') {
        if (data.column.index === 4) { // Review Status
          if (data.cell.raw === 'Completed') {
            data.cell.styles.textColor = [16, 149, 106]; // Emerald
          } else if (data.cell.raw === 'Pending') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber
          }
        }
        if (data.column.index === 7) { // Over Status
          if (String(data.cell.raw).includes('OVER')) {
            data.cell.styles.textColor = [5, 150, 105]; // Green
          } else {
            data.cell.styles.textColor = [100, 116, 139]; // Slate
          }
        }
      }
    },
    didDrawPage: function(data) {
      // Footer on every page
      const currentHeight = doc.internal.pageSize.getHeight();
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        'StudyPulse AI — Autonomous Project Supervision & Review System',
        14,
        currentHeight - 10
      );

      // Page numbers
      const pageNumberStr = `Page ${doc.internal.getCurrentPageInfo().pageNumber}`;
      doc.text(pageNumberStr, pageWidth - 14, currentHeight - 10, { align: 'right' });

      // Reviewer / Coordinator Signatures row on the bottom
      doc.setDrawColor(203, 213, 225);
      doc.line(pageWidth - 110, currentHeight - 15, pageWidth - 60, currentHeight - 15);
      doc.line(pageWidth - 50, currentHeight - 15, pageWidth - 14, currentHeight - 15);

      doc.setFontSize(8);
      doc.text('Reviewer Signature', pageWidth - 85, currentHeight - 11, { align: 'center' });
      doc.text('HOD / Coordinator', pageWidth - 32, currentHeight - 11, { align: 'center' });
    }
  });

  // Save the generated PDF
  const filename = `Review_${reviewNumber}_Evaluation_Batch_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export default {
  exportReviewsToPDF
};

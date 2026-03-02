import jsPDF from 'jspdf';

// ============================================================================
// PDF GENERATOR WITH DYNAMIC SCHOOL BRANDING
// ============================================================================

/**
 * Convert image URL to base64 for PDF embedding
 */
const getImageBase64 = async (imageUrl) => {
  if (!imageUrl) return null;
  
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image for PDF:', error);
    return null;
  }
};

/**
 * Convert SVG URL to base64 PNG for PDF
 */
const getSvgAsBase64 = async (svgUrl) => {
  try {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width || 100;
        canvas.height = img.height || 100;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
    });
  } catch (error) {
    console.error('Error converting SVG:', error);
    return null;
  }
};

/**
 * Get logo as base64 (handles both PNG and SVG)
 */
const getLogoBase64 = async (logoUrl) => {
  if (!logoUrl) return null;
  
  if (logoUrl.endsWith('.svg')) {
    return getSvgAsBase64(logoUrl);
  }
  return getImageBase64(logoUrl);
};

/**
 * Generate test bundle (student test + answer key)
 * @param {Object} testData - Test data
 * @param {Object} branding - School branding from usePdfBranding()
 * @param {boolean} shuffle - Shuffle questions
 */
export const generateTestBundle = async (testData, branding, shuffle = false) => {
  const logo = branding?.showLogo ? await getLogoBase64(branding.logoUrl) : null;
  
  let questions = [...testData.questions];
  if (shuffle) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  const dataWithBranding = { ...testData, questions, branding };

  // Student Test
  const studentDoc = new jsPDF();
  await generateStudentTest(studentDoc, dataWithBranding, logo);

  // Answer Key
  const answerDoc = new jsPDF();
  await generateAnswerKey(answerDoc, dataWithBranding, logo);

  return {
    studentTest: studentDoc,
    answerKey: answerDoc
  };
};

/**
 * Generate student test PDF
 */
const generateStudentTest = async (doc, testData, logo) => {
  const branding = testData.branding || getDefaultBranding();
  const { r: pr, g: pg, b: pb } = branding.primaryRgb || { r: 16, g: 185, b: 129 };
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header with Logo
  if (logo && branding.showLogo) {
    doc.addImage(logo, 'PNG', margin, y, 20, 20);
  }
  
  // School Name (dynamic)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(branding.headerText || branding.schoolName || 'School', logo ? margin + 25 : margin, y + 8);

  // Tagline if exists
  if (branding.tagline) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(branding.tagline, logo ? margin + 25 : margin, y + 13);
  }

  // Line separator
  y += 20;
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // Test Title
  y += 8;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(testData.title, pageWidth / 2, y, { align: 'center' });

  // Test Info Box (uses primary color with transparency)
  y += 8;
  doc.setFillColor(pr, pg, pb, 0.1);
  doc.setFillColor(239, 246, 255); // Light blue background
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  const infoY = y + 7;
  doc.text(`Subject: ${testData.subject}`, margin + 5, infoY);
  doc.text(`Class: ${testData.className}`, margin + 70, infoY);
  doc.text(`Date: ${formatDate(testData.date)}`, margin + 120, infoY);

  doc.text(`Duration: ${testData.duration} minutes`, margin + 5, infoY + 6);
  doc.text(`Total Points: ${testData.totalPoints}`, margin + 70, infoY + 6);
  doc.text(`Teacher: ${testData.teacherName}`, margin + 120, infoY + 6);

  // Student Info Fields
  y += 28;
  doc.setFontSize(8);
  doc.text('Name: ___________________________', margin, y);
  doc.text('Score: _______ / ' + testData.totalPoints, pageWidth - margin - 60, y);

  // Instructions
  y += 12;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Instructions:', margin + 5, y + 6);
  doc.setFont('helvetica', 'normal');

  const instructions = doc.splitTextToSize(testData.instructions, pageWidth - 2 * margin - 10);
  doc.text(instructions, margin + 5, y + 11);

  // Questions
  y += 24;

  testData.questions.forEach((q, index) => {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
      
      // Add header on new page
      doc.setFontSize(9);
      doc.setTextColor(pr, pg, pb);
      doc.text(branding.headerText || branding.schoolName, margin, y);
      doc.setTextColor(100, 100, 100);
      doc.text(`${testData.title} - Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
      y += 10;
    }

    // Question number and text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`${index + 1}.`, margin, y);

    doc.setFont('helvetica', 'normal');
    const questionText = doc.splitTextToSize(q.question, pageWidth - 2 * margin - 10);
    doc.text(questionText, margin + 7, y);

    y += questionText.length * 4.5 + 3;

    // Options for multiple choice
    if (q.type === 'multiple_choice') {
      doc.setFontSize(9);
      ['A', 'B', 'C', 'D'].forEach(letter => {
        if (q.options[letter]) {
          const optionText = doc.splitTextToSize(`${letter}) ${q.options[letter]}`, pageWidth - 2 * margin - 15);
          doc.text(optionText, margin + 10, y);
          y += optionText.length * 4.5 + 2;
        }
      });
      y += 4;
    } else if (q.type === 'true_false') {
      doc.setFontSize(9);
      doc.text('○ True    ○ False', margin + 10, y);
      y += 8;
    } else {
      // Answer space for other types
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + 10, y + 4, pageWidth - margin - 10, y + 4);
      doc.line(margin + 10, y + 10, pageWidth - margin - 10, y + 10);
      if (q.type === 'essay') {
        doc.line(margin + 10, y + 16, pageWidth - margin - 10, y + 16);
        y += 22;
      } else {
        y += 16;
      }
    }

    // Points
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text(`(${q.points} points)`, pageWidth - margin - 30, y - questionText.length * 4.5 - 3);
    doc.setTextColor(31, 41, 55);
  });

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      branding.footerText || `© ${new Date().getFullYear()} ${branding.schoolName}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Save with custom filename
  const sanitizedTitle = testData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = formatDateForFilename(testData.date);
  doc.save(`${sanitizedTitle}_${dateStr}_student.pdf`);
};

/**
 * Generate answer key PDF
 */
const generateAnswerKey = async (doc, testData, logo) => {
  const branding = testData.branding || getDefaultBranding();
  const { r: pr, g: pg, b: pb } = branding.primaryRgb || { r: 16, g: 185, b: 129 };
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header with Logo
  if (logo && branding.showLogo) {
    doc.addImage(logo, 'PNG', margin, y, 15, 15);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(branding.headerText || branding.schoolName || 'School', logo ? margin + 20 : margin, y + 10);

  // Line separator
  y += 22;
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // ANSWER KEY Title (red warning)
  y += 8;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('ANSWER KEY - TEACHER COPY', pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text(testData.title, pageWidth / 2, y, { align: 'center' });

  // Test Info (red background for answer key)
  y += 8;
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  doc.text(`Subject: ${testData.subject}`, margin + 5, y + 7);
  doc.text(`Class: ${testData.className}`, margin + 70, y + 7);
  doc.text(`Date: ${formatDate(testData.date)}`, margin + 120, y + 7);
  doc.text(`Total Points: ${testData.totalPoints}`, margin + 5, y + 13);

  // Answers
  y += 24;

  testData.questions.forEach((q, index) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
      
      // Header on new page
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text('ANSWER KEY', margin, y);
      doc.setTextColor(100, 100, 100);
      doc.text(`${testData.title} - Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
      y += 10;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`${index + 1}.`, margin, y);

    doc.setFont('helvetica', 'normal');
    const questionText = doc.splitTextToSize(q.question, pageWidth - 2 * margin - 20);
    doc.text(questionText, margin + 7, y);

    y += questionText.length * 4.5 + 3;

    // Answer
    let answerText = '';
    let answerHeight = 9;

    if (q.type === 'multiple_choice') {
      const letter = q.correctAnswer;
      const fullAnswer = q.options[letter];
      answerText = `${letter}) ${fullAnswer}`;
      answerHeight = Math.max(9, Math.ceil(answerText.length / 80) * 5 + 4);
    } else {
      answerText = q.correctAnswer || 'No answer provided';
      answerHeight = Math.max(9, Math.ceil(answerText.length / 80) * 5 + 4);
    }

    // Green answer box
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin + 10, y, pageWidth - 2 * margin - 20, answerHeight, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('Answer: ', margin + 12, y + 6);

    doc.setFont('helvetica', 'normal');
    const wrappedAnswer = doc.splitTextToSize(answerText, pageWidth - 2 * margin - 45);
    doc.text(wrappedAnswer, margin + 28, y + 6);

    doc.setTextColor(31, 41, 55);
    y += answerHeight + 4;
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('CONFIDENTIAL - TEACHER USE ONLY', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save
  const sanitizedTitle = testData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = formatDateForFilename(testData.date);
  doc.save(`${sanitizedTitle}_${dateStr}_answer_key.pdf`);
};

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateForFilename = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '_');
};

const getDefaultBranding = () => ({
  schoolName: 'School',
  headerText: 'School',
  footerText: '',
  showLogo: true,
  primaryRgb: { r: 16, g: 185, b: 129 },
  secondaryRgb: { r: 13, g: 148, b: 136 },
});

export default generateTestBundle;
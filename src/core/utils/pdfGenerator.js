import jsPDF from 'jspdf';

// ============================================================================
// PDF GENERATOR v2 - Production Level with Dynamic School Branding
// ============================================================================

/**
 * Convert image URL to base64 for PDF embedding
 * Returns { data, width, height } or null
 */
const getImageBase64 = async (imageUrl) => {
  if (!imageUrl) return null;
  
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          resolve({
            data: canvas.toDataURL('image/png'),
            width: canvas.width,
            height: canvas.height,
          });
        } catch (e) {
          console.error('Canvas error:', e);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load image:', imageUrl);
        resolve(null);
      };
      
      const separator = imageUrl.includes('?') ? '&' : '?';
      img.src = `${imageUrl}${separator}t=${Date.now()}`;
    });
  } catch (error) {
    console.error('Error loading image for PDF:', error);
    return null;
  }
};

/**
 * Convert SVG URL to base64 PNG for PDF
 * Returns { data, width, height } or null
 */
const getSvgAsBase64 = async (svgUrl) => {
  try {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxSize = 200;
        let width = img.width || maxSize;
        let height = img.height || maxSize;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve({
          data: canvas.toDataURL('image/png'),
          width: width,
          height: height,
        });
      };
      
      img.onerror = () => {
        console.error('Failed to convert SVG');
        resolve(null);
      };
      
      const encodedSvg = btoa(unescape(encodeURIComponent(svgText)));
      img.src = `data:image/svg+xml;base64,${encodedSvg}`;
    });
  } catch (error) {
    console.error('Error converting SVG:', error);
    return null;
  }
};

/**
 * Get logo as base64 (handles PNG, JPG, SVG)
 */
const getLogoBase64 = async (logoUrl) => {
  if (!logoUrl) return null;
  
  console.log('📷 Loading logo:', logoUrl);
  
  const lowerUrl = logoUrl.toLowerCase();
  if (lowerUrl.endsWith('.svg') || lowerUrl.includes('.svg?')) {
    return getSvgAsBase64(logoUrl);
  }
  
  return getImageBase64(logoUrl);
};

/**
 * Hex to RGB converter
 */
const hexToRgb = (hex) => {
  if (!hex) return { r: 16, g: 185, b: 129 }; // Default emerald
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 16, g: 185, b: 129 };
};

/**
 * Format date nicely
 */
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format date for filename
 */
const formatDateForFilename = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Sanitize text for filename
 */
const sanitizeFilename = (text) => {
  return (text || 'test').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
};

/**
 * Clean school name - remove trailing pipes and special chars
 */
const cleanSchoolName = (name) => {
  if (!name) return '';
  return name
    .replace(/\s*\|\s*$/, '')  // Remove trailing pipe
    .replace(/\s+/g, ' ')       // Normalize spaces
    .trim();
};

/**
 * Sanitize text for PDF - remove problematic Unicode characters
 * jsPDF default fonts only support basic Latin characters
 */
const sanitizeTextForPdf = (text) => {
  if (!text) return '';
  
  // Convert to string if not already
  let str = String(text);
  
  // Serbian/Croatian Latin special characters → ASCII equivalents
  const latinMap = {
    'ć': 'c', 'Ć': 'C',
    'č': 'c', 'Č': 'C',
    'đ': 'dj', 'Đ': 'Dj',
    'š': 's', 'Š': 'S',
    'ž': 'z', 'Ž': 'Z',
    // Other common European characters
    'ä': 'a', 'Ä': 'A',
    'ö': 'o', 'Ö': 'O',
    'ü': 'u', 'Ü': 'U',
    'ß': 'ss',
    'ñ': 'n', 'Ñ': 'N',
    'ø': 'o', 'Ø': 'O',
    'æ': 'ae', 'Æ': 'AE',
    'å': 'a', 'Å': 'A',
    'é': 'e', 'É': 'E',
    'è': 'e', 'È': 'E',
    'ê': 'e', 'Ê': 'E',
    'ë': 'e', 'Ë': 'E',
    'à': 'a', 'À': 'A',
    'â': 'a', 'Â': 'A',
    'á': 'a', 'Á': 'A',
    'ù': 'u', 'Ù': 'U',
    'û': 'u', 'Û': 'U',
    'ú': 'u', 'Ú': 'U',
    'î': 'i', 'Î': 'I',
    'ï': 'i', 'Ï': 'I',
    'í': 'i', 'Í': 'I',
    'ì': 'i', 'Ì': 'I',
    'ô': 'o', 'Ô': 'O',
    'ó': 'o', 'Ó': 'O',
    'ò': 'o', 'Ò': 'O',
    'ý': 'y', 'Ý': 'Y',
    'ÿ': 'y', 'Ÿ': 'Y',
    'ł': 'l', 'Ł': 'L',
    'ń': 'n', 'Ń': 'N',
    'ą': 'a', 'Ą': 'A',
    'ę': 'e', 'Ę': 'E',
    'ź': 'z', 'Ź': 'Z',
    'ż': 'z', 'Ż': 'Z',
  };
  
  // Replace special characters with ASCII equivalents
  for (const [from, to] of Object.entries(latinMap)) {
    str = str.split(from).join(to);
  }
  
  return str
    // Remove emojis
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Remove other invisible/control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove combining marks that might cause spacing issues
    .replace(/[\u0300-\u036F]/g, '')
    // Replace non-breaking spaces with regular spaces
    .replace(/\u00A0/g, ' ')
    // Replace various Unicode spaces with regular space
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    .trim();
};

// ============================================================================
// MAIN EXPORT - Generate Test Bundle
// ============================================================================

/**
 * Generate test bundle (student test + answer key)
 * 
 * @param {Object} testData - Test information and questions
 * @param {boolean} shuffle - Whether to shuffle questions
 * @returns {Object} { studentTest, answerKey } - jsPDF documents
 * 
 * @example
 * // In your component:
 * import { useBranding } from '../context/BrandingContext';
 * 
 * const { name, logoUrl, primaryColor, tagline, pdfHeaderText, pdfFooterText, showLogoInPdf } = useBranding();
 * 
 * await generateTestBundle({
 *   ...testData,
 *   schoolName: name,
 *   logoUrl,
 *   primaryColor,
 *   tagline,
 *   pdfHeaderText,
 *   pdfFooterText,
 *   showLogoInPdf,
 * }, shuffle);
 */
export const generateTestBundle = async (testData, shuffle = false) => {
  console.log('📄 Generating PDF with branding:', {
    schoolName: testData.schoolName,
    logoUrl: testData.logoUrl,
    primaryColor: testData.primaryColor,
  });
  
  // Extract branding from testData
  const branding = {
    schoolName: cleanSchoolName(testData.schoolName) || 'School',
    logoUrl: testData.logoUrl || null,
    primaryColor: testData.primaryColor || '#10b981',
    headerText: cleanSchoolName(testData.pdfHeaderText || testData.schoolName) || 'School',
    footerText: testData.pdfFooterText || '',
    showLogo: testData.showLogoInPdf !== false,
    tagline: testData.tagline || '',
  };
  
  // Convert primary color to RGB
  const primaryRgb = hexToRgb(branding.primaryColor);
  
  // Load logo with dimensions
  const logoData = branding.showLogo ? await getLogoBase64(branding.logoUrl) : null;
  console.log('📷 Logo loaded:', logoData ? `Yes ✅ (${logoData.width}x${logoData.height})` : 'No ❌');
  
  // Shuffle questions if requested
  let questions = [...(testData.questions || [])];
  if (shuffle) {
    questions = questions.sort(() => Math.random() - 0.5);
  }
  
  // Recalculate points per question
  const totalPoints = testData.totalPoints || 100;
  const pointsPerQuestion = questions.length > 0 ? Math.floor(totalPoints / questions.length) : 0;
  const remainder = totalPoints - (pointsPerQuestion * questions.length);
  
  questions = questions.map((q, i) => ({
    ...q,
    points: pointsPerQuestion + (i < remainder ? 1 : 0) // Distribute remainder
  }));

  const pdfData = {
    ...testData,
    questions,
    branding,
    primaryRgb,
  };

  // Generate Student Test
  const studentDoc = new jsPDF();
  await generateStudentTest(studentDoc, pdfData, logoData);

  // Generate Answer Key
  const answerDoc = new jsPDF();
  await generateAnswerKey(answerDoc, pdfData, logoData);

  return {
    studentTest: studentDoc,
    answerKey: answerDoc
  };
};

// ============================================================================
// STUDENT TEST PDF
// ============================================================================

const generateStudentTest = async (doc, testData, logoData) => {
  const { branding, primaryRgb } = testData;
  const { r: pr, g: pg, b: pb } = primaryRgb;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER WITH LOGO
  // ═══════════════════════════════════════════════════════════════════════════
  
  let logoEndX = margin;
  
  if (logoData && branding.showLogo) {
    try {
      // Calculate logo dimensions maintaining aspect ratio
      const maxHeight = 12;
      const maxWidth = 45; // Allow wider logos
      
      const originalWidth = logoData.width || 100;
      const originalHeight = logoData.height || 100;
      const aspectRatio = originalWidth / originalHeight;
      
      let logoHeight = maxHeight;
      let logoWidth = maxHeight * aspectRatio;
      
      // If too wide, scale down
      if (logoWidth > maxWidth) {
        logoWidth = maxWidth;
        logoHeight = maxWidth / aspectRatio;
      }
      
      doc.addImage(logoData.data, 'PNG', margin, y + (maxHeight - logoHeight) / 2, logoWidth, logoHeight);
      logoEndX = margin + logoWidth + 4;
      
      console.log(`📷 Logo rendered: ${logoWidth.toFixed(1)}x${logoHeight.toFixed(1)} (ratio: ${aspectRatio.toFixed(2)})`);
    } catch (e) {
      console.error('Failed to add logo to PDF:', e);
    }
  }
  
  // School Name
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(sanitizeTextForPdf(branding.headerText), logoEndX, y + 5);
  
  // Tagline (if exists)
  if (branding.tagline) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text(sanitizeTextForPdf(branding.tagline), logoEndX, y + 10);
  }
  
  // Date on right side
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(formatDate(testData.date), pageWidth - margin, y + 5, { align: 'right' });

  // Primary color line
  y += 16;
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += 8;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(sanitizeTextForPdf(testData.title) || 'Test', pageWidth / 2, y, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════
  // INFO BOX - Light primary color background
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += 6;
  const infoBoxHeight = 16;
  
  // Background with low opacity primary color
  const lightR = Math.min(255, pr + Math.floor((255 - pr) * 0.9));
  const lightG = Math.min(255, pg + Math.floor((255 - pg) * 0.9));
  const lightB = Math.min(255, pb + Math.floor((255 - pb) * 0.9));
  doc.setFillColor(lightR, lightG, lightB);
  doc.roundedRect(margin, y, contentWidth, infoBoxHeight, 2, 2, 'F');
  
  // Border with primary color
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, infoBoxHeight, 2, 2, 'S');
  
  // Info text
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  
  const col1 = margin + 4;
  const col2 = margin + contentWidth * 0.35;
  const col3 = margin + contentWidth * 0.68;
  const infoY = y + 6;
  
  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Subject:', col1, infoY);
  doc.text('Class:', col2, infoY);
  doc.text('Duration:', col3, infoY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(sanitizeTextForPdf(testData.subject) || '', col1 + 16, infoY);
  doc.text(sanitizeTextForPdf(testData.className) || '', col2 + 12, infoY);
  doc.text(`${testData.duration || 45} minutes`, col3 + 18, infoY);
  
  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Teacher:', col1, infoY + 5);
  doc.text('Total:', col2, infoY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.text(sanitizeTextForPdf(testData.teacherName) || '', col1 + 16, infoY + 5);
  doc.text(`${testData.totalPoints || 100} points`, col2 + 12, infoY + 5);

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT NAME & SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += infoBoxHeight + 6;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);
  doc.text('Student Name:', margin, y);
  
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin + 28, y, margin + 100, y);
  
  doc.text('Score:', pageWidth - margin - 55, y);
  doc.line(pageWidth - margin - 40, y, pageWidth - margin - 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`/ ${testData.totalPoints || 100}`, pageWidth - margin - 13, y);

  // ═══════════════════════════════════════════════════════════════════════════
  // INSTRUCTIONS BOX
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (testData.instructions) {
    y += 8;
    
    // Yellow background
    doc.setFillColor(254, 249, 195);
    const instructionLines = doc.splitTextToSize(testData.instructions, contentWidth - 10);
    const instructionHeight = Math.max(12, instructionLines.length * 4 + 8);
    doc.roundedRect(margin, y, contentWidth, instructionHeight, 2, 2, 'F');
    
    // Border
    doc.setDrawColor(250, 204, 21);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, instructionHeight, 2, 2, 'S');
    
    // Title
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(133, 77, 14);
    doc.text('INSTRUCTIONS:', margin + 3, y + 5);
    
    // Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 63, 18);
    doc.text(instructionLines, margin + 3, y + 10);
    
    y += instructionHeight;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += 8;

  const questions = testData.questions || [];
  
  questions.forEach((q, index) => {
    // Check for page break
    const estimatedHeight = estimateQuestionHeight(doc, q, contentWidth);
    if (y + estimatedHeight > pageHeight - 25) {
      addNewPage(doc, testData, branding, primaryRgb);
      y = 25;
    }

    // Question number badge (circle with primary color)
    doc.setFillColor(pr, pg, pb);
    doc.circle(margin + 4, y + 2, 3.5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${index + 1}`, margin + 4, y + 3, { align: 'center' });

    // Points badge
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(pageWidth - margin - 16, y - 1, 16, 6, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 128);
    doc.text(`${q.points} pts`, pageWidth - margin - 8, y + 3, { align: 'center' });

    // Question text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    
    const questionLines = doc.splitTextToSize(sanitizeTextForPdf(q.question) || '', contentWidth - 30);
    doc.text(questionLines, margin + 12, y + 3);
    
    y += questionLines.length * 4 + 5;

    // Answer options based on type
    if (q.type === 'multiple_choice' && q.options) {
      doc.setFontSize(8);
      ['A', 'B', 'C', 'D'].forEach(letter => {
        if (q.options[letter]) {
          // Circle for selection
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.3);
          doc.circle(margin + 14, y, 2.2, 'S');
          
          // Letter
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(pr, pg, pb);
          doc.text(letter, margin + 14, y + 0.8, { align: 'center' });
          
          // Option text
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(55, 65, 81);
          const optionLines = doc.splitTextToSize(sanitizeTextForPdf(q.options[letter]), contentWidth - 30);
          doc.text(optionLines, margin + 20, y + 1);
          
          y += optionLines.length * 3.5 + 3;
        }
      });
      y += 2;
      
    } else if (q.type === 'true_false') {
      doc.setFontSize(8);
      
      // True option
      doc.setDrawColor(180, 180, 180);
      doc.circle(margin + 14, y, 2.2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pr, pg, pb);
      doc.text('T', margin + 14, y + 0.8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('True', margin + 20, y + 1);
      
      // False option
      doc.circle(margin + 44, y, 2.2, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pr, pg, pb);
      doc.text('F', margin + 44, y + 0.8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('False', margin + 50, y + 1);
      
      y += 8;
      
    } else {
      // Short answer / Essay - answer lines
      const lines = q.type === 'essay' ? 5 : 2;
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      
      for (let i = 0; i < lines; i++) {
        doc.line(margin + 10, y + (i * 7), pageWidth - margin - 5, y + (i * 7));
      }
      
      y += lines * 7 + 3;
    }
    
    y += 3;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  
  addFooters(doc, branding);

  // Save
  const filename = `${sanitizeFilename(testData.title)}_${formatDateForFilename(testData.date)}_student.pdf`;
  doc.save(filename);
  console.log('✅ Student test saved:', filename);
};

// ============================================================================
// ANSWER KEY PDF
// ============================================================================

const generateAnswerKey = async (doc, testData, logoData) => {
  const { branding, primaryRgb } = testData;
  const { r: pr, g: pg, b: pb } = primaryRgb;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  
  let logoEndX = margin;
  if (logoData && branding.showLogo) {
    try {
      // Calculate logo dimensions maintaining aspect ratio
      const maxHeight = 10;
      const maxWidth = 35;
      
      const originalWidth = logoData.width || 100;
      const originalHeight = logoData.height || 100;
      const aspectRatio = originalWidth / originalHeight;
      
      let logoHeight = maxHeight;
      let logoWidth = maxHeight * aspectRatio;
      
      if (logoWidth > maxWidth) {
        logoWidth = maxWidth;
        logoHeight = maxWidth / aspectRatio;
      }
      
      doc.addImage(logoData.data, 'PNG', margin, y, logoWidth, logoHeight);
      logoEndX = margin + logoWidth + 3;
    } catch (e) {
      console.error('Failed to add logo:', e);
    }
  }
  
  // School Name
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(sanitizeTextForPdf(branding.headerText), logoEndX, y + 5);

  // Red line for answer key
  y += 12;
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANSWER KEY WARNING BOX
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += 5;
  
  // Red warning box
  doc.setFillColor(254, 226, 226);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('ANSWER KEY - TEACHER COPY ONLY', pageWidth / 2, y + 7, { align: 'center' });

  // Test title
  y += 14;
  doc.setFontSize(13);
  doc.setTextColor(31, 41, 55);
  doc.text(sanitizeTextForPdf(testData.title) || 'Test', pageWidth / 2, y, { align: 'center' });

  // Info line
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const infoText = `${sanitizeTextForPdf(testData.subject) || ''} - ${sanitizeTextForPdf(testData.className) || ''} - ${formatDate(testData.date)} - ${testData.totalPoints || 100} points total`;
  doc.text(infoText, pageWidth / 2, y, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════
  // ANSWERS LIST
  // ═══════════════════════════════════════════════════════════════════════════
  
  y += 10;
  
  const questions = testData.questions || [];
  
  questions.forEach((q, index) => {
    // Check for page break
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
      
      // Mini header on new page
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text('ANSWER KEY - CONFIDENTIAL', margin, y);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
      y += 10;
    }

    // Question number and text preview
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`${index + 1}.`, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const cleanQuestion = sanitizeTextForPdf(q.question) || '';
    const shortQuestion = cleanQuestion.slice(0, 70) + (cleanQuestion.length > 70 ? '...' : '');
    doc.text(shortQuestion, margin + 7, y);
    
    y += 5;

    // Answer box
    let answerText = '';
    if (q.type === 'multiple_choice') {
      const letter = q.correctAnswer || '';
      const optionText = sanitizeTextForPdf(q.options?.[letter]) || '';
      answerText = `${letter}) ${optionText}`;
    } else {
      answerText = sanitizeTextForPdf(q.correctAnswer) || 'No answer provided';
    }
    
    const answerLines = doc.splitTextToSize(answerText, contentWidth - 28);
    const boxHeight = Math.max(8, answerLines.length * 4 + 4);
    
    // Green background for correct answer
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin + 5, y, contentWidth - 10, boxHeight, 2, 2, 'F');
    
    // Green border
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin + 5, y, contentWidth - 10, boxHeight, 2, 2, 'S');
    
    // Check icon
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('[OK]', margin + 8, y + 5);
    
    // Answer text
    doc.setFont('helvetica', 'normal');
    doc.text(answerLines, margin + 15, y + 5);
    
    // Points
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 128);
    doc.text(`${q.points} pts`, pageWidth - margin - 10, y + 5, { align: 'right' });
    
    y += boxHeight + 5;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER - CONFIDENTIAL WARNING
  // ═══════════════════════════════════════════════════════════════════════════
  
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(220, 38, 38);
    doc.text('*** CONFIDENTIAL - FOR TEACHER USE ONLY ***', pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  // Save
  const filename = `${sanitizeFilename(testData.title)}_${formatDateForFilename(testData.date)}_ANSWER_KEY.pdf`;
  doc.save(filename);
  console.log('✅ Answer key saved:', filename);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate question height for page break calculation
 */
const estimateQuestionHeight = (doc, question, contentWidth) => {
  let height = 15;
  
  const questionLines = doc.splitTextToSize(question.question || '', contentWidth - 30);
  height += questionLines.length * 4;
  
  if (question.type === 'multiple_choice' && question.options) {
    Object.values(question.options).forEach(opt => {
      if (opt) {
        const lines = doc.splitTextToSize(opt, contentWidth - 30);
        height += lines.length * 4 + 3;
      }
    });
  } else if (question.type === 'true_false') {
    height += 10;
  } else if (question.type === 'essay') {
    height += 40;
  } else {
    height += 18;
  }
  
  return height;
};

/**
 * Add new page with mini header
 */
const addNewPage = (doc, testData, branding, primaryRgb) => {
  doc.addPage();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const { r: pr, g: pg, b: pb } = primaryRgb;
  
  // Mini header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pr, pg, pb);
  doc.text(sanitizeTextForPdf(branding.headerText), margin, 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`${sanitizeTextForPdf(testData.title)} - Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, 12, { align: 'right' });
  
  // Line
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.3);
  doc.line(margin, 16, pageWidth - margin, 16);
};

/**
 * Add footers to all pages
 */
const addFooters = (doc, branding) => {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    
    // Footer text
    const year = new Date().getFullYear();
    const schoolName = sanitizeTextForPdf(branding.schoolName);
    const footerText = sanitizeTextForPdf(branding.footerText) || `(c) ${year} ${schoolName}`;
    doc.text(footerText, margin, pageHeight - 8);
    
    // Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
};

// ============================================================================
// NAMED EXPORTS
// ============================================================================

export default generateTestBundle;
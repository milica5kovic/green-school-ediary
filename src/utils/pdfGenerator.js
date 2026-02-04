import jsPDF from 'jspdf';
import 'jspdf-autotable';
import logoImage from '../assets/logo.png';

// Helper: Convert image to Base64
const getBase64Image = (img) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const image = new Image();
    
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = img;
  });
};

export const generateTestPDF = async (testData, options = {}) => {
  const { 
    includeAnswerKey = false,
    shuffleQuestions = false 
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Questions
  let questions = [...testData.questions];
  if (shuffleQuestions && !includeAnswerKey) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  const actualPointsPerQuestion = Math.floor(testData.totalPoints / questions.length);

  // Load logo
  let logoBase64 = null;
  try {
    logoBase64 = await getBase64Image(logoImage);
  } catch (error) {
    console.warn('Could not load logo:', error);
  }

  // Helper: Check page break - NO HEADERS/FOOTERS on continuation
  const checkPageBreak = (neededSpace = 20) => {
    if (yPosition + neededSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = margin + 10;
      return true;
    }
    return false;
  };

  // ========== PAGE 1: TITLE PAGE ==========
  
  // Logo
  if (logoBase64) {
    const logoWidth = 120;
    const logoHeight = 10.1;
    doc.addImage(logoBase64, 'PNG', margin, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 15;
  } else {
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, yPosition, 60, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Green School', margin + 3, yPosition + 8);
    yPosition += 20;
  }

  // Title Section
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Test Title - CENTERED
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(testData.title);
  doc.text(testData.title, (pageWidth - titleWidth) / 2, yPosition);
  yPosition += 12;

  // Subject & Class - CENTERED
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const subjectLine = testData.subject + ' - ' + testData.className;
  const subjectWidth = doc.getTextWidth(subjectLine);
  doc.text(subjectLine, (pageWidth - subjectWidth) / 2, yPosition);
  yPosition += 15;

  // Test Details - CENTERED
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  const detailsLine = 'Date: ' + testData.date + '  |  Duration: ' + testData.duration + ' minutes  |  Total Points: ' + testData.totalPoints;
  const detailsWidth = doc.getTextWidth(detailsLine);
  doc.text(detailsLine, (pageWidth - detailsWidth) / 2, yPosition);
  yPosition += 7;

  yPosition += 5;
//   // Teacher Name - LEFT ALIGNED
//   doc.setFont('helvetica', 'normal');
//   doc.setFontSize(11);
//   doc.text('Teacher:', (pageWidth - 40) / 2, yPosition);
//   doc.text(testData.teacherName, (pageWidth - 40) / 2 + 20, yPosition);
//   yPosition += 20;

  // Student Info - NO BOX
  if (!includeAnswerKey) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    doc.text('Student Name:', margin, yPosition);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(margin + 35, yPosition + 1, pageWidth - margin, yPosition + 1);
    yPosition += 10;
    
    doc.text('Score:', margin, yPosition);
    doc.line(margin + 17, yPosition + 1, margin + 30, yPosition + 1);
    doc.text(' / ' + testData.totalPoints, margin + 30, yPosition);
    
    yPosition += 15;
  } else {
    doc.setFillColor(220, 252, 231);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('ANSWER KEY', margin + 5, yPosition + 8);
    yPosition += 17;
  }

  // Instructions
  if (testData.instructions && !includeAnswerKey) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INSTRUCTIONS:', margin, yPosition);
    yPosition += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const instructions = doc.splitTextToSize(testData.instructions, pageWidth - 2 * margin);
    doc.text(instructions, margin, yPosition);
    yPosition += instructions.length * 5 + 10;
  }

  // Separator
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  // Footer ONLY on first page
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  const footerText = 'Green School - Excellence in Education';
  const ftWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - ftWidth) / 2, pageHeight - 10);

  // ========== NEW PAGE FOR QUESTIONS ==========
  doc.addPage();
  yPosition = margin;

  // ========== QUESTIONS ==========
  questions.forEach((q, index) => {
    checkPageBreak(35);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(String(index + 1) + '.', margin, yPosition);
    
    doc.setTextColor(0, 0, 0);
    const questionText = doc.splitTextToSize(q.question, pageWidth - 2 * margin - 15);
    doc.text(questionText, margin + 7, yPosition);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('[' + actualPointsPerQuestion + ' pts]', pageWidth - margin - 25, yPosition);
    
    yPosition += questionText.length * 6 + 5;

    switch (q.type) {
      case 'multiple_choice':
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        ['A', 'B', 'C', 'D'].forEach((letter) => {
          if (q.options && q.options[letter]) {
            const optionText = letter + ') ' + q.options[letter];
            const wrappedOption = doc.splitTextToSize(optionText, pageWidth - 2 * margin - 15);
            
            if (includeAnswerKey && q.correctAnswer === letter) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(5, 150, 105);
              doc.text('✓', margin + 10, yPosition);
            }
            
            doc.text(wrappedOption, margin + 15, yPosition);
            
            if (includeAnswerKey && q.correctAnswer === letter) {
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 0);
            }
            
            yPosition += wrappedOption.length * 5.5 + 3;
          }
        });
        break;

      case 'true_false':
        checkPageBreak(15);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        if (includeAnswerKey) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('Correct Answer: ' + q.correctAnswer, margin + 15, yPosition);
        } else {
          doc.text('True     False', margin + 15, yPosition);
        }
        yPosition += 8;
        break;

      case 'short_answer':
        checkPageBreak(25);
        if (includeAnswerKey && q.correctAnswer) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('Answer:', margin + 15, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          const answer = doc.splitTextToSize(q.correctAnswer, pageWidth - 2 * margin - 20);
          doc.text(answer, margin + 15, yPosition);
          yPosition += answer.length * 5.5 + 5;
        } else {
          for (let i = 0; i < 3; i++) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(margin + 15, yPosition, pageWidth - margin - 10, yPosition);
            yPosition += 8;
          }
        }
        break;

      case 'essay':
        checkPageBreak(45);
        if (includeAnswerKey && q.correctAnswer) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('Suggested Answer:', margin + 15, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          const answer = doc.splitTextToSize(q.correctAnswer, pageWidth - 2 * margin - 20);
          doc.text(answer, margin + 15, yPosition);
          yPosition += answer.length * 5.5 + 10;
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.rect(margin + 15, yPosition, pageWidth - 2 * margin - 25, 55);
          yPosition += 60;
        }
        break;

      case 'fill_blank':
        checkPageBreak(15);
        if (includeAnswerKey && q.correctAnswer) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105);
          doc.text('Answer: ' + q.correctAnswer, margin + 15, yPosition);
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(margin + 15, yPosition, pageWidth - margin - 10, yPosition);
        }
        yPosition += 10;
        break;
    }

    yPosition += 8;
  });

  const filename = includeAnswerKey 
    ? testData.title.replace(/\s+/g, '_') + '_AnswerKey.pdf'
    : testData.title.replace(/\s+/g, '_') + '_Test.pdf';

  return {
    pdf: doc,
    filename: filename,
    save: () => doc.save(filename)
  };
};

export const generateTestBundle = async (testData, shuffleQuestions = false) => {
  const actualPointsPerQuestion = Math.floor(testData.totalPoints / testData.questions.length);
  const updatedQuestions = testData.questions.map(q => ({
    ...q,
    points: actualPointsPerQuestion
  }));

  const updatedTestData = {
    ...testData,
    questions: updatedQuestions
  };

  const studentTest = await generateTestPDF(updatedTestData, { 
    includeAnswerKey: false, 
    shuffleQuestions 
  });
  
  const answerKey = await generateTestPDF(updatedTestData, { 
    includeAnswerKey: true, 
    shuffleQuestions: false
  });

  return {
    studentTest,
    answerKey
  };
};
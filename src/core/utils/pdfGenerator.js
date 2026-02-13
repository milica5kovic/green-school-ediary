import jsPDF from 'jspdf';

// Function to convert logo.svg to base64
const getLogoBase64 = async () => {
  try {
    const response = await fetch('/logo.svg');
    const svgText = await response.text();
    
    // Create a canvas to convert SVG to image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
    });
  } catch (error) {
    console.error('Error loading logo:', error);
    return null;
  }
};

export const generateTestBundle = async (testData, shuffle = false) => {
  const logo = await getLogoBase64();
  
  let questions = [...testData.questions];
  if (shuffle) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  // Student Test
  const studentDoc = new jsPDF();
  await generateStudentTest(studentDoc, { ...testData, questions }, logo);

  // Answer Key
  const answerDoc = new jsPDF();
  await generateAnswerKey(answerDoc, { ...testData, questions }, logo);

  return {
    studentTest: studentDoc,
    answerKey: answerDoc
  };
};

const generateStudentTest = async (doc, testData, logo) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header with Logo
  if (logo) {
    doc.addImage(logo, 'PNG', margin, y, 20, 20);
  }
  
 // School Name
doc.setFontSize(14);  // ← Changed from 18
doc.setFont('helvetica', 'bold');
doc.setTextColor(16, 185, 129);
doc.text('Green School by Chartwell', logo ? margin + 25 : margin, y + 8);  // ← Changed y from 10

// Line separator
y += 20;  // ← Changed from 25
doc.setDrawColor(16, 185, 129);
doc.setLineWidth(0.5);
doc.line(margin, y, pageWidth - margin, y);

// Test Title
y += 8;  // ← Changed from 10
doc.setFontSize(16);  // ← Changed from 20
doc.setFont('helvetica', 'bold');
doc.setTextColor(31, 41, 55);
doc.text(testData.title, pageWidth / 2, y, { align: 'center' });

// Test Info Box
y += 8;  // ← Changed from 10
doc.setFillColor(239, 246, 255);
doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 3, 3, 'F');  // ← Changed height from 25

doc.setFontSize(9);  // ← Changed from 10
doc.setFont('helvetica', 'normal');
doc.setTextColor(55, 65, 81);

const infoY = y + 7;  // ← Changed from 8
doc.text(`Subject: ${testData.subject}`, margin + 5, infoY);
doc.text(`Class: ${testData.className}`, margin + 70, infoY);
doc.text(`Date: ${new Date(testData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin + 120, infoY);  // ← CHANGED FORMAT

doc.text(`Duration: ${testData.duration} minutes`, margin + 5, infoY + 6);
doc.text(`Total Points: ${testData.totalPoints}`, margin + 70, infoY + 6);
doc.text(`Teacher: ${testData.teacherName}`, margin + 120, infoY + 6);

// Student Info Fields
y += 28; 
doc.setFontSize(8); 
doc.text('Name: ___________________________', margin, y);
doc.text('Score: _______ / ' + testData.totalPoints, pageWidth - margin - 60, y);

// Instructions
y += 12;  //
doc.setFillColor(254, 243, 199);
doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3, 'F'); 

doc.setFontSize(8);  // ← Changed from 9
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
    }

// Question number and text
doc.setFontSize(10);  // ← Changed from 11
doc.setFont('helvetica', 'bold');
doc.text(`${index + 1}.`, margin, y);

doc.setFont('helvetica', 'normal');
const questionText = doc.splitTextToSize(q.question, pageWidth - 2 * margin - 10);
doc.text(questionText, margin + 7, y);

y += questionText.length * 4.5 + 3;  // ← Changed from 5

// Options for multiple choice
if (q.type === 'multiple_choice') {
  doc.setFontSize(9);  // ← Changed from 10
  ['A', 'B', 'C', 'D'].forEach(letter => {
    if (q.options[letter]) {
      const optionText = doc.splitTextToSize(`${letter}) ${q.options[letter]}`, pageWidth - 2 * margin - 15);
      doc.text(optionText, margin + 10, y);
      y += optionText.length * 4.5 + 2;  // ← Changed from 5
    }
  });
  y += 4;  // ← Changed from 5
} else if (q.type === 'true_false') {
  doc.setFontSize(9);  // ← Changed from 10
  doc.text(' () True    () False', margin + 10, y);
  y += 8;  // ← Changed from 10
} else {
  // Answer space for other types
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 10, y + 4, pageWidth - margin - 10, y + 4);
  doc.line(margin + 10, y + 10, pageWidth - margin - 10, y + 10);
  if (q.type === 'essay') {
    doc.line(margin + 10, y + 16, pageWidth - margin - 10, y + 16);
    y += 22;  // ← Changed from 25
  } else {
    y += 16;  // ← Changed from 18
  }
}

// Points
doc.setFontSize(8);  // ← Changed from 9
doc.setFont('helvetica', 'italic');
doc.setTextColor(107, 114, 128);
doc.text(`(${q.points} points)`, pageWidth - margin - 30, y - questionText.length * 4.5 - 3);
doc.setTextColor(31, 41, 55);
  });

  // Save with custom filename
  const sanitizedTitle = testData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date(testData.date).toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }).replace(/ /g, '_');
  
  doc.save(`${sanitizedTitle}_${dateStr}_student.pdf`);

 
};

const generateAnswerKey = async (doc, testData, logo) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

 // Header with Logo
// Header with Logo
if (logo) {
  doc.addImage(logo, 'PNG', margin, y, 15, 15);  // ← Smaller logo
}

doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.setTextColor(16, 185, 129);
doc.text('Green School by Chartwell', logo ? margin + 20 : margin, y + 10);  // ← Consistent with student test

// Line separator (more space below)
y += 22;  // ← More space
doc.setDrawColor(16, 185, 129);
doc.setLineWidth(0.5);
doc.line(margin, y, pageWidth - margin, y);

doc.setFontSize(9);  // ← Changed from 10
doc.setFont('helvetica', 'normal');
doc.setTextColor(107, 114, 128);
// doc.text('Digital Learning Management', logo ? margin + 25 : margin, y + 14);

y += 20;  // ← Changed from 25
doc.setDrawColor(16, 185, 129);
doc.setLineWidth(0.5);
doc.line(margin, y, pageWidth - margin, y);

// Title
y += 8;  // ← Changed from 10
doc.setFontSize(16);  // ← Changed from 20
doc.setFont('helvetica', 'bold');
doc.setTextColor(220, 38, 38);
doc.text('ANSWER KEY - TEACHER COPY', pageWidth / 2, y, { align: 'center' });

y += 7;  // ← Changed from 8
doc.setFontSize(14);  // ← Changed from 16
doc.setTextColor(31, 41, 55);
doc.text(testData.title, pageWidth / 2, y, { align: 'center' });

// Test Info
y += 8;  // ← Changed from 10
doc.setFillColor(254, 226, 226);
doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3, 'F');  // ← Changed from 20

doc.setFontSize(9);  // ← Changed from 10
doc.setFont('helvetica', 'normal');
doc.setTextColor(55, 65, 81);

doc.text(`Subject: ${testData.subject}`, margin + 5, y + 7);
doc.text(`Class: ${testData.className}`, margin + 70, y + 7);
doc.text(`Date: ${new Date(testData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin + 120, y + 7);  // ← CHANGED FORMAT
doc.text(`Total Points: ${testData.totalPoints}`, margin + 5, y + 13);

// Answers
y += 24;  // ← Changed from 28

testData.questions.forEach((q, index) => {
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(10);  // ← Changed from 11
  doc.setFont('helvetica', 'bold');
  doc.text(`${index + 1}.`, margin, y);
  
  doc.setFont('helvetica', 'normal');
  const questionText = doc.splitTextToSize(q.question, pageWidth - 2 * margin - 20);
  doc.text(questionText, margin + 7, y);
  
  y += questionText.length * 4.5 + 3;  // ← Changed from 5

  // Answer
let answerText = '';
let answerHeight = 9;

if (q.type === 'multiple_choice') {
  // Show letter + full text
  const letter = q.correctAnswer;
  const fullAnswer = q.options[letter];
  answerText = `${letter}) ${fullAnswer}`;
  answerHeight = Math.max(9, Math.ceil(answerText.length / 80) * 5 + 4);
} else {
  answerText = q.correctAnswer || 'No answer provided';
  answerHeight = Math.max(9, Math.ceil(answerText.length / 80) * 5 + 4);
}

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

// Save with custom filename
  const sanitizedTitle = testData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date(testData.date).toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  }).replace(/ /g, '_');
  
  doc.save(`${sanitizedTitle}_${dateStr}_answer_key.pdf`);

  
};
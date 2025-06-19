import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker to use local worker file
// This approach is more robust and immune to CDN issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

console.log('🔧 PDF.js Configuration:', {
  packageVersion: pdfjsLib.version,
  workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
  environment: import.meta.env.MODE,
  workerLocation: 'local (public folder)'
});

export async function extractTextFromDocument(file: File): Promise<string> {
  console.log('📄 Starting document processing:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });

  const fileType = file.type;

  if (fileType === 'application/pdf') {
    console.log('📄 Processing as PDF document');
    return extractTextFromPDF(file);
  }

  console.error('❌ Unsupported file type:', fileType);
  throw new Error('Unsupported file type');
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('📄 Converting PDF file to ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('✅ ArrayBuffer created:', {
      byteLength: arrayBuffer.byteLength,
      sizeInMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2)
    });

    console.log('📄 Loading PDF document with PDF.js...');
    console.log('🔧 Worker configuration check:', {
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
      isWorkerConfigured: !!pdfjsLib.GlobalWorkerOptions.workerSrc,
      workerType: 'local',
      workerFileExtension: pdfjsLib.GlobalWorkerOptions.workerSrc?.split('.').pop()
    });

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    // Add progress tracking
    loadingTask.onProgress = (progress) => {
      console.log('📄 PDF loading progress:', {
        loaded: progress.loaded,
        total: progress.total,
        percentage: progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0
      });
    };

    console.log('📄 Attempting to load PDF with local worker...');
    const pdf = await loadingTask.promise;
    console.log('✅ PDF document loaded successfully:', {
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprint,
      isEncrypted: pdf.isEncrypted
    });

    let text = '';
    console.log('📄 Starting text extraction from all pages...');

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}...`);
      
      try {
        const page = await pdf.getPage(i);
        console.log(`✅ Page ${i} loaded:`, {
          pageNumber: page.pageNumber,
          rotation: page.rotate,
          viewport: {
            width: page.view[2],
            height: page.view[3]
          }
        });

        const content = await page.getTextContent();
        console.log(`📄 Text content extracted from page ${i}:`, {
          itemsCount: content.items.length,
          hasText: content.items.length > 0
        });

        const pageText = content.items.map((item: any) => {
          if (typeof item.str === 'string') {
            return item.str;
          }
          console.warn('⚠️ Unexpected text item format:', item);
          return '';
        }).join(' ');

        console.log(`📄 Page ${i} text length:`, pageText.length);
        text += pageText + '\n';
      } catch (pageError) {
        console.error(`❌ Error processing page ${i}:`, {
          error: pageError.message,
          stack: pageError.stack,
          pageNumber: i
        });
        // Continue with other pages even if one fails
      }
    }

    console.log('✅ PDF text extraction completed:', {
      totalTextLength: text.length,
      totalPages: pdf.numPages,
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });

    if (text.trim().length === 0) {
      console.warn('⚠️ No text extracted from PDF - document may be image-based or encrypted');
      throw new Error('No text could be extracted from this PDF. The document may contain only images or be password-protected.');
    }

    return text;
  } catch (error) {
    console.error('❌ PDF text extraction failed:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      fileName: file.name,
      fileSize: file.size,
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
      workerType: 'local'
    });

    // Provide more specific error messages based on the error type
    if (error.message.includes('Setting up fake worker failed') || error.message.includes('Failed to fetch')) {
      console.error('❌ PDF.js Worker Setup Error - Local worker file issue');
      console.error('💡 Suggestion: Check if pdf.worker.mjs exists in the public folder');
      throw new Error('PDF processing failed: Local worker script not found. Please ensure pdf.worker.mjs is in the public folder.');
    } else if (error.message.includes('Invalid PDF')) {
      console.error('❌ Invalid PDF File Error');
      throw new Error('The uploaded file is not a valid PDF document.');
    } else if (error.message.includes('Password')) {
      console.error('❌ Password Protected PDF Error');
      throw new Error('This PDF is password-protected and cannot be processed.');
    } else {
      console.error('❌ Generic PDF Processing Error');
      console.error('💡 Full error details:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
}
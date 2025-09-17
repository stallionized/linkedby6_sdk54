/**
 * PDF Export Script for ADP Presentation
 * This script exports all slides from the HTML presentation into a single PDF
 * Uses html2canvas and jsPDF libraries for client-side PDF generation
 */

class PresentationPDFExporter {
    constructor() {
        this.slides = [];
        this.currentSlideIndex = 0;
        this.isExporting = false;
        this.loadRequiredLibraries();
    }

    // Load required libraries dynamically
    async loadRequiredLibraries() {
        return new Promise((resolve, reject) => {
            let scriptsLoaded = 0;
            const totalScripts = 2;

            const checkComplete = () => {
                scriptsLoaded++;
                if (scriptsLoaded === totalScripts) {
                    // Wait a bit for libraries to initialize
                    setTimeout(() => {
                        resolve();
                    }, 100);
                }
            };

            // Load html2canvas
            if (!window.html2canvas) {
                const html2canvasScript = document.createElement('script');
                html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                html2canvasScript.onload = () => {
                    console.log('html2canvas loaded successfully');
                    checkComplete();
                };
                html2canvasScript.onerror = () => reject(new Error('Failed to load html2canvas'));
                document.head.appendChild(html2canvasScript);
            } else {
                console.log('html2canvas already loaded');
                checkComplete();
            }

            // Load jsPDF
            if (!window.jsPDF) {
                const jsPDFScript = document.createElement('script');
                jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                jsPDFScript.onload = () => {
                    console.log('jsPDF loaded successfully', window.jsPDF);
                    checkComplete();
                };
                jsPDFScript.onerror = () => reject(new Error('Failed to load jsPDF'));
                document.head.appendChild(jsPDFScript);
            } else {
                console.log('jsPDF already loaded', window.jsPDF);
                checkComplete();
            }
        });
    }

    // Show loading indicator
    showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'pdf-export-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 24px; margin-bottom: 20px;">Exporting PDF...</div>
                <div id="export-progress" style="font-size: 16px; margin-bottom: 20px;">Preparing export...</div>
                <div style="width: 300px; height: 6px; background: #333; border-radius: 3px; overflow: hidden;">
                    <div id="progress-bar" style="width: 0%; height: 100%; background: #0066cc; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingDiv);
    }

    // Update loading progress
    updateProgress(current, total, message) {
        const progressText = document.getElementById('export-progress');
        const progressBar = document.getElementById('progress-bar');
        
        if (progressText) {
            progressText.textContent = message || `Processing slide ${current} of ${total}...`;
        }
        
        if (progressBar) {
            const percentage = (current / total) * 100;
            progressBar.style.width = `${percentage}%`;
        }
    }

    // Hide loading indicator
    hideLoadingIndicator() {
        const loadingDiv = document.getElementById('pdf-export-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // Get all slides from the presentation
    getAllSlides() {
        return document.querySelectorAll('.slide');
    }

    // Hide navigation and export buttons during capture
    hideUIElements() {
        const navigation = document.querySelector('.navigation');
        const exportButtons = document.querySelector('.export-buttons');
        
        if (navigation) navigation.style.display = 'none';
        if (exportButtons) exportButtons.style.display = 'none';
    }

    // Restore navigation and export buttons after capture
    restoreUIElements() {
        const navigation = document.querySelector('.navigation');
        const exportButtons = document.querySelector('.export-buttons');
        
        if (navigation) navigation.style.display = 'flex';
        if (exportButtons) exportButtons.style.display = 'flex';
    }

    // Capture a single slide as canvas
    async captureSlide(slideElement, slideNumber, totalSlides) {
        return new Promise((resolve, reject) => {
            // Make sure only this slide is visible
            const allSlides = this.getAllSlides();
            allSlides.forEach(slide => slide.classList.remove('active'));
            slideElement.classList.add('active');

            // Wait a moment for the slide to render
            setTimeout(async () => {
                try {
                    this.updateProgress(slideNumber, totalSlides, `Capturing slide ${slideNumber} of ${totalSlides}...`);
                    
                    const canvas = await html2canvas(slideElement, {
                        scale: 2, // Higher resolution
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        width: slideElement.offsetWidth,
                        height: slideElement.offsetHeight,
                        scrollX: 0,
                        scrollY: 0
                    });
                    
                    resolve(canvas);
                } catch (error) {
                    reject(error);
                }
            }, 500);
        });
    }

    // Main export function
    async exportAllSlidesToPDF() {
        if (this.isExporting) {
            alert('Export already in progress. Please wait...');
            return;
        }

        try {
            this.isExporting = true;
            this.showLoadingIndicator();
            
            // Load required libraries
            this.updateProgress(0, 1, 'Loading required libraries...');
            await this.loadRequiredLibraries();
            
            // Get all slides
            const slides = this.getAllSlides();
            const totalSlides = slides.length;
            
            if (totalSlides === 0) {
                throw new Error('No slides found in the presentation');
            }

            // Hide UI elements
            this.hideUIElements();
            
            // Store original slide state
            const originalActiveSlide = document.querySelector('.slide.active');
            
            // Initialize PDF document
            let jsPDF;
            console.log('Checking jsPDF availability:', window.jsPDF);
            console.log('Available PDF-related globals:', Object.keys(window).filter(k => k.toLowerCase().includes('pdf')));
            
            if (window.jsPDF && typeof window.jsPDF.jsPDF === 'function') {
                jsPDF = window.jsPDF.jsPDF;
                console.log('Using window.jsPDF.jsPDF');
            } else if (window.jsPDF && typeof window.jsPDF === 'function') {
                jsPDF = window.jsPDF;
                console.log('Using window.jsPDF directly');
            } else if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
                jsPDF = window.jspdf.jsPDF;
                console.log('Using window.jspdf.jsPDF');
            } else if (window.jspdf && typeof window.jspdf === 'function') {
                jsPDF = window.jspdf;
                console.log('Using window.jspdf directly');
            } else if (typeof jsPDF !== 'undefined') {
                // Global jsPDF variable
                console.log('Using global jsPDF');
            } else {
                console.error('jsPDF not found. Available:', Object.keys(window).filter(k => k.toLowerCase().includes('pdf')));
                throw new Error('jsPDF library not loaded properly. Please refresh the page and try again.');
            }
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1200, 800] // Approximate slide dimensions
            });

            // Capture each slide
            for (let i = 0; i < totalSlides; i++) {
                const slide = slides[i];
                const canvas = await this.captureSlide(slide, i + 1, totalSlides);
                
                // Add page to PDF (except for first slide)
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Calculate dimensions to fit the page
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasAspectRatio = canvas.width / canvas.height;
                const pdfAspectRatio = pdfWidth / pdfHeight;
                
                let imgWidth, imgHeight, xOffset, yOffset;
                
                if (canvasAspectRatio > pdfAspectRatio) {
                    // Canvas is wider than PDF page
                    imgWidth = pdfWidth;
                    imgHeight = pdfWidth / canvasAspectRatio;
                    xOffset = 0;
                    yOffset = (pdfHeight - imgHeight) / 2;
                } else {
                    // Canvas is taller than PDF page
                    imgHeight = pdfHeight;
                    imgWidth = pdfHeight * canvasAspectRatio;
                    xOffset = (pdfWidth - imgWidth) / 2;
                    yOffset = 0;
                }
                
                // Add image to PDF
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
                
                this.updateProgress(i + 1, totalSlides, `Added slide ${i + 1} to PDF...`);
            }
            
            // Restore original slide state
            const allSlides = this.getAllSlides();
            allSlides.forEach(slide => slide.classList.remove('active'));
            if (originalActiveSlide) {
                originalActiveSlide.classList.add('active');
            } else {
                slides[0].classList.add('active');
            }
            
            // Restore UI elements
            this.restoreUIElements();
            
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
            const defaultFilename = `LinkedBySix-ADP-Presentation-${timestamp}.pdf`;
            
            // Generate PDF blob
            this.updateProgress(totalSlides, totalSlides, 'Generating PDF file...');
            const pdfBlob = pdf.output('blob');
            
            this.hideLoadingIndicator();
            
            // Save PDF using File System Access API or fallback
            await this.savePDF(pdfBlob, defaultFilename, totalSlides);
            
        } catch (error) {
            console.error('PDF Export Error:', error);
            this.hideLoadingIndicator();
            this.restoreUIElements();
            alert(`Error exporting PDF: ${error.message}\n\nPlease try again or check the browser console for more details.`);
        } finally {
            this.isExporting = false;
        }
    }

    // Show custom file picker dialog
    showCustomFilePicker(pdfBlob, defaultFilename, totalSlides) {
        // Create custom modal dialog
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 90%;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3 style="color: #0066cc; margin-bottom: 20px;">Save PDF File</h3>
            <p style="margin-bottom: 20px; color: #555;">Choose a filename for your presentation PDF:</p>
            <input type="text" id="filename-input" value="${defaultFilename}" 
                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; margin-bottom: 20px; font-size: 14px;">
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="save-btn" style="background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    💾 Save PDF
                </button>
                <button id="cancel-btn" style="background: #ccc; color: #333; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Focus on filename input and select text
        const filenameInput = dialog.querySelector('#filename-input');
        filenameInput.focus();
        filenameInput.select();
        
        // Handle save button
        dialog.querySelector('#save-btn').onclick = () => {
            const filename = filenameInput.value.trim() || defaultFilename;
            document.body.removeChild(modal);
            this.downloadPDFBlob(pdfBlob, filename, totalSlides);
        };
        
        // Handle cancel button
        dialog.querySelector('#cancel-btn').onclick = () => {
            document.body.removeChild(modal);
        };
        
        // Handle Enter key
        filenameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                dialog.querySelector('#save-btn').click();
            } else if (e.key === 'Escape') {
                dialog.querySelector('#cancel-btn').click();
            }
        };
        
        // Handle click outside modal
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    }

    // Save PDF using File System Access API or fallback (following standard approach)
    async savePDF(pdfBlob, defaultFilename, totalSlides) {
        // Check if the File System Access API is supported (Chrome, Edge)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: defaultFilename,
                    types: [{
                        description: 'PDF Files',
                        accept: { 'application/pdf': ['.pdf'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
                
                setTimeout(() => {
                    alert(`PDF exported successfully!\n\nFile saved as: ${handle.name}\nSlides: ${totalSlides}`);
                }, 500);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error saving PDF:', err);
                    // Fallback to download
                    this.fallbackDownload(pdfBlob, defaultFilename, totalSlides);
                }
                // If user cancelled, do nothing
            }
        } else {
            // Fallback for Firefox and other browsers
            this.fallbackDownload(pdfBlob, defaultFilename, totalSlides);
        }
    }

    // Fallback download method
    fallbackDownload(blob, filename, totalSlides) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`PDF exported successfully!\n\nFile: ${filename}\nSlides: ${totalSlides}\n\nThe PDF has been downloaded to your default download folder.`);
        }, 100);
    }
}

// Initialize the PDF exporter
const pdfExporter = new PresentationPDFExporter();

// Global function to be called by the Export PDF button
window.exportAllSlidesToPDF = function() {
    pdfExporter.exportAllSlidesToPDF();
};

// Alternative function name for backward compatibility
window.exportPresentationToPDF = function() {
    pdfExporter.exportAllSlidesToPDF();
};

console.log('PDF Export Script loaded successfully. Use exportAllSlidesToPDF() to export all slides to PDF.');

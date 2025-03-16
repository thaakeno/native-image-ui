class ImageViewer {
    constructor() {
        this.setupLightbox();
        this.enhanceExistingImages();
        
        // Listen for new images added to the DOM
        this.setupMutationObserver();
    }
    
    setupLightbox() {
        // Create lightbox element if it doesn't exist
        if (!document.querySelector('.image-lightbox')) {
            const lightbox = document.createElement('div');
            lightbox.className = 'image-lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <img src="" alt="Enlarged image">
                    <button class="lightbox-close" aria-label="Close lightbox">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button class="lightbox-download" aria-label="Download image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Image
                    </button>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            // Add event listeners
            const closeButton = lightbox.querySelector('.lightbox-close');
            closeButton.addEventListener('click', () => this.closeLightbox());
            
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeLightbox();
                }
            });
            
            const downloadButton = lightbox.querySelector('.lightbox-download');
            downloadButton.addEventListener('click', () => this.downloadLightboxImage());
            
            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && lightbox.classList.contains('open')) {
                    this.closeLightbox();
                }
            });
        }
        
        // Create copy success message element
        if (!document.querySelector('.copy-success-message')) {
            const successMsg = document.createElement('div');
            successMsg.className = 'copy-success-message';
            document.body.appendChild(successMsg);
        }
    }
    
    enhanceExistingImages() {
        // Find all existing images in messages
        const images = document.querySelectorAll('.ai-generated-image, .user-uploaded-image');
        images.forEach(img => this.enhanceImage(img));
    }
    
    enhanceImage(img) {
        // Skip if already enhanced or if image container doesn't exist
        if (!img || !img.closest('.image-container')) {
            return;
        }
        
        // Skip if already enhanced
        if (img.closest('.image-container').querySelector('.image-actions')) {
            return;
        }
        
        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'image-actions';
        actionsDiv.innerHTML = `
            <button class="image-action-btn image-view-btn" title="View larger" aria-label="View larger image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14 21 3"></path>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
            </button>
            <button class="image-action-btn image-download-btn" title="Download" aria-label="Download image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            <button class="image-action-btn image-copy-btn" title="Copy to clipboard" aria-label="Copy image to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        `;
        
        // Add action buttons to container
        img.closest('.image-container').appendChild(actionsDiv);
        
        // Add event listeners
        const viewBtn = actionsDiv.querySelector('.image-view-btn');
        viewBtn.addEventListener('click', () => this.openLightbox(img.src));
        
        const downloadBtn = actionsDiv.querySelector('.image-download-btn');
        downloadBtn.addEventListener('click', () => this.downloadImage(img.src));
        
        const copyBtn = actionsDiv.querySelector('.image-copy-btn');
        copyBtn.addEventListener('click', () => this.copyImageToClipboard(img));
        
        // Add click on image to view larger
        img.addEventListener('click', () => this.openLightbox(img.src));
    }
    
    openLightbox(imageSrc) {
        const lightbox = document.querySelector('.image-lightbox');
        const lightboxImg = lightbox.querySelector('img');
        lightboxImg.src = imageSrc;
        
        // Store the original src for downloading
        lightboxImg.dataset.originalSrc = imageSrc;
        
        // Show lightbox
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    closeLightbox() {
        const lightbox = document.querySelector('.image-lightbox');
        lightbox.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    downloadImage(imageSrc) {
        const link = document.createElement('a');
        link.href = imageSrc;
        
        // Generate a filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `ai-image-${timestamp}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.logDebug('Image downloaded', { src: imageSrc });
    }
    
    downloadLightboxImage() {
        const lightboxImg = document.querySelector('.image-lightbox img');
        if (lightboxImg && lightboxImg.src) {
            this.downloadImage(lightboxImg.src);
        }
    }
    
    async copyImageToClipboard(imgElement) {
        try {
            // Create a canvas to get the image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Wait for image to load
            await new Promise((resolve) => {
                if (imgElement.complete) {
                    resolve();
                } else {
                    imgElement.onload = resolve;
                }
            });
            
            // Set canvas size to match image
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            // Draw image to canvas
            ctx.drawImage(imgElement, 0, 0);
            
            // Get the blob data
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            
            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            // Show success message
            this.showSuccessMessage('Image copied to clipboard');
            this.logDebug('Image copied to clipboard', { width: canvas.width, height: canvas.height });
        } catch (error) {
            console.error('Failed to copy image:', error);
            this.logDebug('Failed to copy image', { error: error.message });
            
            // Fallback for browsers that don't support clipboard API
            this.showSuccessMessage('Copy not supported in this browser. Try downloading instead.');
        }
    }
    
    showSuccessMessage(message) {
        const successMsg = document.querySelector('.copy-success-message');
        successMsg.textContent = message;
        successMsg.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 3000);
    }
    
    setupMutationObserver() {
        // Watch for new images added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        // Check if node is an element and contains images
                        if (node.nodeType === 1) {
                            const images = node.querySelectorAll('.ai-generated-image, .user-uploaded-image');
                            images.forEach(img => {
                                // Wait for image to load
                                if (img.complete) {
                                    this.enhanceImage(img);
                                } else {
                                    img.addEventListener('load', () => this.enhanceImage(img));
                                }
                            });
                        }
                    });
                }
            });
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    logDebug(message, data = null) {
        // Check if there's a global debug function
        if (typeof window.debugLog === 'function') {
            window.debugLog(`[ImageViewer] ${message}`, data);
        } else if (window.app && typeof window.app.debugLog === 'function') {
            window.app.debugLog(`[ImageViewer] ${message}`, data);
        } else {
            console.log(`[ImageViewer] ${message}`, data);
        }
    }
}

// Initialize the image viewer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageViewer = new ImageViewer();
});
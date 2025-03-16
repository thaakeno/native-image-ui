class GifCreator {
    constructor() {
        // Load the gifshot library dynamically
        this.loadGifshotLibrary().then(() => {
            this.isInitialized = true;
            console.log('GIF Creator initialized');
        }).catch(error => {
            console.error('Failed to initialize GIF Creator:', error);
        });
        this.selectedImages = []; // Array to track selected images for multi-message GIFs
    }

    async loadGifshotLibrary() {
        return new Promise((resolve, reject) => {
            if (window.gifshot) {
                resolve();
                return;
            }

            const gifshotScript = document.createElement('script');
            gifshotScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js';
            gifshotScript.async = true;
            
            gifshotScript.onload = () => {
                resolve();
            };
            
            gifshotScript.onerror = () => reject(new Error('Failed to load gifshot library'));
            document.head.appendChild(gifshotScript);
        });
    }

    addGifButtonToMessage(messageElement) {
        // Only add button if the message has images
        const images = messageElement.querySelectorAll('.ai-generated-image');
        if (images.length < 1) return;

        // Check if button already exists
        if (messageElement.querySelector('.gif-container')) return;

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'gif-container';
        
        // Create the GIF creator button
        const gifButton = document.createElement('button');
        gifButton.className = 'gif-creator-button';
        gifButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 8h.01"></path>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M3 8h18"></path>
                <path d="M8 21V8"></path>
            </svg>
            Create GIF from these images
        `;

        // Add click handler
        gifButton.addEventListener('click', () => {
            this.showImageSelectionInterface(messageElement, buttonContainer);
        });

        buttonContainer.appendChild(gifButton);
        
        // Add the button to the message
        const messageContent = messageElement.querySelector('.message-content');
        messageContent.appendChild(buttonContainer);
    }

    showImageSelectionInterface(messageElement, buttonContainer) {
        // Reset selected images
        this.selectedImages = [];
        
        // Create the image selection interface HTML (removed the cross-message notice)
        const selectionHTML = `
            <div class="gif-image-selector">
                <div class="gif-image-selection-header">Select images for your GIF</div>
                <div class="gif-image-selection-info">Images from this message are selected by default. You can also select images from other messages.</div>
                <div class="gif-image-list">
                    ${this.getImageSelectionItems(messageElement)}
                </div>
                <div class="gif-images-selected"><span id="selected-image-count">0</span> images selected</div>
                <div class="gif-creator-controls">
                    <button class="gif-cancel-button">Cancel</button>
                    <button class="gif-create-button">Create GIF</button>
                </div>
            </div>
            <div class="gif-settings">
                <label>
                    Delay (ms):
                    <input type="number" id="gif-delay" value="500" min="100" max="2000">
                </label>
                <label>
                    Repeat:
                    <input type="checkbox" id="gif-repeat" checked>
                </label>
            </div>
        `;

        // Replace the button with the selection interface
        buttonContainer.innerHTML = selectionHTML;

        // Add event listeners to image items
        this.setupImageSelectionListeners(buttonContainer, messageElement);

        // Add event listener for the create button
        const createButton = buttonContainer.querySelector('.gif-create-button');
        createButton.addEventListener('click', () => {
            if (this.selectedImages.length < 2) {
                alert('Please select at least 2 images to create a GIF.');
                return;
            }
            this.createGifFromSelectedImages(messageElement, buttonContainer);
        });

        // Add event listener for the cancel button
        const cancelButton = buttonContainer.querySelector('.gif-cancel-button');
        cancelButton.addEventListener('click', () => {
            this.resetGifCreator(buttonContainer);
        });

        // Update the selected count initially
        this.updateSelectedCount(buttonContainer);
    }

    getImageSelectionItems(currentMessageElement) {
        let htmlItems = '';
        
        // Get all AI messages with images
        const messagesContainer = document.getElementById('messages-container');
        const aiMessages = messagesContainer.querySelectorAll('.ai-message');
        
        aiMessages.forEach(message => {
            const images = message.querySelectorAll('.ai-generated-image');
            if (images.length === 0) return;
            
            let isCurrentMessage = message === currentMessageElement;
            
            images.forEach((img, index) => {
                // Generate a unique ID for this image
                const uniqueId = this.generateUniqueId();
                
                // Create the image item HTML with current-message class if applicable
                htmlItems += `
                    <div class="gif-image-item ${isCurrentMessage ? 'selected current-message' : ''}" 
                         data-id="${uniqueId}" 
                         data-src="${img.src}">
                        <img src="${img.src}" alt="GIF frame">
                    </div>
                `;
                
                // Auto-select images from the current message
                if (isCurrentMessage) {
                    this.selectedImages.push({
                        id: uniqueId,
                        src: img.src
                    });
                }
            });
        });
        
        return htmlItems;
    }

    setupImageSelectionListeners(container, messageElement) {
        // Add click listeners to all image items
        const imageItems = container.querySelectorAll('.gif-image-item');
        
        imageItems.forEach(item => {
            item.addEventListener('click', () => {
                const imageId = item.getAttribute('data-id');
                const imageSrc = item.getAttribute('data-src');
                
                if (item.classList.contains('selected')) {
                    // Deselect
                    item.classList.remove('selected');
                    this.selectedImages = this.selectedImages.filter(img => img.id !== imageId);
                } else {
                    // Select
                    item.classList.add('selected');
                    this.selectedImages.push({
                        id: imageId,
                        src: imageSrc
                    });
                }
                
                // Update the count
                this.updateSelectedCount(container);
            });
        });
    }

    updateSelectedCount(container) {
        const countElement = container.querySelector('#selected-image-count');
        if (countElement) {
            countElement.textContent = this.selectedImages.length;
        }
    }

    resetGifCreator(buttonContainer) {
        // Reset to the initial button
        buttonContainer.innerHTML = `
            <button class="gif-creator-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 8h.01"></path>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M3 8h18"></path>
                    <path d="M8 21V8"></path>
                </svg>
                Create GIF from these images
            </button>
        `;
        
        // Re-add click handler
        const gifButton = buttonContainer.querySelector('.gif-creator-button');
        const messageElement = buttonContainer.closest('.message');
        gifButton.addEventListener('click', () => {
            this.showImageSelectionInterface(messageElement, buttonContainer);
        });
    }

    createGifFromSelectedImages(messageElement, buttonContainer) {
        if (!this.isInitialized) {
            this.loadGifshotLibrary().then(() => {
                this.createGifFromSelectedImages(messageElement, buttonContainer);
            });
            return;
        }

        // Change interface to loading state
        buttonContainer.innerHTML = `
            <button class="gif-creator-button" disabled>
                <div class="gif-loader"><div></div><div></div></div>
                Creating GIF...
            </button>
        `;

        // Get settings
        const delayInput = buttonContainer.querySelector('#gif-delay');
        const repeatInput = buttonContainer.querySelector('#gif-repeat');
        
        // Default settings
        let delay = delayInput ? parseInt(delayInput.value) || 500 : 500;
        let repeat = repeatInput ? (repeatInput.checked ? 0 : 1) : 0; // 0 = repeat forever

        try {
            // Extract sources from selected images
            const imageSrcs = this.selectedImages.map(img => img.src);

            if (imageSrcs.length < 2) {
                throw new Error('Not enough images selected to create a GIF');
            }

            // Find optimal dimensions
            this.calculateOptimalDimensionsForSrcs(imageSrcs).then(dimensions => {
                // Create GIF with gifshot
                window.gifshot.createGIF({
                    images: imageSrcs,
                    gifWidth: dimensions.width,
                    gifHeight: dimensions.height,
                    interval: delay / 1000, // Convert to seconds
                    numWorkers: 2,
                    loop: repeat === 0, // true for infinite loop, false for play once
                    progressCallback: (progress) => {
                        // You could add a progress bar here if desired
                    }
                }, (result) => {
                    if (!result.error) {
                        // Update container with result
                        const resultHTML = `
                            <div class="gif-result">
                                <img src="${result.image}" alt="Generated GIF">
                                <div class="gif-result-actions">
                                    <button class="download-gif-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        Download GIF
                                    </button>
                                    <button class="recreate-gif-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 2v6h6"></path>
                                            <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
                                            <path d="M21 22v-6h-6"></path>
                                            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
                                        </svg>
                                        Recreate
                                    </button>
                                </div>
                            </div>
                            <button class="gif-creator-button save-gif-to-chat" style="margin-top: 16px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Save GIF to Chat
                            </button>
                        `;
                        
                        buttonContainer.innerHTML = resultHTML;
                        
                        // Add event listeners for download button
                        const downloadBtn = buttonContainer.querySelector('.download-gif-btn');
                        downloadBtn.addEventListener('click', () => {
                            const link = document.createElement('a');
                            link.href = result.image;
                            link.download = 'animation.gif';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        });
                        
                        // Add event listener for recreate button
                        const recreateBtn = buttonContainer.querySelector('.recreate-gif-btn');
                        recreateBtn.addEventListener('click', () => {
                            this.showImageSelectionInterface(messageElement, buttonContainer);
                        });
                        
                        // Add event listener for save to chat button
                        const saveToChat = buttonContainer.querySelector('.save-gif-to-chat');
                        saveToChat.addEventListener('click', () => {
                            this.saveGifToChat(messageElement, result.image);
                        });
                    } else {
                        throw new Error(result.errorMsg || 'Failed to create GIF');
                    }
                });
            }).catch(error => {
                console.error('Error creating GIF:', error);
                this.debugLog('Error creating GIF:', error);
                buttonContainer.innerHTML = `
                    <button class="gif-creator-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Error: ${error.message}. Try again
                    </button>
                `;
                
                // Add click handler to try again
                const retryButton = buttonContainer.querySelector('.gif-creator-button');
                retryButton.addEventListener('click', () => {
                    this.showImageSelectionInterface(messageElement, buttonContainer);
                });
            });
        } catch (error) {
            console.error('Error creating GIF:', error);
            this.debugLog('Error creating GIF:', error);
            buttonContainer.innerHTML = `
                <button class="gif-creator-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Error: ${error.message}. Try again
                </button>
            `;
            
            // Add click handler to try again
            const retryButton = buttonContainer.querySelector('.gif-creator-button');
            retryButton.addEventListener('click', () => {
                this.showImageSelectionInterface(messageElement, buttonContainer);
            });
        }
    }

    calculateOptimalDimensionsForSrcs(imageSrcs) {
        return new Promise((resolve) => {
            // Find the maximum dimensions
            let maxWidth = 0;
            let maxHeight = 0;
            let loadedCount = 0;
            
            imageSrcs.forEach(src => {
                const img = new Image();
                img.onload = () => {
                    maxWidth = Math.max(maxWidth, img.naturalWidth || 0);
                    maxHeight = Math.max(maxHeight, img.naturalHeight || 0);
                    
                    loadedCount++;
                    if (loadedCount === imageSrcs.length) {
                        // All images loaded, compute final dimensions
                        finalizeDimensions();
                    }
                };
                img.onerror = () => {
                    // Skip error images
                    loadedCount++;
                    if (loadedCount === imageSrcs.length) {
                        finalizeDimensions();
                    }
                };
                img.src = src;
            });
            
            // Handle case when all images load very quickly or fail
            function finalizeDimensions() {
                // Cap dimensions for performance
                const MAX_SIZE = 800;
                let width = maxWidth;
                let height = maxHeight;
                
                // Scale down if necessary
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height / width) * MAX_SIZE);
                        width = MAX_SIZE;
                    } else {
                        width = Math.round((width / height) * MAX_SIZE);
                        height = MAX_SIZE;
                    }
                }
                
                resolve({
                    width,
                    height,
                    ratio: width / height
                });
            }
        });
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    saveGifToChat(messageElement, gifDataUrl) {
        // Try to find app instance or window.app
        const app = window.app || document.app;
        if (!app) {
            console.error('App instance not found');
            this.debugLog('Failed to save GIF to chat: App instance not found');
            return;
        }
        
        try {
            this.debugLog('Saving GIF to chat');
            
            // Create a blob from data URL
            const blob = this.dataURLToBlob(gifDataUrl);
            const file = new File([blob], "generated_animation.gif", { type: "image/gif" });
            
            // Add to app's uploaded images if the function exists
            if (typeof app.addImageToChat === 'function') {
                app.addImageToChat(gifDataUrl, file);
            } else if (Array.isArray(app.uploadedImages)) {
                // Fallback if addImageToChat doesn't exist
                app.uploadedImages.push({
                    data: gifDataUrl,
                    file: file
                });
                
                // Try to show preview if the function exists
                if (typeof app.showImagePreviews === 'function') {
                    app.showImagePreviews();
                }
            }
            
            this.debugLog('GIF saved to chat successfully');
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'gif-success-message';
            successMsg.textContent = 'GIF added to chat input';
            messageElement.querySelector('.message-content').appendChild(successMsg);
            
            // Remove success message after a delay
            setTimeout(() => {
                successMsg.remove();
            }, 3000);
            
        } catch (error) {
            console.error('Error saving GIF to chat:', error);
            this.debugLog('Error saving GIF to chat:', error);
        }
    }
    
    dataURLToBlob(dataURL) {
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        
        return new Blob([uInt8Array], { type: contentType });
    }

    debugLog(message, data = null) {
        // Check if there's a global debug function
        if (typeof window.debugLog === 'function') {
            window.debugLog(`[GifCreator] ${message}`, data);
        } else if (window.app && typeof window.app.debugLog === 'function') {
            window.app.debugLog(`[GifCreator] ${message}`, data);
        } else {
            console.log(`[GifCreator] ${message}`, data);
        }
    }
}

// Initialize the GIF creator and add buttons to existing messages
document.addEventListener('DOMContentLoaded', () => {
    window.gifCreator = new GifCreator();
    
    // Add GIF creator buttons to all existing messages with images
    setTimeout(() => {
        const aiMessages = document.querySelectorAll('.ai-message');
        aiMessages.forEach(message => {
            const images = message.querySelectorAll('.ai-generated-image');
            if (images.length >= 2) {
                window.gifCreator.addGifButtonToMessage(message);
            }
        });
    }, 1000);
});

// Add a MutationObserver to watch for new messages and add GIF buttons
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach(node => {
                    if (node.classList && node.classList.contains('ai-message')) {
                        setTimeout(() => {
                            const images = node.querySelectorAll('.ai-generated-image');
                            if (images.length >= 1) {
                                if (window.gifCreator) {
                                    window.gifCreator.addGifButtonToMessage(node);
                                }
                            }
                        }, 500);
                    }
                });
            }
        });
    });
    
    // Start observing the messages container when the DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            observer.observe(messagesContainer, { childList: true, subtree: true });
        }
    });
}
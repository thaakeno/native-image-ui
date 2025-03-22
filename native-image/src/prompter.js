/**
 * Animation Prompter - A tool for creating animation sequences
 * Integrated with the chat interface to create frame-by-frame animations
 */
class Prompter {
    constructor() {
        this.isActive = false;
        this.isEnabled = false;
        this.currentPlan = null;
        this.currentPromptIndex = 0;
        this.generatedImages = [];
        this.animationFrames = [];
        this.animationIntervals = {};
        this.selectedImages = [];
        this.isGeneratingAllFrames = false;
        this.app = window.app || {};
        
        // Initialize when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Animation Prompter initializing...');
        
        // Check if prompter is enabled in localStorage
        const prompterSetting = localStorage.getItem('prompterEnabled');
        this.isEnabled = prompterSetting === 'true';
        
        // Set up the toggle in settings
        const prompterToggle = document.getElementById('prompter-toggle');
        if (prompterToggle) {
            // Set initial state
            prompterToggle.checked = this.isEnabled;
            
            // Add event listener
            prompterToggle.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                localStorage.setItem('prompterEnabled', isEnabled);
                this.updatePrompterState(isEnabled);
            });
        }
        
        // Add the button if prompter is enabled
        if (this.isEnabled) {
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                this.addPrompterButton(inputWrapper);
            }
        }
        
        // Set up the input observer to add the button when the input appears
        this.setupInputObserver();
        
        console.log('Animation Prompter initialized:', { enabled: this.isEnabled });
    }
    
    setupInputObserver() {
        // Observer to watch for input area changes or additions
        const observer = new MutationObserver((mutations) => {
            // Check if input wrapper exists but button doesn't
            const inputWrapper = document.querySelector('.input-wrapper');
            const button = document.querySelector('.prompter-toggle-btn');
            
            if (this.isEnabled && inputWrapper && !button) {
                this.addPrompterButton();
            }
        });
        
        // Start observing the document body for changes
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    addPrompterButton() {
        const inputWrapper = document.querySelector('.input-wrapper');
        if (!inputWrapper) return;
        
        // Remove existing button if any
        const existingButton = document.querySelector('.prompter-toggle-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Create the button
        const button = document.createElement('button');
        button.className = 'prompter-toggle-btn pulse';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
        `;
        button.setAttribute('title', 'Open Animation Prompter');
        
        // Add it to the input area (before the send button)
        const sendButton = inputWrapper.querySelector('#send-button');
        if (sendButton) {
            inputWrapper.insertBefore(button, sendButton);
        } else {
            inputWrapper.appendChild(button);
        }
        
        // Event listener to start prompter conversation
        button.addEventListener('click', () => {
            this.startPrompterConversation();
            // Remove pulse effect after first click
            button.classList.remove('pulse');
        });
    }

    removePrompterButton() {
        const button = document.querySelector('.prompter-toggle-btn');
        if (button) {
            button.remove();
        }
    }
    
    // This method will be called from app.js when the toggle changes
    updatePrompterState(isEnabled) {
        this.isEnabled = isEnabled;
        
        // Update UI based on new state
        if (this.isEnabled) {
            // If enabled, add the button if input is visible
            const inputWrapper = document.querySelector('.input-wrapper');
            if (inputWrapper) {
                this.addPrompterButton(inputWrapper);
            }
        } else {
            // If disabled, remove the button
            this.removePrompterButton();
            
            // If currently active, remove any prompter UI
            if (this.isActive) {
                this.isActive = false;
                // Remove any prompter-specific elements
                document.querySelectorAll('[data-prompter="true"]').forEach(el => {
                    el.remove();
                });
            }
        }
    }
    
    startPrompterConversation() {
        // Get the messages container
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        // Check if there's already an active prompter session
        if (this.isActive) {
            // Add a message reminding the user they're already in a prompter session
            this.showSystemMessage("You're already in an Animation Prompter session. Continue your conversation here.");
            return;
        }
        
        this.isActive = true;
        
        // Add system message to explain the prompter
        this.showSystemMessage("You're now talking to the Animation Prompter. I'll help you create animated sequences frame by frame.");
        
        // Add the first AI message to start the conversation
        this.addAIMessage(`
            <p>👋 Welcome to Animation Prompter!</p>
            <p>I'll help you create animated sequences frame by frame. Tell me what kind of animation you'd like to create, and I'll guide you through the process.</p>
            <p>For example, try:</p>
            <ul>
                <li>A sunset that gradually transitions to night with stars appearing</li>
                <li>A flower blooming from bud to full bloom</li>
                <li>A character walking through different seasons</li>
            </ul>
            <p>Describe the animation you want to create:</p>
        `);
    }
    
    showSystemMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `
            <div class="system-message-inner">
                <div class="system-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                ${message}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addAIMessage(html) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message prompter-message';
        messageDiv.setAttribute('data-prompter', 'true');
        
        messageDiv.innerHTML = `
            <div class="prompter-message-content">${html}</div>
        `;
        
        // Add to messages container
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // If this is the welcome message, add input area for user
        if (html.includes('Welcome to Animation Prompter')) {
            this.addPrompterInputArea(messageDiv);
        }
        
        return messageDiv;
    }
    
    addPrompterInputArea(messageElement) {
        // Create the input area
        const inputArea = document.createElement('div');
        inputArea.className = 'prompter-input-area';
        inputArea.innerHTML = `
            <div class="prompter-input-wrapper">
                <textarea class="prompter-textarea" placeholder="Describe your animation idea..."></textarea>
                <button class="prompter-image-btn" title="Add reference image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </button>
                <button class="prompter-send-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
            <input type="file" class="prompter-image-input" accept="image/*" style="display: none;">
            <div class="prompter-images-preview"></div>
        `;
        
        // Add to the message element
        messageElement.appendChild(inputArea);
        
        // Set up event listeners
        const textarea = inputArea.querySelector('.prompter-textarea');
        const sendButton = inputArea.querySelector('.prompter-send-btn');
        const imageButton = inputArea.querySelector('.prompter-image-btn');
        const imageInput = inputArea.querySelector('.prompter-image-input');
        
        // Focus the textarea
        textarea.focus();
        
        // Send button click
        sendButton.addEventListener('click', () => {
            this.handleSendPrompt(textarea, inputArea);
        });
        
        // Enter key in textarea
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendPrompt(textarea, inputArea);
            }
            
            // Auto-resize textarea
            setTimeout(() => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            }, 0);
        });
        
        // Image upload button
        imageButton.addEventListener('click', () => {
            imageInput.click();
        });
        
        // Image selection
        imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files, inputArea);
        });
        
        this.scrollToBottom();
    }
    
    handleSendPrompt(textarea, inputArea) {
        const text = textarea.value.trim();
        
        // Check if there's text or selected images
        if (!text && this.selectedImages.length === 0) {
            return;
        }
        
        // Get reference to images if any
        const uploadedImages = [...this.selectedImages];
        
        // Add user message
        this.addUserMessage(text, uploadedImages);
        
        // Clear input and images
        textarea.value = '';
        textarea.style.height = 'auto';
        this.selectedImages = [];
        
        // Clear image previews
        const previewContainer = inputArea.querySelector('.prompter-images-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        
        // Show loading message
        this.showLoading();
        
        // Process the prompt
        setTimeout(() => {
            if (!this.currentPlan) {
                this.createAnimationPlan(text, uploadedImages);
            } else {
                this.processFollowupAnswer(text, uploadedImages);
            }
        }, 1000);
    }
    
    addUserMessage(text, images = []) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.setAttribute('data-prompter', 'true');
        
        let messageContent = `<div class="message-content user-text">${text}</div>`;
        
        // Add to messages container
        messageDiv.innerHTML = messageContent;
        messagesContainer.appendChild(messageDiv);
        
        // Add images if any
        if (images && images.length > 0) {
            const imagesContainer = document.createElement('div');
            imagesContainer.className = 'image-container';
            
            images.forEach(img => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imgElement = document.createElement('img');
                    imgElement.src = e.target.result;
                    imgElement.alt = 'Uploaded image';
                    
                    imagesContainer.appendChild(imgElement);
                    messageDiv.appendChild(imagesContainer);
                    
                    // Scroll to bottom
                    this.scrollToBottom();
                };
                reader.readAsDataURL(img.file);
            });
        }
        
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    handleImageUpload(files, inputArea) {
        if (!files || files.length === 0) return;
        
        // Get preview container
        const previewContainer = inputArea.querySelector('.prompter-images-preview');
        if (!previewContainer) return;
        
        // Process each file
        Array.from(files).forEach(file => {
            // Check if it's an image
            if (!file.type.match('image.*')) return;
            
            // Create unique ID
            const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Store the file
            this.selectedImages.push({
                id: imageId,
                file: file
            });
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'prompter-image-preview-item';
                previewItem.dataset.id = imageId;
                
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Selected image">
                    <button class="prompter-remove-image" data-id="${imageId}">×</button>
                `;
                
                previewContainer.appendChild(previewItem);
                
                // Add remove button handler
                const removeBtn = previewItem.querySelector('.prompter-remove-image');
                removeBtn.addEventListener('click', () => {
                    this.removeSelectedImage(imageId, previewItem);
                });
            };
            
            reader.readAsDataURL(file);
        });
        
        // Reset file input
        const imageInput = inputArea.querySelector('.prompter-image-input');
        if (imageInput) {
            imageInput.value = '';
        }
    }
    
    removeSelectedImage(imageId, previewItem) {
        // Remove from array
        this.selectedImages = this.selectedImages.filter(img => img.id !== imageId);
        
        // Remove from UI
        if (previewItem && previewItem.parentNode) {
            previewItem.parentNode.removeChild(previewItem);
        }
    }
    
    showLoading() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message ai-message prompter-message loading-message';
        loadingDiv.setAttribute('data-prompter', 'true');
        
        loadingDiv.innerHTML = `
            <div class="prompter-message-content">
                <div class="prompter-loading">
                    <div class="prompter-loading-animation">
                        <div class="prompter-loading-dot"></div>
                        <div class="prompter-loading-dot"></div>
                        <div class="prompter-loading-dot"></div>
                    </div>
                    <div class="prompter-loading-text">Creating your animation plan...</div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
        
        return loadingDiv;
    }
    
    // Placeholder implementation - will be expanded in the next section
    createAnimationPlan(prompt, images = []) {
        // Remove loading message
        this.removeLoadingMessage();
        
        // Show that we're planning
        this.addAIMessage(`<p>I'm creating an animation plan for: <strong>${prompt}</strong></p>
            <p>Please wait while I design the frame sequence...</p>`);
            
        // Show new loading animation
        const loadingMsg = this.showLoading();
        
        // Create the animation plan
        this.createAnimationPlanWithAI(prompt, images)
            .then(plan => {
                // Remove loading message
                if (loadingMsg && loadingMsg.parentNode) {
                    loadingMsg.parentNode.removeChild(loadingMsg);
                }
                
                // Show the plan
                this.currentPlan = plan;
                this.showAnimationPlan();
            })
            .catch(error => {
                console.error('Error creating animation plan:', error);
                
                // Remove loading message
                if (loadingMsg && loadingMsg.parentNode) {
                    loadingMsg.parentNode.removeChild(loadingMsg);
                }
                
                // Show error message
                this.addAIMessage(`
                    <p>I encountered an error while creating your animation plan: ${error.message}</p>
                    <p>Please try again with a different description.</p>
                `);
            });
    }
    
    removeLoadingMessage() {
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage && loadingMessage.parentNode) {
            loadingMessage.parentNode.removeChild(loadingMessage);
        }
    }
    
    async createAnimationPlanWithAI(prompt, images = []) {
        try {
            // Check if we have access to the Gemini API
            if (!window.app || !window.app.model) {
                throw new Error('Gemini model not available. Please check your API key.');
            }
            
            // Process uploaded images if any
            const imageData = [];
            if (images && images.length > 0) {
                for (const img of images) {
                    const base64Data = await this.getImageDataFromFile(img.file);
                    imageData.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: img.file.type
                        }
                    });
                }
            }
            
            // Create a structured prompt for planning the animation
            const planPrompt = {
                contents: [{
                    role: 'user',
                    parts: [
                        // Add text prompt
                        {
                            text: `I need to create an animation sequence about: "${prompt}".
                            
Please create a detailed animation plan with the following structure:
1. A brief description of the overall animation concept
2. The recommended number of frames (between 3-8 frames)
3. A detailed description for each frame, including:
   - Frame number
   - Detailed visual description
   - Key visual elements to include
   - Transition notes to the next frame

Format your response as a JSON object with this structure:
{
  "concept": "Overall description of the animation",
  "frameCount": 5,
  "frames": [
    {
      "index": 0,
      "description": "Detailed description of what's in this frame",
      "elements": ["key element 1", "key element 2"],
      "transition": "How this frame transitions to the next"
    },
    ...more frames...
  ]
}

Do not include any text outside of this JSON structure. The JSON should be valid and parseable.`
                        },
                        // Add images if available
                        ...imageData,
                        // Add additional instructions if images are included
                        ...(imageData.length > 0 ? [{ 
                            text: "Use the provided reference image(s) to inform your animation plan. The animation should be based on or inspired by these images."
                        }] : [])
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    responseModalities: ['text']
                }
            };
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(planPrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate animation plan');
            }
            
            // Extract the response text
            const responseText = result.response.text();
            
            // Try to parse the JSON response
            let planData;
            try {
                // Find JSON in the response if there's any additional text
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    planData = JSON.parse(jsonMatch[0]);
                } else {
                    planData = JSON.parse(responseText);
                }
            } catch (parseError) {
                console.error('Failed to parse animation plan JSON:', parseError);
                console.log('Raw response:', responseText);
                
                // Create a fallback plan with basic structure
                planData = {
                    concept: prompt,
                    frameCount: 5,
                    frames: Array.from({ length: 5 }, (_, i) => ({
                        index: i,
                        description: `Frame ${i + 1} of the "${prompt}" animation`,
                        elements: [`Element for frame ${i + 1}`],
                        transition: i < 4 ? `Transition to frame ${i + 2}` : 'Final frame'
                    }))
                };
            }
            
            // Store the plan
            const plan = {
                prompt: prompt,
                concept: planData.concept,
                frameCount: planData.frameCount,
                frames: []
            };
            
            // Process each frame and generate detailed prompts
            for (let i = 0; i < planData.frameCount; i++) {
                const frameData = planData.frames[i] || { 
                    index: i,
                    description: `Frame ${i + 1}`,
                    elements: [],
                    transition: ''
                };
                
                // Create a rich prompt for generating this specific frame
                const framePrompt = this.generateFramePrompt(
                    prompt,
                    frameData.description,
                    i,
                    planData.frameCount,
                    frameData.elements,
                    frameData.transition
                );
                
                plan.frames.push({
                    index: i,
                    description: frameData.description,
                    elements: frameData.elements || [],
                    transition: frameData.transition || '',
                    prompt: framePrompt,
                    imageUrl: null,
                    status: 'pending' // pending, generating, complete, error
                });
            }
            
            return plan;
            
        } catch (error) {
            console.error('Error creating animation plan:', error);
            throw error;
        }
    }
    
    generateFramePrompt(originalPrompt, description, index, totalFrames, elements = [], transition = '') {
        // Create a detailed prompt for Gemini to generate this specific frame
        const elementsList = elements.length > 0 ? elements.join(", ") : "all relevant elements";
        const progress = Math.round((index / (totalFrames - 1)) * 100);
        
        return `Create a detailed, high-quality image for frame ${index + 1} of ${totalFrames} in an animation sequence about "${originalPrompt}".

Frame description: ${description}

This frame should include: ${elementsList}

This is ${progress}% through the animation sequence.
${transition ? `This frame transitions to the next by: ${transition}` : ''}

The style should be consistent with other frames in the sequence, with smooth transitions between states.`;
    }
    
    // Helper method to get base64 data from a file
    getImageDataFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                // Get the base64 data (remove the data:image/xyz;base64, prefix)
                const base64Data = e.target.result.split(',')[1];
                resolve(base64Data);
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read image file'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    showAnimationPlan() {
        if (!this.currentPlan) return;
        
        // Create AI message to display the plan
        const messageDiv = this.addAIMessage(`
            <p>I've created an animation plan with ${this.currentPlan.frameCount} frames based on your request:</p>
            <p><strong>Concept:</strong> ${this.currentPlan.concept}</p>
            <div class="prompter-frames-container"></div>
            <div class="prompter-actions">
                <button class="prompter-action-button prompter-generate-all">Generate All Frames</button>
                <button class="prompter-action-button prompter-export" disabled>Export as GIF</button>
            </div>
        `);
        
        // Get the frames container and add frames
        const framesContainer = messageDiv.querySelector('.prompter-frames-container');
        if (!framesContainer) return;
        
        // Add frames to container
        this.currentPlan.frames.forEach((frame, index) => {
            const frameElement = document.createElement('div');
            frameElement.className = 'prompter-frame';
            frameElement.dataset.index = index;
            
            frameElement.innerHTML = `
                <div class="prompter-frame-header">Frame ${index + 1}</div>
                <div class="prompter-frame-content">
                    <div class="prompter-frame-image-placeholder">
                        ${frame.imageUrl ? 
                            `<img src="${frame.imageUrl}" class="prompter-frame-image">
                             <div class="prompter-frame-info-icon" title="View Prompt">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                             </div>` 
                            : `<div>Frame ${index + 1}</div>`
                        }
                    </div>
                    <div class="prompter-frame-description">${frame.description}</div>
                </div>
                <div class="prompter-frame-actions">
                    <button class="prompter-frame-button prompter-generate-btn" data-index="${index}">Generate</button>
                    <button class="prompter-frame-button prompter-edit-btn" data-index="${index}">Edit Prompt</button>
                </div>
            `;
            
            framesContainer.appendChild(frameElement);
            
            // Add event listeners to the buttons
            const generateBtn = frameElement.querySelector('.prompter-generate-btn');
            if (generateBtn) {
                generateBtn.addEventListener('click', () => {
                    this.generateFrame(index);
                });
            }
            
            const editBtn = frameElement.querySelector('.prompter-edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    this.editFramePrompt(index);
                });
            }
            
            // Add event listener to the info icon if the frame has an image
            const infoIcon = frameElement.querySelector('.prompter-frame-info-icon');
            if (infoIcon) {
                infoIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFramePromptDialog(index);
                });
            }
        });
        
        // Add event listeners to action buttons
        const generateAllBtn = messageDiv.querySelector('.prompter-generate-all');
        if (generateAllBtn) {
            generateAllBtn.addEventListener('click', () => {
                this.generateAllFrames();
            });
        }
        
        const exportBtn = messageDiv.querySelector('.prompter-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAsGif();
            });
        }
        
        // Add input area for follow-up questions
        this.addPrompterInputArea(messageDiv);
    }
    
    processFollowupAnswer(answer, images = []) {
        // Remove loading message
        this.removeLoadingMessage();
        
        // Process uploaded images if any
        let imageMessage = '';
        if (images && images.length > 0) {
            imageMessage = `<p>I've also received your ${images.length} image(s) and will take them into account.</p>`;
        }
        
        // Customize the animation plan based on the user's answer
        // For simplicity, we'll just acknowledge and continue
        
        // Add confirmation message
        this.addAIMessage(`<p>Thanks for the details! I've noted your feedback.</p>${imageMessage}`);
        
        // Add input area for follow-up
        const messageDiv = this.addAIMessage(`<p>Would you like to generate all frames now or update any specific frame?</p>`);
        this.addPrompterInputArea(messageDiv);
    }
    
    editFramePrompt(index) {
        const frame = this.currentPlan.frames[index];
        if (!frame) return;
        
        // Create dialog for editing the prompt
        const dialog = document.createElement('div');
        dialog.className = 'prompter-dialog';
        dialog.innerHTML = `
            <div class="prompter-dialog-content edit-prompt-dialog">
                <div class="prompter-dialog-header">
                    <h3 class="prompter-dialog-title">Edit Frame ${index + 1} Prompt</h3>
                    <button class="prompter-dialog-close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="prompter-dialog-body">
                    <div class="prompter-prompt-instructions">
                        <p>Edit the prompt below to customize how this frame is generated. Be specific about visual elements, style, and composition.</p>
                    </div>
                    
                    <div class="prompter-textarea-container">
                        <textarea class="prompter-dialog-textarea" rows="8">${frame.prompt}</textarea>
                    </div>
                    
                    <div class="prompter-prompt-tips">
                        <div class="prompter-tip-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <div class="prompter-tip-text">
                            <span>Tip:</span> Include specific details about lighting, color, perspective, and the transition to the next frame.
                        </div>
                    </div>
                </div>
                
                <div class="prompter-dialog-actions">
                    <button class="prompter-dialog-button prompter-dialog-cancel">Cancel</button>
                    <button class="prompter-dialog-button prompter-dialog-save">Save Changes</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Make the dialog visible with a small delay for the animation
        setTimeout(() => {
            dialog.classList.add('active');
            // Focus the textarea
            dialog.querySelector('.prompter-dialog-textarea').focus();
        }, 10);
        
        // Setup event listeners
        const cancelBtn = dialog.querySelector('.prompter-dialog-cancel');
        const closeBtn = dialog.querySelector('.prompter-dialog-close');
        const saveBtn = dialog.querySelector('.prompter-dialog-save');
        const textarea = dialog.querySelector('.prompter-dialog-textarea');
        
        const closeDialog = () => {
            dialog.classList.remove('active');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        };
        
        cancelBtn.addEventListener('click', closeDialog);
        closeBtn.addEventListener('click', closeDialog);
        
        // Auto resize text area as user types
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
        });
        
        // Trigger resize initially
        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
        }, 50);
        
        saveBtn.addEventListener('click', () => {
            const newPrompt = textarea.value.trim();
            if (newPrompt) {
                // Show save animation
                saveBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Saved!
                `;
                saveBtn.classList.add('saved');
                
                this.currentPlan.frames[index].prompt = newPrompt;
                // Update the description in the UI
                const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
                if (frameElement) {
                    const descriptionElement = frameElement.querySelector('.prompter-frame-description');
                    if (descriptionElement) {
                        descriptionElement.textContent = frame.description + ' (prompt edited)';
                    }
                }
                
                // Close after a brief delay to show the checkmark
                setTimeout(closeDialog, 600);
            } else {
                // Show error if empty
                textarea.classList.add('error');
                setTimeout(() => {
                    textarea.classList.remove('error');
                }, 800);
            }
        });
        
        // Allow closing with escape key
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escListener);
            }
        });
    }
    
    showFramePromptDialog(index) {
        const frame = this.currentPlan.frames[index];
        if (!frame) return;
        
        // Create dialog for showing the prompt
        const dialog = document.createElement('div');
        dialog.className = 'prompter-dialog';
        dialog.innerHTML = `
            <div class="prompter-dialog-content">
                <h3 class="prompter-dialog-title">Frame ${index + 1} Details</h3>
                
                <div class="prompter-dialog-section">
                    <h4 class="prompter-dialog-section-title">Description</h4>
                    <p class="prompter-dialog-prompt">${frame.description}</p>
                </div>
                
                <div class="prompter-dialog-section">
                    <h4 class="prompter-dialog-section-title">Full Prompt Used</h4>
                    <p class="prompter-dialog-prompt">${frame.prompt}</p>
                </div>
                
                ${frame.imageUrl ? `
                <div class="prompter-dialog-section">
                    <h4 class="prompter-dialog-section-title">Generated Image</h4>
                    <img src="${frame.imageUrl}" class="prompter-dialog-image">
                </div>
                ` : ''}
                
                <div class="prompter-dialog-actions">
                    <button class="prompter-dialog-button prompter-dialog-save">Close</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Make the dialog visible with a small delay for the animation
        setTimeout(() => {
            dialog.classList.add('active');
        }, 10);
        
        // Setup event listener for close button
        const closeBtn = dialog.querySelector('.prompter-dialog-save');
        closeBtn.addEventListener('click', () => {
            dialog.classList.remove('active');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        });
    }
    
    generateFrame(index) {
        if (!this.currentPlan || !this.currentPlan.frames[index]) return;
        
        const frame = this.currentPlan.frames[index];
        frame.status = 'generating';
        
        // Update UI to show generating state
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
        if (frameElement) {
            const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <div class="prompter-frame-loading">
                        <div class="prompter-frame-spinner"></div>
                        <span>Generating...</span>
                    </div>
                `;
            }
            
            // Disable the generate button
            const generateBtn = frameElement.querySelector('.prompter-generate-btn');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generating...';
            }
        }
        
        // Generate the frame using the Gemini API
        this.generateImageWithGemini(index);
    }
    
    async generateImageWithGemini(index) {
        try {
            // Get access to the app's Gemini model
            if (!window.app || !window.app.model) {
                console.error('Gemini model not available');
                this.handleGenerationError(index, 'Gemini model not initialized. Please check your API key.');
                return;
            }
            
            const frame = this.currentPlan.frames[index];
            
            // Find previous frame if available (for continuity)
            let previousFrameImage = null;
            if (index > 0 && this.currentPlan.frames[index - 1].imageUrl) {
                // Get the previous frame as a base to create continuity
                previousFrameImage = await this.getImageDataFromUrl(this.currentPlan.frames[index - 1].imageUrl);
            }
            
            // Create parts for the prompt
            const promptParts = [];
            
            // Add text prompt
            promptParts.push({
                text: `Generate ONLY AN IMAGE for animation frame ${index + 1} of ${this.currentPlan.frameCount}:\n\n${frame.prompt}\n\nThis should be a high-quality, detailed image that will be part of an animation sequence. DO NOT generate any text. PROVIDE ONLY THE IMAGE.`
            });
            
            // Add previous frame image if available (for better continuity)
            if (previousFrameImage) {
                promptParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: previousFrameImage
                    }
                });
                
                // Add specific instruction for continuity
                promptParts.push({
                    text: "Use the provided reference image as a base for continuity. Maintain the same style, lighting, and key elements while adjusting for the described animation progress. PROVIDE ONLY THE IMAGE, NO TEXT."
                });
            }
            
            // Get temperature from app config if available
            const temperature = window.app.config?.temperature || 0.7;
            
            // Create a structured prompt for the frame
            const structuredPrompt = {
                contents: [{
                    role: 'user',
                    parts: promptParts
                }],
                generationConfig: {
                    temperature: temperature,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    responseModalities: ["image", "text"],
                    responseMimeType: "text/plain"
                },
                model: 'gemini-2.0-flash-exp-image-generation'
            };
            
            console.log(`Generating frame ${index + 1} with prompt:`, frame.prompt);
            
            // Update UI to show magical generating animation
            this.updateGeneratingAnimation(index);
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(structuredPrompt);
            
            if (result && result.response && result.response.candidates && 
                result.response.candidates[0] && 
                result.response.candidates[0].content && 
                result.response.candidates[0].content.parts) {
                
                const parts = result.response.candidates[0].content.parts;
                
                // Find the image part
                const imagePart = parts.find(part => part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/'));
                
                if (imagePart && imagePart.inlineData) {
                    // Cancel the animation interval
                    if (this.animationIntervals[index]) {
                        clearInterval(this.animationIntervals[index]);
                        this.animationIntervals[index] = null;
                    }
                    
                    // Create a data URL from the image data
                    const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    
                    // Update the UI with the generated image
                    this.handleGeneratedImage(index, imageUrl);
                    
                    // If this was frame 0 and there are more frames, automatically start next frame
                    if (index === 0 && this.currentPlan.frames.length > 1) {
                        setTimeout(() => {
                            this.generateFrame(1);
                        }, 500);
                    }
                    
                    return true; // Success
                } else {
                    this.handleGenerationError(index, 'No image was generated. The API only returned text. Try adjusting your prompt.');
                    return false;
                }
            } else {
                this.handleGenerationError(index, 'Failed to generate image. The API returned an unexpected response.');
                return false;
            }
        } catch (error) {
            console.error('Error generating image with Gemini:', error);
            this.handleGenerationError(index, `Error: ${error.message || 'Unknown error'}`);
            return false;
        }
    }
    
    // Helper method to get base64 data from an image URL
    async getImageDataFromUrl(url) {
        return new Promise((resolve, reject) => {
            // If it's already a data URL with base64 encoding
            if (url.startsWith('data:image')) {
                // Extract the base64 part
                const base64Data = url.split(',')[1];
                resolve(base64Data);
                return;
            }
            
            // Otherwise, load the image and convert to canvas/base64
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Handle CORS
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Get as base64 without the prefix
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64Data = dataUrl.split(',')[1];
                
                resolve(base64Data);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            
            img.src = url;
        });
    }
    
    // Update the generating animation with a magical effect
    updateGeneratingAnimation(index) {
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
        if (!frameElement) return;
        
        const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
        if (!placeholder) return;
        
        // Set up the initial loading animation container
        placeholder.innerHTML = `
            <div class="prompter-magical-loading">
                <div class="prompter-magical-particles"></div>
                <div class="prompter-magical-glow"></div>
                <div class="prompter-magical-text">
                    <span>Generating frame ${index + 1}...</span>
                </div>
            </div>
        `;
        
        // Clear any existing animation interval
        if (this.animationIntervals[index]) {
            clearInterval(this.animationIntervals[index]);
        }
        
        // Create magical particles
        const particlesContainer = placeholder.querySelector('.prompter-magical-particles');
        const glowElement = placeholder.querySelector('.prompter-magical-glow');
        const textElement = placeholder.querySelector('.prompter-magical-text span');
        
        // Create initial particles
        for (let i = 0; i < 15; i++) {
            this.createParticle(particlesContainer);
        }
        
        // Animation states
        let phase = 0;
        const phases = ['Analyzing prompt', 'Creating composition', 'Adding details', 'Finalizing image'];
        
        // Update animation at intervals
        this.animationIntervals[index] = setInterval(() => {
            // Add new particles
            for (let i = 0; i < 2; i++) {
                this.createParticle(particlesContainer);
            }
            
            // Update glow
            const hue = (Date.now() / 50) % 360;
            glowElement.style.boxShadow = `0 0 30px 10px hsla(${hue}, 100%, 70%, 0.3)`;
            
            // Update text periodically
            if (Math.random() > 0.95) {
                phase = (phase + 1) % phases.length;
                textElement.textContent = `${phases[phase]}...`;
            }
        }, 200);
    }
    
    // Create a single magical particle
    createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'prompter-particle';
        
        // Random position, size and color
        const size = Math.random() * 6 + 2;
        const hue = Math.floor(Math.random() * 360);
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = `hsla(${hue}, 100%, 70%, 0.8)`;
        
        // Position randomly within container
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Add animation
        particle.style.animationDuration = `${1 + Math.random() * 2}s`;
        particle.style.animationDelay = `${Math.random() * 0.5}s`;
        
        container.appendChild(particle);
        
        // Remove particle after animation completes
        setTimeout(() => {
            if (container.contains(particle)) {
                container.removeChild(particle);
            }
        }, 3000);
    }
    
    handleGenerationError(index, errorMessage) {
        if (!this.currentPlan || !this.currentPlan.frames[index]) return;
        
        const frame = this.currentPlan.frames[index];
        frame.status = 'error';
        frame.errorMessage = errorMessage;
        
        // Update UI to show error state
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
        if (frameElement) {
            const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <div class="prompter-frame-loading">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f44336;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Generation failed</span>
                    </div>
                `;
            }
            
            // Enable the generate button for retry
            const generateBtn = frameElement.querySelector('.prompter-generate-btn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Retry';
            }
        }

        // If we're generating all frames sequentially, continue to the next frame despite the error
        if (this.isGeneratingAllFrames && index < this.currentPlan.frames.length - 1) {
            console.log(`Frame ${index + 1} failed, continuing to next frame...`);
            setTimeout(() => {
                this.generateFrame(index + 1);
            }, 500);
        }
    }
    
    handleGeneratedImage(index, imageUrl) {
        if (!this.currentPlan || !this.currentPlan.frames[index]) return;
        
        const frame = this.currentPlan.frames[index];
        frame.imageUrl = imageUrl;
        frame.status = 'complete';
        
        // Update UI with the generated image
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
        if (frameElement) {
            const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <img src="${imageUrl}" class="prompter-frame-image">
                    <div class="prompter-frame-info-icon" title="View Prompt">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                `;
                
                // Add event listener to the info icon
                const infoIcon = placeholder.querySelector('.prompter-frame-info-icon');
                if (infoIcon) {
                    infoIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showFramePromptDialog(index);
                    });
                }
            }
            
            // Update the generate button
            const generateBtn = frameElement.querySelector('.prompter-generate-btn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Regenerate';
            }
        }
        
        // Save the generated image
        this.generatedImages[index] = imageUrl;
        
        // Check if all frames are complete and enable export button if so
        this.checkAllFramesComplete();
        
        // If we're generating all frames sequentially, continue to the next frame
        if (this.isGeneratingAllFrames && index < this.currentPlan.frames.length - 1) {
            setTimeout(() => {
                this.generateFrame(index + 1);
            }, 500);
        }
    }
    
    checkAllFramesComplete() {
        if (!this.currentPlan || !this.currentPlan.frames) return;
        
        let allComplete = true;
        
        for (const frame of this.currentPlan.frames) {
            if (frame.status !== 'complete') {
                allComplete = false;
                break;
            }
        }
        
        // Enable export button if all frames are complete
        const exportBtn = document.querySelector('.prompter-export');
        if (exportBtn) {
            exportBtn.disabled = !allComplete;
        }
        
        // Add message when all frames are generated
        if (allComplete) {
            // Reset the flag since all frames are now complete
            this.isGeneratingAllFrames = false;
            
            const messageDiv = this.addAIMessage(`
                <p>All frames have been generated successfully! You can now:</p>
                <ol>
                    <li>Export the frames as a GIF animation</li>
                    <li>Regenerate any frames you want to modify</li>
                    <li>Continue the conversation with any questions or changes</li>
                </ol>
            `);
            this.addPrompterInputArea(messageDiv);
        }
    }
    
    generateAllFrames() {
        if (!this.currentPlan || !this.currentPlan.frames) return;
        
        // Set flag that we're generating all frames sequentially
        this.isGeneratingAllFrames = true;
        
        // Start with the first frame
        this.generateFrame(0);
        
        // Add a message to indicate we're generating all frames
        this.addAIMessage(`
            <p>I'm now generating all ${this.currentPlan.frameCount} frames of your animation in sequence.</p>
            <p>This process may take a few moments for each frame. The frames will appear as they're created.</p>
        `);
    }
    
    exportAsGif() {
        if (!this.currentPlan || !this.currentPlan.frames.length === 0) return;
        
        // Check if all frames are complete
        let allFramesReady = true;
        const frameImages = [];
        
        for (let i = 0; i < this.currentPlan.frames.length; i++) {
            const frame = this.currentPlan.frames[i];
            if (frame.status !== 'complete' || !frame.imageUrl) {
                allFramesReady = false;
                break;
            }
            frameImages.push(frame.imageUrl);
        }
        
        if (!allFramesReady) {
            this.addAIMessage(`
                <p>Cannot export animation: some frames are not yet generated.</p>
                <p>Please generate all frames before exporting.</p>
            `);
            return;
        }
        
        // Show loading message
        const loadingMessage = this.addAIMessage(`
            <p>Creating your animation, please wait...</p>
            <div class="prompter-loading">
                <div class="prompter-loading-animation">
                    <div class="prompter-loading-dot"></div>
                    <div class="prompter-loading-dot"></div>
                    <div class="prompter-loading-dot"></div>
                </div>
            </div>
        `);
        
        // Create the GIF
        this.createGif(frameImages)
            .then(gifBlob => {
                // Remove loading message
                if (loadingMessage && loadingMessage.parentNode) {
                    loadingMessage.parentNode.removeChild(loadingMessage);
                }
                
                // Create object URL for the GIF
                const gifUrl = URL.createObjectURL(gifBlob);
                
                // Add success message with preview and download link
                const messageDiv = this.addAIMessage(`
                    <p>Your animation is ready! Here's a preview:</p>
                    <div class="prompter-animation-preview">
                        <img src="${gifUrl}" alt="Animation GIF" class="prompter-animation-gif">
                    </div>
                    <p>You can download it using the button below:</p>
                    <div class="prompter-download-container">
                        <a href="${gifUrl}" download="animation.gif" class="prompter-download-button">
                            Download GIF
                        </a>
                    </div>
                `);
                
                // Add input area for further questions
                this.addPrompterInputArea(messageDiv);
            })
            .catch(error => {
                console.error('Error creating GIF:', error);
                
                // Remove loading message
                if (loadingMessage && loadingMessage.parentNode) {
                    loadingMessage.parentNode.removeChild(loadingMessage);
                }
                
                // Show error message
                this.addAIMessage(`
                    <p>I encountered an error while creating your animation: ${error.message}</p>
                    <p>Please try again or consider using fewer frames.</p>
                `);
            });
    }
    
    async createGif(frameUrls) {
        // Load gifshot library dynamically if not already loaded
        await this.loadGifshotLibrary();
        
        return new Promise(async (resolve, reject) => {
            try {
                // Load all images first
                const images = frameUrls;
                
                // Calculate optimal dimensions
                const dimensions = await this.calculateOptimalDimensions(images);
                
                // Create GIF with gifshot
                window.gifshot.createGIF({
                    images: images,
                    gifWidth: dimensions.width,
                    gifHeight: dimensions.height,
                    interval: 0.2, // 200ms between frames
                    numFrames: images.length,
                    frameDuration: 1,
                    sampleInterval: 10,
                    progressCallback: (progress) => {
                        console.log('GIF creation progress:', Math.round(progress * 100) + '%');
                    }
                }, (result) => {
                    if (!result.error) {
                        // Convert the data URL to a Blob
                        const binaryString = window.atob(result.image.split(',')[1]);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        const blob = new Blob([bytes.buffer], { type: 'image/gif' });
                        
                        resolve(blob);
                    } else {
                        reject(new Error(result.errorMsg || 'Failed to create GIF'));
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async loadGifshotLibrary() {
        return new Promise((resolve, reject) => {
            // Check if gifshot is already loaded
            if (window.gifshot) {
                resolve();
                return;
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js';
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load gifshot library'));
            
            // Add to document head
            document.head.appendChild(script);
        });
    }
    
    async calculateOptimalDimensions(imageSrcs) {
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
                const MAX_SIZE = 512;
                let width = maxWidth || 512;
                let height = maxHeight || 512;
                
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
    
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                // Create a canvas to normalize the image size
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                
                const ctx = canvas.getContext('2d');
                // Draw with object-fit: cover style
                const imgRatio = img.width / img.height;
                const canvasRatio = canvas.width / canvas.height;
                
                let drawWidth, drawHeight, drawX, drawY;
                
                if (imgRatio > canvasRatio) {
                    // Image is wider than canvas ratio, crop width
                    drawHeight = canvas.height;
                    drawWidth = img.width * (canvas.height / img.height);
                    drawX = -(drawWidth - canvas.width) / 2;
                    drawY = 0;
                } else {
                    // Image is taller than canvas ratio, crop height
                    drawWidth = canvas.width;
                    drawHeight = img.height * (canvas.width / img.width);
                    drawX = 0;
                    drawY = -(drawHeight - canvas.height) / 2;
                }
                
                // Draw the image centered and cropped to fit
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                
                resolve(canvas);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    }
}

// Initialize the prompter when the page loads
window.addEventListener('DOMContentLoaded', () => {
    window.prompter = new Prompter();
    window.prompter.init();
});

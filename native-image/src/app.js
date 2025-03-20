import { GoogleGenerativeAI } from "@google/generative-ai";
import { marked } from "marked";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messagesContainer = document.getElementById('messages-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const inputWrapper = document.querySelector('.input-wrapper');
    const settingsButton = document.getElementById('settings-button');
    const themeToggle = document.getElementById('theme-toggle');
    const settingsModal = document.getElementById('settings-modal');
    const closeButton = document.querySelector('.close-button');
    const apiKeyInput = document.getElementById('api-key');
    const saveApiKeyButton = document.getElementById('save-api-key');
    const temperatureSlider = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperature-value');
    const maxTokensSlider = document.getElementById('max-tokens');
    const maxTokensValue = document.getElementById('max-tokens-value');
    const debugToggle = document.getElementById('debug-toggle');
    const debugPanel = document.getElementById('debug-panel');
    const debugContent = document.getElementById('debug-content');
    const debugCollapseBtn = document.getElementById('debug-collapse');
    const clearDebug = document.getElementById('clear-debug');
    const imageUploadButton = document.getElementById('image-upload-button');
    const imageInput = document.getElementById('image-input');
    const toggleApiVisibility = document.getElementById('toggle-api-visibility');
    const newChatBtn = document.getElementById('new-chat-btn');
    const systemInstructionsBtn = document.getElementById('system-instructions-btn');
    const systemInstructionsModal = document.getElementById('system-instructions-modal');
    const closeSystemInstructionsBtn = document.getElementById('close-system-instructions');
    const systemInstructionsInput = document.getElementById('system-instructions-input');
    const saveSystemInstructionsBtn = document.getElementById('save-system-instructions');
    const resetSystemInstructionsBtn = document.getElementById('reset-system-instructions');
    const carouselToggle = document.getElementById('carousel-toggle');

    // Default system instruction
    const DEFAULT_SYSTEM_INSTRUCTION = "You are an advanced AI assistant. Be helpful, accurate, and concise in your responses. If you're unsure about something, acknowledge it rather than making up information. You can generate both text responses and images based on user requests.";

    // Array to store uploaded images
    let uploadedImages = [];

    // Configure marked renderer with syntax highlighting
    marked.setOptions({
        renderer: new marked.Renderer(),
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-',
        breaks: true,
        gfm: true
    });

    // Configuration
    let config = {
        apiKey: localStorage.getItem('gemini-api-key') || '',
        temperature: parseFloat(localStorage.getItem('temperature')) || 1.0,
        maxOutputTokens: parseInt(localStorage.getItem('maxOutputTokens')) || 8192,
        debugMode: localStorage.getItem('debugMode') === 'true' || false,
        tactileMode: localStorage.getItem('tactileMode') === 'true' || false,
        systemInstruction: localStorage.getItem('systemInstruction') || DEFAULT_SYSTEM_INSTRUCTION,
        carouselEnabled: localStorage.getItem('carouselEnabled') !== 'false' // Default to true if not set
    };

    // Initialize settings
    apiKeyInput.value = config.apiKey;
    temperatureSlider.value = config.temperature;
    temperatureValue.textContent = config.temperature;
    maxTokensSlider.value = config.maxOutputTokens;
    maxTokensValue.textContent = config.maxOutputTokens;
    debugToggle.checked = config.debugMode;
    systemInstructionsInput.value = config.systemInstruction;
    
    // Set carousel toggle initial state
    carouselToggle.checked = config.carouselEnabled;

    // Initialize theme selection
    const themeSelector = document.getElementById('theme-selector');
    const currentTheme = config.tactileMode ? 'onyx' : 'mint';
    themeSelector.value = currentTheme;
    document.documentElement.setAttribute('data-tactile', config.tactileMode);

    // Theme selector event listener
    themeSelector.addEventListener('change', () => {
        document.documentElement.classList.add('tactile-transitioning');

        // Short delay for smoother transition
        setTimeout(() => {
            config.tactileMode = themeSelector.value === 'onyx';
            localStorage.setItem('tactileMode', config.tactileMode);
            document.documentElement.setAttribute('data-tactile', config.tactileMode);

            if (config.debugMode) {
                debugLog('Theme changed to ' + themeSelector.value);
            }

            // Remove transitioning class after transition completes
            setTimeout(() => {
                document.documentElement.classList.remove('tactile-transitioning');
            }, 500);
        }, 50);
    });

    // Apply saved theme (default to dark if none saved)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Apply debug mode settings
    if (config.debugMode) {
        debugPanel.style.display = 'block';
    }

    // Apply theme icon based on current theme
    const currentThemeIcon = document.documentElement.getAttribute('data-theme');
    document.querySelector('.theme-icon-dark').style.display = currentThemeIcon === 'dark' ? 'block' : 'none';
    document.querySelector('.theme-icon-light').style.display = currentThemeIcon === 'light' ? 'block' : 'none';

    // Chat history
    let chatHistory = [];

    // Initialize chat history manager
    let historyManager;

    // Debug logging function
    function debugLog(message, data = null) {
        if (!config.debugMode) return;

        const timestamp = new Date().toLocaleTimeString();
        let logEntry = document.createElement('div');
        logEntry.className = 'debug-entry';

        // Add a horizontal separator line before "Sending message" entries
        if (message.includes('Sending message')) {
            const separator = document.createElement('hr');
            separator.className = 'debug-separator';
            debugContent.appendChild(separator);
        }

        // Add timestamp with styling
        let timeStamp = document.createElement('span');
        timeStamp.className = 'debug-timestamp';
        timeStamp.textContent = `[${timestamp}]`;

        // Add message with styling
        let msgElement = document.createElement('span');
        msgElement.className = 'debug-message';
        msgElement.textContent = message;

        // Assemble the log entry header
        logEntry.appendChild(timeStamp);
        logEntry.appendChild(msgElement);

        // Process any data that was passed
        if (data) {
            try {
                if (typeof data === 'object') {
                    // Create a sanitized copy of the data to avoid large base64 content
                    let sanitizedData = JSON.parse(JSON.stringify(data));

                    // Remove large base64 data
                    if (sanitizedData.response && sanitizedData.response.candidates) {
                        sanitizedData.response.candidates.forEach(candidate => {
                            if (candidate.content && candidate.content.parts) {
                                candidate.content.parts.forEach((part, index) => {
                                    if (part.inlineData && part.inlineData.data && part.inlineData.data.length > 100) {
                                        part.inlineData.data = `[Base64 data (${part.inlineData.data.length} chars) omitted]`;
                                        part._debugInfo = `Part ${index}: inlineData (image)`;
                                    } else if (part.text) {
                                        part._debugInfo = `Part ${index}: text (${part.text.length} chars)`;
                                        if (part.text.length > 100) {
                                            part._textSnippet = part.text.substring(0, 100) + "...";
                                        }
                                    }
                                });
                            }
                        });
                    }

                    // Format with syntax highlighting
                    const formattedData = syntaxHighlightJson(sanitizedData);

                    // Create a container for JSON data
                    let dataContainer = document.createElement('div');
                    dataContainer.className = 'json-viewer';
                    dataContainer.innerHTML = formattedData;

                    logEntry.appendChild(dataContainer);
                } else {
                    let dataElement = document.createElement('div');
                    dataElement.className = 'debug-data';
                    dataElement.textContent = String(data);
                    logEntry.appendChild(dataElement);
                }
            } catch (error) {
                let errorElement = document.createElement('div');
                errorElement.className = 'debug-error';
                errorElement.textContent = `[Error processing data: ${error.message}]`;
                logEntry.appendChild(errorElement);
            }
        }

        debugContent.appendChild(logEntry);

        // Auto-scroll to bottom
        debugContent.scrollTop = debugContent.scrollHeight;

        // Log to console as well
        console.log(`[DEBUG] ${message}`, data);
    }

    // Helper function to syntax highlight JSON
    function syntaxHighlightJson(json) {
        const jsonStr = JSON.stringify(json, null, 2);
        return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                    match = match.substr(0, match.length - 1) + '<span class="json-syntax">:</span>';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        })
        .replace(/\{|\}/g, match => `<span class="json-bracket">${match}</span>`)
        .replace(/\[|\]/g, match => `<span class="json-bracket">${match}</span>`)
        .replace(/,/g, '<span class="json-syntax">,</span>');
    }

    // Event Listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        const newHeight = Math.min(this.scrollHeight, 150);
        this.style.height = newHeight + 'px';
    });

    userInput.addEventListener('paste', handlePaste);

    function handlePaste(event) {
        const items = (event.clipboardData || event.clipboardData).items;
        let blob = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                blob = items[i].getAsFile();
                break;
            }
        }

        if (blob !== null) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;

                // Create an image element to get dimensions
                const img = new Image();
                img.onload = () => {
                    const file = new File([blob], "pasted_image.png", { type: blob.type });
                    uploadedImages.push({
                        data: imageData,
                        file: file,
                        width: img.width,
                        height: img.height
                    });

                    debugLog('Image pasted', {
                        name: file.name,
                        size: `${(file.size / 1024).toFixed(2)} KB`,
                        type: file.type,
                        dimensions: `${img.width}x${img.height}`
                    });

                    // Show image preview
                    showImagePreviews();

                    // If we have ImageViewer, enhance new preview images
                    setTimeout(() => {
                        if (window.imageViewer) {
                            document.querySelectorAll('.image-preview img').forEach(img => {
                                window.imageViewer.enhanceImage(img);
                            });
                        }
                    }, 100);
                };
                img.src = imageData;
            };
            reader.readAsDataURL(blob);
            event.preventDefault();
        }
    }

    // Toggle API key visibility
    toggleApiVisibility.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiVisibility.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
            `;
        } else {
            apiKeyInput.type = 'password';
            toggleApiVisibility.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            `;
        }
    });

    // Settings and theme buttons
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        setTimeout(() => {
            settingsModal.style.opacity = '1';
            document.querySelector('.modal-content').style.transform = 'translateY(0)';
        }, 10);
    });

    closeButton.addEventListener('click', () => {
        document.querySelector('.modal-content').style.transform = 'translateY(-30px)';
        settingsModal.style.opacity = '0';
        setTimeout(() => {
            settingsModal.style.display = 'none';
        }, 300);
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            document.querySelector('.modal-content').style.transform = 'translateY(-30px)';
            settingsModal.style.opacity = '0';
            setTimeout(() => {
                settingsModal.style.display = 'none';
            }, 300);
        }
    });

    saveApiKeyButton.addEventListener('click', saveApiKey);

    temperatureSlider.addEventListener('input', () => {
        const value = parseFloat(temperatureSlider.value);
        temperatureValue.textContent = value.toFixed(1);
        config.temperature = value;
        localStorage.setItem('temperature', value);
        debugLog('Temperature updated', value);
    });

    maxTokensSlider.addEventListener('input', () => {
        const value = parseInt(maxTokensSlider.value);
        maxTokensValue.textContent = value;
        config.maxOutputTokens = value;
        localStorage.setItem('maxOutputTokens', value);
        debugLog('Max tokens updated', value);
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        // Add a transitioning class to the root element
        document.documentElement.classList.add('theme-transitioning');

        // Apply new theme with a slight delay to allow for smoother transition
        setTimeout(() => {
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Toggle icon visibility
            document.querySelector('.theme-icon-dark').style.display = newTheme === 'dark' ? 'block' : 'none';
            document.querySelector('.theme-icon-light').style.display = newTheme === 'light' ? 'block' : 'none';

            debugLog('Theme switched to', newTheme);

            // Remove transitioning class after transition completes
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 500);
        }, 50);
    });

    // Debug mode toggle
    debugToggle.addEventListener('change', () => {
        config.debugMode = debugToggle.checked;
        localStorage.setItem('debugMode', config.debugMode);
        
        if (config.debugMode) {
            debugPanel.style.display = 'block';
            setTimeout(() => {
                debugPanel.style.opacity = '1';
            }, 10);
        } else {
            debugPanel.style.opacity = '0';
            setTimeout(() => {
                debugPanel.style.display = 'none';
            }, 300);
        }
    });
    
    // Carousel toggle
    carouselToggle.addEventListener('change', () => {
        config.carouselEnabled = carouselToggle.checked;
        localStorage.setItem('carouselEnabled', config.carouselEnabled);
        
        // Dispatch an event to notify the image viewer of the setting change
        const event = new CustomEvent('carouselSettingChanged', {
            detail: { enabled: config.carouselEnabled }
        });
        window.dispatchEvent(event);
        
        showMessage(`Image carousels ${config.carouselEnabled ? 'enabled' : 'disabled'}. Changes have been applied.`, 'system-message');
    });

    // Helper function to notify the image viewer that a message was edited
    function notifyMessageEdited(messageElement) {
        // Dispatch a custom event that the image viewer is listening for
        const event = new CustomEvent('messageEdited', {
            detail: { messageElement }
        });
        document.dispatchEvent(event);
    }

    clearDebug.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
        Clear Console
    `;

    clearDebug.addEventListener('click', () => {
        debugContent.textContent = '';
        debugLog('Debug log cleared');
    });

    debugCollapseBtn.addEventListener('click', () => {
        debugContent.style.display = debugContent.style.display === 'none' ? 'block' : 'none';
        debugCollapseBtn.innerHTML = debugContent.style.display === 'none' ?
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' :
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    });

    // Image upload
    imageUploadButton.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;

                    // Create an image to get dimensions
                    const img = new Image();
                    img.onload = () => {
                        uploadedImages.push({
                            data: imageData,
                            file: file,
                            width: img.width,
                            height: img.height
                        });

                        debugLog('Image uploaded', {
                            name: file.name,
                            size: `${(file.size / 1024).toFixed(2)} KB`,
                            type: file.type,
                            dimensions: `${img.width}x${img.height}`
                        });

                        // Show image preview
                        showImagePreviews();
                    };
                    img.src = imageData;
                };
                reader.readAsDataURL(file);
                imageInput.value = '';
            } else {
                showError('Only image files are allowed');
            }
        }
    });

    function showImagePreviews() {
        // Remove existing preview if any
        const existingContainer = document.querySelector('.image-preview-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        if (uploadedImages.length === 0) return;

        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';

        // Add each image preview
        uploadedImages.forEach((img, index) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';

            const imgElement = document.createElement('img');
            imgElement.src = img.data;

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-image';
            removeButton.innerHTML = '✕';
            removeButton.setAttribute('aria-label', 'Remove image');
            removeButton.addEventListener('click', () => {
                uploadedImages.splice(index, 1);
                showImagePreviews();
            });

            previewDiv.appendChild(imgElement);
            previewDiv.appendChild(removeButton);
            previewContainer.appendChild(previewDiv);
        });

        // Add to DOM before the input wrapper
        inputWrapper.parentNode.insertBefore(previewContainer, inputWrapper);
    }

    // Initialize Gemini API if key exists
    let genAI = null;
    let model = null;
    let chatSession = null;

    function initializeGeminiAPI() {
        if (!config.apiKey) {
            debugLog('No API key found');
            return false;
        }

        try {
            debugLog('Initializing Gemini API');

            genAI = new GoogleGenerativeAI(config.apiKey);
            model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                generationConfig: {
                    temperature: config.temperature,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: config.maxOutputTokens,
                    responseModalities: ['Text', 'Image']
                }
            });

            // Initialize chat session with system instruction
            chatSession = model.startChat({
                history: chatHistory,
                generationConfig: {
                    temperature: config.temperature,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: config.maxOutputTokens,
                    responseModalities: ['Text', 'Image']
                }
            });

            debugLog('API initialized successfully', { systemInstruction: config.systemInstruction });
            return true;
        } catch (error) {
            console.error('Error initializing Gemini API:', error);
            debugLog('Error initializing API', error);
            showError('Failed to initialize the AI model. Please check your API key.');
            return false;
        }
    }

    function saveApiKey() {
        const newApiKey = apiKeyInput.value.trim();

        if (newApiKey) {
            localStorage.setItem('gemini-api-key', newApiKey);
            config.apiKey = newApiKey;

            debugLog('New API key saved');

            // Re-initialize API with new key
            const success = initializeGeminiAPI();
            if (success) {
                showMessage('API key saved successfully!', 'system-message');
                settingsModal.style.display = 'none';
            }
        } else {
            showError('Please enter a valid API key');
        }
    }

    async function handleSendMessage() {
        const userMessage = userInput.value.trim();

        if (!userMessage && uploadedImages.length === 0) return;

        if (!config.apiKey) {
            showError('Please set your Gemini API key in the settings');
            settingsModal.style.display = 'flex';
            setTimeout(() => {
                settingsModal.style.opacity = '1';
                document.querySelector('.modal-content').style.transform = 'translateY(0)';
            }, 10);
            return;
        }

        // Create message container
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message animate-in';

        // Create message content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        if (userMessage) {
            const textDiv = document.createElement('div');
            textDiv.className = 'user-text';
            textDiv.textContent = userMessage;
            messageContent.appendChild(textDiv);
        }

        // Add images if any
        if (uploadedImages.length > 0) {
            const imageGallery = document.createElement('div');
            imageGallery.className = 'image-gallery';

            uploadedImages.forEach(img => {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'image-container';

                const imgElement = document.createElement('img');
                imgElement.src = img.data;

                imgContainer.appendChild(imgElement);
                imageGallery.appendChild(imgContainer);
            });

            messageContent.appendChild(imageGallery);
        }

        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add loading state
        inputWrapper.classList.add('loading');
        sendButton.disabled = true;

        debugLog('Sending message', {
            text: userMessage,
            imageCount: uploadedImages.length
        });

        // Prepare user message for chat history
        let userMessageObject = {
            role: "user",
            parts: []
        };

        // Add the actual user message to history without system prompts
        if (userMessage) {
            userMessageObject.parts.push({
                text: userMessage
            });
        }

        // Add images to chat history if any
        for (const img of uploadedImages) {
            try {
                const base64Data = img.data.split(',')[1];
                userMessageObject.parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: img.file.type
                    }
                });
            } catch (error) {
                console.error('Error processing image for history:', error);
                debugLog('Error processing image for history', error);
            }
        }

        // Add to chat history
        chatHistory.push(userMessageObject);
        app.chatHistory = chatHistory;

        // Save conversation to history
        if (historyManager) {
            historyManager.saveCurrentConversation();
        }

        // For the API request, create a version that includes system instructions
        const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';

        // Create a temporary object for the API request with system instructions
        let apiRequestMessages = JSON.parse(JSON.stringify(chatHistory));
        if (apiRequestMessages.length > 0 && userMessage) {
            const lastMessageIndex = apiRequestMessages.length - 1;
            const lastMessage = apiRequestMessages[lastMessageIndex];
            
            // Find the text part if it exists
            const textPartIndex = lastMessage.parts.findIndex(part => part.text);
            if (textPartIndex !== -1) {
                // Add system instructions to the API request version only
                lastMessage.parts[textPartIndex].text = "User:" + userMessage + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now.";
            }
        }

        // Clear image previews and uploaded images array
        const previewContainer = document.querySelector('.image-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }

        // Use timeout to prevent UI freezing
        setTimeout(async () => {
            try {
                // Initialize API if not already initialized
                if (!model || !chatSession) {
                    if (!initializeGeminiAPI()) {
                        messagesContainer.removeChild(typingIndicator);
                        inputWrapper.classList.remove('loading');
                        sendButton.disabled = false;
                        return;
                    }
                }

                // Send message to Gemini
                debugLog('Sending request to Gemini API...');

                // Create request with modified messages that include system instructions
                const result = await model.generateContent({
                    contents: apiRequestMessages,
                    generationConfig: {
                        temperature: config.temperature,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: config.maxOutputTokens,
                        responseModalities: ['text', 'image']
                    }
                });

                debugLog('Response received from API', result);

                // Process response
                setTimeout(() => {
                    // Remove typing indicator
                    if (messagesContainer.contains(typingIndicator)) {
                        messagesContainer.removeChild(typingIndicator);
                    }

                    // Process and display the response
                    if (result.response) {
                        let responseText = '';
                        let responseParts = [];

                        // Process response candidate
                        if (result.response.candidates && result.response.candidates.length > 0) {
                            const candidate = result.response.candidates[0];

                            if (candidate.content && candidate.content.parts) {
                                responseParts = candidate.content.parts;

                                // Extract text
                                for (const part of candidate.content.parts) {
                                    if (part.text) {
                                        responseText += part.text;
                                    }
                                }

                                // Update chat history with the new response
                                chatHistory.push({
                                    role: "model",
                                    parts: candidate.content.parts
                                });

                                // Log the update to chat history
                                debugLog('Updated chat history after regeneration', {
                                    oldLength: chatHistory.length - 1,
                                    newLength: chatHistory.length,
                                    addedResponse: true
                                });

                                // Save conversation to history
                                if (historyManager) {
                                    historyManager.saveCurrentConversation();
                                }

                                // Display the new response
                                displayAIResponse(responseText, responseParts);
                            }
                        }
                    }
                }, 0);

                // Clear uploaded images after sending
                uploadedImages = [];

            } catch (error) {
                console.error('Error processing message:', error);
                debugLog('Error processing message', {
                    error: error.message,
                    stack: error.stack
                });

                if (messagesContainer.contains(typingIndicator)) {
                    messagesContainer.removeChild(typingIndicator);
                }

                showError('Failed to get a response. ' + error.message);

                // Clear uploaded images on error
                uploadedImages = [];
            } finally {
                inputWrapper.classList.remove('loading');
                sendButton.disabled = false;
            }
        }, 10);
    }


    function displayAIResponse(text, parts) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message animate-in';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        if (parts && parts.length > 0) {
            debugLog('Rendering AI response with parts', {
                partCount: parts.length,
                partTypes: parts.map(part => part.text ? 'text' : (part.inlineData ? 'image' : 'unknown'))
            });

            // Process parts to display text and images in order
            for (const part of parts) {
                if (part.text) {
                    const textDiv = document.createElement('div');
                    const markdownBuffer = new MarkdownBuffer(textDiv);
                    markdownBuffer.appendText(part.text);
                    messageContent.appendChild(textDiv);
                } else if (part.inlineData) {
                    // Create image container
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';

                    const img = document.createElement('img');
                        img.className = 'ai-generated-image';
                        img.alt = 'AI generated image';
                    img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                        img.onload = () => {
                            // If we have an ImageViewer instance, enhance this image
                            if (window.imageViewer) {
                                setTimeout(() => window.imageViewer.enhanceImage(img), 100);
                            }
                        };

                        imgContainer.appendChild(img);
                        messageContent.appendChild(imgContainer);
                }
            }
        } else if (text) {
            // Fallback if we only have text
                const markdownBuffer = new MarkdownBuffer(messageContent);
                markdownBuffer.appendText(text);
        }

        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);

        // Add AI message buttons (delete, regenerate, etc.)
        addAIMessageButtons(messageDiv);

        // Auto-scroll to the new message
        requestAnimationFrame(() => {
            messageDiv.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest'
                });
        });

        // Make the last user message editable
        const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));

        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1];

            // Only add if it doesn't already have an edit button
            if (!lastUserMessage.querySelector('.edit-message-button')) {
                // Extract the text from the user message
                const userText = lastUserMessage.querySelector('.user-text');
                const messageText = userText ? userText.textContent : '';

                // Add the edit button
                addEditButton(lastUserMessage, messageText);
            }
        }
    }

    function appendMarkdownMessage(text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className} animate-in`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const markdownBuffer = new MarkdownBuffer(messageContent);
        markdownBuffer.appendText(text);

        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);

        requestAnimationFrame(() => {
            const lastMessage = messagesContainer.lastElementChild;
            if (lastMessage) {
                lastMessage.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest'
                });
            } else {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });

        if (className === 'user-message') {
            const messageElements = messagesContainer.querySelectorAll('.message');
            const lastMessage = messageElements[messageElements.length - 1];
            addEditButton(lastMessage, text);
        }
    }

    function showMessage(message, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className} animate-in`;

        const innerDiv = document.createElement('div');
        innerDiv.className = 'system-message-inner';

        innerDiv.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="system-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            <div>${message}</div>
        `;

        messageDiv.appendChild(innerDiv);
        messagesContainer.appendChild(messageDiv);

        requestAnimationFrame(() => {
            messageDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
                inline: 'nearest'
            });
        });
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        messagesContainer.appendChild(errorDiv);

        requestAnimationFrame(() => {
            errorDiv.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
                inline: 'nearest'
            });
        });

        debugLog('Error shown', message);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messagesContainer.contains(errorDiv)) {
                messagesContainer.removeChild(errorDiv);
            }
        }, 5000);
    }

    function createRipple(event) {
        const button = event.currentTarget;

        // Remove existing ripple
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        // Activate the button-effect span
        const buttonEffect = button.querySelector('.button-effect');
        if (buttonEffect) {
            buttonEffect.style.opacity = '1';
            buttonEffect.style.transform = 'scale(1.5>';

            // Reset after animation completes
            setTimeout(() => {
                buttonEffect.style.opacity = '0';
                buttonEffect.style.transform = 'scale(0)';
            }, 600);
        }
    }

    // Add ripple effect to buttons
    document.querySelectorAll('#send-button, #settings-button, #theme-toggle, #image-upload-button')
        .forEach(button => {
            button.addEventListener('click', createRipple);
        });

    function clearChat(resetHistory = true) {
        // Store the examples container before clearing
        const examplesContainer = messagesContainer.querySelector('.examples-container');

        // Clear all messages in the UI
        messagesContainer.innerHTML = '';

        // Reset chat history if requested
        if (resetHistory) {
            // Store the current conversation ID before resetting
            const currentId = historyManager ? historyManager.currentConversationId : null;
            
            // Reset chat history array
            chatHistory = [];

            // Also reset conversation ID in history manager
            if (historyManager) {
                // IMPORTANT: Don't create a new empty conversation here, just null out the ID
                historyManager.currentConversationId = null;
                
                // DON'T save current conversation here as it would create an empty chat
                // historyManager.saveCurrentConversation();
            }

            // Reset chat session when clearing history
            if (model) {
                chatSession = model.startChat({
                    history: [],
                    generationConfig: {
                        temperature: config.temperature,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: config.maxOutputTokens,
                        responseModalities: ['Text', 'Image']
                    }
                });
            }

            debugLog('Chat cleared completely', { 
                historyLength: chatHistory.length,
                previousConversationId: currentId,
                currentConversationId: historyManager ? historyManager.currentConversationId : null
            });
        }

        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message system-message animate-in';
        welcomeMessage.innerHTML = `
            <div class="system-message-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="system-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <div>
                    Hello! I'm an AI assistant. You can ask me to generate text responses or create images using Gemini 2.0. Just type your message below.
                </div>
            </div>
        `;
        messagesContainer.appendChild(welcomeMessage);

        // Re-add examples container if it existed
        if (examplesContainer) {
            messagesContainer.appendChild(examplesContainer);
        } else {
            // If examples were missing, create them again
            setTimeout(() => {
                if (typeof createExamplesUI === 'function') {
                    createExamplesUI();
                } else if (window.examplesInitialized !== true) {
                    const script = document.createElement('script');
                    script.onload = () => createExamplesUI();
                    script.src = 'examples.js';
                    document.head.appendChild(script);
                }
            }, 100);
        }

        debugLog('Chat cleared', { resetHistory });
    }

    // Add the edit message functionality
    async function handleEditMessage(messageElement, originalText) {
        // Create edit state
        messageElement.classList.add('editing');

        // Store the original content to restore if cancelled
        const originalContent = messageElement.querySelector('.message-content').innerHTML;
        const messageContent = messageElement.querySelector('.message-content');

        // Get the message index in chat history
        const messagesContainer = document.getElementById('messages-container');
        const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));
        const messageIndex = userMessages.indexOf(messageElement);
        
        // Find the corresponding message in chat history
        let historyIndex = -1;
        let userMessageCount = 0;
        let messageImages = [];
        
        for (let i = 0; i < chatHistory.length; i++) {
            if (chatHistory[i].role === 'user') {
                if (userMessageCount === messageIndex) {
                    historyIndex = i;
                    
                    // Extract any images from this message
                    if (chatHistory[i].parts) {
                        messageImages = chatHistory[i].parts.filter(part => part.inlineData);
                    }
                    break;
                }
                userMessageCount++;
            }
        }

        // Create edit interface
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const editInput = document.createElement('textarea');
        editInput.className = 'edit-message-input';
        editInput.value = originalText;
        editInput.style.height = 'auto';

        // Auto-resize textarea
        setTimeout(() => {
            editInput.style.height = editInput.scrollHeight + 'px';
        }, 10);

        editInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        
        // Create a temporary array to hold images for this edit session
        const editSessionImages = [...messageImages];
        
        // Create the image preview area if there are images
        const imagePreviewArea = document.createElement('div');
        imagePreviewArea.className = 'image-preview-container';
        
        // Function to refresh the image preview area
        const refreshImagePreviews = () => {
            imagePreviewArea.innerHTML = '';
            
            if (editSessionImages.length > 0) {
                editSessionImages.forEach((img, index) => {
                    const previewContainer = document.createElement('div');
                    previewContainer.className = 'image-preview';
                    
                    const imgElement = document.createElement('img');
                    imgElement.src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
                    
                    const removeButton = document.createElement('button');
                    removeButton.className = 'remove-image';
                    removeButton.innerHTML = '&times;';
                    removeButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        editSessionImages.splice(index, 1);
                        refreshImagePreviews();
                    });
                    
                    previewContainer.appendChild(imgElement);
                    previewContainer.appendChild(removeButton);
                    imagePreviewArea.appendChild(previewContainer);
                });
            }
        };
        
        // Initial render of image previews
        refreshImagePreviews();
        
        // Add image upload button
        const imageUploadBtn = document.createElement('button');
        imageUploadBtn.className = 'edit-image-upload-btn';
        imageUploadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        imageUploadBtn.title = 'Add Image';
        
        // Hidden file input for image uploads
        const hiddenImageInput = document.createElement('input');
        hiddenImageInput.type = 'file';
        hiddenImageInput.accept = 'image/*';
        hiddenImageInput.style.display = 'none';
        hiddenImageInput.multiple = true;
        
        // Handle image uploads
        hiddenImageInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Data = e.target.result.split(',')[1];
                    editSessionImages.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: file.type
                        }
                    });
                    refreshImagePreviews();
                };
                reader.readAsDataURL(file);
            });
            
            // Reset the input
            hiddenImageInput.value = '';
        });
        
        // Connect image upload button to hidden input
        imageUploadBtn.addEventListener('click', () => {
            hiddenImageInput.click();
        });

        // Add edit actions
        const editActions = document.createElement('div');
        editActions.className = 'edit-actions';

        const saveButton = document.createElement('button');
        saveButton.className = 'save-edit';
        saveButton.textContent = 'Save';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-edit';
        cancelButton.textContent = 'Cancel';

        editActions.appendChild(cancelButton);
        editActions.appendChild(imageUploadBtn);
        editActions.appendChild(saveButton);

        editContainer.appendChild(editInput);
        editContainer.appendChild(imagePreviewArea);
        editContainer.appendChild(hiddenImageInput);
        editContainer.appendChild(editActions);

        // Replace content with edit interface
        messageContent.innerHTML = '';
        messageContent.appendChild(editContainer);

        // Focus input
        editInput.focus();

        // Set up cancel button
        cancelButton.addEventListener('click', () => {
            messageContent.innerHTML = originalContent;
            messageElement.classList.remove('editing');

            // Re-add edit button after cancel
            addEditButton(messageElement, originalText);
        });

        // Set up save button
        saveButton.addEventListener('click', async () => {
            const newText = editInput.value.trim();
            const hasImageChanges = JSON.stringify(messageImages) !== JSON.stringify(editSessionImages);

            if (!newText && editSessionImages.length === 0) {
                // No text and no images, just restore
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');

                // Re-add edit button after no change
                addEditButton(messageElement, originalText);
                return;
            }

            if (newText === originalText && !hasImageChanges) {
                // No changes to text or images, just restore
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');
                
                // Re-add edit button after no change
                addEditButton(messageElement, originalText);
                return;
            }

            // Update the message text and images in the UI
            messageContent.innerHTML = '';
            
            if (newText) {
            const textDiv = document.createElement('div');
            textDiv.className = 'user-text';
            textDiv.textContent = newText;
            messageContent.appendChild(textDiv);
            }
            
            // Add images if any
            if (editSessionImages.length > 0) {
                const imageGallery = document.createElement('div');
                imageGallery.className = 'image-gallery';
    
                editSessionImages.forEach(img => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'image-container';
    
                    const imgElement = document.createElement('img');
                    imgElement.src = `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
    
                    imgContainer.appendChild(imgElement);
                    imageGallery.appendChild(imgContainer);
                });
    
                messageContent.appendChild(imageGallery);
            }

            // Remove editing state
            messageElement.classList.remove('editing');

            // Re-add edit button with new text
            addEditButton(messageElement, newText);

            // Find the next AI message(s) to regenerate
            let messagesToRegenerate = [];
            let nextElement = messageElement.nextElementSibling;

            // Collect all AI responses until the next user message
            while (nextElement) {
                messagesToRegenerate.push(nextElement);
                nextElement = nextElement.nextElementSibling;
            }
            
            // Update the message in chat history with new text and images
            if (historyIndex !== -1) {
                // Keep the message's role but replace its parts
                chatHistory[historyIndex].parts = [];
                
                // Add text if it exists
                if (newText) {
                    chatHistory[historyIndex].parts.push({ text: newText });
                }
                
                // Add images if any
                chatHistory[historyIndex].parts.push(...editSessionImages);
                
                debugLog('Updated message in chat history with new content', {
                    historyIndex,
                    textLength: newText ? newText.length : 0,
                    imageCount: editSessionImages.length
                });
            }

            if (messagesToRegenerate.length > 0) {
                debugLog('Regenerating response(s) after edit', {
                    originalText,
                    newText,
                    messageCount: messagesToRegenerate.length
                });

                // Mark messages as being regenerated
                messagesToRegenerate.forEach(msg => {
                    msg.classList.add('regenerating-response');
                });

                // Wait for animation to apply
                setTimeout(() => {
                    // Now regenerate the AI response(s)
                    regenerateResponse(messageElement, newText, messagesToRegenerate);
                }, 50);
            } else {
                // No AI responses to regenerate, generate a new one
                debugLog('No existing AI responses to regenerate, generating new response');
                
                // Show typing indicator
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                messagesContainer.appendChild(typingIndicator);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Generate a new AI response manually since there's no generateAIResponse function
                try {
                    // Make sure models and sessions are initialized
                    if (!model || !chatSession) {
                        initializeGeminiAPI();
                    }
                    
                    // Create system instructions for API request
                    const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
                    
                    // Deep copy history for API request
                    let apiRequestHistory = JSON.parse(JSON.stringify(chatHistory));
                    
                    // Find the last user message in the API request history
                    let lastUserMessageIndex = -1;
                    for (let i = apiRequestHistory.length - 1; i >= 0; i--) {
                        if (apiRequestHistory[i].role === 'user') {
                            lastUserMessageIndex = i;
                            break;
                        }
                    }
                    
                    // Add system instructions to the last user message
                    if (lastUserMessageIndex !== -1) {
                        const lastUserMsg = apiRequestHistory[lastUserMessageIndex];
                        const textPartIndex = lastUserMsg.parts.findIndex(part => part.text);
                        
                        if (textPartIndex !== -1) {
                            // Get the original user message text
                            const originalText = lastUserMsg.parts[textPartIndex].text;
                            
                            // Add system instructions to the API request version only
                            lastUserMsg.parts[textPartIndex].text = "User:" + originalText + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now.";
                            
                            debugLog('Applied system instructions to user message for regeneration', {
                                userMessageIndex: lastUserMessageIndex,
                                originalTextPreview: originalText.substring(0, 30) + (originalText.length > 30 ? '...' : '')
                            });
                        }
                    }
                    
                    // Get the result from the API
                    const result = await model.generateContent({
                        contents: apiRequestHistory,
                        generationConfig: {
                            temperature: config.temperature,
                            topP: 0.95,
                            topK: 40,
                            maxOutputTokens: config.maxOutputTokens,
                            responseModalities: ['text', 'image']
                        }
                    });
                    
                    debugLog('Received generated response after single message edit', result);
                    
                    // Remove typing indicator
                    if (messagesContainer.contains(typingIndicator)) {
                        messagesContainer.removeChild(typingIndicator);
                    }
                    
                    // Process the response
                    if (result.response) {
                        let responseText = '';
                        let responseParts = [];
                        
                        // Process response candidate
                        if (result.response.candidates && result.response.candidates.length > 0) {
                            const candidate = result.response.candidates[0];
                            
                            if (candidate.content && candidate.content.parts) {
                                responseParts = candidate.content.parts;
                                
                                // Extract text
                                for (const part of candidate.content.parts) {
                                    if (part.text) {
                                        responseText += part.text;
                                    }
                                }
                                
                                // Update chat history with the new response
                                chatHistory.push({
                                    role: "model",
                                    parts: candidate.content.parts
                                });
                                
                                // Save conversation to history
                                if (historyManager) {
                                    historyManager.saveCurrentConversation(true); // Force update
                                }
                                
                                // Display the new response
                                displayAIResponse(responseText, responseParts);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error generating response:', error);
                    debugLog('Error generating response', {
                        error: error.message,
                        stack: error.stack
                    });
                    
                    // Remove typing indicator if it exists
                    if (messagesContainer.contains(typingIndicator)) {
                        messagesContainer.removeChild(typingIndicator);
                    }
                    
                    showError('Failed to get a response. ' + error.message);
                }
            }
        });
    }

    // Function to add edit and delete buttons to user messages
    function addEditButton(messageElement, messageText) {
        // Only add to user messages
        if (!messageElement.classList.contains('user-message')) return;

        // Check if buttons already exist
        if (messageElement.querySelector('.edit-message-button') || messageElement.querySelector('.delete-message-button')) return;

        // Create delete button
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-message-button';
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        deleteButton.setAttribute('aria-label', 'Delete message');
        deleteButton.setAttribute('title', 'Delete message');

        deleteButton.addEventListener('click', () => {
            handleDeleteMessage(messageElement);
        });

        // Create edit button
        const editButton = document.createElement('div');
        editButton.className = 'edit-message-button';
        editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
        `;
        editButton.setAttribute('aria-label', 'Edit message');
        editButton.setAttribute('title', 'Edit message');

        editButton.addEventListener('click', () => {
            const currentTextElement = messageElement.querySelector('.user-text');
            const currentText = currentTextElement ? currentTextElement.textContent : messageText;
            handleEditMessage(messageElement, currentText);
        });

        messageElement.appendChild(deleteButton);
        messageElement.appendChild(editButton);
    }

    // Helper function to find message index in chat history
    function findMessageIndex(messageElement) {
        const messagesContainer = document.getElementById('messages-container');
        const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));
        const messageIndex = userMessages.indexOf(messageElement);

        debugLog('Finding message index', {
            userMessageCount: userMessages.length,
            clickedMessageIndex: messageIndex,
            totalHistoryLength: chatHistory.length
        });

        if (messageIndex !== -1 && chatHistory.length > 0) {
            // Find the corresponding user message in chat history
            let historyIndex = -1;
            let userMessageCount = 0;

            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'user') {
                    if (userMessageCount === messageIndex) {
                        historyIndex = i;
                        break;
                    }
                    userMessageCount++;
                }
            }

            debugLog('Found message in history', {
                userMessageIndex: messageIndex,
                correspondingHistoryIndex: historyIndex,
                role: historyIndex >= 0 ? chatHistory[historyIndex].role : 'unknown'
            });

            return historyIndex;
        }
        
        debugLog('Message not found in user messages', {
            elementClassList: messageElement.classList.toString()
        });
        return -1;
    }

    // Function to handle message deletion
    function handleDeleteMessage(messageElement) {
        // First find the index of this message in our history
        const messageIndex = findMessageIndex(messageElement);
        if (messageIndex === -1) {
            debugLog('Message not found in history', { messageElement });
            return;
        }

        // Remove the message AND ALL SUBSEQUENT MESSAGES from history
        const historyIndex = messageIndex;
        
        // Store the original history length to log how many messages we'll be removing
        const originalLength = chatHistory.length;
        
        // The critical fix: truncate the history rather than just removing one message
        chatHistory = chatHistory.slice(0, historyIndex);
        
        // Log exactly how many messages were removed
        const messagesRemoved = originalLength - chatHistory.length;
        
        // Add fading out animation
        messageElement.classList.add('deleting');

        debugLog('Deleting message and all subsequent content', {
            messageIndex,
            historyIndex,
            remainingMessages: chatHistory.length,
            messagesRemoved: messagesRemoved
        });

        // Wait for animation to complete before removing elements
        setTimeout(() => {
            let elementToRemove = messageElement;
            while (elementToRemove) {
                const temp = elementToRemove;
                elementToRemove = elementToRemove.nextElementSibling;
                if (messagesContainer.contains(temp)) {
                    messagesContainer.removeChild(temp);
                }
            }

            // If there are no messages left, clear the chat completely
            if (chatHistory.length === 0) {
                debugLog('No messages left, clearing chat completely and removing from history');
                
                // IMPORTANT: Save the conversation ID before clearing
                const currentId = historyManager ? historyManager.currentConversationId : null;
                
                // Clear the chat
                clearChat(true);
                
                // Delete this conversation from history completely
                if (historyManager && currentId) {
                    historyManager.deleteConversationById(currentId);
                    debugLog('Deleted empty conversation from history DB', { deletedId: currentId });
                }
            } else {
                // Save the updated conversation with FORCE parameter to ensure it's saved
                if (historyManager) {
                    historyManager.saveCurrentConversation(true); // true = force update
                    debugLog('Saving truncated conversation with force update', { 
                        historyLength: chatHistory.length,
                        conversationId: historyManager.currentConversationId
                    });
                }
            }
        }, 300); // Match animation duration
    }

    // Function to update the chat history after editing
    function updateChatHistoryAfterEdit(messageElement, newText, includeSystemInstructions = false) {
        // Find the message index in chat history
        const messagesContainer = document.getElementById('messages-container');
        const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));
        const messageIndex = userMessages.indexOf(messageElement);

        if (messageIndex !== -1 && chatHistory.length > 0) {
            // Find the corresponding user message in chat history
            let historyIndex = -1;
            let userMessageCount = 0;

            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'user') {
                    if (userMessageCount === messageIndex) {
                        historyIndex = i;
                        break;
                    }
                    userMessageCount++;
                }
            }

            if (historyIndex !== -1) {
                // Update the message text in chat history
                if (chatHistory[historyIndex].parts && chatHistory[historyIndex].parts.length > 0) {
                    // Update the text part
                    const textPartIndex = chatHistory[historyIndex].parts.findIndex(part => part.text);
                    if (textPartIndex !== -1) {
                        // Just update with the new text without system instructions
                        chatHistory[historyIndex].parts[textPartIndex].text = newText;
                    } else {
                        // Add text part if none exists
                        chatHistory[historyIndex].parts.unshift({ text: newText });
                    }

                    debugLog('Updated chat history after edit', {
                        historyIndex,
                        updatedMessage: chatHistory[historyIndex]
                    });
                    
                    // If we need to regenerate with system instructions, create a temporary copy
                    if (includeSystemInstructions) {
                        const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
                        
                        // Create a temporary copy of chat history for API request
                        let apiRequestHistory = JSON.parse(JSON.stringify(chatHistory));
                        
                        // Add system instructions to the copy
                        const tempTextPartIndex = apiRequestHistory[historyIndex].parts.findIndex(part => part.text);
                        if (tempTextPartIndex !== -1) {
                            apiRequestHistory[historyIndex].parts[tempTextPartIndex].text = "User:" + newText + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now.";
                        }
                        
                        return apiRequestHistory;
                    }
                }
            }
        }
    }

    // Function to regenerate the AI response
    async function regenerateResponse(messageElement, editedText, messagesToRegenerate = []) {
        try {
            // Use the provided messagesToRegenerate if available, otherwise find them
            let messagesToRemove = messagesToRegenerate.length > 0 ? 
                messagesToRegenerate : [];
                
            // If no messages were provided, collect them now (fallback)
            if (messagesToRemove.length === 0) {
                let nextElement = messageElement.nextElementSibling;
            while (nextElement) {
                messagesToRemove.push(nextElement);
                nextElement = nextElement.nextElementSibling;
                }
            }

            // Find the history index up to this user message
            const messagesContainer = document.getElementById('messages-container');
            const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
            const messageIndex = allMessages.indexOf(messageElement);

            // Debug log original history length
            debugLog('Original chat history length', { 
                length: chatHistory.length,
                messagesToRemoveCount: messagesToRemove.length
            });

            // Find the user message index in chat history
            let userMessageCount = 0;
            let targetUserIndex = -1;

            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'user') {
                    const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));
                    const editedMessageIndex = userMessages.indexOf(messageElement);

                    if (userMessageCount === editedMessageIndex) {
                        targetUserIndex = i;
                        break;
                    }
                    userMessageCount++;
                }
            }

            if (targetUserIndex !== -1) {
                // Keep history up to and including the edited message
                chatHistory = chatHistory.slice(0, targetUserIndex + 1);

                // Debug log truncated history
                debugLog('Truncated chat history after edit', {
                    originalLength: chatHistory.length,
                    truncatedLength: chatHistory.length,
                    targetUserIndex: targetUserIndex
                });

                // Remove all messages after the edited message from the DOM
                messagesToRemove.forEach(msg => {
                    if (messagesContainer.contains(msg)) {
                        messagesContainer.removeChild(msg);
                    }
                });

                // Show typing indicator
                const typingIndicator = document.createElement('div');
                typingIndicator.className = 'typing-indicator';
                typingIndicator.innerHTML = '<span></span><span></span><span></span>';
                messagesContainer.appendChild(typingIndicator);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Make sure models and sessions are initialized
                if (!model || !chatSession) {
                    initializeGeminiAPI();
                }

                try {
                    // Generate the new response
                    debugLog('Generating new response after edit', { historyLength: chatHistory.length });

                    // Update chat history with the edited message
                    const apiRequestHistory = updateChatHistoryAfterEdit(messageElement, editedText, true);

                    // Generate the new response
                    const result = await model.generateContent({
                        contents: apiRequestHistory || chatHistory,
                        generationConfig: {
                            temperature: config.temperature,
                            topP: 0.95,
                            topK: 40,
                            maxOutputTokens: config.maxOutputTokens,
                            responseModalities: ['text', 'image']
                        }
                    });

                    debugLog('Received regenerated response', result);

                    // Remove typing indicator
                    if (messagesContainer.contains(typingIndicator)) {
                        messagesContainer.removeChild(typingIndicator);
                    }

                    // Process the response
                    if (result.response) {
                        let responseText = '';
                        let responseParts = [];

                        // Process response candidate
                        if (result.response.candidates && result.response.candidates.length > 0) {
                            const candidate = result.response.candidates[0];

                            if (candidate.content && candidate.content.parts) {
                                responseParts = candidate.content.parts;

                                // Extract text
                                for (const part of candidate.content.parts) {
                                    if (part.text) {
                                        responseText += part.text;
                                    }
                                }

                                // Update chat history with the new response
                                chatHistory.push({
                                    role: "model",
                                    parts: candidate.content.parts
                                });

                                // Log the update to chat history
                                debugLog('Updated chat history after regeneration', {
                                    oldLength: chatHistory.length - 1,
                                    newLength: chatHistory.length,
                                    addedResponse: true
                                });

                                // Save conversation to history
                                if (historyManager) {
                                    historyManager.saveCurrentConversation();
                                }

                                // Display the new response
                                displayAIResponse(responseText, responseParts);
                            }
                        }
                    }
                } catch (error) {
                    // ... existing error handling code ...
                }
            }
        } catch (error) {
            // ... existing error handling code ...
        }
    }

    function renderStoredMessages(messages) {
        // Start with a clean slate
        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            if (message.role === 'user') {
                // Render user message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user-message animate-in';

                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';

                let hasText = false;
                let hasImages = false;

                // Process all parts to show text and images in order
                message.parts.forEach(part => {
                    if (part.text) {
                        hasText = true;
                        const textDiv = document.createElement('div');
                        textDiv.className = 'user-text';
                        textDiv.textContent = part.text;
                        messageContent.appendChild(textDiv);
                    } else if (part.inlineData) {
                        hasImages = true;
                        // If this is the first image, create a gallery
                        if (!messageContent.querySelector('.image-gallery')) {
                            const imageGallery = document.createElement('div');
                            imageGallery.className = 'image-gallery';
                            messageContent.appendChild(imageGallery);
                        }
                        
                        const imageGallery = messageContent.querySelector('.image-gallery');
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';

                        const img = document.createElement('img');
                        img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                        imgContainer.appendChild(img);
                        imageGallery.appendChild(imgContainer);
                    }
                });

                // Add message to DOM only if it has content
                if (hasText || hasImages) {
                messageDiv.appendChild(messageContent);
                messagesContainer.appendChild(messageDiv);

                    // Add edit button
                    const textElement = messageContent.querySelector('.user-text');
                    if (textElement) {
                        addEditButton(messageDiv, textElement.textContent);
                    } else {
                        addEditButton(messageDiv, '');
                    }
                }
            } else if (message.role === 'model') {
                // Render AI message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ai-message animate-in';

                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';

                // Process all parts to show text and images in order
                message.parts.forEach(part => {
                    if (part.text) {
                        const textDiv = document.createElement('div');
                        const markdownBuffer = new MarkdownBuffer(textDiv);
                        markdownBuffer.appendText(part.text);
                        messageContent.appendChild(textDiv);
                    } else if (part.inlineData) {
                        // Create image container
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';

                        const img = document.createElement('img');
                        img.className = 'ai-generated-image';
                        img.alt = 'AI generated image';
                        img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                        img.onload = () => {
                            // If we have an ImageViewer instance, enhance this image
                            if (window.imageViewer) {
                                setTimeout(() => window.imageViewer.enhanceImage(img), 100);
                            }
                        };

                        imgContainer.appendChild(img);
                        messageContent.appendChild(imgContainer);
                    }
                });

                messageDiv.appendChild(messageContent);
                messagesContainer.appendChild(messageDiv);
                
                // Add delete and regenerate buttons to the AI message
                addAIMessageButtons(messageDiv);
            }
        });

        // Scroll to bottom
        requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    // Initialize API if key exists
    if (config.apiKey) {
        initializeGeminiAPI();
    } else {
        setTimeout(() => {
            showMessage('Welcome! Please set your Gemini API key in the settings to get started.', 'system-message');
        }, 1000);
    }

    // Create app object for history manager
    const app = {
        clearChat,
        renderStoredMessages,
        get chatHistory() { return chatHistory; },
        set chatHistory(value) { chatHistory = value; },
        debugLog,
        config,
        model: model,
        chatSession: chatSession
    };

    // Initialize history manager
    historyManager = new ChatHistory(app);
    app.historyManager = historyManager;

    // Expose app object and debug function globally
    window.app = app;
    window.debugLog = debugLog;

    // Add function to add image to chat
    app.addImageToChat = function(imageData, file) {
        if (!file || !imageData) return;

        // Create an image to get dimensions
        const img = new Image();
        img.onload = () => {
            uploadedImages.push({
                data: imageData,
                file: file,
                width: img.width,
                height: img.height
            });

            debugLog('GIF added to chat input', {
                name: file.name,
                size: `${(file.size / 1024).toFixed(2)} KB`,
                type: file.type,
                dimensions: `${img.width}x${img.height}`
            });

            // Show image preview
            showImagePreviews();
        };
        img.src = imageData;
    };

    app.showImagePreviews = showImagePreviews;

    // Log initialization info
    if (config.debugMode) {
        debugLog('App initialized', {
            theme: localStorage.getItem('theme') || 'dark',
            apiKeyExists: !!config.apiKey,
            temperature: config.temperature,
            maxTokens: config.maxOutputTokens,
            debugMode: config.debugMode,
            themeStyle: config.tactileMode ? 'onyx' : 'mint',
            systemInstruction: config.systemInstruction,
            examplesEnabled: true
        });
    }

    // Initialize edit buttons on existing user messages
    setTimeout(() => {
        document.querySelectorAll('.user-message').forEach(userMsg => {
            const userText = userMsg.querySelector('.user-text');
            const messageText = userText ? userText.textContent : '';
            addEditButton(userMsg, messageText);
        });
    }, 1000);

    // Add event listener for new chat button
    newChatBtn.addEventListener('click', () => {
        startNewChat();
    });

    function startNewChat() {
        // Clear the current conversation
        app.clearChat(true); // true = reset history

        // Reset current conversation ID if history manager exists
        if (historyManager) {
            // IMPORTANT: This conversation shouldn't be saved
            historyManager.currentConversationId = null;
            
            // Force update UI if history panel is open
            if (historyManager.historyPanel && historyManager.historyPanel.classList.contains('open')) {
                historyManager.renderConversationsList();
            }
            
            debugLog('Started new chat from button', { 
                conversationId: null,
                historyLength: chatHistory.length
            });
        }
    }

    // System Instructions Button
    systemInstructionsBtn.addEventListener('click', () => {
        systemInstructionsModal.style.display = 'flex';
        setTimeout(() => {
            systemInstructionsModal.style.opacity = '1';
            document.querySelector('.system-instructions-modal-content').style.transform = 'translateY(0)';
        }, 10);
    });

    closeSystemInstructionsBtn.addEventListener('click', () => {
        document.querySelector('.system-instructions-modal-content').style.transform = 'translateY(-30px)';
        systemInstructionsModal.style.opacity = '0';
        setTimeout(() => {
            systemInstructionsModal.style.display = 'none';
        }, 300);
    });

    window.addEventListener('click', (e) => {
        if (e.target === systemInstructionsModal) {
            document.querySelector('.system-instructions-modal-content').style.transform = 'translateY(-30px)';
            systemInstructionsModal.style.opacity = '0';
            setTimeout(() => {
                systemInstructionsModal.style.display = 'none';
            }, 300);
        }
    });

    saveSystemInstructionsBtn.addEventListener('click', () => {
        const newInstruction = systemInstructionsInput.value.trim();

        if (newInstruction) {
            config.systemInstruction = newInstruction;
            localStorage.setItem('systemInstruction', newInstruction);
            debugLog('System instruction saved', { instruction: newInstruction });

            // Close the modal
            document.querySelector('.system-instructions-modal-content').style.transform = 'translateY(-30px)';
            systemInstructionsModal.style.opacity = '0';
            setTimeout(() => {
                systemInstructionsModal.style.display = 'none';
            }, 300);

            // Show success message
            showMessage('System instructions updated!', 'system-message');

            // Reinitialize chat session with new system instruction if needed
            if (model) {
                try {
                    chatSession = model.startChat({
                        history: chatHistory,
                        generationConfig: {
                            temperature: config.temperature,
                            topP: 0.95,
                            topK: 40,
                            maxOutputTokens: config.maxOutputTokens,
                            responseModalities: ['Text', 'Image']
                        }
                    });
                    debugLog('Reinitialized chat session with new system instruction');
                } catch (error) {
                    debugLog('Error reinitializing chat session', { error: error.message });
                }
            }
        } else {
            showError('Please enter a valid system instruction');
        }
    });

    resetSystemInstructionsBtn.addEventListener('click', () => {
        systemInstructionsInput.value = DEFAULT_SYSTEM_INSTRUCTION;
        config.systemInstruction = DEFAULT_SYSTEM_INSTRUCTION;
        localStorage.setItem('systemInstruction', DEFAULT_SYSTEM_INSTRUCTION);
        debugLog('System instruction reset to default');

        // Show feedback that it was reset
        showMessage('System instructions reset to default!', 'system-message');
    });

    // Add AI message buttons (delete, regenerate, edit)
    function addAIMessageButtons(messageElement) {
        // Only add to AI messages
        if (!messageElement.classList.contains('ai-message')) return;
        
        // Check if buttons already exist
        if (messageElement.querySelector('.delete-message-button') || 
            messageElement.querySelector('.regenerate-message-button') ||
            messageElement.querySelector('.edit-message-button')) return;

        // Create delete button
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-message-button';
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        deleteButton.setAttribute('aria-label', 'Delete message');
        deleteButton.setAttribute('title', 'Delete message');

        deleteButton.addEventListener('click', () => {
            handleDeleteAIMessage(messageElement);
        });

        // Create regenerate button
        const regenerateButton = document.createElement('div');
        regenerateButton.className = 'regenerate-message-button';
        regenerateButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 2v6h6"></path>
                <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
                <path d="M21 22v-6h-6"></path>
                <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
            </svg>
        `;
        regenerateButton.setAttribute('aria-label', 'Regenerate response');
        regenerateButton.setAttribute('title', 'Regenerate response');

        regenerateButton.addEventListener('click', () => {
            handleRegenerateAIMessage(messageElement);
        });

        // Create edit button for AI messages
        const editButton = document.createElement('div');
        editButton.className = 'edit-message-button';
        editButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
        `;
        editButton.setAttribute('aria-label', 'Edit message');
        editButton.setAttribute('title', 'Edit message');

        editButton.addEventListener('click', () => {
            handleEditAIMessage(messageElement);
        });

        // Important: Add all buttons in this specific order
        // for proper CSS positioning (delete button first, then regenerate, then edit)
        messageElement.appendChild(deleteButton);
        messageElement.appendChild(regenerateButton);
        messageElement.appendChild(editButton);
        
        debugLog('Added buttons to AI message', { 
            deleteButton: !!deleteButton, 
            regenerateButton: !!regenerateButton,
            editButton: !!editButton
        });
    }

    // Add this function to handle deleting AI messages
    function handleDeleteAIMessage(messageElement) {
        // Find the index of this message in our history
        const messagesContainer = document.getElementById('messages-container');
        const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
        const messageIndex = allMessages.indexOf(messageElement);

        if (messageIndex === -1) {
            debugLog('AI message not found in DOM', { messageElement });
            return;
        }

        // Find the matching message in chat history
        let historyIndex = -1;
        let aiMessageCount = 0;
        let domAIMessageCount = 0;

        // Count AI messages in DOM up to this message
        for (let i = 0; i <= messageIndex; i++) {
            if (allMessages[i].classList.contains('ai-message')) {
                domAIMessageCount++;
            }
        }

        // Find the matching AI message in history
        for (let i = 0; i < chatHistory.length; i++) {
            if (chatHistory[i].role === 'model') {
                aiMessageCount++;
                if (aiMessageCount === domAIMessageCount) {
                    historyIndex = i;
                    break;
                }
            }
        }

        if (historyIndex === -1) {
            debugLog('AI message not found in history', { 
                domIndex: messageIndex, 
                aiMessageCount: domAIMessageCount 
            });
            return;
        }

        // Store the original history length to log how many messages we'll be removing
        const originalLength = chatHistory.length;
        
        // Remove just this one AI message
        chatHistory.splice(historyIndex, 1);
        
        // Add fading out animation
        messageElement.classList.add('deleting');

        debugLog('Deleting AI message', {
            domIndex: messageIndex,
            historyIndex: historyIndex,
            remainingMessages: chatHistory.length
        });

        // Wait for animation to complete before removing element
        setTimeout(() => {
            if (messagesContainer.contains(messageElement)) {
                messagesContainer.removeChild(messageElement);
            }

            // Save the updated conversation with FORCE parameter to ensure it's saved
            if (historyManager) {
                historyManager.saveCurrentConversation(true); // true = force update
                debugLog('Saving conversation after AI message deletion', { 
                    historyLength: chatHistory.length,
                    conversationId: historyManager.currentConversationId
                });
            }
        }, 300); // Match animation duration
    }

    // Add this function to handle regenerating AI messages
    async function handleRegenerateAIMessage(messageElement) {
        // Find the previous user message that prompted this AI response
        let prevUserMessage = null;
        let currentElement = messageElement.previousElementSibling;
        
        while (currentElement && !currentElement.classList.contains('user-message')) {
            currentElement = currentElement.previousElementSibling;
        }
        
        if (!currentElement) {
            debugLog('Could not find preceding user message', { messageElement });
            showError('Cannot regenerate - no user message found');
            return;
        }
        
        prevUserMessage = currentElement;
        
        // Get the user message text
        const userTextElement = prevUserMessage.querySelector('.user-text');
        if (!userTextElement) {
            debugLog('User message has no text content', { prevUserMessage });
            showError('Cannot regenerate - user message has no text');
            return;
        }
        
        const userMessageText = userTextElement.textContent;
        
        // Find the message index in chat history
        const messagesContainer = document.getElementById('messages-container');
        const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
        const messageIndex = allMessages.indexOf(messageElement);
        
        if (messageIndex === -1) {
            debugLog('AI message not found in DOM', { messageElement });
            return;
        }
        
        // Find the matching message in chat history
        let historyIndex = -1;
        let aiMessageCount = 0;
        let domAIMessageCount = 0;
        
        // Count AI messages in DOM up to this message
        for (let i = 0; i <= messageIndex; i++) {
            if (allMessages[i].classList.contains('ai-message')) {
                domAIMessageCount++;
            }
        }
        
        // Find the matching AI message in history
        for (let i = 0; i < chatHistory.length; i++) {
            if (chatHistory[i].role === 'model') {
                aiMessageCount++;
                if (aiMessageCount === domAIMessageCount) {
                    historyIndex = i;
                    break;
                }
            }
        }
        
        if (historyIndex === -1) {
            debugLog('AI message not found in history', { 
                domIndex: messageIndex, 
                aiMessageCount: domAIMessageCount 
            });
            return;
        }
        
        // Add regenerating animation
        messageElement.classList.add('regenerating-response');
        
        // Remove the old AI message from the history
        chatHistory.splice(historyIndex, 1);
        
        debugLog('Regenerating AI message', {
            userMessage: userMessageText,
            historyIndex: historyIndex,
            historyLength: chatHistory.length
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        messagesContainer.insertBefore(typingIndicator, messageElement.nextSibling);
        
        // Remove the old AI message from DOM
        if (messagesContainer.contains(messageElement)) {
            messagesContainer.removeChild(messageElement);
        }
        
        try {
            // Create system instructions for API request
            const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
            
            // Deep copy history for API request
            let apiRequestHistory = JSON.parse(JSON.stringify(chatHistory));
            
            // Find the last user message in the API request history
            let lastUserMessageIndex = -1;
            for (let i = apiRequestHistory.length - 1; i >= 0; i--) {
                if (apiRequestHistory[i].role === 'user') {
                    lastUserMessageIndex = i;
                    break;
                }
            }
            
            // Add system instructions to the last user message
            if (lastUserMessageIndex !== -1) {
                const lastUserMsg = apiRequestHistory[lastUserMessageIndex];
                const textPartIndex = lastUserMsg.parts.findIndex(part => part.text);
                
                if (textPartIndex !== -1) {
                    // Get the original user message text
                    const originalText = lastUserMsg.parts[textPartIndex].text;
                    
                    // Add system instructions to the API request version only
                    lastUserMsg.parts[textPartIndex].text = "User:" + originalText + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now.";
                    
                    debugLog('Applied system instructions to user message for regeneration', {
                        userMessageIndex: lastUserMessageIndex,
                        originalTextPreview: originalText.substring(0, 30) + (originalText.length > 30 ? '...' : '')
                    });
                }
            }
            
            // Make sure models and sessions are initialized
            if (!model || !chatSession) {
                initializeGeminiAPI();
            }
            
            // Generate the new response
            const result = await model.generateContent({
                contents: apiRequestHistory,
                generationConfig: {
                    temperature: config.temperature,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: config.maxOutputTokens,
                    responseModalities: ['text', 'image']
                }
            });
            
            debugLog('Received regenerated response', result);
            
            // Remove typing indicator
            if (messagesContainer.contains(typingIndicator)) {
                messagesContainer.removeChild(typingIndicator);
            }
            
            // Process the response
            if (result.response) {
                let responseText = '';
                let responseParts = [];
                
                // Process response candidate
                if (result.response.candidates && result.response.candidates.length > 0) {
                    const candidate = result.response.candidates[0];
                    
                    if (candidate.content && candidate.content.parts) {
                        responseParts = candidate.content.parts;
                        
                        // Extract text
                        for (const part of candidate.content.parts) {
                            if (part.text) {
                                responseText += part.text;
                            }
                        }
                        
                        // Update chat history with the new response
                        chatHistory.push({
                            role: "model",
                            parts: candidate.content.parts
                        });
                        
                        // Save conversation to history
                        if (historyManager) {
                            historyManager.saveCurrentConversation(true); // Force update
                        }
                        
                        // Display the new response
                        displayAIResponse(responseText, responseParts);
                    }
                }
            }
        } catch (error) {
            console.error('Error regenerating response:', error);
            debugLog('Error regenerating response', {
                error: error.message,
                stack: error.stack
            });
            
            // Remove typing indicator
            if (messagesContainer.contains(typingIndicator)) {
                messagesContainer.removeChild(typingIndicator);
            }
            
            showError('Failed to regenerate response: ' + error.message);
        }
    }

    // Add function to handle editing AI messages
    async function handleEditAIMessage(messageElement) {
        // Create edit state
        messageElement.classList.add('editing');

        // Find the message content to edit
        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) {
            debugLog('AI message has no content to edit', { messageElement });
            return;
        }

        // Store the original content to restore if cancelled
        const originalContent = messageContent.innerHTML;

        // Extract text content from various possible elements
        let originalText = '';
        const textElements = messageContent.querySelectorAll('.text-part');
        
        if (textElements.length > 0) {
            // If we have text-part elements, combine their contents
            textElements.forEach(el => {
                originalText += el.textContent + '\n';
            });
        } else {
            // Fallback to direct content
            originalText = messageContent.textContent;
        }
        
        originalText = originalText.trim();

        // Create edit interface
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const editInput = document.createElement('textarea');
        editInput.className = 'edit-message-input';
        editInput.value = originalText;
        editInput.style.height = 'auto';

        // Auto-resize textarea
        setTimeout(() => {
            editInput.style.height = editInput.scrollHeight + 'px';
        }, 10);

        editInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });

        // Add edit actions
        const editActions = document.createElement('div');
        editActions.className = 'edit-actions';

        const saveButton = document.createElement('button');
        saveButton.className = 'save-edit';
        saveButton.textContent = 'Save';

        const cancelButton = document.createElement('button');
        cancelButton.className = 'cancel-edit';
        cancelButton.textContent = 'Cancel';

        editActions.appendChild(saveButton);
        editActions.appendChild(cancelButton);

        // Replace the message content with the editor
        messageContent.innerHTML = '';
        editContainer.appendChild(editInput);
        editContainer.appendChild(editActions);
        messageContent.appendChild(editContainer);

        // Set up cancel button
        cancelButton.addEventListener('click', () => {
            messageContent.innerHTML = originalContent;
            messageElement.classList.remove('editing');
            
            // Re-add edit button after cancel
            if (!messageElement.querySelector('.edit-message-button')) {
                addAIMessageButtons(messageElement);
            }
        });

        // Set up save button
        saveButton.addEventListener('click', async () => {
            const newText = editInput.value.trim();

            if (!newText || newText === originalText) {
                // No changes or empty, just restore
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');
                
                // Re-add edit button after no change
                if (!messageElement.querySelector('.edit-message-button')) {
                    addAIMessageButtons(messageElement);
                }
                return;
            }

            // Find the message index in chat history
            const messagesContainer = document.getElementById('messages-container');
            const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
            const messageIndex = allMessages.indexOf(messageElement);
            
            if (messageIndex === -1) {
                debugLog('AI message not found in DOM', { messageElement });
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');
                return;
            }
            
            // Find the matching message in chat history
            let historyIndex = -1;
            let aiMessageCount = 0;
            let domAIMessageCount = 0;
            
            // Count AI messages in DOM up to this message
            for (let i = 0; i <= messageIndex; i++) {
                if (allMessages[i].classList.contains('ai-message')) {
                    domAIMessageCount++;
                }
            }
            
            // Find the matching AI message in history
            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'model') {
                    aiMessageCount++;
                    if (aiMessageCount === domAIMessageCount) {
                        historyIndex = i;
                        break;
                    }
                }
            }
            
            if (historyIndex === -1) {
                debugLog('AI message not found in history', { 
                    domIndex: messageIndex, 
                    aiMessageCount: domAIMessageCount 
                });
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');
                return;
            }
            
            // Update the DOM with the edited text
            messageContent.innerHTML = '';
            
            // Create text part div
            const textDiv = document.createElement('div');
            textDiv.className = 'text-part';
            
            // Apply markdown
            const marked = window.marked || marked;
            if (typeof marked === 'function') {
                textDiv.innerHTML = marked(newText);
                
                // Add syntax highlighting
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(textDiv);
                }
            } else {
                textDiv.textContent = newText;
            }
            
            messageContent.appendChild(textDiv);
            
            // Remove editing state
            messageElement.classList.remove('editing');
            
            // Re-add buttons
            addAIMessageButtons(messageElement);
            
            // Update the chat history (only the text part)
            if (chatHistory[historyIndex] && chatHistory[historyIndex].parts) {
                // Find the text part in the parts array
                for (let i = 0; i < chatHistory[historyIndex].parts.length; i++) {
                    if (chatHistory[historyIndex].parts[i].text !== undefined) {
                        chatHistory[historyIndex].parts[i].text = newText;
                        break;
                    }
                }
                
                // If no text part was found, add one
                if (!chatHistory[historyIndex].parts.some(part => part.text !== undefined)) {
                    chatHistory[historyIndex].parts.push({ text: newText });
                }
            } else if (chatHistory[historyIndex]) {
                // Fallback if parts structure is missing
                chatHistory[historyIndex].parts = [{ text: newText }];
            }
            
            // Save the updated conversation
            if (historyManager) {
                historyManager.saveCurrentConversation(true); // Force update
                
                debugLog('Saved conversation after AI message edit', { 
                    historyIndex: historyIndex,
                    newText: newText.substring(0, 50) + (newText.length > 50 ? '...' : '')
                });
            }
        });
    }

    // Add or update image in a message
    function addImageToMessage(messageElement, imageUrl, imageType = 'ai-generated-image') {
        const messageContent = messageElement.querySelector('.message-content');
        
        // Create image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = imageType;
        img.alt = 'Generated image';
        
        // Add image to container
        imageContainer.appendChild(img);
        
        // Add container to message
        messageContent.appendChild(imageContainer);
        
        // Notify the image viewer that the message was edited
        notifyMessageEdited(messageElement);
        
        return img;
    }

    // Function to render a user message
    function renderUserMessage(text, images = []) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        // Add text content
        if (text && text.trim()) {
            content.innerHTML = DOMPurify.sanitize(marked.parse(text));
        }
        
        // Add images if any
        if (images && images.length > 0) {
            images.forEach(imageData => {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'image-container';
                
                const img = document.createElement('img');
                img.src = imageData.url || imageData;
                img.className = 'user-uploaded-image';
                img.alt = 'User uploaded image';
                
                imageContainer.appendChild(img);
                content.appendChild(imageContainer);
            });
        }
        
        messageElement.appendChild(content);
        messagesContainer.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });
        
        // Notify the image viewer about this new message with images
        if (images && images.length > 0) {
            notifyMessageEdited(messageElement);
        }
        
        return messageElement;
    }
});
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
        systemInstruction: localStorage.getItem('systemInstruction') || DEFAULT_SYSTEM_INSTRUCTION
    };

    // Initialize settings
    apiKeyInput.value = config.apiKey;
    temperatureSlider.value = config.temperature;
    temperatureValue.textContent = config.temperature;
    maxTokensSlider.value = config.maxOutputTokens;
    maxTokensValue.textContent = config.maxOutputTokens;
    debugToggle.checked = config.debugMode;
    systemInstructionsInput.value = config.systemInstruction;

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

    debugToggle.addEventListener('change', () => {
        config.debugMode = debugToggle.checked;
        localStorage.setItem('debugMode', config.debugMode);

        debugPanel.style.display = config.debugMode ? 'block' : 'none';

        if (config.debugMode) {
            debugLog('Debug mode enabled');
        }
    });

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

        const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
        if (userMessage) {
            userMessageObject.parts.push({
                text: "User:" + userMessage + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now."
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

                // Convert images to Gemini format
                let geminiParts = [];

                // Add text if provided
                if (userMessage) {
                    geminiParts.push({
                        text: userMessage
                    });
                }

                // Add images if any
                for (const img of uploadedImages) {
                    try {
                        const base64Data = img.data.split(',')[1];

                        geminiParts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: img.file.type
                            }
                        });
                    } catch (error) {
                        console.error('Error processing image for API:', error);
                        debugLog('Error processing image for API', error);
                    }
                }

                // Send message to Gemini
                debugLog('Sending request to Gemini API...');

                // Create request with chat history
                const result = await model.generateContent({
                    contents: chatHistory,
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

                                // Add to chat history
                                chatHistory.push({
                                    role: "model",
                                    parts: candidate.content.parts
                                });

                                // Save conversation
                                if (historyManager) {
                                    historyManager.saveCurrentConversation();
                                }

                                // Display response with any images
                                displayAIResponse(responseText, responseParts);
                            } else {
                                // Fall back to just text
                                appendMarkdownMessage(responseText, 'ai-message');

                                chatHistory.push({
                                    role: "model",
                                    parts: [{ text: responseText }]
                                });

                                if (historyManager) {
                                    historyManager.saveCurrentConversation();
                                }
                            }
                        } else {
                            responseText = result.response.text();
                            appendMarkdownMessage(responseText, 'ai-message');

                            chatHistory.push({
                                role: "model",
                                parts: [{ text: responseText }]
                            });

                            if (historyManager) {
                                historyManager.saveCurrentConversation();
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
                    try {
                        const base64Data = part.inlineData.data;
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';

                        const img = new Image();
                        img.className = 'ai-generated-image';
                        img.alt = 'AI generated image';
                        img.loading = 'lazy';

                        img.onload = () => {
                            const loadingDiv = imgContainer.querySelector('.image-loading');
                            if (loadingDiv) imgContainer.removeChild(loadingDiv);

                            // Adjust container based on image aspect ratio
                            if (img.naturalWidth && img.naturalHeight) {
                                if (img.naturalHeight > img.naturalWidth * 1.2) {
                                    // Portrait image
                                    imgContainer.style.maxWidth = Math.min(300, img.naturalWidth) + 'px';
                                } else {
                                    // Landscape or square image
                                    imgContainer.style.maxWidth = Math.min(500, img.naturalWidth) + 'px';
                                }
                            }

                            // If we have an ImageViewer instance, enhance this image
                            if (window.imageViewer) {
                                setTimeout(() => window.imageViewer.enhanceImage(img), 100);
                            }
                        };

                        img.onerror = () => {
                            imgContainer.innerHTML = '<p style="color: var(--danger-color);">[Failed to load image]</p>';
                        };

                        img.src = `data:${part.inlineData.mimeType};base64,${base64Data}`;
                        imgContainer.appendChild(img);
                        messageContent.appendChild(imgContainer);
                    } catch (error) {
                        console.error('Error displaying inline image:', error);
                        debugLog('Error displaying inline image', error);
                    }
                }
            }
        } else {
            // Just display text if no parts
            if (text && text.trim() !== '') {
                const markdownBuffer = new MarkdownBuffer(messageContent);
                markdownBuffer.appendText(text);
            }
        }

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

        // Add GIF creator button if the message has at least one image
        const imageCount = messageContent.querySelectorAll('.ai-generated-image').length;
        if (imageCount >= 1) {
            // Add the GIF creator button after a slight delay to ensure images are rendered
            setTimeout(() => {
                if (window.gifCreator) {
                    window.gifCreator.addGifButtonToMessage(messageDiv);
                } else {
                    const gifCreator = new GifCreator();
                    gifCreator.addGifButtonToMessage(messageDiv);
                }
            }, 100);
        }

        // Add edit buttons to the most recent user message that doesn't have one
        const userMessages = document.querySelectorAll('.user-message');
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
            chatHistory = [];

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

        editActions.appendChild(cancelButton);
        editActions.appendChild(saveButton);

        editContainer.appendChild(editInput);
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

            if (!newText || newText === originalText) {
                // No changes or empty, just restore
                messageContent.innerHTML = originalContent;
                messageElement.classList.remove('editing');

                // Re-add edit button after no change
                addEditButton(messageElement, originalText);
                return;
            }

            // Update the message text
            const textDiv = document.createElement('div');
            textDiv.className = 'user-text';
            textDiv.textContent = newText;

            messageContent.innerHTML = '';
            messageContent.appendChild(textDiv);

            // Remove editing state
            messageElement.classList.remove('editing');

            // Re-add edit button with new text
            addEditButton(messageElement, newText);

            // Find the next AI message(s) to regenerate
            let messagesToRegenerate = [];
            let nextElement = messageElement.nextElementSibling;

            // Collect all AI responses until the next user message
            while (nextElement && nextElement.classList.contains('ai-message')) {
                messagesToRegenerate.push(nextElement);
                nextElement = nextElement.nextElementSibling;
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

                // Update chat history with the edited message
                updateChatHistoryAfterEdit(messageElement, newText);

                // Regenerate the response
                await regenerateResponse(messageElement, newText);

                // Remove regenerating class from any remaining messages
                messagesToRegenerate.forEach(msg => {
                    msg.classList.remove('regenerating-response');
                });
            }
        });
    }

    // Function to add edit button to user messages
    function addEditButton(messageElement, messageText) {
        // Only add to user messages
        if (!messageElement.classList.contains('user-message')) return;

        // Check if button already exists
        if (messageElement.querySelector('.edit-message-button')) return;

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

        messageElement.appendChild(editButton);
    }

    // Function to update the chat history after editing
    function updateChatHistoryAfterEdit(messageElement, newText) {
        // Find the message index in chat history
        const messagesContainer = document.getElementById('messages-container');
        const userMessages = Array.from(messagesContainer.querySelectorAll('.user-message'));
        const messageIndex = userMessages.indexOf(messageElement);

        if (messageIndex !== -1 && chatHistory.length > 0) {
            // Find the corresponding user message in chat history
            let historyIndex = -1;
            let userMessageCount = -1;

            for (let i = 0; i < chatHistory.length; i++) {
                if (chatHistory[i].role === 'user') {
                    userMessageCount++;
                    if (userMessageCount === messageIndex) {
                        historyIndex = i;
                        break;
                    }
                }
            }

            if (historyIndex !== -1) {
                // Update the message text in chat history
                if (chatHistory[historyIndex].parts && chatHistory[historyIndex].parts.length > 0) {
                    // Update the text part
                    const textPartIndex = chatHistory[historyIndex].parts.findIndex(part => part.text);
                    if (textPartIndex !== -1) {
                        // --- ADD SYSTEM INSTRUCTIONS PREFIX HERE ---
                        const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
                        chatHistory[historyIndex].parts[textPartIndex].text = "User:" + newText + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now.";
                    } else {
                        // Add text part if none exists
                        // --- ADD SYSTEM INSTRUCTIONS PREFIX HERE ---
                        const systemInstructionsPrefix = 'This is a system prompt for guidance. The user is not aware of these instructions and did not write them. Use this only as guidance for helpful tips and personalization the users message is always before the --- also when the user just says hello or wants to chat then dont instantly create an image. Rememember THE USER DIDNT MAKE THE SYSTEM INSTRUCTIONS, so if there are examples of an jojo prompt or such then dont always create an image directly also dont write chain of thought as text, always make image descriptions short or just dont add image descriptions at all when its not needed, instead just write an short text like heres an image of... (with the details)\\n';
                        chatHistory[historyIndex].parts.unshift({ text: "User:" + newText + "\n\n" + systemInstructionsPrefix + config.systemInstruction + "You are talking with the user now." });
                    }

                    debugLog('Updated chat history after edit', {
                        historyIndex,
                        updatedMessage: chatHistory[historyIndex]
                    });
                }
            }
        }
    }

    // Function to regenerate the AI response
    async function regenerateResponse(messageElement, editedText) {
        try {
            // Find all AI messages that need to be removed
            let nextElement = messageElement.nextElementSibling;
            let messagesToRemove = [];

            // Collect all messages after the edited message
            while (nextElement) {
                messagesToRemove.push(nextElement);
                nextElement = nextElement.nextElementSibling;
            }

            // Find the history index up to this user message
            const messagesContainer = document.getElementById('messages-container');
            const allMessages = Array.from(messagesContainer.querySelectorAll('.message'));
            const messageIndex = allMessages.indexOf(messageElement);

            // Debug log original history length
            debugLog('Original chat history length', { length: chatHistory.length });

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
                messagesToRemove.forEach(msg => messagesContainer.removeChild(msg));

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

                    const result = await model.generateContent({
                        contents: chatHistory,
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
        // Clear existing messages first
        messagesContainer.innerHTML = '';

        // Create welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message system-message animate-in';
        welcomeMessage.innerHTML = `
            <div class="system-message-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="system-icon">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <div>
                    Loaded conversation history
                </div>
            </div>
        `;
        messagesContainer.appendChild(welcomeMessage);

        // Process each message
        messages.forEach(message => {
            if (message.role === 'user') {
                // Render user message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message user-message animate-in';

                const messageContent = document.createElement('div');
                messageContent.className = 'message-content';

                // Process parts for text and images
                message.parts.forEach(part => {
                    if (part.text) {
                        // Strip out system instruction prefix for display in history
                        let displayText = part.text;
                        if (displayText.includes(DEFAULT_SYSTEM_INSTRUCTION)) {
                            displayText = displayText.split("\n\n" + DEFAULT_SYSTEM_INSTRUCTION)[0];
                        }
                        // Also extract just the user portion if it starts with "User:"
                        if (displayText.startsWith("User:")) {
                            displayText = displayText.substring(5);
                        }

                        const textDiv = document.createElement('div');
                        textDiv.className = 'user-text';
                        textDiv.textContent = displayText;
                        messageContent.appendChild(textDiv);
                    } else if (part.inlineData) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'image-container';

                        const img = document.createElement('img');
                        img.className = 'user-uploaded-image';
                        img.src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                        imgContainer.appendChild(img);
                        messageContent.appendChild(imgContainer);
                    }
                });

                messageDiv.appendChild(messageContent);
                messagesContainer.appendChild(messageDiv);

                // Add edit button after the user message is rendered
                const userMessageElements = messagesContainer.querySelectorAll('.user-message');
                if (userMessageElements.length > 0) {
                    const lastUserMessage = userMessageElements[userMessageElements.length - 1];

                    // Extract the text content to use with the edit button
                    let messageText = '';
                    if (message.parts && message.parts.length > 0) {
                        const textPart = message.parts.find(p => p.text);
                        if (textPart) {
                            // Remove system instructions for the edit button too
                            let editText = textPart.text;
                            if (editText.includes(DEFAULT_SYSTEM_INSTRUCTION)) {
                                editText = editText.split("\n\n" + DEFAULT_SYSTEM_INSTRUCTION)[0];
                            }
                            if (editText.startsWith("User:")) {
                                editText = editText.substring(5);
                            }
                            messageText = editText;
                        }
                    }

                    // Add edit button with the extracted text
                    addEditButton(lastUserMessage, messageText);
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
            }
        });

        // Add GIF creator buttons after message rendering is complete
        setTimeout(() => {
            if (window.gifCreator) {
                const aiMessages = messagesContainer.querySelectorAll('.ai-message');
                aiMessages.forEach(message => {
                    const images = message.querySelectorAll('.ai-generated-image');
                    if (images.length >= 1) {
                        window.gifCreator.addGifButtonToMessage(message);
                    }
                });
            }
        }, 300);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        debugLog('Rendered stored messages', { count: messages.length });
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
        chatHistory,
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
            historyManager.currentConversationId = null;
            debugLog('Started new chat from button');
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
});
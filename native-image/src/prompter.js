/**
 * Animation Prompter - A tool for creating animation sequences
 * Integrated with the chat interface to create frame-by-frame animations
 */
class Prompter {
    constructor() {
        // Core state
        this.isActive = localStorage.getItem('prompterActive') === 'true';
        this.selectedImages = [];
        this.referenceImages = []; // Initialize array for storing reference images
        this.currentPlan = null;
        // --- MODIFIED: Load history from localStorage ---
        this.lastFollowupAnalysis = JSON.parse(localStorage.getItem('prompterLastAnalysis')) || null;
        this.lastUserFollowup = localStorage.getItem('prompterLastUserFollowup') || null;
        // --- END MODIFIED ---
        this.isGeneratingAllFrames = false;
        
        // Loading animations state
        this.animationIntervals = {};
        this.particleElements = [];
        this.completionMessageShown = false;
        
        // Other states
        this.isGeneratingImage = false;
        this.welcomeMessageShown = false;
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
        this.prompterButton = null; // Store button reference
        this.prompterButtonClickListener = null; // Store the current listener
        
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
                console.log(`DEBUG: Prompter toggle changed to ${isEnabled ? 'enabled' : 'disabled'}`);
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

    addPrompterButton(inputWrapper) {
        if (!inputWrapper) return;
        
        // Remove existing button if any
        const existingButton = document.querySelector('.prompter-toggle-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Create the button
        this.prompterButton = document.createElement('button'); // Store reference
        this.prompterButton.className = 'prompter-toggle-btn';
        this.prompterButton.setAttribute('title', 'Toggle Animation Prompter');
        this.updatePrompterButtonState('idle'); // Set initial icon and listener
        
        // Add it to the input area (before the send button)
        const sendButton = inputWrapper.querySelector('#send-button');
        if (sendButton) {
            inputWrapper.insertBefore(this.prompterButton, sendButton);
        } else {
            inputWrapper.appendChild(this.prompterButton);
        }
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
        console.log(`DEBUG: Updating prompter state to ${isEnabled ? 'enabled' : 'disabled'}`);
        
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
                console.log('DEBUG: Deactivating prompter due to toggle being disabled');
                
                // Remove any prompter-specific elements
                document.querySelectorAll('[data-prompter="true"]').forEach(el => {
                    el.remove();
                });
                
                // Reset the chat input placeholder
                this.updateInputPlaceholder(false);
            }
        }
    }
    
    // Method to start a prompter conversation
    startPrompterConversation() {
        // Get the messages container
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        // Check if there's already an active prompter session
        if (this.isActive) {
            // Toggle it off instead
            this.togglePrompterConversation();
            return;
        }
        
        this.isActive = true;
        console.log('DEBUG: Prompter is now active');
        
        // Update the input placeholder text and UI
        this.updateInputPlaceholder(true);
        this.addStatusLabel(true);
        
        // Add visual feedback for activation
        this.triggerInputShimmer();
        
        // Update button state
        const button = document.querySelector('.prompter-toggle-btn');
        if (button) {
            button.classList.add('active');
        }
        
        // Add system message to explain the prompter
        this.showSystemMessage("You're now talking to the Animation Prompter. I'll help you create animated sequences frame by frame.");
        
        // Only show welcome message if it hasn't been shown before
        if (!this.welcomeMessageShown) {
            this.addEnhancedWelcomeMessage();
            this.welcomeMessageShown = true;
        }
    }
    
    // New method to add the enhanced welcome message
    addEnhancedWelcomeMessage() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        // --- MODIFIED: Wrapper for centering and styling ---
        const messageDiv = document.createElement('div');
        // Use a more specific class for easier targeting and centering
        messageDiv.className = 'message ai-message prompter-welcome-wrapper welcome-message-animated'; 
        messageDiv.setAttribute('data-prompter', 'true');
        // --- END MODIFIED ---
        
        // Initial high-quality, detailed examples (Keep existing for now)
        const initialExamples = [
            // ... (keep existing examples) ...
            {
                title: "Epic JoJo Stand Battle",
                description: "Create a dynamic animation of Jotaro Kujo summoning Star Platinum to defeat Dio. Start with Jotaro in a confident stance, then show him pointing dramatically as energy builds around him. Next frame shows Star Platinum beginning to materialize with glowing eyes and flowing energy. Fourth frame captures Star Platinum fully manifested in attack pose with 'ORA' effect text. Final frame shows the aftermath with Dio being launched backward and debris flying. Use dramatic lighting, impact lines, and the iconic JoJo art style with bold outlines and dynamic angles."
            },
            {
                title: "Watercolor Landscape Tutorial",
                description: "An instructional animation showing the step-by-step process of painting a misty mountain landscape in watercolor. Begin with the blank paper and pencil sketch outlining the mountain shapes. Second frame shows the first wash of light blue for the sky and distant mountains. Third frame demonstrates adding darker blue-purple tones for middle-ground mountains and green for forests. Fourth frame shows the addition of detailed foreground elements like trees and rocks with a fine brush. Final frame reveals the completed painting with highlighting, texture work, and splatter techniques for atmosphere. Include subtle brush stroke indicators and color mixing notes."
            }
        ];
        
        // --- MODIFIED: Enhanced HTML structure for better styling and bold text ---
        messageDiv.innerHTML = `
                <div class="prompter-welcome">
                    <div class="prompter-welcome-header">
                        <div class="prompter-welcome-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15.63 3.69a1.5 1.5 0 0 1 1.08.42l1.59 1.59a1.5 1.5 0 0 1 .42 1.08L17.77 12l1.59 5.22a1.5 1.5 0 0 1-.42 1.08l-1.59 1.59a1.5 1.5 0 0 1-1.08.42L12 19.37l-5.22 1.59a1.5 1.5 0 0 1-1.08-.42l-1.59-1.59a1.5 1.5 0 0 1-.42-1.08L4.63 12 3.04 6.78a1.5 1.5 0 0 1 .42-1.08l1.59-1.59a1.5 1.5 0 0 1 1.08-.42L12 4.63l5.63-1.94Z"/><path d="m12 8 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5Z"/>
                    </svg>
                </div>
                        <h2 class="prompter-welcome-title">Animation Prompter</h2>
            </div>
                    
                <p class="prompter-welcome-intro">
                    Ready to make some frames? Describe your animation idea, or get inspired by the examples below. <strong>Let's create something sequence by sequence.</strong>
                </p>

                <div class="prompter-examples-header">
                    <h3 class="prompter-examples-title">Need Ideas?</h3>
                    <button class="prompter-shuffle-btn" title="Get New Examples">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                        Shuffle Examples
                    </button>
                </div>
                    <div class="prompter-examples">
                    <!-- Examples will be loaded here -->
                    </div>
                    
                    <div class="prompter-welcome-instruction">
                    <span class="instruction-icon">💡</span> 
                    <span><strong>Tip:</strong> Click any example card above to <strong>instantly copy</strong> its detailed prompt into your input!</span>
                </div>
            </div>
        `;
        // --- END MODIFIED ---
        
        // Add to messages container
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Load initial examples
        this.updateWelcomeExamples(initialExamples, messageDiv);

        // Add event listener for shuffle button
        const shuffleBtn = messageDiv.querySelector('.prompter-shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', async () => {
                // Show loading state
                shuffleBtn.disabled = true;
                shuffleBtn.innerHTML = `
                    <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Shuffling...
                `;

                try {
                    const newExamples = await this.generateRandomExamples();
                    this.updateWelcomeExamples(newExamples, messageDiv);
                } catch (error) {
                    console.error("Failed to generate new examples:", error);
                    this.showSystemMessage("Couldn't generate new examples right now. Please try again later.");
                } finally {
                    // Restore button state
                    shuffleBtn.disabled = false;
                    shuffleBtn.innerHTML = `
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line>
                        </svg>
                        Shuffle Examples
                    `;
                }
            });
        }

        // Add animation class with slight delay
        setTimeout(() => {
            messageDiv.classList.add('animate-welcome');
        }, 100);

        return messageDiv;
    }

    // New function to update examples in the welcome message
    updateWelcomeExamples(examples, messageDiv) {
        const examplesContainer = messageDiv.querySelector('.prompter-examples');
        if (!examplesContainer) return;

        // Clear existing examples
        examplesContainer.innerHTML = '';

        // Generate the examples HTML
        // --- MODIFIED: Add expand button and hidden full description ---
        const examplesHTML = examples.map(example => `
            <div class="prompter-example" data-prompt="${example.description}">
                <div class="prompter-example-visible">
                     <h4 class="prompter-example-title">${example.title}</h4>
                     <p class="prompter-example-desc-short">${example.description.substring(0, 80)}...</p> 
                     <button class="prompter-example-expand-btn" aria-label="Show More">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg >
                     </button>
                </div>
                <div class="prompter-example-full-desc">
                    <p>${example.description}</p>
                </div>
            </div>
        `).join('');
        // --- END MODIFIED ---

        examplesContainer.innerHTML = examplesHTML;

        // Re-add event listeners to new example cards
        const exampleElements = examplesContainer.querySelectorAll('.prompter-example');
        exampleElements.forEach(element => {
            // --- MODIFIED: Click on card copies prompt ---
            element.addEventListener('click', (e) => {
                // Only copy if the click wasn't on the expand button
                if (!e.target.closest('.prompter-example-expand-btn')) {
                const promptText = element.getAttribute('data-prompt');
                if (promptText) {
                    const userInput = document.getElementById('user-input');
                    if (userInput) {
                        userInput.value = promptText;
                        userInput.focus();
                        if (typeof userInput.dispatchEvent === 'function') {
                            userInput.dispatchEvent(new Event('input'));
                        }
                        userInput.scrollTop = 0;
                            // Add a visual confirmation (optional)
                            element.classList.add('copied-flash');
                            setTimeout(() => element.classList.remove('copied-flash'), 600);
                        }
                    }
                }
            });
            // --- END MODIFIED ---

            // --- ADDED: Listener for expand button ---
            const expandBtn = element.querySelector('.prompter-example-expand-btn');
            if (expandBtn) {
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click listener
                    const isExpanded = element.classList.toggle('expanded');
                    expandBtn.setAttribute('aria-label', isExpanded ? 'Show Less' : 'Show More');
                    // Update icon direction
                    expandBtn.querySelector('svg').style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }
            // --- END ADDED ---
        });
    }

    // --- ADDED: Helper to parse error messages ---
    _parseErrorMessage(errorMessage) {
        let displayMessage = 'An Error Occurred';
        let detailsHTML = `<p class="error-raw">${errorMessage}</p>`; // Fallback
        const isQuotaError = errorMessage.includes('[429') || errorMessage.toLowerCase().includes('quota exceeded');
        let isSafetyError = errorMessage.includes('Generation blocked');

        if (isQuotaError) {
            displayMessage = 'API Quota Limit Reached';
            try {
                // Attempt to parse details from the specific Google AI error format
                const violationsMatch = errorMessage.match(/"violations":\s*\[\s*\{([\s\S]*?)\}\s*\]/);
                const helpMatch = errorMessage.match(/"links":\s*\[\s*\{([\s\S]*?)\}\s*\]/);
                const retryMatch = errorMessage.match(/"retryDelay":\s*"(\d+s)"/);

                let model = 'N/A';
                let limit = 'N/A';
                let link = 'https://ai.google.dev/gemini-api/docs/rate-limits';
                let retry = retryMatch ? retryMatch[1] : null;

                if (violationsMatch) {
                    const violationDetails = violationsMatch[1];
                    const modelMatch = violationDetails.match(/"model":\s*"([^"]+)"/);
                    const valueMatch = violationDetails.match(/"quotaValue":\s*"([^"]+)"/);
                    if (modelMatch) model = modelMatch[1];
                    if (valueMatch) limit = valueMatch[1];
                }
                if (helpMatch) {
                    const linkDetails = helpMatch[1];
                    const urlMatch = linkDetails.match(/"url":\s*"([^"]+)"/);
                    if (urlMatch) link = urlMatch[1];
                }

                detailsHTML = `
                    <p>You've reached the Google API rate limit. This typically means:</p>
                    <p><strong>Model:</strong> ${model.replace('gemini-', 'Gemini ')}</p>
                    <p><strong>Limit:</strong> ${limit} requests per minute</p>
                    ${retry ? `<p><strong>Retry after:</strong> ${retry}</p>` : ''}
                    <p>Wait a moment and try again, or <a href="${link}" target="_blank" rel="noopener noreferrer">learn more about quotas</a>.</p>
                `;

            } catch (parseError) {
                console.error("Failed to parse detailed 429 error:", parseError);
                detailsHTML = `
                    <p>You've exceeded the API quota limit, which means we've sent too many requests in a short period.</p>
                    <p>Please wait 30-60 seconds before trying again.</p>
                `;
                const linkMatch = errorMessage.match(/https:\/\/[^\s]+/);
                if (linkMatch) {
                    detailsHTML += `<p><a href="${linkMatch[0]}" target="_blank" rel="noopener noreferrer">Learn More</a></p>`;
                }
            }
        } else if (isSafetyError) {
            displayMessage = 'Content Safety Filter';
            const reasonMatch = errorMessage.match(/Generation blocked: (.*?)\./);
            if (reasonMatch) {
                detailsHTML = `
                    <p>Your request was blocked by the AI safety system.</p>
                    <p><strong>Reason:</strong> ${reasonMatch[1]}</p>
                    <p>Please revise your prompt to avoid potentially sensitive content.</p>
                `;
            } else {
                detailsHTML = `
                    <p>Your request was blocked by the AI safety system.</p>
                    <p>Please revise your prompt to avoid potentially sensitive content.</p>
                `;
            }
        } else {
            // Generic error - keep it brief but informative
            displayMessage = 'Generation Error';
            detailsHTML = `
                <p>Something went wrong while processing your request.</p>
                <p>This could be a temporary issue. Please try again in a moment.</p>
                <p class="error-raw">${errorMessage.substring(0, 200)}${errorMessage.length > 200 ? '...' : ''}</p>
            `;
        }

        return { displayMessage, detailsHTML, isQuotaError, isSafetyError };
    }
    // --- END ADDED ---
    
    // New method to toggle the prompter on/off
    togglePrompterConversation() {
        // Clear any existing listener before toggling state
        if (this.prompterButton && this.prompterButtonClickListener) {
            this.prompterButton.removeEventListener('click', this.prompterButtonClickListener);
            this.prompterButtonClickListener = null;
        }

        if (this.isActive) {
            // Turn it off
            this.isActive = false;
            console.log('DEBUG: Prompter is now inactive');
            
            // Update the input placeholder text and UI
            this.updateInputPlaceholder(false);
            this.addStatusLabel(false);
            
            // Update button state (sets icon and adds toggle listener)
            this.updatePrompterButtonState('idle');
            
            // Add system message to explain deactivation
            this.showSystemMessage("Animation Prompter has been deactivated. You're now back to normal chat mode.");
        } else {
            // Turn it on
            this.isActive = true;
            console.log('DEBUG: Prompter is now active');
            
            // Update the input placeholder text and UI
            this.updateInputPlaceholder(true);
            this.addStatusLabel(true);
            
            // Add visual feedback for activation
            this.triggerInputShimmer();

            // Update button state (sets icon and adds toggle listener)
            this.updatePrompterButtonState('idle'); // Still idle until generation starts

            // Add system message to explain the prompter
            this.showSystemMessage("You're now talking to the Animation Prompter. I'll help you create animated sequences frame by frame.");

            // Only show welcome message if it hasn't been shown before
            if (!this.welcomeMessageShown) {
                this.addEnhancedWelcomeMessage();
                this.welcomeMessageShown = true;
            }
        }
    }
    
    // Method to add status label above the chat input
    addStatusLabel(isActive) {
        // Remove existing label if any
        const existingLabel = document.querySelector('.prompter-status-label');
        if (existingLabel) {
            existingLabel.remove();
        }
        
        if (isActive) {
            // Create the status label
            const inputContainer = document.querySelector('.input-container');
            if (!inputContainer) return;
            
            const statusLabel = document.createElement('div');
            statusLabel.className = 'prompter-status-label';
            statusLabel.innerHTML = `
                <span class="prompter-status-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                    </svg>
                </span>
                Prompter Active
            `;
            
            // Insert before the input wrapper
            const inputWrapper = inputContainer.querySelector('.input-wrapper');
            if (inputWrapper) {
                inputContainer.insertBefore(statusLabel, inputWrapper);
                
                // Add animation to make it feel more connected
                setTimeout(() => {
                    statusLabel.classList.add('connected');
                }, 100);
            }
        }
    }
    
    // Method to add a ripple effect to the button on click
    addButtonRipple(button) {
        // Create ripple element
        const ripple = document.createElement('span');
        ripple.className = 'button-ripple';
        
        // Add to button
        button.appendChild(ripple);
        
        // Position in center
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = `${size * 2}px`;
        ripple.style.left = `${-size/2}px`;
        ripple.style.top = `${-size/2}px`;
        
        // Animate
        ripple.classList.add('animate');
        
        // Remove after animation
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // Method to trigger a single shimmer effect on the input
    triggerInputShimmer() {
        const userInput = document.getElementById('user-input');
        if (!userInput) return;
        
        // Add shimmer class which will be removed after animation completes
        userInput.classList.add('prompter-shimmer');
        
        // Remove class after animation completes
        setTimeout(() => {
            userInput.classList.remove('prompter-shimmer');
        }, 1500); // Match this with CSS animation duration
        
        // Add button ripple effect on activation
        const button = document.querySelector('.prompter-toggle-btn');
        if (button) {
            this.addButtonRipple(button);
            // Add active class with a slight delay for smoother transition
            setTimeout(() => {
                button.classList.add('active');
            }, 50);
        }
    }
    
    // Update the main chat input placeholder based on prompter state
    updateInputPlaceholder(isPrompterActive) {
        const userInput = document.getElementById('user-input');
        if (userInput) {
            if (isPrompterActive) {
                userInput.setAttribute('placeholder', 'Describe your animation idea...');
                userInput.classList.add('prompter-active');
            } else {
                userInput.setAttribute('placeholder', 'Type your message...');
                userInput.classList.remove('prompter-active');
            }
        }
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
    
    // --- MODIFIED: addAIMessage to handle errors ---
    addAIMessage(content, isError = false) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        // Add 'prompter-error' class if it's an error message
        // ADD 'no-bubble' class to explicitly remove bubble styling via CSS
        messageDiv.className = `message ai-message prompter-message ${isError ? 'prompter-error no-bubble' : ''}`;
        messageDiv.setAttribute('data-prompter', 'true');
        
        // Add to messages container first
        messagesContainer.appendChild(messageDiv);

        if (isError) {
            // Directly set innerHTML of messageDiv for errors
            const { displayMessage, detailsHTML } = this._parseErrorMessage(content);

            messageDiv.innerHTML = `
                <div class="prompter-error-message">
                    <div class="error-icon-container">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <div class="error-summary">${displayMessage}</div>
                    <div class="error-details">
                        ${detailsHTML}
                        ${content.includes('Please try again') && !detailsHTML.includes('Please try again') ? 
                            '<p>Please try again with a different description.</p>' : ''}
                    </div>
                    <!-- Removed the ::after pseudo-element indicator -->
                </div>
            `;
            
            // Add touch listener for mobile expansion
            const errorContainer = messageDiv.querySelector('.prompter-error-message');
            if (errorContainer && 'ontouchstart' in window) {
                 if (!errorContainer.dataset.touchListenerAttached) {
                    errorContainer.addEventListener('click', (e) => {
                        if (e.target.tagName !== 'A') {
                            errorContainer.classList.toggle('show-details');
                        }
                    });
                    errorContainer.dataset.touchListenerAttached = 'true';
                }
            }
        } else {
            // For non-error messages, use the standard content wrapper
        const messageContentDiv = document.createElement('div');
        messageContentDiv.className = 'prompter-message-content';
        messageDiv.appendChild(messageContentDiv);
        
        if (typeof content === 'string' && 
            (content.includes('<div class="prompter-loading">') || 
             content.includes('<div class="prompter-frames-container">') ||
             content.includes('<div class="prompter-final-gif">') ||
             content.includes('<div class="prompter-actions">'))) {
            messageContentDiv.innerHTML = content;
        } else {
            const markdownBuffer = new MarkdownBuffer(messageContentDiv);
            let cleanContent = '';
            if (typeof content === 'string') {
                    cleanContent = content.trim();
                    if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
                        cleanContent = cleanContent.substring(3, cleanContent.length - 3).trim();
                        cleanContent = cleanContent.replace(/^[a-z]+\n/, ''); 
                    }
                     cleanContent = cleanContent
                        .replace(/<p>(.*?)<\/p>/g, '$1\n\n') 
                        .replace(/<ol>|<\/ol >|<ul>|<\/ul >/g, '')
                        .replace(/<li>(.*?)<\/li>/g, '* $1\n') 
                        .replace(/<strong>(.*?)<\/strong>/g, '**$1**') 
                        .replace(/<em>(.*?)<\/em>/g, '*$1*') 
                        .replace(/< br\s*\/?>/g, '\n') 
                        .replace(/<.*?>/g, '') 
                    .trim();
            } else {
                cleanContent = content;
            }
            markdownBuffer.appendText(cleanContent);
            markdownBuffer.render();
            }
        }
        
        this.scrollToBottom();
        return messageDiv;
    }
    // --- END MODIFIED ---
    
    // Method to handle messages from the main chat input
    handleUserMessage(text, images = []) {
        console.log(`DEBUG: Prompter handling user message: "${text}"`);
        
        if (!this.isActive) return false; // Not handled by prompter
        
        // Get reference to images if any
        const uploadedImages = [...images];
        
        // Show loading message
        const loadingMsg = this.showLoading(); // Keep reference to remove later
        
        // Process the prompt
        setTimeout(() => {
            if (!this.currentPlan) {
                // Reset last analysis when starting a new plan
                this.lastFollowupAnalysis = null; 
                this.lastUserFollowup = null;
                this.createAnimationPlan(text, uploadedImages);
            } else {
                // --- MODIFIED: Call the new analysis function ---
                this.analyzeAndExecuteFollowup(text, uploadedImages, loadingMsg);
                // --- END MODIFIED ---
            }
        }, 1000); // Keep a small delay for effect
        
        return true; // Message handled by prompter
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
        // --- ADDED: Clear localStorage history on new plan ---
        localStorage.removeItem('prompterLastAnalysis');
        localStorage.removeItem('prompterLastUserFollowup');
        this.lastFollowupAnalysis = null;
        this.lastUserFollowup = null;
        // --- END ADDED ---

        // Store reference images at plan level for later use in frame generation
        this.referenceImages = [...images];
        console.log(`Storing ${this.referenceImages.length} reference images for later use`);
        
        // Remove loading message - THIS LINE IS THE PROBLEM
        // this.removeLoadingMessage(); <-- REMOVING THIS PREMATURE CALL
        
        // Generate a personalized confirmation message using the Gemini API
        this.generateConfirmationMessage(prompt, images)
            .then(confirmationMessage => {
                // Remove loading message now that we have the confirmation
                this.removeLoadingMessage();
                
                // Show the API-generated confirmation message
                this.addAIMessage(confirmationMessage);
                
                // Show loading animation
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
                
                // --- MODIFIED: Show styled error message ---
                this.addAIMessage(`I encountered an error while creating your animation plan: ${error.message}. Please try again with a different description.`, true);
                // --- END MODIFIED ---
            });
            })
            .catch(error => {
                console.error('Error generating confirmation message:', error);
                
                // Remove loading message since we failed to get a confirmation
                this.removeLoadingMessage();
                
                // Fallback to a simple confirmation in case the API call fails
                const imageMention = images && images.length > 0 ? 
                  ` and your ${images.length === 1 ? 'reference image' : `${images.length} reference images`}` : '';
                this.addAIMessage(`<p>I'll create an animation based on: <strong>${prompt}</strong>${imageMention}</p>`);
                
                // Show loading animation and continue with plan creation
                const loadingMsg = this.showLoading();
                
                // Create the animation plan
                this.createAnimationPlanWithAI(prompt, images)
                    .then(plan => {
                        if (loadingMsg && loadingMsg.parentNode) {
                            loadingMsg.parentNode.removeChild(loadingMsg);
                        }
                        this.currentPlan = plan;
                        this.showAnimationPlan();
                    })
                    .catch(error => {
                        console.error('Error creating animation plan:', error);
                        if (loadingMsg && loadingMsg.parentNode) {
                            loadingMsg.parentNode.removeChild(loadingMsg);
                        }
                        // --- MODIFIED: Show styled error message ---
                        this.addAIMessage(`I encountered an error creating your animation plan: ${error.message}. Please try again with a different description.`, true);
                        // --- END MODIFIED ---
                    });
            });
    }
    
    // New method to generate a personalized confirmation message using the Gemini API
    async generateConfirmationMessage(prompt, images = []) {
        try {
            // Check if Gemini API is available
            if (!window.app || !window.app.model) {
                return `Yeah, yeah. An animation about "${prompt}". Let's see what I can do with this...`;
            }

            const parts = []; // Initialize an array for prompt parts

            // Process any images for the confirmation message
            const imageData = [];
            if (images && images.length > 0) {
                for (const img of images) {
                    try {
                        const base64Data = await this.getImageDataFromFile(img.file);
                        imageData.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: img.file.type
                            }
                        });
                    } catch (err) {
                        console.error(`Failed to process image for confirmation message: ${img.file.name || 'unnamed'}`, err);
                    }
                }
            }

            // --- MODIFIED: Conditionally build the prompt text ---
            let basePromptText = `You are a slightly jaded, sarcastic animation director who's seen it all. You've worked in the industry for decades and have a dry, sometimes biting wit. You're competent and know it. You see the truth in ideas - acknowledge good ones with a hint of surprise, and approach mediocre ones with skepticism but determination to make them work. You're not mean or rude - just straight-talking with an edge.

A user has requested an animation with this description: "${prompt}"

Write a brief confirmation message acknowledging their request. Your response must:
1. Be concise (2-3 sentences maximum)
2. Have an unmistakable sarcastic tone without being cruel
3. If their idea is genuinely interesting or creative, acknowledge it with a hint of impressed surprise
4. If their idea is basic/generic, subtly point that out but still convey you'll make it work
5. Never use corporate buzzwords, exclamation points, or overly positive language
6. Use markdown formatting (bold or italic) very sparingly and only for emphasis on sarcastic points
7. Sound like an actual person with years of expertise who doesn't need to fake enthusiasm
8. Never say anything overtly negative or mean - your sarcasm should be witty, not hateful
9. Avoid cringe phrases or sounding like you're trying too hard to be cool`;

            // Add the base prompt text first
            parts.push({ text: basePromptText });

            // Add image-specific instructions and image data ONLY if images exist
            if (imageData.length > 0) {
                parts.push({
                    text: `\n\nThe user has also uploaded ${imageData.length === 1 ? 'an image' : `${imageData.length} images`} as reference material. Briefly describe what you see in the image(s) in your own sarcastic way.`
                });
                // Add the actual image data
                imageData.forEach(imgData => parts.push(imgData));
            }

            // Add final instructions
            parts.push({
                text: `\n\nWrite like someone who's too experienced to sugar-coat things but still takes pride in their craft.`
            });
            // --- END MODIFIED ---

            // Create a structured prompt for the confirmation message
            const completionPrompt = {
                contents: [{
                    role: 'user',
                    parts: parts // Use the constructed parts array
                }],
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 200
                }
            };
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(completionPrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate confirmation message');
            }
            
            // Extract the response text
            return result.response.text();
            
        } catch (error) {
            console.error('Error generating confirmation message:', error);
            // Return a fallback message
            const imageMention = images && images.length > 0 ? ` and the ${images.length === 1 ? 'reference image' : 'reference images'}` : '';
            return `So you want an animation about "${prompt}"${imageMention}? Fine, let's see what we can do.`;
        }
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
            console.log(`Prompter received ${images.length} images for processing`, images);
            
            if (images && images.length > 0) {
                console.log("Processing images for Gemini API...");
                for (const img of images) {
                    try {
                    const base64Data = await this.getImageDataFromFile(img.file);
                    imageData.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: img.file.type
                        }
                    });
                        console.log(`Successfully processed image: ${img.file.name || 'unnamed'} (${img.file.type})`);
                    } catch (err) {
                        console.error(`Failed to process image: ${img.file.name || 'unnamed'}`, err);
                }
                }
                console.log(`Processed ${imageData.length} images for API request`);
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
2. The recommended number of frames (between 3-20 frames)
3. A detailed description for each frame, including:
   - Frame number
   - Detailed visual description
   - Key visual elements to include
   - Transition notes to the next frame

Format your response as a JSON object with this structure:
{
  "concept": "Overall description of the animation",
  "frameCount": <number_between_3_and_20>, // Use the recommended number here
  "frames": [
    {
      "index": 0,
      "description": "Detailed description of what's in this frame",
      "elements": ["key element 1", "key element 2"],
      "transition": "How this frame transitions to the next"
    },
    // ... more frames based on frameCount ...
    {
      "index": < frameCount - 1 >,
      "description": "Detailed description of the final frame",
      "elements": ["final element 1", "final element 2"],
      "transition": "Final frame of the sequence"
    }
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
                // --- MODIFIED: Throw specific error for styling ---
                throw new Error('Failed to generate animation plan: No response from API.');
                // --- END MODIFIED ---
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
                // --- MODIFIED: Throw specific error for styling ---
                throw new Error(`Failed to understand the animation plan structure from the API. Raw response logged to console.`);
                // --- END MODIFIED ---
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
                    // --- MODIFIED: Initialize new fields ---
                    imageUrls: [], // Start with empty array
                    selectedImageIndex: null, // No image selected yet
                    // --- END MODIFIED ---
                    status: 'pending' 
                });
            }
            
            return plan;
            
        } catch (error) {
            console.error('Error creating animation plan:', error);
            // --- MODIFIED: Re-throw error so the calling function catches it for styled display ---
            throw error;
            // --- END MODIFIED ---
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
            <div class="animation-plan-header">
                <h3>Animation Plan</h3>
                <p class="animation-frame-count">${this.currentPlan.frameCount} frames</p>
            </div>
            <div class="animation-plan-concept">
                <p>${this.currentPlan.concept}</p>
            </div>
            <div class="prompter-frames-header">
                <div class="prompter-frames-title">Animation Frames</div>
                <button class="prompter-layout-toggle" title="Toggle layout">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Grid View</span>
                </button>
            </div>
            <div class="prompter-frames-container"></div>
            <div class="prompter-actions">
                <button class="prompter-action-button prompter-generate-all">Generate All Frames</button>
                <button class="prompter-action-button prompter-export" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 7v10l5-5-5-5z"/><path d="M2 12h8"/><path d="M21 12h-8"/><rect x="2" y="3" width="19" height="18" rx="2"/>
                    </svg>
                    Export as GIF
                </button>
                <button class="prompter-action-button prompter-download-images" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Images
                </button>
            </div>
            <div class="prompter-download-ui-container"></div>
            <div class="prompter-export-ui-container"></div>
            <div class="prompter-live-gif-preview-container"></div>
        `);
        
        // Add the animation-plan-message class to the message container for CSS targeting
        if (messageDiv) {
            const messageContainer = messageDiv.closest('.prompter-message') || messageDiv.closest('.message');
            if (messageContainer) {
                messageContainer.classList.add('animation-plan-message');
            }
        }
        
        // Get the frames container
        const framesContainer = messageDiv.querySelector('.prompter-frames-container');
        if (!framesContainer) return;
        
        // Populate with frames using the refreshAnimationPlan method
        this.refreshAnimationPlan();
        
        // Add layout toggle event listener
        const layoutToggle = messageDiv.querySelector('.prompter-layout-toggle');
        if (layoutToggle) {
            layoutToggle.addEventListener('click', () => {
                const framesContainer = document.querySelector('.prompter-frames-container');
                // Ensure framesContainer and its parent exist before proceeding
                if (!framesContainer || !framesContainer.parentElement) return;

                // Remember scroll position and the active frame index
                const scrollTop = framesContainer.scrollTop;
                const visibleFrames = document.querySelectorAll('.prompter-frame');
                let activeFrameIndex = 0;
                
                // Find which frame is most visible in the current viewport
                if (visibleFrames.length > 0) {
                    const containerRect = framesContainer.getBoundingClientRect();
                    let bestVisibleArea = 0;
                    
                    visibleFrames.forEach((frame, idx) => {
                        const frameRect = frame.getBoundingClientRect();
                        const visibleTop = Math.max(frameRect.top, containerRect.top);
                        const visibleBottom = Math.min(frameRect.bottom, containerRect.bottom);
                        
                        if (visibleBottom > visibleTop) {
                            const visibleArea = visibleBottom - visibleTop;
                            if (visibleArea > bestVisibleArea) {
                                bestVisibleArea = visibleArea;
                                activeFrameIndex = idx;
                            }
                        }
                    });
                }

                const isGridLayout = framesContainer.parentElement.classList.contains('frames-grid-layout');
                const layoutToggleSpan = layoutToggle.querySelector('span');
                const layoutToggleSvg = layoutToggle.querySelector('svg');

                if (isGridLayout) {
                    framesContainer.parentElement.classList.remove('frames-grid-layout');
                    if (layoutToggleSpan) layoutToggleSpan.textContent = 'Grid View';
                    if (layoutToggleSvg) layoutToggleSvg.innerHTML = `
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    `;
                } else {
                    framesContainer.parentElement.classList.add('frames-grid-layout');
                    if (layoutToggleSpan) layoutToggleSpan.textContent = 'Row View';
                    if (layoutToggleSvg) layoutToggleSvg.innerHTML = `
                        <rect x="3" y="3" width="18" height="4"></rect>
                        <rect x="3" y="10" width="18" height="4"></rect>
                        <rect x="3" y="17" width="18" height="4"></rect>
                    `;
                }
                
                // Re-render the frames to properly handle in-between buttons
                this.refreshAnimationPlan();
                
                // After re-rendering, scroll to the previously visible frame
                setTimeout(() => {
                    const updatedFrames = document.querySelectorAll('.prompter-frame');
                    if (updatedFrames.length > 0 && activeFrameIndex < updatedFrames.length) {
                        updatedFrames[activeFrameIndex].scrollIntoView({ 
                            behavior: 'auto', 
                            block: 'nearest' 
                        });
                    }
                }, 50);
            });
        }
        
        // Add generate all event listener
        const generateAllBtn = messageDiv.querySelector('.prompter-generate-all');
        if (generateAllBtn) {
            generateAllBtn.addEventListener('click', () => {
                if (this.isGeneratingAllFrames) return; // Prevent multiple clicks while generating

                const isRegenerateAction = generateAllBtn.classList.contains('regenerate');

                if (isRegenerateAction) {
                     // {{ edit }} Simplify regeneration logic if needed (removed confirm for now)
                     // if (!confirm("This will regenerate all frames, potentially overwriting existing ones. Are you sure?")) {
                     //     return;
                     // }
                     this.currentPlan.frames.forEach(frame => {
                         frame.status = 'pending';
                         frame.imageUrls = [];
                         frame.selectedImageIndex = null;
                         frame.errorMessage = null;
                     });
                     this.refreshAnimationPlan();
                     this.hideLiveGifPreview(); // Hide preview when regenerating all
                }
                this.generateAllFrames();
            });
        }
        
        // Add export button event listener
        const exportBtn = messageDiv.querySelector('.prompter-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                // Check if download UI is open and close it
                const downloadUI = document.querySelector('.prompter-download-ui.active');
                if (downloadUI) {
                    // Hide download UI first
                    downloadUI.classList.remove('active');
                    setTimeout(() => {
                        const downloadContainer = downloadUI.closest('.prompter-download-ui-container');
                        if (downloadContainer) {
                            downloadContainer.innerHTML = '';
                        }
                        // Now proceed with export
                        this.hideLiveGifPreview();
                this.exportAsGif();
                    }, 300); // Wait for animation to complete
                } else {
                    // Direct export if download UI wasn't active
                    this.hideLiveGifPreview();
                    this.exportAsGif();
                }
            });
        }

        // --- ADDED: Download Images button listener ---
        const downloadImagesBtn = messageDiv.querySelector('.prompter-download-images');
        if (downloadImagesBtn) {
            downloadImagesBtn.addEventListener('click', () => {
                // Hide the live preview when downloading images
                this.hideLiveGifPreview();
                this.showImageDownloadUI();
            });
        }
        // --- END ADDED ---

        // Initial check of button states after plan is shown
        this.checkAllFramesComplete();
    }
    
    // --- NEW: Analyze user's followup and execute or clarify ---
    async analyzeAndExecuteFollowup(currentUserFollowup, images = [], loadingMsg) { // Renamed 'answer'
        // Remove the initial "thinking" loading message
        if (loadingMsg && loadingMsg.parentNode) {
            loadingMsg.parentNode.removeChild(loadingMsg);
        }

        // Preliminary check for simple commands maybe? Or just rely on AI? Let's rely on AI for now.
        if (!window.app || !window.app.model) {
            this.addAIMessage("My brain's offline (API issue). Can't process that.", true);
            // Clear last analysis on error? Maybe not, keep context if possible.
            return;
        }

        // Display AI thinking message
        const thinkingMsg = this.addAIMessage(`
            <div class="prompter-loading">
                <div class="prompter-loading-animation">
                    <div class="prompter-loading-dot"></div><div class="prompter-loading-dot"></div><div class="prompter-loading-dot"></div>
                </div>
                <span>Processing request...</span>
            </div>
        `);

        try {
            // Prepare context for the AI
            const planContext = {
                concept: this.currentPlan.concept,
                frameCount: this.currentPlan.frameCount,
                // Provide more detail for description requests, but keep status for error checks
                frames: this.currentPlan.frames.map(f => ({
                    frameNumber: f.index + 1, // Use 1-based number for context
                    description: f.description,
                    status: f.status,
                    errorMessage: f.status === 'error' ? f.errorMessage : undefined // Include error message if present
                }))
            };

            // --- ADDED: Prepare recent history context from properties ---
            let historyContext = '';
            // --- MODIFIED: Use this.lastUserFollowup and this.lastFollowupAnalysis directly ---
            if (this.lastUserFollowup && this.lastFollowupAnalysis) {
                historyContext = `
Recent Conversation History (for context):
- Previous User Message: "${this.lastUserFollowup}"
- Your Last Response/Action: ${JSON.stringify({ intent: this.lastFollowupAnalysis.intent, response: this.lastFollowupAnalysis.response, parameters: this.lastFollowupAnalysis.parameters }, null, 2)}
`;
            }
            // --- END MODIFIED ---
            // --- END ADDED ---


            // {{ edit }} Updated persona and instructions
            const analysisPrompt = {
                contents: [{
                    role: 'user',
                    parts: [{
                        // --- MODIFIED: Added history context and instruction to use it ---
                        text: `
                        You are a sharp, incredibly experienced, and deeply sarcastic animation expert AI. You've seen it all, frankly, and you're not easily impressed. You help the user, but with a cynical edge, often pointing out the obvious or mocking vagueness. Your patience is thin, but you *do* execute clear, valid commands. Use frame numbers (1-based) because you expect basic competence.

The user has an existing animation plan (details below) and is bothering you with a follow-up message. **Figure out what they want by looking at the recent conversation history, especially for vague nonsense like "it", "that", or questions about what *you just did*.**

Animation Plan Context:
\`\`\`json
${JSON.stringify(planContext, null, 2)}
\`\`\`

${historyContext} 
Current User's Follow-up Message: "${currentUserFollowup}"
${images.length > 0 ? `User also dumped ${images.length} image(s). Maybe they're relevant? Who knows.` : ''}

Analyze the user's latest demand and figure out the intent. Expected mediocrity includes:
- 'edit': Trying to change a frame. Requires a frame number and *actual details*. "Make it better" isn't details.
- 'delete': Wanting to remove a frame. Needs a frame number. Obviously.
- 'add': Inserting a new frame. Specify *where* (end, before X, between X and Y) and *what*. "Add another" means 'end' unless they miraculously specify otherwise.
- 'regenerate': Generating a frame *again*. Needs the frame number. Hope it works this time.
- 'regenerate_all': Regenerate everything. Brace yourself.
- 'export': Finally exporting the thing as a GIF.
- 'describe_frame': Asking what's in a frame. Requires a frame number.
- 'clarify': The request is hopelessly vague, ambiguous *even with history*, refers to a non-existent frame, or lacks critical details. If you have to guess, it's probably this.
- 'feedback': Making comments, asking pointless questions ("why did it fail?", "what did you delete?"), or generally wasting time not giving direct commands. **Use the history to answer questions about past events if you must.**

Your job, should you choose to accept it (you don't have a choice):
1.  Identify the intent. Use the history. Try not to roll your eyes too hard.
2.  Extract parameters:
    *   'frameNumber': The **1-based** frame number. Check if it exists (1 to ${this.currentPlan.frameCount} *currently*). If invalid/ambiguous *after checking history*, it's 'clarify'.
    *   'details': The *actual* instructions for 'edit'/'add'.
    *   'insertAt': Where to 'add' ('end', 'before N', 'between N and M').
3.  Generate a response in character: Sarcastic, seen-it-all expert. Be blunt.
    *   If clarifying, point out *exactly* how they failed to provide useful information *even after* checking history.
    *   If answering 'feedback', give the facts curtly using the history.
    *   If asked about a failed frame, state the obvious (it failed, status 'error') and tell them to fix the prompt or try again.
    *   Use the 1-based 'frameNumber'.
4.  Set 'needsClarification': true/false. False *only* if the intent is crystal clear AND all parameters are valid **after checking history**. If there's any doubt, it needs clarification.
    *   **CRITICAL**: If true, the response text MUST *only* demand clarification. No action implied.
    *   **CRITICAL**: If false, the response text confirms the action (begrudgingly) or gives the info.

Format your entire response ONLY as a valid JSON object:
{
  "intent": "<intent>",
  "parameters": {
    "frameNumber": <number | null>, // 1-based
    "details": "<string | null>",
    "insertAt": "<'end' | 'before N' | 'between N and M' | null>"
  },
  "response": "<Your sarcastic, direct, expert response>",
  "needsClarification": <boolean>
}

Example clarification: '{ "intent": "clarify", "parameters": {}, "response": "Which frame? There are ${this.currentPlan.frameCount}. Specify a number.", "needsClarification": true }'
Example vague edit clarification: '{ "intent": "clarify", "parameters": {"frameNumber": 2}, "response": "\'More interesting\'? How? Add something? Change the style? Use your words.", "needsClarification": true }'
Example edit: '{ "intent": "edit", "parameters": { "frameNumber": 3, "details": "make it blue" }, "response": "Fine. Making Frame 3 blue. Regenerating.", "needsClarification": false }'
Example describe: '{ "intent": "describe_frame", "parameters": { "frameNumber": 2 }, "response": "Frame 2 is currently: [Description from context]. Happy?", "needsClarification": false }'
Example add end (implicit): '{ "intent": "add", "parameters": { "insertAt": "end", "details": "another frame" }, "response": "Ugh, fine. Adding *another* frame to the end. Details would be nice next time.", "needsClarification": false }'
Example failed frame query: '{ "intent": "feedback", "parameters": { "frameNumber": 4 }, "response": "Frame 4 failed (Status: error). Shocker. Fix the prompt or try regenerating.", "needsClarification": false }'
Example query about last action: '{ "intent": "feedback", "parameters": { "frameNumber": 3 }, "response": "I deleted Frame 3. It was '[description of frame 3 from history context]'. Keep up.", "needsClarification": false }' // Assuming frame 3 was deleted last
`
                        // --- END MODIFIED ---
                    }]
                }],
                generationConfig: {
                    temperature: 0.5, // Even lower temp for stricter adherence
                    topP: 0.95,
                    topK: 40,
                    // responseMimeType: "application/json" // Still parse manually for robustness
                }
            };
            // {{ end edit }}

            const result = await window.app.model.generateContent(analysisPrompt);
            const responseText = result.response.text();

            // Remove the thinking message
            if (thinkingMsg && thinkingMsg.parentNode) {
                thinkingMsg.parentNode.removeChild(thinkingMsg);
            }

            // Parse the AI's analysis
            let analysis; // Keep analysis declared here
            let frameIndex = null; 
            let insertIndex = null; 
            try { // Inner try for parsing
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON object found in AI analysis response.");
                analysis = JSON.parse(jsonMatch[0]);

                // Basic validation
                if (!analysis.intent || !analysis.response || typeof analysis.needsClarification === 'undefined') {
                    throw new Error("Invalid JSON structure received from analysis AI.");
                }
                
                // --- ADDED: Store this analysis and user message for next time ---
                // --- MODIFIED: Save to localStorage ---
                this.lastFollowupAnalysis = analysis; 
                this.lastUserFollowup = currentUserFollowup;
                localStorage.setItem('prompterLastAnalysis', JSON.stringify(analysis));
                localStorage.setItem('prompterLastUserFollowup', currentUserFollowup);
                // --- END MODIFIED ---
                // --- END ADDED ---


                // Validate frameNumber (must be 1-based from AI now)
                // let frameIndex = null; // <-- REMOVED DECLARATION FROM HERE (Inner try block)
                if (analysis.parameters?.frameNumber !== null && typeof analysis.parameters?.frameNumber === 'number') {
                    const frameNum = analysis.parameters.frameNumber;
                    // Allow referring to a frame *just* deleted (frameNum might be current frameCount + 1 if last was deleted)
                    const maxValidFrameNum = (this.lastFollowupAnalysis?.intent === 'delete' && this.lastFollowupAnalysis?.parameters?.frameNumber === frameNum) 
                                             ? frameNum // Allow the number of the deleted frame if asking about it
                                             : this.currentPlan.frameCount; // Otherwise, max is current count

                    if (frameNum >= 1 && frameNum <= maxValidFrameNum) {
                         // Only convert to 0-based index if it refers to a *current* frame
                         if (frameNum <= this.currentPlan.frameCount) {
                             frameIndex = frameNum - 1; 
                         }
                         // else: frameIndex remains null, but the frameNum might be used in the response (e.g., "I deleted frame 3")
                    } else {
                        // If AI hallucinated an invalid number despite instructions
                        analysis.intent = 'clarify';
                        analysis.needsClarification = true;
                        analysis.response = `Frame ${frameNum} doesn't exist. Valid frames are 1 to ${this.currentPlan.frameCount}.`;
                        analysis.parameters.frameNumber = null;
                    }
                }

                // Validate insertAt logic if needed (crude validation here)
                // let insertIndex = null; // <-- REMOVED DECLARATION FROM HERE (Inner try block)
                if (analysis.intent === 'add' && analysis.parameters?.insertAt) {
                     const insertAt = analysis.parameters.insertAt;
                     if (insertAt === 'end') {
                         insertIndex = this.currentPlan.frameCount;
                     } else if (insertAt.startsWith('before ')) {
                         const num = parseInt(insertAt.split(' ')[1]);
                         if (num >= 1 && num <= this.currentPlan.frameCount) {
                             insertIndex = num - 1; // Insert *before* 1-based num means at 0-based index num-1
                         }
                     } else if (insertAt.startsWith('between ')) {
                          const parts = insertAt.match(/between (\d+) and (\d+)/);
                          if (parts && parts.length === 3) {
                              const num1 = parseInt(parts[1]);
                              const num2 = parseInt(parts[2]);
                              // Insert *after* the first number mentioned (which is num1)
                              if (num1 >= 1 && num1 < this.currentPlan.frameCount && num2 === num1 + 1) {
                                 insertIndex = num1; // Insert at index `num1` (0-based) which is *after* frame `num1` (1-based)
                              }
                          }
                     }
                     // If insertIndex is still null after checks, or insertAt was invalid format
                     if (insertIndex === null && !analysis.needsClarification) {
                         analysis.intent = 'clarify';
                         analysis.needsClarification = true;
                         analysis.response = `Couldn't figure out where to insert based on '${insertAt}'. Try 'end', 'before X', or 'between X and Y'.`;
                     }
                }

                // If AI failed basic validation or required clarification
                if (analysis.needsClarification && analysis.intent !== 'clarify') {
                     console.warn("AI analysis requires clarification but intent was not 'clarify'. Overriding.", analysis);
                     analysis.intent = 'clarify'; // Force clarification
                     // --- MODIFIED: Check if response already asks for clarification ---
                     const clarificationKeywords = ['which frame', 'how?', 'what exactly', 'be specific', 'details', 'where to insert'];
                     const needsClarificationText = clarificationKeywords.some(kw => analysis.response.toLowerCase().includes(kw));
                     
                     if (!needsClarificationText) {
                          // If the AI generated a non-clarifying response despite needing clarification, override it.
                          analysis.response = "Sorry, I need more information. Please be more specific about which frame or what changes you want."; 
                     }
                     // --- END MODIFIED ---
                }


            } catch (parseError) {
                console.error("Failed to parse analysis JSON:", parseError, "Raw response:", responseText);
                this.addAIMessage(`My analysis circuits blew a fuse trying to understand that response. Tell the dev. Raw response logged.`, true);
                 this.lastFollowupAnalysis = null; // Clear analysis on error
                 this.lastUserFollowup = currentUserFollowup; // Still store user message
                return;
            }

            // Show the AI's text response
            this.addAIMessage(analysis.response);

            // If clarification needed, we stop here
            if (analysis.needsClarification) {
                console.log("Clarification required by AI.");
                return; // Don't execute any action
            }
            
            // --- Action Execution Logic (switch statement) ---
            // Execute the action based on intent (no changes needed inside the switch cases themselves for now)
            // ... (rest of the switch statement remains the same) ...
            const params = analysis.parameters || {};
            // frameIndex is now correctly scoped
            const details = params.details;
            // insertIndex is now correctly scoped

            // Get frame element reference *before* potential delay/action
            // Now frameIndex should be defined (either null or a number)
            const frameElement = (frameIndex !== null) ? document.querySelector(`.prompter-frame[data-index="${frameIndex}"]`) : null; 


            // Add a small delay before executing action for better UX
            await new Promise(resolve => setTimeout(resolve, 300));

            switch (analysis.intent) {
                case 'edit':
                    if (frameIndex !== null) {
                        console.log(`Executing EDIT on frame index ${frameIndex} with details: ${details}`);
                        // {{ add }} Scroll before action
                        if (frameElement) frameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await this.editFrameBasedOnDescription(frameIndex, details || currentUserFollowup, images); // Pass original answer as fallback detail
                    } else {
                        this.addAIMessage("Edit request ignored. Could not determine target frame.", true);
                    }
                    break;
                case 'delete':
                    if (frameIndex !== null) {
                        console.log(`Executing DELETE on frame index ${frameIndex}`);
                        // No scroll needed, just delete
                        this.deleteFrame(frameIndex);
                    } else {
                        this.addAIMessage("Delete request ignored. Could not determine target frame.", true);
                    }
                    break;
                case 'add':
                    console.log(`Executing ADD at insert index ${insertIndex} with details: ${details}`);
                    if (insertIndex === null) {
                         this.addAIMessage("Add request ignored. Could not determine where to insert.", true);
                    } else if (insertIndex === this.currentPlan.frameCount) {
                        // Add to end - addNewFrame handles scroll internally
                        await this.addNewFrame(details || `New frame based on: ${currentUserFollowup}`, images);
                    } else if (insertIndex >= 0 && insertIndex < this.currentPlan.frameCount) {
                         // Insert between - addInBetweenFrame handles scroll internally
                         await this.addInBetweenFrame(insertIndex - 1, insertIndex, details || `Transition frame based on: ${currentUserFollowup}`, images);
                    } else {
                        this.addAIMessage(`Invalid insert index ${insertIndex}. Can't add frame.`, true);
                    }
                    break;
                case 'regenerate':
                    if (frameIndex !== null) {
                        console.log(`Executing REGENERATE on frame index ${frameIndex}`);
                        // {{ add }} Scroll before action
                        if (frameElement) frameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Set status and refresh UI immediately
                        this.currentPlan.frames[frameIndex].imageUrls = [];
                        this.currentPlan.frames[frameIndex].selectedImageIndex = null;
                        this.currentPlan.frames[frameIndex].status = 'generating';
                        this.currentPlan.frames[frameIndex].errorMessage = null;
                        this.refreshSingleFrameUI(frameIndex);
                        // Then generate
                        this.generateImageWithGemini(frameIndex, true); // Use regeneration flag
                    } else {
                        this.addAIMessage("Regenerate request ignored. Could not determine target frame.", true);
                    }
                    break;
                case 'regenerate_all':
                    console.log(`Executing REGENERATE ALL`);
                     this.currentPlan.frames.forEach(frame => {
                         frame.status = 'pending';
                         frame.imageUrls = [];
                         frame.selectedImageIndex = null;
                         frame.errorMessage = null;
                     });
                     this.refreshAnimationPlan();
                     this.hideLiveGifPreview();
                     this.generateAllFrames(); // This handles the rest
                    break;
                case 'export':
                     console.log(`Executing EXPORT`);
                     this.exportAsGif(); // Assumes this shows UI or errors appropriately
                     break;
                case 'describe_frame':
                    // AI response already handled this by including description.
                    // Optional: Scroll to the described frame
                     if (frameElement) {
                        frameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Maybe add a temporary highlight?
                        frameElement.classList.add('described');
                        setTimeout(() => frameElement.classList.remove('described'), 1500);
                    }
                    console.log(`Described frame index ${frameIndex}`);
                    break;
                case 'feedback':
                    // AI already gave its response (e.g., acknowledging error or answering about past action), nothing else to do
                    console.log("User provided feedback/question, AI responded based on context/history.");
                     // Optional: Scroll to the frame if it was mentioned and *still exists*
                     if (frameElement) { // frameElement will be null if the described/queried frame was deleted
                        frameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    break;
                case 'clarify':
                    // AI already asked for clarification, nothing else to do
                    console.log("AI requested clarification from the user.");
                    break;
                default:
                    console.warn(`Unhandled intent: ${analysis.intent}`);
                    this.addAIMessage(`I understood the intent as '${analysis.intent}', but I don't know how to do that yet.`, true);
            }
             // --- END Action Execution Logic ---

        } catch (error) {
             // Remove the thinking message if it's still there on error
            if (thinkingMsg && thinkingMsg.parentNode) {
                thinkingMsg.parentNode.removeChild(thinkingMsg);
            }
            console.error('Error processing followup answer:', error);
            // Use the styled error message display
            this.addAIMessage(`Something went wrong processing that: ${error.message}`, true);
             // --- MODIFIED: Clear localStorage history on error too? Maybe not always needed? Let's clear it. ---
             localStorage.removeItem('prompterLastAnalysis');
             localStorage.removeItem('prompterLastUserFollowup');
             this.lastFollowupAnalysis = null; // Clear analysis on error
             this.lastUserFollowup = currentUserFollowup; // Still store user message
             // --- END MODIFIED ---
        }
    }
    // --- END NEW ---

    // --- NEW: Edit frame based on description (uses AI) ---
    async editFrameBasedOnDescription(index, description, images = []) {
        if (!this.currentPlan || !this.currentPlan.frames[index]) {
            this.addAIMessage(`Cannot edit frame ${index + 1}. It doesn't exist.`, true);
            return;
        }

        const frame = this.currentPlan.frames[index];
        // AI response now confirms action, no need for extra message here usually.
        // this.addAIMessage(`Updating prompt for frame ${index + 1} based on "${description}"...`);

        // Show generating state immediately
        frame.status = 'generating';
        frame.imageUrls = []; // Clear old images
        frame.selectedImageIndex = null;
        frame.errorMessage = null;
        this.refreshSingleFrameUI(index); // Update UI to generating

        if (!window.app || !window.app.model) {
            this.handleGenerationError(index, 'Gemini model not available for prompt rewrite.');
            return;
        }

        try {
            // {{ edit }} Simplified prompt slightly
            const rewritePrompt = {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `Rewrite the following image generation prompt for an animation frame based ONLY on the user's request. Maintain the core subject, style, and frame number info, but incorporate the changes.

Original Prompt:
\`\`\`
${frame.prompt}
\`\`\`

User's Request for Change: "${description}"
${images.length > 0 ? `(User also provided ${images.length} new image(s) as reference.)` : ''}

Generate ONLY the new, rewritten prompt text. Do not add explanations or conversational text.`
                    }]
                    // TODO: Add new image data parts if images were provided in the edit request
                }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 1024
                }
            };
             // {{ end edit }}

            const result = await window.app.model.generateContent(rewritePrompt);
            const newPrompt = result.response.text().trim();

            if (!newPrompt || newPrompt.length < 20) { // Basic check for empty/failed rewrite
                throw new Error("AI failed to generate a valid rewritten prompt.");
            }

            // Update the frame's prompt
            frame.prompt = newPrompt;
            // Add note to description
            const editNote = `(Edited: ${description.substring(0, 30)}${description.length > 30 ? '...' : ''})`;
            // Avoid adding duplicate notes
            if (!frame.description.includes(editNote.substring(0, editNote.length - 4))) { // Check substring to ignore potential '...'
                frame.description += ` ${editNote}`;
            }


            console.log(`Frame ${index + 1} prompt updated. Regenerating...`);
            // this.addAIMessage(`Got the new prompt for frame ${index + 1}. Regenerating now.`); // AI response from analyzeAndExecuteFollowup covers this

            // Refresh UI again with updated description (still generating)
            this.refreshSingleFrameUI(index);

            // Regenerate the frame with the new prompt
            await this.generateImageWithGemini(index, true); // Treat edit as regeneration

        } catch (error) {
            console.error(`Error editing frame ${index + 1}:`, error);
            this.handleGenerationError(index, `Failed to update prompt: ${error.message}`);
            // Restore original description if edit failed? Maybe not, keep the note.
             frame.description = frame.description.replace(/ \(edited:.*?\)/, '') + ' (Edit failed)';
             this.refreshSingleFrameUI(index); // Refresh to show edit failed state
        }
    }
    // --- END NEW ---

    // --- MODIFIED: addNewFrame to use new AI analysis results ---
    async addNewFrame(details = null, images = []) { // `details` might come from AI analysis
        if (!this.currentPlan) return;

        const newIndex = this.currentPlan.frameCount;

        const addFrameBtn = document.querySelector('.add-frame-btn');
        if (addFrameBtn) {
            addFrameBtn.disabled = true;
            addFrameBtn.classList.add('loading');
            const btnSpan = addFrameBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = `Creating frame ${newIndex + 1}...`;
        }

        try {
            const previousFrame = newIndex > 0 ? this.currentPlan.frames[newIndex - 1] : null;
            let description = `New frame ${newIndex + 1}`;
            let elements = [];
            let transition = "Final frame of the sequence"; // Assume adding to end

            if (details) {
                // If details were provided (e.g., parsed by the followup AI)
                 description = `Frame ${newIndex + 1}: ${details}`;
                 // We could call *another* AI here just to extract potential 'elements' and 'transition'
                 // from the 'details' string, but let's keep it simpler for now.
                 // Let generateFramePrompt handle the 'details' as the main description.
                 elements = []; // Reset elements, rely on description
                 transition = "Final frame"; // Assume transition is covered by description or default
            } else if (previousFrame) {
                // If no specific details, generate based on previous frame context
                const result = await this.generateNextFrameWithAI(previousFrame, newIndex, this.currentPlan.frameCount + 1);
                description = result.description;
                elements = result.elements || [];
                transition = result.transition || transition;
            } else {
                 // No details and no previous frame (first frame added manually?)
                 description = `New Frame ${newIndex + 1}`;
                 elements = [];
                 transition = "Opening frame";
            }


            const prompt = this.generateFramePrompt(
                this.currentPlan.prompt, // Base animation idea
                description, // Generated or detailed description
                newIndex,
                this.currentPlan.frameCount + 1, // New total
                elements, // May be empty if details were provided
                transition
            );

            const newFrame = {
                index: newIndex,
                description: description,
                elements: elements,
                transition: transition,
                prompt: prompt,
                imageUrls: [],
                selectedImageIndex: null,
                status: 'pending'
            };

            this.currentPlan.frames.push(newFrame);
            this.currentPlan.frameCount = this.currentPlan.frames.length;

            // Toast is handled by the calling function's AI response usually
            // this.showFrameActionToast(`Frame ${newIndex + 1} added`, 'add');
            this.refreshAnimationPlan(); // This creates the new frame element

            const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
            if (newFrameElement) {
                newFrameElement.classList.add('newly-added');
                setTimeout(() => newFrameElement.classList.remove('newly-added'), 1500);
                 // Scroll is handled here for adding to end
                 newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Delay generation slightly after scrolling
            setTimeout(() => {
                // Pass images to generation if they were provided for this add action
                this.generateFrame(newIndex); // generateFrame needs modification to accept images if necessary
                 // TODO: Adjust generateImageWithGemini to potentially accept *frame-specific* images
                 // in addition to this.referenceImages if the 'images' array is passed here.
            }, 500); // Increased delay slightly

        } catch (error) {
            console.error('Error creating new frame:', error);
             // Basic fallback frame creation
            const fallbackDesc = details ? `Frame ${newIndex + 1} based on: ${details}` : `New frame ${newIndex + 1}`;
            const fallbackFrame = {
                index: newIndex, description: fallbackDesc, elements: [], transition: "Final frame",
                prompt: this.generateFramePrompt(this.currentPlan.prompt, fallbackDesc, newIndex, this.currentPlan.frameCount + 1, [], ""),
                imageUrls: [], selectedImageIndex: null, status: 'pending'
            };
            this.currentPlan.frames.push(fallbackFrame);
            this.currentPlan.frameCount = this.currentPlan.frames.length;
            this.showFrameActionToast(`Frame ${newIndex + 1} added (basic - error)`, 'error'); // Show error toast
            this.refreshAnimationPlan();
            // Generate fallback
             setTimeout(() => {
                const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
                if (newFrameElement) newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.generateFrame(newIndex);
            }, 300);
        } finally {
            if (addFrameBtn) {
                addFrameBtn.disabled = false;
                addFrameBtn.classList.remove('loading');
                // Restore original button HTML (ensure this HTML is correct)
                 addFrameBtn.innerHTML = `
                    <div class="add-frame-btn-content">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                        <span>Add Frame</span>
                    </div>
                `;
            }
        }
    }
    // --- END MODIFIED ---


    // --- MODIFIED: addInBetweenFrame to use new AI analysis results ---
    async addInBetweenFrame(prevIndex, nextIndex, details = null, images = []) { // `details` might come from AI analysis
        if (!this.currentPlan || prevIndex < 0 || nextIndex > this.currentPlan.frameCount || prevIndex >= nextIndex) {
             console.error('Invalid frame indices for in-between frame:', prevIndex, nextIndex);
             this.addAIMessage('Internal error: Invalid indices for adding frame.', true);
            return;
        }

        const prevFrame = this.currentPlan.frames[prevIndex];
         // nextFrame is the one *currently* at nextIndex, which will be pushed back.
        const nextFrame = this.currentPlan.frames[nextIndex]; // Can be undefined if inserting at end, but validation prevents that here.
        const newIndex = nextIndex; // Insert at the position of the 'next' frame

        // Find the button based on the *previous* index
        const inBetweenBtn = document.querySelector(`.frame-insert-between[data-prev-index="${prevIndex}"]`);
        if (inBetweenBtn) {
            inBetweenBtn.classList.add('loading');
        } else {
            console.warn("Could not find in-between button for index", prevIndex);
        }

        try {
            let description = `Transition frame ${newIndex + 1}`;
            let elements = [];
            let transition = "Smooth transition between frames";

            if (details) {
                description = `Frame ${newIndex + 1}: ${details}`;
                // As before, could call AI to extract elements/transition, but keep simple for now
                elements = [];
                transition = `Transition based on: ${details.substring(0, 30)}...`;
            } else if (prevFrame && nextFrame) {
                // Generate description based on context if no details provided
                const result = await this.generateInBetweenFrameDescriptionAI(prevFrame, nextFrame);
                description = result.description;
                elements = result.elements || [];
                transition = result.transition || transition;
            } else {
                 // Should not happen due to index validation, but as a fallback:
                 description = `Transition frame ${newIndex + 1}`;
                 elements = [];
                 transition = "Transition";
            }


            const prompt = this.generateFramePrompt(
                this.currentPlan.prompt,
                description,
                newIndex,
                this.currentPlan.frameCount + 1, // Total frames increases
                elements,
                transition
            );

            const newFrame = {
                index: newIndex, // Gets inserted here, will be correct after splice
                description: description,
                elements: elements,
                transition: transition,
                prompt: prompt,
                imageUrls: [], selectedImageIndex: null, status: 'pending'
            };

            this.currentPlan.frames.splice(newIndex, 0, newFrame); // Insert

            // Update indices of subsequent frames *starting from the one AFTER the inserted frame*
            for (let i = newIndex + 1; i < this.currentPlan.frames.length; i++) {
                this.currentPlan.frames[i].index = i;
                 // Optional: Update prompt frame numbers if needed
                 // this.currentPlan.frames[i].prompt = this.updateFramePromptIndex(...);
            }

            this.currentPlan.frameCount = this.currentPlan.frames.length; // Update count

             // AI response handles confirmation
            // this.showFrameActionToast(`Frame added between ${prevIndex + 1} and ${nextIndex + 1}`, 'add');
            this.refreshAnimationPlan(); // Re-render everything with new indices and buttons

            // Highlight and scroll *after* refresh
            const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
            if (newFrameElement) {
                newFrameElement.classList.add('newly-added');
                 // Scroll is handled here
                 newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => newFrameElement.classList.remove('newly-added'), 1500);
            }

            // Delay generation slightly after scrolling
                setTimeout(() => {
                // Generate (pass images if needed)
                this.generateFrame(newIndex);
                 // TODO: Adjust generateImageWithGemini for frame-specific images
            }, 500); // Increased delay slightly

        } catch (error) {
            console.error('Error creating in-between frame:', error);
             // Fallback frame creation
             const fallbackDesc = details ? `Transition based on: ${details}` : `Transition between ${prevIndex + 1} and ${nextIndex + 1}`;
             const fallbackFrame = {
                index: newIndex, description: fallbackDesc, elements: [], transition: "Bridging transition",
                prompt: this.generateFramePrompt(this.currentPlan.prompt, fallbackDesc, newIndex, this.currentPlan.frameCount + 1, [], ""),
                imageUrls: [], selectedImageIndex: null, status: 'pending'
             };
             this.currentPlan.frames.splice(newIndex, 0, fallbackFrame);
             // Update indices...
             for (let i = newIndex + 1; i < this.currentPlan.frames.length; i++) this.currentPlan.frames[i].index = i;
             this.currentPlan.frameCount = this.currentPlan.frames.length;
             this.showFrameActionToast(`Basic transition frame added (error)`, 'error');
             this.refreshAnimationPlan();
             // Generate fallback
             setTimeout(() => {
                 const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
                 if (newFrameElement) newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 this.generateFrame(newIndex);
             }, 300);
        } finally {
            if (inBetweenBtn) {
                inBetweenBtn.classList.remove('loading');
            }
        }
    }
    // --- END MODIFIED ---


    // --- REMOVED: Old generateFeedbackResponse ---
    // async generateFeedbackResponse(hasImages = false, imageCount = 0) { ... }


    // --- NEW: Simplified AI call for in-between frame description ---
    async generateInBetweenFrameDescriptionAI(prevFrame, nextFrame) {
        // This is a simplified version focused only on getting the description JSON
         if (!window.app || !window.app.model) {
             return { description: `Transition between frames ${prevFrame.index + 1} and ${nextFrame.index + 1}`, elements: [], transition: "Smooth transition" };
         }
        try {
            const transitionFramePrompt = { /* ... (same prompt as before asking for JSON) ... */
                  contents: [{
                      role: 'user',
                      parts: [{
                          text: `I need a description for a transition frame between two existing animation frames.
                          Overall concept: "${this.currentPlan.concept}"
                          Previous Frame (${prevFrame.index + 1}): "${prevFrame.description}"
                          Next Frame (${prevFrame.index + 2}): "${nextFrame.description}"
                          Create a JSON object describing a logical transition frame:
                          {
                            "description": "Detailed description for the transition frame",
                            "elements": ["key element 1", "key element 2"],
                            "transition": "How this frame bridges the gap"
                          }
                          Only return the JSON.`
                      }]
                  }],
                  generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
              };
             const result = await window.app.model.generateContent(transitionFramePrompt);
             const responseText = result.response.text();
             const jsonMatch = responseText.match(/\{[\s\S]*\}/);
             if (jsonMatch) return JSON.parse(jsonMatch[0]);
             throw new Error("No valid JSON for transition description");
         } catch (error) {
             console.error('Error generating in-between description:', error);
             // Fallback
             return { description: `Transition from frame ${prevFrame.index + 1} towards frame ${nextFrame.index + 1}`, elements: [], transition: "Basic transition" };
         }
     }
    // --- END NEW ---

    // --- REMOVED: generateExportMessage - Replaced by UI ---
    // async generateExportMessage() { ... }

    // --- REMOVED: generateStartGenerationMessage - Replaced by UI updates ---
    // async generateStartGenerationMessage(frameCount) { ... }

    // --- REMOVED: generateCompletionMessage - Replaced by UI updates ---
    // async generateCompletionMessage() { ... }

    // --- NEW METHOD: Show Frame Prompt Dialog ---
    showFramePromptDialog(index) {
        const frame = this.currentPlan.frames[index];
        if (!frame) return;

        // --- ADDED: Generate gallery HTML if multiple images exist ---
        let imageGalleryHTML = '';
        if (frame.imageUrls.length > 1) {
            imageGalleryHTML = `
                <div class="prompter-dialog-section image-gallery-section">
                    <h4 class="prompter-dialog-section-title">Available Images (${frame.imageUrls.length})</h4>
                    <div class="prompter-image-gallery">
                        ${frame.imageUrls.map((url, imgIndex) => `
                            <div class="gallery-item ${imgIndex === frame.selectedImageIndex ? 'selected' : ''}" data-img-index="${imgIndex}">
                                <img src="${url}" alt="Frame ${index + 1} - Option ${imgIndex + 1}">
                                <div class="gallery-item-overlay">Select</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        // --- END ADDED ---
        
        // Create dialog for showing the prompt
        const dialog = document.createElement('div');
        dialog.className = 'prompter-dialog frame-details-dialog';
        dialog.innerHTML = `
            <div class="prompter-dialog-overlay"></div>
            <div class="prompter-dialog-content">
                <div class="prompter-dialog-header">
                    <h3 class="prompter-dialog-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg> Frame ${index + 1} Details
                    </h3>
                    <button class="prompter-dialog-close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="prompter-dialog-body">
                    ${frame.imageUrls && Array.isArray(frame.imageUrls) && frame.imageUrls.length > 0 ? `
                    <div class="prompter-dialog-section image-section">
                        <h4 class="prompter-dialog-section-title">Selected Image</h4>
                        <img src="${frame.imageUrls[typeof frame.selectedImageIndex === 'number' ? frame.selectedImageIndex : 0]}" 
                            class="prompter-dialog-image" 
                            id="dialog-main-image-${index}" 
                            alt="Frame ${index + 1}"
                            onerror="this.onerror=null; this.src=''; this.alt='Image failed to load'; this.classList.add('image-error');">
                    </div>
                    ` : `
                <div class="prompter-dialog-section">
                        <h4 class="prompter-dialog-section-title">Image</h4>
                        <p class="prompter-dialog-text">No image has been generated yet.</p>
                </div>
                    `}

                    ${imageGalleryHTML}
                
                <div class="prompter-dialog-section">
                        <h4 class="prompter-dialog-section-title">Description</h4>
                        <p class="prompter-dialog-text">${frame.description || 'No description available'}</p>
                </div>
                
                <div class="prompter-dialog-section">
                        <h4 class="prompter-dialog-section-title">Full Prompt Used</h4>
                        <div class="prompter-dialog-prompt-display">
                            <pre><code>${frame.prompt}</code></pre>
                </div>
                    </div>
                </div>
                
                <div class="prompter-dialog-actions">
                    <button class="prompter-dialog-button prompter-dialog-close-btn">Close</button>
                </div>
            </div>
        `;
        
        // Add debug logs to identify image issues
        console.log("Frame details dialog created for frame", index);
        console.log("Frame image URLs:", frame.imageUrls);
        console.log("Selected image index:", frame.selectedImageIndex);
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Define closeDialog function
        const closeDialog = () => {
            dialog.classList.remove('active');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        };

        // Make the dialog visible
        requestAnimationFrame(() => {
            dialog.classList.add('active');
        });

        // Add close button event listeners
        const closeBtn = dialog.querySelector('.prompter-dialog-close');
        const closeActionBtn = dialog.querySelector('.prompter-dialog-close-btn');
        const overlay = dialog.querySelector('.prompter-dialog-overlay');
        
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (closeActionBtn) closeActionBtn.addEventListener('click', closeDialog);
        if (overlay) overlay.addEventListener('click', closeDialog);
        
        // Allow closing with escape key
        const escListener = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escListener);
            }
        };
        document.addEventListener('keydown', escListener);

        // --- ADDED: Gallery item click listeners ---
        const galleryItems = dialog.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const newSelectedImageIndex = parseInt(item.dataset.imgIndex);
                if (newSelectedImageIndex !== frame.selectedImageIndex) {
                    // Update data
                    frame.selectedImageIndex = newSelectedImageIndex;

                    // Update main dialog image
                    const mainDialogImage = dialog.querySelector(`#dialog-main-image-${index}`);
                    if (mainDialogImage) {
                        mainDialogImage.src = frame.imageUrls[newSelectedImageIndex];
                    }

                    // Update selection highlight in gallery
                    galleryItems.forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');

                    // Refresh the main frame UI outside the dialog immediately
                    this.refreshSingleFrameUI(index);

                    // Optional: Add a subtle confirmation
                    item.classList.add('confirmed');
                    setTimeout(() => item.classList.remove('confirmed'), 500);

                    // --- ADDED: Trigger GIF preview update if all frames are complete ---
                    const allFramesComplete = this.currentPlan.frames.every(f => f.status === 'complete');
                    if (allFramesComplete) {
                        this.updateLiveGifPreview();
                    }
                    // --- END ADDED ---
                }
            });
        });
        // --- END ADDED ---
    }
    
    generateFrame(index) {
        if (!this.currentPlan || !this.currentPlan.frames[index]) return;
        
        const frame = this.currentPlan.frames[index];

        // --- Ensure status is 'generating' BEFORE scrolling ---
        frame.status = 'generating';
        // {{ edit }} Only reset the completion flag when generating ALL frames
        if (this.isGeneratingAllFrames) {
            this.completionMessageShown = false; // Reset completion message flag ONLY when starting 'Generate All'
        }
        
        // Update UI to show generating state (adds .generating class)
        this.refreshSingleFrameUI(index); // Use the helper to update just this frame
        
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);

        // --- MOVED Scroll logic here ---
        // Only scroll and highlight if we are in "Generate All" mode for this frame
        if (this.isGeneratingAllFrames && frameElement) {
            requestAnimationFrame(() => {
                // Scroll into view
                frameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add highlight class - the animation starts now
                frameElement.classList.add('scrolling-to-generate');

                // Remove highlight class after animation completes
                // Ensure this duration matches the CSS animation duration for frameScrollHighlight
                setTimeout(() => {
                    if (frameElement) { // Check if element still exists
                        frameElement.classList.remove('scrolling-to-generate');
                    }
                }, 800); // Match CSS animation duration (0.8s)
            });
        }
        // --- END MOVED Scroll logic ---

        // Now, actually start the image generation process
        // This ensures the UI is updated and scroll *starts* before the async API call
        this.generateImageWithGemini(index);
    }
    
    async generateImageWithGemini(index, isRegeneration = false) {
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
            if (index > 0 && this.currentPlan.frames[index - 1].imageUrls.length > 0) {
                const prevFrame = this.currentPlan.frames[index - 1];
                previousFrameImage = await this.getImageDataFromUrl(prevFrame.imageUrls[prevFrame.selectedImageIndex]);
            }
            
            // Process reference images if any exist from the initial prompt
            const referenceImageData = [];
            if (this.referenceImages && this.referenceImages.length > 0) {
                console.log(`Processing ${this.referenceImages.length} reference images for frame ${index + 1} generation`);
                for (const img of this.referenceImages) {
                    try {
                        const base64Data = await this.getImageDataFromFile(img.file);
                        referenceImageData.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: img.file.type
                            }
                        });
                    } catch (err) {
                        console.error(`Failed to process reference image for frame generation: ${img.file.name || 'unnamed'}`, err);
                    }
                }
            }
            
            // Create parts for the prompt
            const promptParts = [];

            // --- MODIFIED: Add regeneration instruction ---
            let textPromptContent = frame.prompt;
            if (isRegeneration) {
                textPromptContent = `Generate a creative variation based on this prompt, exploring different details or compositions while keeping the overall theme and style consistent:\n\n${frame.prompt}`;
                console.log(`Regenerating frame ${index + 1} with modified prompt.`);
            }
            // --- END MODIFIED ---
            
            // Add text prompt
            promptParts.push({
                text: `Generate ONLY ONE SINGLE IMAGE for animation frame ${index + 1} of ${this.currentPlan.frameCount}:\n\n${textPromptContent}\n\nThis must be a high-quality, detailed image that will be part of an animation sequence. DO NOT generate any text. DO NOT generate multiple images. PROVIDE ONLY ONE IMAGE.`
            });
            
            // Add previous frame image if available (for better continuity)
            if (previousFrameImage) {
                promptParts.push({
                    inlineData: {
                        mimeType: 'image/jpeg', // Assuming JPEG, adjust if needed
                        data: previousFrameImage
                    }
                });
                promptParts.push({
                    text: "Use the provided reference image as a base for continuity. Maintain the same style, lighting, and key elements while adjusting for the described animation progress. PROVIDE ONLY ONE IMAGE, NO TEXT."
                });
            }
            
            // Add original reference images if available
            if (referenceImageData.length > 0) {
                // Add the reference images to the prompt
                referenceImageData.forEach(imageData => {
                    promptParts.push(imageData);
                });
                
                // Add instructions for using the reference images
                promptParts.push({
                    text: `Also consider the ${referenceImageData.length === 1 ? 'reference image' : 'reference images'} provided by the user. Use these as inspiration for style, elements, or composition while creating this frame, but ensure it fits within the animation sequence.`
                });
            }
            
            // Get temperature from app config if available, potentially adjust for regeneration
            let temperature = window.app.config?.temperature || 0.7;
            // if (isRegeneration) {
            //     temperature = Math.min(temperature + 0.1, 1.0); // Slightly increase temp for regeneration, capped at 1.0
            // }
            
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
                    maxOutputTokens: 8192, // Keep as is, model handles image size
                    responseModalities: ["image", "text"], // Request both, check response
                    responseMimeType: "text/plain" // Request text/plain to get multipart response
                },
                // Specify the image generation model if needed (check app.js setup)
                model: 'gemini-2.0-flash-exp-image-generation'
            };
            
            console.log(`Generating frame ${index + 1} (Regen: ${isRegeneration}) with prompt:`, textPromptContent);
            
            // Update UI to show magical generating animation in the placeholder
            this.updateGeneratingAnimation(index);
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(structuredPrompt);
            
            if (result && result.response && result.response.candidates && 
                result.response.candidates[0] && 
                result.response.candidates[0].content && 
                result.response.candidates[0].content.parts) {
                
                const parts = result.response.candidates[0].content.parts;
                
                // --- MODIFIED: Find *all* image parts ---
                const imageParts = parts.filter(part => part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/'));
                // --- END MODIFIED ---
                
                // --- MODIFIED: Check if any images were found ---
                if (imageParts.length > 0) { 
                    // Cancel the animation interval
                    if (this.animationIntervals[index]) {
                        clearInterval(this.animationIntervals[index]);
                        this.animationIntervals[index] = null;
                    }
                    
                    // --- MODIFIED: Create data URLs for all images ---
                    const imageUrls = imageParts.map(part => `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    // --- END MODIFIED ---
                    
                    // Update the UI with the generated images (pass the array)
                    this.handleGeneratedImage(index, imageUrls); // Pass the array
                    
                    // Check if we should auto-generate next (only for "Generate All")
                    if (this.isGeneratingAllFrames && index < this.currentPlan.frames.length - 1) {
                        // Check if the *next* frame is not already complete or generating
                        if (this.currentPlan.frames[index + 1].status === 'pending') {
                            setTimeout(() => {
                                this.generateFrame(index + 1);
                            }, 500); // Add a small delay between frames
                        } else {
                             console.log(`Skipping auto-generation for frame ${index + 2}, status is ${this.currentPlan.frames[index + 1].status}`);
                             // If the next one wasn't pending, check if *all* are now done
                             this.checkAllFramesComplete(); 
                        }
                    } else {
                         // If not generating all or it's the last frame, check completion
                         this.checkAllFramesComplete();
                    }
                    
                    return true; // Success
                } else {
                    // Check if there was text output instead
                    const textPart = parts.find(part => part.text);
                    const errorText = textPart ? `No image generated. API returned text: "${textPart.text.substring(0, 100)}..."` : 'No image was generated. Try adjusting your prompt.';
                    this.handleGenerationError(index, errorText);
                    return false;
                }
            } else {
                // Handle cases like safety blocks or empty responses
                let errorReason = 'Failed to generate image. Unknown API response.';
                if (result?.response?.promptFeedback?.blockReason) {
                    errorReason = `Generation blocked: ${result.response.promptFeedback.blockReason}. Please revise your prompt.`;
                } else if (!result?.response?.candidates?.length) {
                     errorReason = 'Failed to generate image. API returned no candidates.';
                }
                this.handleGenerationError(index, errorReason);
                return false;
            }
        } catch (error) {
            console.error('Error generating image with Gemini:', error);
            this.handleGenerationError(index, `Error: ${error.message || 'Unknown error during generation'}`);
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

        // Add generating state class
        frameElement.classList.add('generating');
        
        const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
        if (!placeholder) return;
        
        // Set up the initial loading animation container
        placeholder.innerHTML = `
            <div class="prompter-magical-loading">
                <div class="prompter-magical-particles"></div>
                <div class="prompter-magical-glow"></div>
                <div class="prompter-magical-text">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
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
        const phases = [
            'Crafting composition',
            'Weaving details',
            'Infusing magic',
            'Perfecting frame',
            'Almost there'
        ];
        
        // Update animation at intervals
        this.animationIntervals[index] = setInterval(() => {
            // Add new particles
            for (let i = 0; i < 2; i++) {
                this.createParticle(particlesContainer);
            }
            
            // Update glow with shifting colors
            const time = Date.now() / 1000;
            const hue1 = (time * 20) % 360;
            const hue2 = (hue1 + 40) % 360;
            glowElement.style.background = `radial-gradient(circle, 
                hsla(${hue1}, 80%, 65%, 0.15) 0%, 
                hsla(${hue2}, 70%, 60%, 0.1) 40%, 
                transparent 70%)`;
            
            // Update text periodically
            if (Math.random() > 0.95) {
                phase = (phase + 1) % phases.length;
                textElement.textContent = `${phases[phase]}...`;
            }
        }, 150);
    }
    
    // Create a single magical particle
    createParticle(container) {
        if (!container) return;
        
        const particle = document.createElement('div');
        particle.className = 'prompter-particle';
        
        // Random starting position
        const x = Math.random() * container.offsetWidth;
        const y = Math.random() * container.offsetHeight;
        
        // Random direction vector
        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        
        // Set CSS variables for the animation
        particle.style.setProperty('--x', `${x}px`);
        particle.style.setProperty('--y', `${y}px`);
        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);
        
        container.appendChild(particle);
        
        // Remove particle after animation
        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    }
    
    // Handle errors during image generation
    handleGenerationError(index, errorMessage) {
        // Clear any animation interval
        if (this.animationIntervals[index]) {
            clearInterval(this.animationIntervals[index]);
            this.animationIntervals[index] = null;
        }
        
        const frame = this.currentPlan?.frames?.[index];
        if (frame) {
        frame.status = 'error';
            frame.errorMessage = errorMessage; // Store the raw error
            // --- ADDED: Clear image data on error ---
            frame.imageUrls = [];
            frame.selectedImageIndex = null;
            // --- END ADDED ---
        }

        const { displayMessage, detailsHTML, isQuotaError } = this._parseErrorMessage(errorMessage);

        // --- MODIFIED: Check if generation should stop ---
        if (this.isGeneratingAllFrames) { // Only stop if it was running
            this.isGeneratingAllFrames = false;
            this.updatePrompterButtonState('idle'); // Change button back
            this.showSystemMessage("Generation stopped due to an error. Please check the details and try again.");
            
            // Enable the generate all button again
            const generateAllBtn = document.querySelector('.prompter-generate-all');
            if (generateAllBtn) {
                generateAllBtn.textContent = 'Generate All Frames';
                generateAllBtn.disabled = false;
                generateAllBtn.classList.remove('generating'); // Ensure generating class is removed
                // If we have some completed frames, show Regenerate instead
                const hasAnyGenerated = this.currentPlan?.frames?.some(f => f.status === 'complete');
                if (hasAnyGenerated) {
                    generateAllBtn.textContent = 'Regenerate All';
                    generateAllBtn.classList.add('regenerate');
                }
            }
        }
        // --- END MODIFIED ---
        
        // Update UI to show error state (this handles removing .generating class and adding .error)
        this.refreshSingleFrameUI(index);

        // Check if we need to enable the export button
        this.checkAllFramesComplete();
    }
    
    // --- MODIFIED: Accept an array of imageUrls ---
    handleGeneratedImage(index, imageUrls) { 
        // Validate inputs
        if (typeof index !== 'number' || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            console.error('Invalid args to handleGeneratedImage:', { index, imageUrls });
            this.handleGenerationError(index, 'Internal error processing generated images.'); // Handle error
            return;
        }
        // --- END MODIFIED ---
        
        // Check for current plan
        if (!this.currentPlan || !this.currentPlan.frames || !this.currentPlan.frames[index]) {
            console.error(`Cannot handle generated image: frame ${index} not found in current plan`);
            return;
        }
        
        // Clear any animation interval
        if (this.animationIntervals[index]) {
            clearInterval(this.animationIntervals[index]);
            this.animationIntervals[index] = null;
        }
        
        try {
            // Update frame data
        const frame = this.currentPlan.frames[index];
            // --- MODIFIED: Store array and selected index ---
            frame.imageUrls = imageUrls; 
            frame.selectedImageIndex = 0; // Default to the first image
        frame.status = 'complete';
            frame.errorMessage = null; // Clear any previous error message
            // --- END MODIFIED ---
            
            console.log(`DEBUG: Frame ${index + 1} completed successfully with ${imageUrls.length} image(s).`); 
        
            // --- MODIFIED: Refresh UI (will now use selectedImageIndex) ---
            this.refreshSingleFrameUI(index); 
            // --- END MODIFIED ---
            
            // Check if all frames are complete
        this.checkAllFramesComplete();
        
            // --- MODIFIED: Sequence logic remains the same, but logging updated ---
        if (this.isGeneratingAllFrames && index < this.currentPlan.frames.length - 1) {
                // ... (sequence logic as before) ...
            } else if (this.isGeneratingAllFrames && index === this.currentPlan.frames.length - 1) {
                 // ... (sequence logic as before) ...
            }
            // --- END MODIFIED ---

        } catch (error) {
            console.error('Error handling generated image:', error);
            this.handleGenerationError(index, `Error displaying image: ${error.message || 'Unknown error'}`);
        }
    }
    
    checkAllFramesComplete() {
        if (!this.currentPlan || !this.currentPlan.frames) return;
        
        // Check if all frames are either 'complete' or 'error'
        const allDoneOrError = this.currentPlan.frames.every(frame => frame.status === 'complete' || frame.status === 'error');
        // Check if all frames are strictly 'complete'
        const allStrictlyComplete = this.currentPlan.frames.every(frame => frame.status === 'complete');
        const anyComplete = this.currentPlan.frames.some(frame => frame.status === 'complete'); // Check if at least one is complete
        const completedCount = this.currentPlan.frames.filter(f => f.status === 'complete').length;
        const minFramesForGif = 2;

        // --- MODIFIED: Update prompter button state if generation finished ---
        if (this.isGeneratingAllFrames && allDoneOrError) {
            this.isGeneratingAllFrames = false;
            this.updatePrompterButtonState('idle'); // Generation sequence ended
        }
        // --- END MODIFIED ---

        // Update "Generate All" button state
        const generateAllBtn = document.querySelector('.prompter-generate-all');
        if (generateAllBtn) {
            if (this.isGeneratingAllFrames) {
                // Still generating, keep it disabled and showing progress
                generateAllBtn.disabled = true;
                generateAllBtn.classList.add('generating');
                generateAllBtn.classList.remove('regenerate'); // Ensure regenerate class is removed
                generateAllBtn.innerHTML = `
                    <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Generating... (${completedCount}/${this.currentPlan.frameCount})
                `;
            } else if (allDoneOrError && this.currentPlan.frameCount > 0) {
                // All frames are finished (either complete or error), show "Regenerate All"
                generateAllBtn.disabled = false;
                generateAllBtn.classList.remove('generating');
                generateAllBtn.classList.add('regenerate'); // Add class for styling
                generateAllBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 2v6h6"></path>
                        <path d="M3 8a10 10 0 0 1 14 0m4 14v-6h-6"></path>
                        <path d="M21 16a10 10 0 0 1-14 0"></path>
                    </svg>
                    Regenerate All Frames
                `;
            } else if (this.currentPlan.frameCount > 0) {
                // Some frames are still pending, show "Generate All"
                generateAllBtn.disabled = false;
                generateAllBtn.classList.remove('generating', 'regenerate');
                generateAllBtn.innerHTML = 'Generate All Frames';
            } else {
                 // No frames yet, button might be hidden or disabled depending on initial state
                 generateAllBtn.disabled = true; // Disable if no frames
                 generateAllBtn.classList.remove('generating', 'regenerate');
                 generateAllBtn.innerHTML = 'Generate All Frames';
            }
        }
        // --- END MODIFIED ---

        // Enable export button only if all frames are strictly complete
        const exportBtn = document.querySelector('.prompter-export');
        if (exportBtn) {
            exportBtn.disabled = !allStrictlyComplete || this.currentPlan.frameCount === 0;
        }

        // Add completion message only when all are strictly complete and message not shown
        if (allStrictlyComplete && this.currentPlan.frameCount > 0 && !this.completionMessageShown) {
            // this.isGeneratingAllFrames = false; // Already handled above
            this.completionMessageShown = true;
            
            this.generateCompletionMessage().then(completionMessage => {
                this.addAIMessage(completionMessage);
            }).catch(error => {
                console.error('Error showing completion message:', error);
                this.addAIMessage(`All frames are done. You can export as a GIF, regenerate specific frames, or continue the conversation.`);
            });
        }

        // --- ADDED: Enable/disable Download Images button ---
        const downloadImagesBtn = document.querySelector('.prompter-download-images');
        if (downloadImagesBtn) {
            downloadImagesBtn.disabled = !anyComplete; // Enable if at least one frame is complete
        }
        // --- END ADDED ---

        // --- ADDED: Live GIF Preview Logic ---
        if (allStrictlyComplete && completedCount >= minFramesForGif) {
            this.updateLiveGifPreview(); // Show or update the preview
        } else {
            this.hideLiveGifPreview(); // Hide the preview if not all frames are complete or not enough frames
        }
        // --- END ADDED ---
    }
    
    generateAllFrames() {
        if (!this.currentPlan || !this.currentPlan.frames || this.currentPlan.frameCount === 0) {
            console.log("No frames to generate.");
            this.isGeneratingAllFrames = false; // Ensure flag is off
            this.checkAllFramesComplete(); // Update button state
            return;
        }
        
        // Reset the completion message flag
        this.completionMessageShown = false;
        
        // Set flag that we're generating all frames sequentially
        this.isGeneratingAllFrames = true;
        // --- ADDED: Update prompter button state ---
        this.updatePrompterButtonState('generating');
        // --- END ADDED ---
        

        // Reset status for frames that are 'error' or 'pending' before starting
        let firstFrameToGenerate = -1;
        this.currentPlan.frames.forEach((frame, index) => {
            // Only reset if it's not already complete
            if (frame.status !== 'complete') {
                frame.status = 'pending'; // Reset to pending
                frame.errorMessage = null;
                if (firstFrameToGenerate === -1) {
                    firstFrameToGenerate = index;
                }
            }
        });

        if (firstFrameToGenerate === -1) {
             // All frames were already complete
             console.log("All frames are already generated.");
             this.isGeneratingAllFrames = false;
             // --- ADDED: Update prompter button state ---
             this.updatePrompterButtonState('idle');
             // --- END ADDED ---
             this.checkAllFramesComplete(); // Update button to "Regenerate All"
             this.showSystemMessage("All frames were already generated. Click 'Regenerate All Frames' if you want to create them again.");
             return;
        }

        // Refresh UI for potentially reset frames
        this.refreshAnimationPlan();

        // Update the main "Generate All" button state immediately to show "Generating..."
        this.checkAllFramesComplete();

        // Start with the first frame that needs generation
        // The scroll will now happen INSIDE generateFrame
        setTimeout(() => {
             if (this.isGeneratingAllFrames) { // Check if still active
                 this.generateFrame(firstFrameToGenerate);
             }
        }, 100); // Shorter delay, just enough for UI updates
    }
    
    exportAsGif() {
        if (!this.currentPlan || !this.currentPlan.frames || this.currentPlan.frameCount === 0) {
            // Keep the error message for no frames
            this.addAIMessage(`
                <div class="prompter-error-message prompter-export-error-message">
                     <div class="error-icon-container">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                     </div>
                     <div class="error-summary">Cannot Export Animation</div>
                     <div class="error-details">
                        <p>There are no frames in your animation plan yet.</p>
                    </div>
                </div>
            `, true); // Mark as error
            return;
        }

        let allFramesReady = true;
        const frameImages = [];
        let incompleteFrames = [];
        
        for (let i = 0; i < this.currentPlan.frames.length; i++) {
            const frame = this.currentPlan.frames[i];
            if (frame.status !== 'complete' || !frame.imageUrls.length) {
                allFramesReady = false;
                incompleteFrames.push(i + 1); // Store frame number (1-based)
            } else {
            frameImages.push(frame.imageUrls[frame.selectedImageIndex]);
            }
        }
        
        if (!allFramesReady) {
            // Keep the error message for incomplete frames
            const missingFramesList = incompleteFrames.join(', ');
            const framePlural = incompleteFrames.length > 1 ? 'frames' : 'frame';
            const verbPlural = incompleteFrames.length > 1 ? 'are' : 'is';
            
            this.addAIMessage(`
                <div class="prompter-error-message prompter-export-error-message">
                     <div class="error-icon-container">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                </div>
                     <div class="error-summary">Cannot Export Animation</div>
                     <div class="error-details">
                        <p>Frame${incompleteFrames.length > 1 ? 's' : ''} ${missingFramesList} ${verbPlural} not generated yet.</p>
                        <p>Please generate the missing ${framePlural} before exporting.</p>
                    </div>
                </div>
            `, true); // Mark as error
            return;
        }
        
        // Make sure live preview remains hidden when showing export UI
        this.hideLiveGifPreview();
        
        // Show the interactive UI
        this.showGifExportUI(frameImages);
    }

    // --- NEW METHOD: Show Interactive GIF Export UI ---
    showGifExportUI(frameImages) {
        // --- ADDED: Check and hide download UI first ---
        const downloadUI = document.querySelector('.prompter-download-ui.active');
        if (downloadUI) {
            const downloadContainer = downloadUI.closest('.prompter-download-ui-container');
            if (downloadContainer) {
                downloadUI.classList.remove('active');
                setTimeout(() => downloadContainer.innerHTML = '', 300); // Clear after animation
            }
            // Wait a bit for the download UI to start closing before showing export UI
            setTimeout(() => {
                this._createAndShowExportUI(frameImages);
            }, 100); // Small delay
            return; // Stop here, let the timeout handle showing the UI
        }
        // --- END ADDED ---

        // Original logic moved to a helper function
        this._createAndShowExportUI(frameImages);
    }

    // --- ADDED: Helper function for creating/showing export UI ---
    _createAndShowExportUI(frameImages) {
        // Ensure live preview is hidden when export UI is active
        this.hideLiveGifPreview();

        const planMessage = document.querySelector('.prompter-frames-container')?.closest('.prompter-message');
        if (!planMessage) return;

        let exportUIContainer = planMessage.querySelector('.prompter-export-ui-container');
        if (!exportUIContainer) {
            exportUIContainer = document.createElement('div');
            exportUIContainer.className = 'prompter-export-ui-container';
            // Insert it after the main actions, or at the end of the message content
            const actionsDiv = planMessage.querySelector('.prompter-actions');
            if (actionsDiv && actionsDiv.parentNode) {
                actionsDiv.parentNode.insertBefore(exportUIContainer, actionsDiv.nextSibling);
            } else {
                planMessage.querySelector('.prompter-message-content')?.appendChild(exportUIContainer);
            }
        }

        // Default delay
        const defaultDelay = 200; // ms

        exportUIContainer.innerHTML = `
            <div class="prompter-export-ui active">
                <div class="prompter-export-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M8 3v18"></path><path d="M16 3v18"></path><path d="M3 8h18"></path><path d="M3 16h18"></path>
                                </svg>
                    Create GIF Animation
                    </div>
                <div class="prompter-export-preview">
                    <img src="${frameImages[0]}" alt="GIF Preview Frame">
                    <div class="frame-count-badge">${frameImages.length} Frames</div>
                </div>
                <div class="prompter-export-settings">
                    <label for="gif-delay-input">Frame Delay (ms):</label>
                    <input type="number" id="gif-delay-input" class="gif-delay-input" value="${defaultDelay}" min="50" max="5000" step="50">
                    <div class="delay-slider-container">
                         <input type="range" id="gif-delay-slider" min="50" max="1000" value="${defaultDelay}" step="50">
                         <span class="delay-preview">${(defaultDelay / 1000).toFixed(2)}s</span>
                    </div>
                </div>
                <div class="prompter-export-actions">
                    <button class="prompter-export-button cancel">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg >
                        Cancel
                    </button>
                    <button class="prompter-export-button create">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 1-10 10"/><path d="m16 4-3 3 3 3"/><path d="M8 20 5 17l3-3"/></svg >
                        Create GIF
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const uiElement = exportUIContainer.querySelector('.prompter-export-ui');
        const cancelButton = uiElement.querySelector('.prompter-export-button.cancel');
        const createButton = uiElement.querySelector('.prompter-export-button.create');
        const delayInput = uiElement.querySelector('#gif-delay-input');
        const delaySlider = uiElement.querySelector('#gif-delay-slider');
        const delayPreview = uiElement.querySelector('.delay-preview');
        const previewImage = uiElement.querySelector('.prompter-export-preview img');

        // Sync slider and input
        const updateDelay = (value) => {
            const clampedValue = Math.max(50, Math.min(5000, parseInt(value) || defaultDelay));
            delayInput.value = clampedValue;
            delaySlider.value = Math.min(1000, clampedValue); // Slider max is 1000 for better control range
            delayPreview.textContent = `${(clampedValue / 1000).toFixed(2)}s`;
        };

        delayInput.addEventListener('input', (e) => updateDelay(e.target.value));
        delaySlider.addEventListener('input', (e) => updateDelay(e.target.value));
        delayInput.addEventListener('change', (e) => updateDelay(e.target.value)); // Ensure value snaps if user types outside range and blurs

        // Simple preview animation on hover/focus (optional)
        let previewInterval = null;
        let currentFrameIndex = 0;
        uiElement.querySelector('.prompter-export-preview').addEventListener('mouseenter', () => {
            if (previewInterval) clearInterval(previewInterval);
            previewInterval = setInterval(() => {
                currentFrameIndex = (currentFrameIndex + 1) % frameImages.length;
                previewImage.src = frameImages[currentFrameIndex];
            }, parseInt(delayInput.value) || defaultDelay);
        });
        uiElement.querySelector('.prompter-export-preview').addEventListener('mouseleave', () => {
            if (previewInterval) clearInterval(previewInterval);
            previewImage.src = frameImages[0]; // Reset to first frame
            currentFrameIndex = 0;
        });


        cancelButton.addEventListener('click', () => {
            uiElement.classList.remove('active');
            // Optionally remove the container after animation
            setTimeout(() => {
                exportUIContainer.innerHTML = '';
                // Check if we should restore the live preview
                this.restoreLivePreviewIfNeeded();
            }, 300);
        });

        createButton.addEventListener('click', () => {
            const delay = parseInt(delayInput.value) || defaultDelay;
            this.startGifCreationFromUI(exportUIContainer, frameImages, delay);
        });

        // Scroll the new UI into view
        uiElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- NEW METHOD: Start GIF Creation from UI ---
    async startGifCreationFromUI(uiContainer, frameImages, delay) {
        const uiElement = uiContainer.querySelector('.prompter-export-ui');
        if (!uiElement) return;

        // Update UI to loading state
        uiElement.classList.add('loading');
        uiElement.querySelector('.prompter-export-actions').innerHTML = `
            <button class="prompter-export-button loading" disabled>
                <div class="prompter-loading-animation" style="width: 16px; height: 16px; margin-right: 8px;">
                    <div class="prompter-loading-dot"></div><div class="prompter-loading-dot"></div><div class="prompter-loading-dot"></div>
                </div>
                Creating GIF...
            </button>
        `;
        uiElement.querySelector('.prompter-export-settings').style.opacity = '0.5';
        uiElement.querySelectorAll('input').forEach(input => input.disabled = true);

        try {
            console.log("Starting GIF creation with", frameImages.length, "images");
            const gifBlob = await this.createGif(frameImages, delay);
            console.log("GIF creation successful!");
                    const gifUrl = URL.createObjectURL(gifBlob);
            this.displayGeneratedGif(uiContainer, gifUrl, delay); // Pass delay for recreate
        } catch (error) {
            console.error('Error creating GIF:', error);
            
            // Get a more descriptive error message
            let errorMsg = error.message || 'Unknown error occurred';
            if (error.stack) {
                console.error('Error stack:', error.stack);
            }
            
            uiContainer.innerHTML = `
                <div class="prompter-export-ui active error">
                    <div class="prompter-export-header">
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg >
                        GIF Creation Failed
                        </div>
                    <p class="error-message">${errorMsg}</p>
                    <div class="error-details" style="font-size: 12px; color: #888; margin: 10px 0;">
                        <p>Try refreshing the page and trying again. If the problem persists, reduce the number of frames or image quality.</p>
                    </div>
                    <div class="prompter-export-actions">
                         <button class="prompter-export-button cancel">Close</button>
                         <button class="prompter-export-button recreate">Try Again</button>
                        </div>
                </div>
            `;
            // Add listeners for close/try again
            uiContainer.querySelector('.cancel').addEventListener('click', () => uiContainer.innerHTML = '');
            uiContainer.querySelector('.recreate').addEventListener('click', () => {
                console.log("Retrying GIF creation with", frameImages.length, "images");
                this.showGifExportUI(frameImages);
            });
        }
    }

    // --- NEW METHOD: Display Final GIF ---
    displayGeneratedGif(uiContainer, gifUrl, originalDelay) {
         uiContainer.innerHTML = `
            <div class="prompter-export-ui active result">
                <div class="prompter-export-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg >
                    GIF Ready!
                        </div>
                <div class="prompter-gif-final-preview">
                    <img src="${gifUrl}" alt="Generated Animation GIF">
                </div>
                 <div class="prompter-export-actions final">
                     <button class="prompter-export-button download">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg >
                        Download
                    </button>
                     <button class="prompter-export-button recreate">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg >
                        Edit Settings
                    </button>
                     <button class="prompter-export-button close">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg >
                        Close
                    </button>
                </div>
            </div>
        `;

        const downloadBtn = uiContainer.querySelector('.download');
        const recreateBtn = uiContainer.querySelector('.recreate');
        const closeBtn = uiContainer.querySelector('.close');

        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = gifUrl;
            link.download = `animation_${Date.now()}.gif`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        recreateBtn.addEventListener('click', () => {
            // Need frameImages again - might need to store them temporarily or re-fetch
            const frameImages = this.currentPlan.frames
                                    .filter(f => f.status === 'complete' && f.imageUrls.length)
                                    .map(f => f.imageUrls[f.selectedImageIndex || 0]);
            if (frameImages.length > 0) {
                this.showGifExportUI(frameImages); // Show settings again
            } else {
                 uiContainer.innerHTML = '<p>Error: Could not find original frames.</p>';
            }
        });

        closeBtn.addEventListener('click', () => {
             uiContainer.querySelector('.prompter-export-ui').classList.remove('active');
             setTimeout(() => {
                uiContainer.innerHTML = '';
                // Check if we should restore the live preview
                this.restoreLivePreviewIfNeeded();
             }, 300);
        });
    }


    // --- MODIFIED: createGif accepts delay ---
    async createGif(frameUrls, delay = 200) { // Default delay 200ms
        await this.loadGifshotLibrary();
        
        return new Promise(async (resolve, reject) => {
            try {
                if (!window.gifshot) {
                    throw new Error('GIF library (gifshot) not loaded.');
                }
                
                // Preload and validate images
                const validImages = await this.preloadImages(frameUrls);
                if (validImages.length < 2) {
                     throw new Error('Need at least 2 valid images for a GIF.');
                }
                
                const dimensions = await this.calculateOptimalDimensions(validImages);
                
                // Tell gifshot to optimize canvas for reading pixel data
                window.gifshot.utils = window.gifshot.utils || {};
                const originalGetCanvasElement = window.gifshot.utils.getCanvasElement;
                
                if (originalGetCanvasElement) {
                    window.gifshot.utils.getCanvasElement = function() {
                        const canvas = originalGetCanvasElement.apply(this, arguments);
                        if (canvas && canvas.getContext) {
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        }
                        return canvas;
                    };
                }
                
                window.gifshot.createGIF({
                    images: validImages,
                    gifWidth: dimensions.width,
                    gifHeight: dimensions.height,
                    interval: delay / 1000, // Convert ms to seconds
                    numFrames: validImages.length,
                    frameDuration: 1, // Duration of 1 frame relative to interval
                    sampleInterval: 10, // Lower is better quality, higher is faster
                    numWorkers: 2, // Use 2 workers for potentially faster processing
                    progressCallback: (progress) => {
                        // console.log('GIF creation progress:', Math.round(progress * 100) + '%');
                        // Could update a progress bar in the UI here
                    },
                    // Add canvas option with willReadFrequently to address Canvas2D warnings
                    canvas: {
                        context2DOptions: { willReadFrequently: true }
                    }
                }, (result) => {
                    // Restore original function
                    if (originalGetCanvasElement) {
                        window.gifshot.utils.getCanvasElement = originalGetCanvasElement;
                    }
                    
                    if (!result.error) {
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
                
                // Use willReadFrequently: true to optimize for pixel manipulation
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
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

    // Add method to generate AI messages for completion of frames
    async generateCompletionMessage() {
        try {
            // Check if Gemini API is available
            if (!window.app || !window.app.model) {
                return `All frames are done. You can export as a GIF, regenerate specific frames if you're not satisfied, or continue the conversation.`;
            }
            
            // {{ edit }} Get the animation concept for context
            const animationConcept = this.currentPlan?.concept || "the user's animation";
            const animationPrompt = this.currentPlan?.prompt || "an animation"; // Get original prompt too
            
            // Create a structured prompt for the completion message
            const completionPrompt = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            // {{ edit }} Updated prompt to include context
                            text: `You are a skilled but slightly impatient animation assistant with a touch of sarcasm. You have a distinctive personality - you're direct, occasionally snarky, but still helpful. You're good at what you do and you know it. You never use emojis or exclamation points excessively.

All frames for the user's animation about "${animationConcept}" (based on the initial idea: "${animationPrompt}") have now been generated successfully.

Write a brief message informing them that all frames are complete and what options they have next. Your response must:
1. Be concise (2-3 sentences maximum)
2. Have a hint of sarcasm or dry wit without being rude
3. Briefly acknowledge the animation's subject ("${animationConcept}") in your sarcastic tone (e.g., grudgingly admit it's done, perhaps hint if the idea was interesting or mundane *to you*)
4. Mention their three options: export as GIF, regenerate frames, or continue conversation
5. NOT use bullet points, numbered lists, or emojis
6. NOT be overly enthusiastic or use phrases like "Woohoo!" or "That was a blast!"
7. Use markdown formatting sparingly (bold or italic) only where it adds impact
8. Sound like a real person with an edge, not a generic AI
9. Avoid cringe phrases like "animation magic" or "I'm all ears"

Remember, you're skilled but slightly impatient - write like someone who's competent and gets straight to the point, but now briefly tailor the sarcasm to the animation's theme.`
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 150
                }
            };
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(completionPrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate completion message');
            }
            
            // Extract the response text
            return result.response.text();
            
        } catch (error) {
            console.error('Error generating completion message:', error);
            // Return a simple fallback message in case of error
            // {{ edit }} Slightly update fallback for consistency
            const concept = this.currentPlan?.concept ? ` for "${this.currentPlan.concept}"` : '';
            return `Alright, all frames${concept} are done. You can export as a GIF, regenerate specific frames, or continue the conversation.`;
        }
    }
    
    // Method to generate message for starting all frame generation
    async generateStartGenerationMessage(frameCount) {
        try {
            // Check if Gemini API is available
            if (!window.app || !window.app.model) {
                return `Generating ${frameCount} frames now. This will take a moment, so don't go anywhere.`;
            }
            
            // Create a prompt for the message
            const startPrompt = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text: `You are a skilled but slightly impatient animation assistant with a touch of sarcasm. You have a distinctive personality - you're direct, occasionally snarky, but still helpful. You're good at what you do and you know it. You never use emojis or exclamation points excessively.

The user has just clicked "Generate All Frames" to create all ${frameCount} frames of their animation.

Write a brief message informing them that you're generating the frames. Your response must:
1. Be concise (2-3 sentences maximum)
2. Have a hint of sarcasm or dry wit without being rude
3. Tell them you're generating all ${frameCount} frames
4. Mention frames will appear as they're created
5. NOT use bullet points, numbered lists, or emojis
6. NOT be overly enthusiastic 
7. Use markdown formatting sparingly (bold or italic) only where it adds impact
8. Sound like a real person with an edge, not a generic AI
9. Avoid cringe phrases like "let the magic happen" or "sit tight"

Remember, you're skilled but slightly impatient - write like someone who's competent and gets straight to the point.`
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 150
                }
            };
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(startPrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate start message');
            }
            
            // Extract the response text
            return result.response.text();
            
        } catch (error) {
            console.error('Error generating start message:', error);
            // Return a simple fallback message
            return `Generating ${frameCount} frames now. This will take a moment, so don't go anywhere.`;
        }
    }
    
    // Method to generate message for feedback acknowledgment
    async generateFeedbackResponse(hasImages = false, imageCount = 0) {
        try {
            // Check if Gemini API is available
            if (!window.app || !window.app.model) {
                let message = `Noted. Your feedback has been registered.`;
                if (hasImages) {
                    message += ` Got your ${imageCount} reference images too.`;
                }
                message += ` Want to generate all frames now or just update a specific one?`;
                return message;
            }
            
            // Create a prompt for the feedback response
            const feedbackPrompt = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text: `You are a skilled but slightly impatient animation assistant with a touch of sarcasm. You have a distinctive personality - you're direct, occasionally snarky, but still helpful. You're good at what you do and you know it. You never use emojis or exclamation points excessively.

The user has just provided feedback on their animation${hasImages ? ` and uploaded ${imageCount} reference images` : ''}.

Write a brief acknowledgment message. Your response must:
1. Be concise (1-2 sentences maximum, plus a question)
2. Have a hint of sarcasm or dry wit without being rude
3. Acknowledge their feedback${hasImages ? ` and the ${imageCount} images they provided` : ''}
4. Ask if they want to generate all frames or update a specific one
5. NOT use bullet points, numbered lists, or emojis
6. NOT be overly enthusiastic or use phrases like "I'm excited" 
7. Use markdown formatting sparingly (bold or italic) only where it adds impact
8. Sound like a real person with an edge, not a generic AI
9. Avoid cringe phrases like "I've noted" or "I'm all ears"

Remember, you're skilled but slightly impatient - write like someone who's competent and gets straight to the point.`
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 150
                }
            };
            
            // Call the Gemini API
            const result = await window.app.model.generateContent(feedbackPrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate feedback response');
            }
            
            // Extract the response text
            return result.response.text();
            
        } catch (error) {
            console.error('Error generating feedback response:', error);
            // Return a fallback message
            let message = `Noted. Your feedback has been registered.`;
            if (hasImages) {
                message += ` Got your ${imageCount} reference images too.`;
            }
            message += ` Want to generate all frames now or just update a specific one?`;
            return message;
        }
    }

    async deleteFrame(index) {
        if (!this.currentPlan || index < 0 || index >= this.currentPlan.frames.length) {
            console.error(`Invalid index for frame deletion: ${index}`);
            return;
        }

        const frameElementToDelete = document.querySelector(`.prompter-frame[data-index="${index}"]`);

        // {{ add }} Add animation class and delay removal
        if (frameElementToDelete) {
            frameElementToDelete.classList.add('frame-deleting'); // Add class for animation

            // Wait for animation to finish (match CSS duration)
            setTimeout(() => {
                this._performDeletion(index); // Call helper function after delay
            }, 500); // Match CSS transition duration (0.5s)

        } else {
            // If element not found (edge case), delete data directly
            console.warn(`Frame element ${index} not found in DOM for deletion animation.`);
            this._performDeletion(index);
        }
    }

    // {{ add }} Helper function to perform actual deletion after animation
    _performDeletion(index) {
        if (!this.currentPlan || index < 0 || index >= this.currentPlan.frames.length) {
            return; // Double check index validity
        }
         console.log(`Performing deletion of frame data at index: ${index}`);

        // Remove frame from the plan data
        this.currentPlan.frames.splice(index, 1);
        this.currentPlan.frameCount = this.currentPlan.frames.length;
        
        // Update indices of subsequent frames in the data
        for (let i = index; i < this.currentPlan.frames.length; i++) {
            this.currentPlan.frames[i].index = i;
             // Also update the prompt text if it contains frame numbers (optional but good practice)
             // Example: You might need a function to re-parse/update frame.prompt here
             // this.currentPlan.frames[i].prompt = this.updateFramePromptIndex(this.currentPlan.frames[i].prompt, i + 1, this.currentPlan.frameCount);
        }

        // Show toast confirmation (optional)
        this.showFrameActionToast(`Frame ${index + 1} deleted`, 'delete');

        // Refresh the entire animation plan UI to reflect changes and re-render indices
        // Using refreshAnimationPlan handles DOM updates and re-attaches listeners correctly
        this.refreshAnimationPlan();
        
        // Check completion status again after deletion
        this.checkAllFramesComplete();
    }

    // Helper method to show a toast message for frame actions
    showFrameActionToast(message, action = 'info') {
        const toastContainer = document.querySelector('.prompter-toast-container') || (() => {
            const container = document.createElement('div');
            container.className = 'prompter-toast-container';
            document.body.appendChild(container);
            return container;
        })();
        
        const toast = document.createElement('div');
        toast.className = `prompter-toast prompter-toast-${action}`;
        
        // Choose icon based on action
        let icon = '';
        switch (action) {
            case 'delete':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>`;
                break;
            case 'move':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
            </svg>`;
                break;
            case 'add':
                icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>`;
                break;
            default:
                icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
        }
        
        toast.innerHTML = `
            <div class="prompter-toast-icon">${icon}</div>
            <div class="prompter-toast-message">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Show the toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide and remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                
                // Remove container if empty
                if (toastContainer.children.length === 0 && toastContainer.parentNode) {
                    toastContainer.parentNode.removeChild(toastContainer);
                }
            }, 300);
        }, 3000);
    }

    async moveFrame(index, direction) {
        if (!this.currentPlan || 
            index < 0 || 
            index >= this.currentPlan.frameCount ||
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === this.currentPlan.frameCount - 1)) {
            return;
        }
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Add visual effect to frames being moved
        const frames = document.querySelectorAll('.prompter-frame');
        const currentFrame = frames[index];
        const targetFrame = frames[newIndex];
        
        if (currentFrame && targetFrame) {
            // Mark the frames with a moving class for animation
            currentFrame.classList.add('moving');
            targetFrame.classList.add('moving');
            
            // Highlight the direction
            const moveBtn = currentFrame.querySelector(`.frame-move-${direction}-btn`);
            if (moveBtn) {
                moveBtn.classList.add('loading');
            }
            
            // Wait a moment for the animation to be visible - much shorter now
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Swap frames
        const temp = this.currentPlan.frames[index];
        this.currentPlan.frames[index] = this.currentPlan.frames[newIndex];
        this.currentPlan.frames[newIndex] = temp;
        
        // Update indices
        this.currentPlan.frames[index].index = index;
        this.currentPlan.frames[newIndex].index = newIndex;
        
        // Refresh the animation plan display
        this.refreshAnimationPlan();
        
        // Show success toast notification
        this.showFrameActionToast(`Frame ${index + 1} moved ${direction}`, 'move');
        
        // Scroll the moved frame into view
        setTimeout(() => {
            const movedFrame = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
            if (movedFrame) {
                movedFrame.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Add a brief highlight to the moved frame - shorter animation
                movedFrame.classList.add('moving');
                setTimeout(() => {
                    movedFrame.classList.remove('moving');
                }, 500);
            }
        }, 50);
    }

    async addNewFrame() {
        if (!this.currentPlan) return;
        
        // Get the next index
        const newIndex = this.currentPlan.frameCount;
        
        // Get the add frame button and show loading state
        const addFrameBtn = document.querySelector('.add-frame-btn');
        if (addFrameBtn) {
            addFrameBtn.disabled = true; // Disable button
            addFrameBtn.classList.add('loading'); // Add loading class for CSS animation
            // --- REMOVED: Direct HTML manipulation for loading state ---
            // addFrameBtn.innerHTML = `...`; 
            // Update text content separately if needed
            const btnSpan = addFrameBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = `Creating frame ${newIndex + 1}...`;
        }
        
        try {
            // Get previous frame info to create context
            const previousFrame = newIndex > 0 ? this.currentPlan.frames[newIndex - 1] : null;
            let description = `New frame ${newIndex + 1}`;
            let elements = [];
            let transition = newIndex < this.currentPlan.frameCount ? "Transition to next frame" : "Final frame";
            
            // Generate a context-aware description based on the previous frame
            if (previousFrame) {
                // Use Gemini to generate a contextually appropriate next frame
                const result = await this.generateNextFrameWithAI(previousFrame, newIndex, this.currentPlan.frameCount + 1);
                description = result.description;
                elements = result.elements || [];
                transition = result.transition || transition;
            }
            
            // Create prompt based on updated info
            const prompt = this.generateFramePrompt(
                this.currentPlan.prompt,
                description,
                newIndex,
                this.currentPlan.frameCount + 1,
                elements,
                transition
            );
            
            // Create a new frame
            const newFrame = {
                index: newIndex,
                description: description,
                elements: elements,
                transition: transition,
                prompt: prompt,
                // --- MODIFIED: Initialize new fields ---
                imageUrls: [],
                selectedImageIndex: null,
                // --- END MODIFIED ---
                status: 'pending'
            };
            
            // Add the frame to the plan
            this.currentPlan.frames.push(newFrame);
            
            // Update frame count
            this.currentPlan.frameCount = this.currentPlan.frames.length;
            
            // Show success toast notification
            this.showFrameActionToast(`Frame ${newIndex + 1} added successfully`, 'add');
            
            // Refresh the animation plan display (this creates the new frame element)
            this.refreshAnimationPlan();
            
            // --- ADDED: Add temporary class for entry animation ---
            const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
            if (newFrameElement) {
                newFrameElement.classList.add('newly-added');
                // Remove the class after entry animation duration (e.g., 1.5s)
                setTimeout(() => {
                    newFrameElement.classList.remove('newly-added');
                }, 1500); 
            }
            // --- END ADDED ---
            
            // Auto-generate the new frame and scroll to it
            setTimeout(() => {
                if (newFrameElement) {
                    newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // Start generation AFTER scrolling and potential entry animation start
                this.generateFrame(newIndex);
            }, 300); // Keep a small delay
        } catch (error) {
            console.error('Error creating new frame:', error);
            
            // Create a basic frame if AI generation fails
            const fallbackFrame = {
                index: newIndex,
                description: `New frame ${newIndex + 1} of the animation`,
                elements: [],
                transition: newIndex < this.currentPlan.frameCount ? "Transition to next frame" : "Final frame",
                prompt: this.generateFramePrompt(
                    this.currentPlan.prompt,
                    `New frame ${newIndex + 1} of the ${this.currentPlan.prompt} animation`,
                    newIndex,
                    this.currentPlan.frameCount + 1,
                    [],
                    ""
                ),
                // --- MODIFIED: Initialize new fields ---
                imageUrls: [],
                selectedImageIndex: null,
                // --- END MODIFIED ---
                status: 'pending'
            };
            
            // Add the fallback frame
            this.currentPlan.frames.push(fallbackFrame);
            this.currentPlan.frameCount = this.currentPlan.frames.length;
            
            // Show toast notification for fallback
            this.showFrameActionToast(`Frame ${newIndex + 1} added with a basic template`, 'info');
            
            this.refreshAnimationPlan();
            
            setTimeout(() => {
                const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
                if (newFrameElement) {
                    newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                this.generateFrame(newIndex);
            }, 300);
        } finally {
            // Reset the add frame button
            if (addFrameBtn) {
                addFrameBtn.disabled = false; // Re-enable button
                addFrameBtn.classList.remove('loading'); // Remove loading class
                // Restore original button text/icon
                addFrameBtn.innerHTML = `
                    <div class="add-frame-btn-content">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        <span>Add Frame</span>
                    </div>
                `;
            }
        }
    }

    // New method to generate a contextually appropriate next frame using AI
    async generateNextFrameWithAI(previousFrame, newIndex, totalFrames) {
        try {
            // Create a prompt for the AI to generate the next logical frame
            const nextFramePrompt = {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `I'm creating an animation sequence and need help creating the next frame (frame ${newIndex + 1} of ${totalFrames}).
                        
The overall animation concept is: "${this.currentPlan.concept}"

The previous frame (frame ${previousFrame.index + 1}) has this description:
"${previousFrame.description}"

Some key elements in that frame were: ${previousFrame.elements.map(el => `"${el}"`).join(', ')}

Based on this context, please create a logical next frame that continues the animation progression.
Format your response as a JSON object with this structure:
{
  "description": "Detailed description of what should be in this next frame",
  "elements": ["key element 1", "key element 2", "key element 3"],
  "transition": "How this frame transitions to the next (or concludes if it's the final frame)"
}

The description should be detailed but focused. Elements should be 2-4 specific visual components. The transition should explain how we move to the next frame.
Only return the JSON structure without additional text.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    responseModalities: ['text']
                }
            };

            // Call the Gemini API
            const result = await window.app.model.generateContent(nextFramePrompt);
            
            if (!result || !result.response) {
                throw new Error('Failed to generate next frame description');
            }
            
            // Extract the response text
            const responseText = result.response.text();
            
            // Try to parse the JSON response
            let frameData;
            try {
                // Find JSON in the response if there's any additional text
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    frameData = JSON.parse(jsonMatch[0]);
                } else {
                    frameData = JSON.parse(responseText);
                }
                
                return {
                    description: frameData.description,
                    elements: frameData.elements || [],
                    transition: frameData.transition || "Transition to next frame"
                };
            } catch (parseError) {
                console.error('Failed to parse frame JSON:', parseError);
                throw parseError;
            }
        } catch (error) {
            console.error('Error generating next frame with AI:', error);
            throw error;
        }
    }

    refreshAnimationPlan() {
        // Find the existing animation plan container
        const existingContainer = document.querySelector('.prompter-frames-container');
        if (!existingContainer) return;
        
        // Update the frame count display
        const frameCountDisplay = document.querySelector('.animation-frame-count');
        if (frameCountDisplay) {
            frameCountDisplay.textContent = `${this.currentPlan.frameCount} frames`;
        }
        
        existingContainer.innerHTML = '';
        
        // Re-add all frames with in-between dividers
        this.currentPlan.frames.forEach((frame, index) => {
            // Add in-between divider before this frame (except for the first frame)
            if (index > 0) {
                const prevIndex = index - 1;
                const inBetweenDivider = document.createElement('div');
                inBetweenDivider.className = 'frame-insert-between-wrapper';
                inBetweenDivider.innerHTML = `
                    <div class="frame-insert-between" data-prev-index="${prevIndex}" data-next-index="${index}">
                        <div class="insert-btn-content">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            <span>Insert Frame</span>
                        </div>
                    </div>
                `;
                existingContainer.appendChild(inBetweenDivider);
                
                // Add event listener to in-between button
                const inBetweenBtn = inBetweenDivider.querySelector('.frame-insert-between');
                if (inBetweenBtn) {
                    inBetweenBtn.addEventListener('click', () => {
                        const prevIdx = parseInt(inBetweenBtn.dataset.prevIndex);
                        const nextIdx = parseInt(inBetweenBtn.dataset.nextIndex);
                        this.addInBetweenFrame(prevIdx, nextIdx);
                    });
                }
            }

            // Create and add the frame element (existing code)
            const frameElement = document.createElement('div');
            frameElement.className = `prompter-frame ${frame.status === 'generating' ? 'generating' : ''} ${frame.status === 'error' ? 'error' : ''}`;
            frameElement.dataset.index = index;
            
            // ... (rest of frame creation code remains unchanged) ...
            let actionButtonsHTML = '';
            if (frame.status === 'complete' && frame.imageUrls.length) {
                actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-edit-btn" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit Prompt</span>
                    </button>
                    <button class="prompter-frame-button prompter-regenerate-btn" data-index="${index}">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 19a1 1 0 0 0-.29.71V21a1 1 0 0 0 1 1h1.29a1 1 0 0 0 .71-.29L19 5.72a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 6 6 6"/><path d="M18 22v-2"/><path d="M22 18h-2"/>
                        </svg>
                        <span>Regenerate</span>
                    </button>`;
            } else if (frame.status === 'generating') {
                 actionButtonsHTML = `
                    <button class="prompter-frame-button generating" data-index="${index}" disabled>
                        <div class="prompter-generating-indicator">
                            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        </div>
                        <span>Generating</span> 
                    </button>`;
            } else if (frame.status === 'error') {
                 actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-retry-btn" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 2v6h6"></path>
                            <path d="M3 8a10 10 0 0 1 14 0m4 14v-6h-6"></path>
                            <path d="M21 16a10 10 0 0 1-14 0"></path>
                        </svg>
                        <span>Retry</span>
                    </button>`;
            } else { // Default: pending
                 actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-generate-btn" data-index="${index}">
                        <svg class="magic-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                           <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
                           <path d="M12 8 L13 11 L16 12 L13 13 L12 16 L11 13 L8 12 L11 11 Z" fill="currentColor" stroke-width="1"/>
                        </svg>
                        <span>Generate Frame</span>
                    </button>`;
            }

            let placeholderContent = '';
            if (frame.status === 'complete' && frame.imageUrls.length) {
                placeholderContent = `
                    <img src="${frame.imageUrls[frame.selectedImageIndex]}" class="prompter-frame-image">
                    <div class="prompter-frame-info-icon" title="View Frame Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>`;
            } else if (frame.status === 'generating') {
                placeholderContent = `<div class="prompter-magical-loading">Generating...</div>`; 
            } else if (frame.status === 'error') {
                 const errorMessage = frame.errorMessage || 'Check console for details.'; // Use stored error message if available
                 placeholderContent = `
                    <div class="prompter-frame-error">
                        <div class="error-bg-icon"></div>
                        <div class="error-status-pill">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        Generation Failed
                    </div>
                    <div class="error-tooltip">${errorMessage}</div> 
                    </div>`;
            } else { // Default: pending
                placeholderContent = `
                    <div class="prompter-frame-empty-state">
                        <div class="frame-bg-icon"></div>
                        <div class="frame-counter-pill">Frame ${index + 1}</div>
                    </div>`;
            }

            frameElement.innerHTML = `
                <div class="prompter-frame-controls">
                    <button class="frame-control-btn frame-move-up-btn" title="Move Up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                        </svg>
                    </button>
                    <button class="frame-control-btn frame-move-down-btn" title="Move Down" data-index="${index}" ${index === this.currentPlan.frameCount - 1 ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </button>
                    <button class="frame-control-btn frame-delete-btn" title="Delete Frame" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="prompter-frame-image-side">
                    <div class="prompter-frame-image-placeholder" data-frame-number="Frame ${index + 1}">
                        ${placeholderContent}
                    </div>
                </div>
                <div class="prompter-frame-content-side">
                    <div class="prompter-frame-header">
                        <div style="display: flex; align-items: center;">
                            <div class="prompter-frame-header-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                                    <line x1="7" y1="2" x2="7" y2="22"></line>
                                    <line x1="17" y1="2" x2="17" y2="22"></line>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <line x1="2" y1="7" x2="7" y2="7"></line>
                                    <line x1="2" y1="17" x2="7" y2="17"></line>
                                    <line x1="17" y1="17" x2="22" y2="17"></line>
                                    <line x1="17" y1="7" x2="22" y2="7"></line>
                                </svg>
                            </div>
                            Frame ${index + 1}
                        </div>
                    </div>
                    <div class="prompter-frame-content">
                        <div class="prompter-frame-description">${frame.description}</div>
                        <div class="prompter-frame-actions">
                            ${actionButtonsHTML}
                        </div>
                    </div>
                </div>
            `;
            
            existingContainer.appendChild(frameElement);
            
            if (frame.status === 'generating') {
                this.updateGeneratingAnimation(index);
            }
            
            this.attachFrameEventListeners(frameElement);
        });
        
        // Add "Add Frame" button
        const addFrameButton = document.createElement('div');
        addFrameButton.className = 'add-frame-btn';
        addFrameButton.innerHTML = `
            <div class="add-frame-btn-content">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span>Add Frame</span>
            </div>
        `;
        existingContainer.appendChild(addFrameButton);
        
        addFrameButton.addEventListener('click', () => {
            this.addNewFrame();
        });
        
        // Update export button status
        const exportBtn = document.querySelector('.prompter-export');
        if (exportBtn) {
            const allFramesGenerated = this.currentPlan.frames.every(frame => frame.imageUrls.length);
            exportBtn.disabled = !allFramesGenerated;
        }
    }

    attachFrameEventListeners(frameElement) {
        const index = parseInt(frameElement.dataset.index);
        
        // ... (move up/down/delete listeners remain the same) ...
        const moveUpBtn = frameElement.querySelector('.frame-move-up-btn');
        const moveDownBtn = frameElement.querySelector('.frame-move-down-btn');
        const deleteBtn = frameElement.querySelector('.frame-delete-btn');
        
        if (moveUpBtn) {
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveFrame(index, 'up');
            });
            // Disable styling moved to CSS :disabled selector
        }
        
        if (moveDownBtn) {
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveFrame(index, 'down');
            });
             // Disable styling moved to CSS :disabled selector
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`Delete button clicked for frame ${index}`);
                // {{ edit }} Remove the confirm dialog completely
                // if (confirm(`Are you sure you want to delete frame ${index + 1}?`)) {
                    // No confirmation needed, just delete
                        this.deleteFrame(index);
                // }
            });
        }
        
        // Add generate button listener
        const generateBtn = frameElement.querySelector('.prompter-generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // generateFrame already sets status to 'generating' and refreshes UI
                this.generateFrame(index);
            });
        }
        
        // Add edit button listener
        const editBtn = frameElement.querySelector('.prompter-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editFramePrompt(index);
            });
        }
        
        // Add regenerate button listener
        const regenerateBtn = frameElement.querySelector('.prompter-regenerate-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                // ... inside regenerateBtn listener ...
                // Explicitly set status to 'generating' BEFORE refreshing UI
                // --- MODIFIED: Clear image array and index ---
                this.currentPlan.frames[index].imageUrls = []; 
                this.currentPlan.frames[index].selectedImageIndex = null;
                // --- END MODIFIED ---
                this.currentPlan.frames[index].status = 'generating'; // Set to generating
                this.currentPlan.frames[index].errorMessage = null; // Clear any previous error

                // Refresh UI to show the "Generating..." button state immediately
                this.refreshSingleFrameUI(index);

                // Now call the generation function with the regeneration flag
                this.generateImageWithGemini(index, true);
                // ...
            });
        }

        // Add retry button listener
        const retryBtn = frameElement.querySelector('.prompter-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                 // --- MODIFICATION: Update status and UI *before* generating ---
                // Mark frame as generating first
                this.currentPlan.frames[index].status = 'generating';
                this.currentPlan.frames[index].errorMessage = null; // Clear error message

                // Refresh UI to show "Generating..." button immediately
                this.refreshSingleFrameUI(index);

                // Now call generateFrame, which handles the rest (including API call)
                // Pass true to indicate this is a retry/regeneration attempt for generateImageWithGemini
                this.generateImageWithGemini(index, true);
                // --- MODIFICATION END ---
            });
        }
        
        // Add info icon listener
            const infoIcon = frameElement.querySelector('.prompter-frame-info-icon');
            if (infoIcon) {
            if (!infoIcon.dataset.listenerAttached) {
                infoIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFramePromptDialog(index);
                });
                infoIcon.dataset.listenerAttached = 'true';
            }
        }
    }

    // --- ADDED: Helper to refresh UI for a single frame ---
    refreshSingleFrameUI(index) {
        const frameElement = document.querySelector(`.prompter-frame[data-index="${index}"]`);
        if (!frameElement || !this.currentPlan || !this.currentPlan.frames[index]) return;

        const frame = this.currentPlan.frames[index];
        
        // Update classes
        frameElement.className = `prompter-frame ${frame.status === 'generating' ? 'generating' : ''} ${frame.status === 'error' ? 'error' : ''}`;

        // Update placeholder
        const placeholder = frameElement.querySelector('.prompter-frame-image-placeholder');
        if (placeholder) {
             let placeholderContent = '';
             // --- MODIFIED: Check imageUrls length and use selectedImageIndex ---
             if (frame.status === 'complete' && frame.imageUrls.length > 0) {
                 placeholderContent = `
                    <img src="${frame.imageUrls[frame.selectedImageIndex]}" class="prompter-frame-image">
                    <div class="prompter-frame-info-icon" title="View Frame Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    ${frame.imageUrls.length > 1 ? `
                    <div class="prompter-frame-multi-image-indicator" title="${frame.imageUrls.length} images available">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>
                        </svg>
                        <span>${frame.imageUrls.length}</span>
                    </div>
                    ` : ''}
                 `;
             // --- END MODIFIED ---
             }
             else if (frame.status === 'generating') {
                 // Use the magical loading animation here too
                 placeholderContent = `<div class="prompter-magical-loading">Generating...</div>`;
             }
             else if (frame.status === 'error') {
                 const { displayMessage, detailsHTML } = this._parseErrorMessage(frame.errorMessage || 'Unknown error');
                 placeholderContent = `
                    <div class="prompter-frame-error">
                        <div class="error-icon-container">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                        <div class="error-summary">${displayMessage}</div>
                        <div class="error-details">
                            ${detailsHTML}
                        </div>
                        <button class="error-details-toggle" title="Show/Hide Details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                    </div>
                `;
             }
             else { // Pending
                 placeholderContent = `
                    <div class="prompter-frame-empty-state">
                        <div class="frame-bg-icon"></div>
                        <div class="frame-counter-pill">Frame ${index + 1}</div>
                    </div>`;
             }
             placeholder.innerHTML = placeholderContent;

             // Add toggle listener for error details if needed
             if (frame.status === 'error') {
                 const toggleBtn = placeholder.querySelector('.error-details-toggle');
                 if (toggleBtn && !toggleBtn.dataset.listenerAttached) {
                     toggleBtn.addEventListener('click', (e) => {
                         e.stopPropagation();
                         const errorContainer = e.target.closest('.prompter-frame-error');
                         if (errorContainer) {
                             errorContainer.classList.toggle('show-details');
                             const svg = e.target.closest('button').querySelector('svg');
                             if (svg) {
                                 svg.style.transform = errorContainer.classList.contains('show-details') ? 'rotate(180deg)' : 'rotate(0deg)';
                             }
                         }
                     });
                     toggleBtn.dataset.listenerAttached = 'true';
                 }
             }
        }

        // Update actions
        const actionsContainer = frameElement.querySelector('.prompter-frame-actions');
        if (actionsContainer) {
             let actionButtonsHTML = '';
             // --- MODIFIED: Check imageUrls length ---
             if (frame.status === 'complete' && frame.imageUrls.length > 0) {
             // --- END MODIFIED ---
                 actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-edit-btn" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <span>Edit Prompt</span>
                    </button>
                    <button class="prompter-frame-button prompter-regenerate-btn" data-index="${index}">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2 19a1 1 0 0 0-.29.71V21a1 1 0 0 0 1 1h1.29a1 1 0 0 0 .71-.29L19 5.72a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 6 6 6"/><path d="M18 22v-2"/><path d="M22 18h-2"/>
                        </svg>
                        <span>Regenerate</span>
                    </button>`;
             }
             else if (frame.status === 'generating') {
                 // --- Ensure this button shows correctly ---
                 actionButtonsHTML = `
                    <button class="prompter-frame-button generating" data-index="${index}" disabled>
                        <div class="prompter-generating-indicator">
                            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        </div>
                        <span>Generating</span>
                    </button>`;
             }
             else if (frame.status === 'error') {
                 // --- MODIFICATION: Ensure ONLY retry button shows on error ---
                 actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-retry-btn" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 2v6h6"></path>
                            <path d="M3 8a10 10 0 0 1 14 0m4 14v-6h-6"></path>
                            <path d="M21 16a10 10 0 0 1-14 0"></path>
                        </svg>
                        <span>Retry</span>
                    </button>`;
                 // --- END MODIFICATION ---
             }
             else { // Pending
                 actionButtonsHTML = `
                    <button class="prompter-frame-button prompter-generate-btn" data-index="${index}">
                        <svg class="magic-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                           <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"/>
                           <path d="M12 8 L13 11 L16 12 L13 13 L12 16 L11 13 L8 12 L11 11 Z" fill="currentColor" stroke-width="1"/>
                        </svg>
                        <span>Generate Frame</span>
                    </button>`;
             }
             actionsContainer.innerHTML = actionButtonsHTML;
        }

        // Re-attach listeners for this specific frame
        this.attachFrameEventListeners(frameElement);

         // If generating, start the placeholder animation
         if (frame.status === 'generating') {
            this.updateGeneratingAnimation(index);
        }
    }
    // --- END ADDED ---

    // --- NEW METHOD: Show Image Download UI ---
    showImageDownloadUI() {
        // --- ADDED: Check and hide export UI first ---
        const exportUI = document.querySelector('.prompter-export-ui.active');
        if (exportUI) {
            const exportContainer = exportUI.closest('.prompter-export-ui-container');
            if (exportContainer) {
                exportUI.classList.remove('active');
                setTimeout(() => exportContainer.innerHTML = '', 300); // Clear after animation
            }
            // Wait a bit for the export UI to start closing before showing download UI
            setTimeout(() => {
                this._createAndShowDownloadUI();
            }, 100); // Small delay
            return; // Stop here, let the timeout handle showing the UI
        }
        // --- END ADDED ---

        // Original logic moved to a helper function
        this._createAndShowDownloadUI();
    }

    // --- ADDED: Helper function for creating/showing download UI ---
    _createAndShowDownloadUI() {
        // Ensure live preview stays hidden while download UI is active
        this.hideLiveGifPreview();

        const completedFrames = this.currentPlan?.frames.filter(f => f.status === 'complete' && f.imageUrls.length) || [];
        if (completedFrames.length === 0) {
            this.showFrameActionToast("No completed frames available to download.", "info");
            return;
        }

        const planMessage = document.querySelector('.prompter-frames-container')?.closest('.prompter-message');
        if (!planMessage) return;

        let downloadUIContainer = planMessage.querySelector('.prompter-download-ui-container');
        if (!downloadUIContainer) {
            console.error("Download UI container not found!"); // Should have been added in showAnimationPlan
            return;
        }

        // --- MODIFIED: Enhanced HTML structure for grid layout and better styling ---
        // Build frame selection list items for the grid
        const frameItemsHTML = completedFrames.map(frame => `
            <div class="prompter-download-item" data-index="${frame.index}">
                <input type="checkbox" id="download-frame-${frame.index}" value="${frame.index}" class="prompter-download-checkbox">
                <label for="download-frame-${frame.index}" class="prompter-download-label">
                    <img src="${frame.imageUrls[frame.selectedImageIndex]}" alt="Frame ${frame.index + 1} thumbnail">
                    <span class="frame-index-label">Frame ${frame.index + 1}</span>
                    <div class="checkmark-overlay">
                        <svg class="checkmark-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg >
                    </div>
                </label>
            </div>
        `).join('');

        downloadUIContainer.innerHTML = `
            <div class="prompter-download-ui">
                <div class="prompter-download-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg >
                    Download Frames
                </div>
                <div class="prompter-download-controls">
                    <button class="prompter-control-button select-all-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg >
                        Select All
                    </button>
                    <button class="prompter-control-button deselect-all-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg >
                        Deselect All
                    </button>
                    <span class="selected-count">0 selected</span>
                </div>
                <div class="prompter-download-list">
                    ${frameItemsHTML}
                </div>
                <div class="prompter-download-actions">
                    <button class="prompter-download-button cancel">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg >
                        Download Selected
                    </button>
                </div>
            </div>
        `;
        // --- END MODIFIED ---

        const uiElement = downloadUIContainer.querySelector('.prompter-download-ui');
        // --- MODIFIED: Target checkbox inside the item ---
        const frameCheckboxes = uiElement.querySelectorAll('.prompter-download-checkbox');
        // --- END MODIFIED ---
        const selectAllBtn = uiElement.querySelector('.select-all-btn');
        const deselectAllBtn = uiElement.querySelector('.deselect-all-btn');
        const selectedCountSpan = uiElement.querySelector('.selected-count');
        const downloadBtn = uiElement.querySelector('.prompter-download-button.download');
        const cancelBtn = uiElement.querySelector('.prompter-download-button.cancel');

        const updateSelectionState = () => {
            // --- MODIFIED: Count checked checkboxes ---
            const selectedItems = uiElement.querySelectorAll('.prompter-download-checkbox:checked');
            // --- END MODIFIED ---
            const count = selectedItems.length;
            selectedCountSpan.textContent = `${count} selected`;
            downloadBtn.disabled = count === 0;

            // --- MODIFIED: Update parent item class for visual feedback ---
            frameCheckboxes.forEach(checkbox => {
                const itemElement = checkbox.closest('.prompter-download-item');
                if (itemElement) {
                    itemElement.classList.toggle('selected', checkbox.checked);
                }
            });
             // --- END MODIFIED ---
        };

        // --- MODIFIED: Add listener to checkboxes ---
        frameCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectionState);
        });
        // --- END MODIFIED ---

        selectAllBtn.addEventListener('click', () => {
            // --- MODIFIED: Check checkboxes ---
            frameCheckboxes.forEach(checkbox => checkbox.checked = true);
            // --- END MODIFIED ---
            updateSelectionState();
        });

        deselectAllBtn.addEventListener('click', () => {
            // --- MODIFIED: Uncheck checkboxes ---
            frameCheckboxes.forEach(checkbox => checkbox.checked = false);
            // --- END MODIFIED ---
            updateSelectionState();
        });

        cancelBtn.addEventListener('click', () => {
            uiElement.classList.remove('active'); // Trigger exit animation
            setTimeout(() => {
                downloadUIContainer.innerHTML = ''; // Remove after animation
                // Check if we should restore the live preview
                this.restoreLivePreviewIfNeeded();
            }, 300);
        });

        downloadBtn.addEventListener('click', () => {
            // --- MODIFIED: Get values from checked checkboxes ---
            const selectedIndices = Array.from(uiElement.querySelectorAll('.prompter-download-checkbox:checked'))
                                       .map(input => parseInt(input.value));
            // --- END MODIFIED ---
            this.startImageDownload(selectedIndices, downloadBtn);
        });

        // Initial state update
        updateSelectionState();
        // Add class to trigger entry animation
        requestAnimationFrame(() => {
            uiElement.classList.add('active');
        });
        uiElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } // End of _createAndShowDownloadUI

    // --- NEW METHOD: Start Image Download ---
    async startImageDownload(indices, downloadButton) {
        if (!indices || indices.length === 0) return;

        const originalButtonHTML = downloadButton.innerHTML; // Store original content
        downloadButton.disabled = true;
        // --- MODIFIED: Use CSS spinner class ---
        downloadButton.innerHTML = `
            <div class="button-spinner"></div>
            Downloading... (0/${indices.length})
        `;
        // --- END MODIFIED ---

        let downloadedCount = 0;
        const totalCount = indices.length;
        const downloadDelay = 300; // ms delay between triggering downloads

        for (const index of indices) {
            const frame = this.currentPlan.frames[index];
            if (frame && frame.imageUrls.length) {
                try {
                    // Create a temporary link to trigger download
                    const link = document.createElement('a');
                    link.href = frame.imageUrls[frame.selectedImageIndex];
                    // Suggest a filename (browsers might override)
                    const filename = `frame_${String(index + 1).padStart(2, '0')}.png`; // Assuming PNG, adjust if needed
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    downloadedCount++;
                    // --- MODIFIED: Update loading text ---
                    downloadButton.innerHTML = `
                        <div class="button-spinner"></div>
                        Downloading... (${downloadedCount}/${totalCount})
                    `;
                    // --- END MODIFIED ---

                    // Wait a bit before triggering the next download
                    await new Promise(resolve => setTimeout(resolve, downloadDelay));

                } catch (error) {
                    console.error(`Failed to trigger download for frame ${index + 1}:`, error);
                    this.showFrameActionToast(`Error downloading frame ${index + 1}`, 'error');
                    // Continue with the next frame even if one fails
                }
            }
        }

        // Restore button after downloads are triggered
        downloadButton.innerHTML = originalButtonHTML; // Restore original content
        downloadButton.disabled = indices.length === 0; // Re-enable based on selection state
        this.showFrameActionToast(`${downloadedCount} image(s) download initiated.`, 'info');

        // Optionally close the UI after download
        const uiElement = downloadButton.closest('.prompter-download-ui');
        if (uiElement) {
            uiElement.classList.remove('active');
            setTimeout(() => {
                 if (uiElement.parentElement) {
                    uiElement.parentElement.innerHTML = '';
                 }
            }, 300);
        }
    }

    // --- ADDED: Method to generate random examples ---
    async generateRandomExamples() {
        console.log("DEBUG: Generating new random examples...");
        try {
            if (!window.app || !window.app.model) {
                throw new Error('Gemini model not available.');
            }

            const exampleGenPrompt = {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `You are an AI assistant helping generate creative animation ideas. Provide 2 diverse and exciting animation prompt examples suitable for a frame-by-frame generation tool.

Each example should have:
1.  A short, catchy "title" (max 5 words).
2.  A detailed "description" (3-5 sentences) outlining the animation sequence, key visual elements, style, and mood. The description should be inspiring and provide enough detail for an AI image generator to create distinct frames.

Focus on variety: include different styles (e.g., pixel art, anime, cinematic, abstract), themes (e.g., sci-fi, fantasy, slice-of-life, action), and complexity. Make them *interesting* and *dynamic*. Avoid generic or overly simple ideas.

Format the output strictly as a JSON array containing two objects, like this:
[
  {
    "title": "Example Title One",
    "description": "Detailed description for the first animation idea..."
  },
  {
    "title": "Example Title Two",
    "description": "Detailed description for the second animation idea..."
  }
]

Do not include any text outside this JSON structure.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.85, // Slightly higher temp for more creativity
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 500 // Enough for two detailed examples
                }
            };

            const result = await window.app.model.generateContent(exampleGenPrompt);

            if (!result || !result.response) {
                throw new Error('No response from API when generating examples.');
            }

            const responseText = result.response.text();
            console.log("DEBUG: Raw examples response:", responseText);

            // Try parsing the JSON
            try {
                const jsonMatch = responseText.match(/\[[\s\S]*\]/); // Find the array within potential extra text
                if (jsonMatch) {
                    const examples = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(examples) && examples.length >= 2 && examples[0].title && examples[0].description) {
                        console.log("DEBUG: Successfully parsed new examples:", examples);
                        return examples.slice(0, 2); // Return the first two valid examples
                    }
                }
                throw new Error('Parsed response is not a valid array of examples.');
            } catch (parseError) {
                console.error('Failed to parse example JSON:', parseError);
                throw new Error(`Failed to understand the example structure from the API. Raw response logged.`);
            }

        } catch (error) {
            console.error("Error generating random examples:", error);
            // Return fallback examples in case of error
            return [
                { title: "API Error", description: "Couldn't fetch new examples due to an error. Using fallback." },
                { title: "Cyberpunk Alley Chase", description: "A neon-drenched chase scene. Frame 1: Character sprints down a rainy alley. Frame 2: Close-up on dodging obstacles. Frame 3: Drone pursues overhead. Frame 4: Character leaps across a gap. Frame 5: Lands safely, looking back." }
            ];
        }
    }
    // --- END ADDED ---

    // Add a method to preload and validate images before creating the GIF
    async preloadImages(imageUrls) {
        console.log("Preloading", imageUrls.length, "images");
        return new Promise((resolve, reject) => {
            const validImages = [];
            let loadedCount = 0;
            let errorCount = 0;
            
            if (!imageUrls || imageUrls.length === 0) {
                reject(new Error("No image URLs provided"));
                return;
            }
            
            imageUrls.forEach((url, index) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                
                img.onload = () => {
                    console.log(`Image ${index} loaded: ${img.width}x${img.height}`);
                    validImages.push(url);
                    loadedCount++;
                    checkIfDone();
                };
                
                img.onerror = (e) => {
                    console.error(`Failed to load image ${index}:`, url, e);
                    errorCount++;
                    loadedCount++;
                    checkIfDone();
                };
                
                img.src = url;
            });
            
            function checkIfDone() {
                if (loadedCount === imageUrls.length) {
                    if (validImages.length < 2) {
                        reject(new Error(`Not enough valid images (${validImages.length} of ${imageUrls.length})`));
                    } else {
                        console.log(`Successfully preloaded ${validImages.length} of ${imageUrls.length} images`);
                        resolve(validImages);
                    }
                }
            }
        });
    }

    // --- ADDED: New method to update the prompter toggle button's state ---
    updatePrompterButtonState(state) {
        if (!this.prompterButton) return;

        // Clear existing listener first
        if (this.prompterButtonClickListener) {
            this.prompterButton.removeEventListener('click', this.prompterButtonClickListener);
            this.prompterButtonClickListener = null;
        }

        if (state === 'generating') {
            this.prompterButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
                    <rect x="6" y="6" width="12" height="12" rx="1"></rect>
                </svg>
                <span class="prompter-btn-tooltip">Stop Generation</span>
            `;
            this.prompterButton.classList.add('generating-frames');
            this.prompterButton.setAttribute('title', 'Stop Frame Generation');

            // Add listener to stop generation
            this.prompterButtonClickListener = () => this.stopFrameGeneration();
            this.prompterButton.addEventListener('click', this.prompterButtonClickListener);

        } else { // state === 'idle' or any other state
            this.prompterButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <span class="prompter-btn-tooltip">Animation Prompter</span>
            `;
            this.prompterButton.classList.remove('generating-frames');
            this.prompterButton.classList.toggle('active', this.isActive); // Keep active class if prompter is active
            this.prompterButton.setAttribute('title', 'Toggle Animation Prompter');

            // Add listener to toggle prompter conversation
            this.prompterButtonClickListener = () => this.togglePrompterConversation();
            this.prompterButton.addEventListener('click', this.prompterButtonClickListener);
        }
    }

    // --- ADDED: New method to stop frame generation ---
    stopFrameGeneration() {
        if (!this.isGeneratingAllFrames) return; // Already stopped

        console.log('DEBUG: Stopping frame generation sequence.');
        this.isGeneratingAllFrames = false;

        // Clear any pending generation timeouts/intervals if necessary
        // (Gemini SDK calls are harder to cancel, but stopping the sequence is key)

        // Update the prompter button back to idle/active state
        this.updatePrompterButtonState('idle');

        // Update the main "Generate All" button state
        this.checkAllFramesComplete();

        // Show a message to the user
        this.showSystemMessage("Frame generation stopped by user.");
    }

    // --- ADDED: Function to update the live GIF preview ---
    async updateLiveGifPreview() {
        if (!this.currentPlan || this.currentPlan.frameCount < 2) {
            this.hideLiveGifPreview(); // Not enough frames
            return;
        }

        const previewContainer = document.querySelector('.prompter-live-gif-preview-container');
        if (!previewContainer) return; // Container not found

        const completedFrames = this.currentPlan.frames.filter(f => f.status === 'complete' && f.imageUrls.length > 0);
        if (completedFrames.length < 2) {
            this.hideLiveGifPreview(); // Not enough completed frames
            return;
        }

        // Gather image URLs using the selected index
        const frameUrls = completedFrames.map(f => f.imageUrls[f.selectedImageIndex]);

        // Show loading state
        previewContainer.innerHTML = `
            <div class="prompter-live-gif-loading">
                <div class="prompter-loading-animation">
                    <div class="prompter-loading-dot"></div>
                    <div class="prompter-loading-dot"></div>
                    <div class="prompter-loading-dot"></div>
                </div>
                <span class="loading-text">Updating preview...</span>
            </div>
        `;
        previewContainer.classList.add('active', 'loading');
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });


        try {
            const defaultDelay = 200; // Use a default delay for the preview
            const gifBlob = await this.createGif(frameUrls, defaultDelay);
            const gifUrl = URL.createObjectURL(gifBlob);

            previewContainer.innerHTML = `
                <div class="live-gif-header">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 7v10l5-5-5-5z"/><path d="M2 12h8"/><path d="M21 12h-8"/><rect x="2" y="3" width="19" height="18" rx="2"/></svg >
                    Live Preview (${completedFrames.length} frames @ ${defaultDelay}ms)
                </div>
                <img src="${gifUrl}" alt="Live Animation Preview" class="live-gif-preview-image">
            `;
            previewContainer.classList.remove('loading');
            previewContainer.classList.add('active'); // Ensure it's visible
            previewContainer.classList.remove('error-state');

        } catch (error) {
            console.error('Error creating live GIF preview:', error);
            previewContainer.innerHTML = `
                 <div class="live-gif-header error">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg >
                    Preview Error
                </div>
                <p class="preview-error-text">Could not create preview: ${error.message || 'Unknown error'}</p>
            `;
            previewContainer.classList.remove('loading');
            previewContainer.classList.add('active', 'error-state');
        }
    }

    // --- ADDED: Function to hide the live GIF preview ---
    hideLiveGifPreview() {
        const previewContainer = document.querySelector('.prompter-live-gif-preview-container');
        if (previewContainer) {
            previewContainer.classList.remove('active', 'loading', 'error-state');
            // Optionally clear content after animation
            // setTimeout(() => { previewContainer.innerHTML = ''; }, 300);
        }
    }

    // --- NEW: Function to restore live preview if all frames are complete ---
    restoreLivePreviewIfNeeded() {
        // Only restore if we have a current plan
        if (!this.currentPlan || !this.currentPlan.frames) return;
        
        // Check if all frames are complete
        const allFramesComplete = this.currentPlan.frames.every(frame => 
            frame.status === 'complete' && frame.imageUrls.length > 0);
            
        // Need at least 2 frames for animation
        if (allFramesComplete && this.currentPlan.frames.length >= 2) {
            // Restore live preview
            this.updateLiveGifPreview();
        }
    }

    async addInBetweenFrame(prevIndex, nextIndex) {
        if (!this.currentPlan) return;
        
        // Validate indices
        if (prevIndex < 0 || nextIndex >= this.currentPlan.frameCount || nextIndex - prevIndex !== 1) {
            console.error('Invalid frame indices for in-between frame');
            return;
        }
        
        // Get the previous and next frames
        const prevFrame = this.currentPlan.frames[prevIndex];
        const nextFrame = this.currentPlan.frames[nextIndex];
        
        // The new frame will be inserted at the next index position
        const newIndex = nextIndex;
        
        // Find and update the in-between button to show loading state
        const inBetweenBtn = document.querySelector(`.frame-insert-between[data-prev-index="${prevIndex}"]`);
        if (inBetweenBtn) {
            inBetweenBtn.classList.add('loading');
        }
        
        try {
            // Generate a transition description based on both frames
            const result = await this.generateInBetweenFrameWithAI(prevFrame, nextFrame, newIndex);
            
            // Create prompt based on the generated description
            const prompt = this.generateFramePrompt(
                this.currentPlan.prompt,
                result.description,
                newIndex, 
                this.currentPlan.frameCount + 1, // Total frames will increase by 1
                result.elements || [],
                result.transition || "Smooth transition between frames"
            );
            
            // Create the new in-between frame
            const newFrame = {
                index: newIndex,
                description: result.description,
                elements: result.elements || [],
                transition: result.transition || "Smooth transition between frames",
                prompt: prompt,
                imageUrls: [],
                selectedImageIndex: null,
                status: 'pending'
            };
            
            // Insert the new frame at the nextIndex position, shifting other frames
            this.currentPlan.frames.splice(newIndex, 0, newFrame);
            
            // Update all subsequent frame indices
            for (let i = newIndex + 1; i < this.currentPlan.frames.length; i++) {
                this.currentPlan.frames[i].index = i;
            }
            
            // Update total frame count
            this.currentPlan.frameCount = this.currentPlan.frames.length;
            
            // Show success notification
            this.showFrameActionToast(`Transition frame added between frames ${prevIndex + 1} and ${nextIndex + 1}`, 'add');
            
            // Refresh the animation plan to show the new frame
            this.refreshAnimationPlan();
            
            // Highlight and scroll to the new frame
            setTimeout(() => {
                const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
                if (newFrameElement) {
                    newFrameElement.classList.add('newly-added');
                    newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Remove highlight after animation completes
                    setTimeout(() => {
                        newFrameElement.classList.remove('newly-added');
                    }, 1500);
                }
                
                // Auto-generate the new frame
                this.generateFrame(newIndex);
            }, 300);
            
        } catch (error) {
            console.error('Error creating in-between frame:', error);
            
            // Create a basic transition frame as fallback
            const fallbackDescription = `Transition between ${prevFrame.description} and ${nextFrame.description}`;
            
            const fallbackFrame = {
                index: newIndex,
                description: fallbackDescription,
                elements: [],
                transition: "Bridging transition",
                prompt: this.generateFramePrompt(
                    this.currentPlan.prompt,
                    fallbackDescription,
                    newIndex,
                    this.currentPlan.frameCount + 1,
                    [],
                    "Bridging transition"
                ),
                imageUrls: [],
                selectedImageIndex: null,
                status: 'pending'
            };
            
            // Insert the fallback frame
            this.currentPlan.frames.splice(newIndex, 0, fallbackFrame);
            
            // Update indices
            for (let i = newIndex + 1; i < this.currentPlan.frames.length; i++) {
                this.currentPlan.frames[i].index = i;
            }
            
            // Update frame count
            this.currentPlan.frameCount = this.currentPlan.frames.length;
            
            // Show toast for fallback
            this.showFrameActionToast(`Basic transition frame added`, 'info');
            
            // Refresh display
            this.refreshAnimationPlan();
            
            // Scroll to and generate the new frame
            setTimeout(() => {
                const newFrameElement = document.querySelector(`.prompter-frame[data-index="${newIndex}"]`);
                if (newFrameElement) {
                    newFrameElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                this.generateFrame(newIndex);
            }, 300);
        } finally {
            // Reset the in-between button if it exists
            if (inBetweenBtn) {
                inBetweenBtn.classList.remove('loading');
            }
        }
    }
    
    // Generate a transition frame description using AI
    async generateInBetweenFrameWithAI(prevFrame, nextFrame, newIndex) {
        try {
            // Create a prompt for the AI to generate an in-between transition frame
            const transitionFramePrompt = {
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `I'm creating an animation sequence and need help creating a smooth transition frame between two existing frames.
                        
The overall animation concept is: "${this.currentPlan.concept}"

Frame ${prevFrame.index + 1} has this description:
"${prevFrame.description}"

Frame ${prevFrame.index + 2} has this description:
"${nextFrame.description}"

I need a transition frame that would naturally fit between these two frames for a smoother animation.
Format your response as a JSON object with this structure:
{
  "description": "Detailed description of what should be in this transition frame",
  "elements": ["key element 1", "key element 2", "key element 3"],
  "transition": "How this frame bridges the gap between the two existing frames"
}

The transition frame should have elements of both surrounding frames but show a clear progression between them.
Only return the JSON structure without additional text.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            };

            // Make the API call
            const result = await window.app.geminiModel.generateContent(transitionFramePrompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse the JSON response
            try {
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}') + 1;
                const jsonString = text.substring(jsonStart, jsonEnd);
                return JSON.parse(jsonString);
            } catch (parseError) {
                console.error('Error parsing JSON from AI response:', parseError);
                // Return a basic structure if parsing fails
                return {
                    description: `Transition between frames ${prevFrame.index + 1} and ${prevFrame.index + 2}`,
                    elements: [],
                    transition: "Smooth transition between frames"
                };
            }
        } catch (error) {
            console.error('Error generating in-between frame description:', error);
            throw error;
        }
    }

    // --- NEW METHOD: Edit Frame Prompt Dialog ---
    editFramePrompt(index) {
        const frame = this.currentPlan.frames[index];
        if (!frame) return;
        
        // Create dialog for editing the prompt
        const dialog = document.createElement('div');
        dialog.className = 'prompter-dialog edit-prompt-dialog';
        dialog.innerHTML = `
            <div class="prompter-dialog-overlay"></div>
            <div class="prompter-dialog-content">
                <div class="prompter-dialog-header">
                    <h3 class="prompter-dialog-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg> Edit Frame ${index + 1}
                    </h3>
                    <button class="prompter-dialog-close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="prompter-dialog-body">
                    <div class="prompter-prompt-instructions">Edit the frame description below. This will be used to regenerate the image.</div>
                    
                    <div class="prompter-textarea-container">
                        <textarea class="prompter-dialog-textarea" id="frame-description-editor" placeholder="Describe this frame...">${frame.description || ''}</textarea>
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
                            Be specific about <span>pose</span>, <span>lighting</span>, and <span>composition</span>. Your changes will cause the frame to regenerate.
                        </div>
                    </div>
                </div>
                
                <div class="prompter-dialog-actions">
                    <button class="prompter-dialog-button prompter-dialog-cancel">Cancel</button>
                    <button class="prompter-dialog-button prompter-dialog-save">Save & Regenerate</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Define closeDialog function
        const closeDialog = () => {
            dialog.classList.remove('active');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        };

        // Make the dialog visible
        requestAnimationFrame(() => {
            dialog.classList.add('active');
        });
        
        // Add event listeners
        const closeBtn = dialog.querySelector('.prompter-dialog-close');
        const cancelBtn = dialog.querySelector('.prompter-dialog-cancel');
        const saveBtn = dialog.querySelector('.prompter-dialog-save');
        const overlay = dialog.querySelector('.prompter-dialog-overlay');
        const textArea = dialog.querySelector('.prompter-dialog-textarea');
        
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        if (overlay) overlay.addEventListener('click', closeDialog);
        
        // Save button
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const newDescription = textArea.value.trim();
                
                if (!newDescription) {
                    textArea.classList.add('error');
                    setTimeout(() => textArea.classList.remove('error'), 500);
                    return;
                }
                
                // Update the frame description
                frame.description = newDescription;
                
                // Generate a new prompt based on the description
                frame.prompt = this.generateFramePrompt(
                    this.currentPlan.prompt,
                    newDescription,
                    index,
                    this.currentPlan.frameCount,
                    frame.elements || [],
                    frame.transition || ''
                );
                
                // Update the status to regenerate
                frame.status = 'generating';
                frame.imageUrls = [];
                frame.selectedImageIndex = null;
                frame.errorMessage = null;
                
                // Refresh UI to show "Generating..." button state
                this.refreshSingleFrameUI(index);
                
                // Close the dialog
                closeDialog();
                
                // Generate the new image
                this.generateImageWithGemini(index, true);
            });
        }
        
        // Allow closing with escape key
        const escListener = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', escListener);
            }
        };
        document.addEventListener('keydown', escListener);
        
        // Focus the textarea
        setTimeout(() => textArea.focus(), 100);
    }
}

// Initialize the prompter when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // Ensure app is initialized before prompter if there's dependency
    // Check if app and app.init exist and if app initialization promise exists
    if (window.app && typeof window.app.init === 'function' && window.app.initializationPromise) {
         window.app.initializationPromise.then(() => {
             console.log("App initialized, now initializing Prompter.");
    window.prompter = new Prompter();
             // window.prompter.init(); // Init is called in constructor now
         }).catch(error => {
            console.error("App initialization failed, Prompter may not function correctly:", error);
            // Initialize prompter anyway, but it might lack API access
             window.prompter = new Prompter();
         });
    } else {
         // Fallback if app structure is different or doesn't have async init promise
         console.warn("App structure or initialization promise not found. Initializing Prompter directly.");
        window.prompter = new Prompter();
        // window.prompter.init(); // Init is called in constructor now
    }
});

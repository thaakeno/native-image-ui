/**
 * Native Image Animation Prompter Onboarding (v9 - Improved Flow & Polish)
 * Guides users through enabling and using the animation prompter feature
 * with a slower, more descriptive automated tour and enhanced UI.
 */

class PrompterOnboarding {
    constructor() {
        // Core state
        this.currentStepIndex = -1;
        this.onboardingShown = localStorage.getItem('prompterOnboardingComplete') === 'true';
        this.isAutoExecuting = false; // Flag for the automated tour
        this.autoExecuteTimeout = null; // Timeout ID for delays

        // UI Elements
        this.onboardingElement = null;
        this.overlay = null;
        this.highlightElement = null;

        // Listeners & Utils
        this.actionListenerAbortController = null;
        this.resizeTimeout = null;
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleAction = null; // Not used in auto-mode, but keep structure
        this.animationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // SVG Icons (Adding 'edit' and 'eye')
        this.icons = {
            settings: `<svg class="inline-icon" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'></path><circle cx='12' cy='12' r='3'></circle></svg>`,
            toggleOn: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect><circle cx="16" cy="12" r="3"></circle></svg>`,
            prompterBtn: `<svg class="inline-icon" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><polygon points='10 8 16 12 10 16 10 8'></polygon></svg>`,
            close: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
            magic: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`, // Wand icon
            rocket: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>`,
            check: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
            sparkles: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
            edit: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
            eye: `<svg class="inline-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
        };

        // --- Step Definitions (V9 - Improved Descriptions & Pacing) ---
        this.steps = [
            { // Step 0: Welcome
                title: "Let's Explore Animation!",
                content: `<p>Welcome! Ready to create frame-by-frame animations right here in the chat?</p><p>This quick tour automatically shows you how to use the <strong>Animation Prompter</strong> feature.</p>`,
                targetSelector: null,
                placement: 'center',
                showShowMeButton: true,
                stepIcon: this.icons.sparkles,
                action: null,
                readDelay: 500 // Initial short pause
            },
            { // Step 1: Open Settings
                title: "Step 1: Opening Settings",
                content: `<p>First, we need to enable the feature. Let's open the application settings.</p><p>Keep an eye ${this.icons.eye} on the <strong>Settings</strong> icon ${this.icons.settings} in the top right.</p>`,
                targetSelector: '#settings-button',
                highlightPadding: 8,
                placement: 'bottom-start',
                stepIcon: this.icons.settings,
                action: {
                    type: 'click',
                    selector: '#settings-button',
                    proceedOnClick: true, // Still use this for robustness if user clicks
                    autoExecuteDelay: 1800 // SLOWER: Time to read and see highlight before click
                }
            },
            { // Step 2: Enable Prompter
                title: "Step 2: Enabling the Feature",
                content: `<p>Inside the settings menu, find the <strong>Animation Prompter</strong> option.</p><p>We'll activate it using this toggle ${this.icons.toggleOn}. This adds the animation tools to your chat.</p>`,
                targetSelector: '#prompter-toggle',
                highlightPadding: 12,
                placement: 'right-start',
                targetGroupSelector: '.setting-group:has(#prompter-toggle)',
                stepIcon: this.icons.toggleOn,
                precondition: () => document.getElementById('settings-modal')?.style.display !== 'none',
                action: {
                    type: 'change',
                    selector: '#prompter-toggle',
                    condition: (el) => el.checked,
                    proceedOnClick: true,
                    autoExecuteDelay: 1500 // SLOWER: Time to locate toggle
                }
            },
            { // Step 3: Close Settings
                title: "Step 3: Back to the Chat",
                content: `<p>Great! The Animation Prompter is now enabled.</p><p>Let's close the settings panel using the <strong>Close button</strong> ${this.icons.close} to see the new tools.</p>`,
                targetSelector: '#settings-modal .modal-content .close-button',
                highlightPadding: 10,
                placement: 'bottom',
                stepIcon: this.icons.close,
                precondition: () => document.getElementById('prompter-toggle')?.checked && document.getElementById('settings-modal')?.style.display !== 'none',
                action: {
                    type: 'modal_close',
                    selector: '#settings-modal', // Target the modal itself for condition check
                    closeButtonSelector: '#settings-modal .modal-content .close-button', // Explicitly state button to click
                    condition: (el) => el.style.display === 'none',
                    proceedOnClick: true,
                    autoExecuteDelay: 1200 // SLOWER: Pause before closing
                },
            },
            { // Step 4: Activate Prompter Mode
                title: "Step 4: Enter Animation Mode",
                content: `<p>See the new button? That's the <strong>Animation Prompter</strong> toggle ${this.icons.prompterBtn}.</p><p>Clicking it switches between standard chat and animation creation mode.</p>`,
                targetSelector: '.prompter-toggle-btn',
                highlightPadding: 10,
                placement: 'top-start',
                stepIcon: this.icons.prompterBtn,
                precondition: async () => {
                    const toggle = document.getElementById('prompter-toggle');
                    const settingsModal = document.getElementById('settings-modal');
                    if (!toggle || !toggle.checked || (settingsModal && settingsModal.style.display !== 'none')) {
                        console.log("Precondition fail (Step 4): Toggle off or Settings open");
                        return false;
                    }
                    try {
                        await this.waitForElement('.prompter-toggle-btn', 2000); // Extended wait slightly
                        console.log("Precondition success (Step 4): Button found.");
                        return true;
                    } catch (e) {
                        console.log("Precondition fail (Step 4): Prompter button not found/visible.", e);
                        return false;
                    }
                },
                action: {
                    type: 'click',
                    selector: '.prompter-toggle-btn',
                    proceedOnClick: true,
                    autoExecuteDelay: 1800 // SLOWER: More time to see the button
                }
            },
            { // Step 5: Click Example Prompt
                title: "Step 5: Using an Example",
                content: `<p>Welcome to Animation Mode! This area shows example prompts to get you started.</p><p>Let's select one ${this.icons.magic} to see how it populates the input field.</p>`,
                targetSelector: '.prompter-welcome .prompter-example', // Select the first example
                highlightPadding: 8,
                placement: 'right',
                stepIcon: this.icons.magic,
                precondition: async () => {
                    try {
                        await this.waitForElement('.prompter-welcome .prompter-example', 3000); // Longer wait for welcome message
                        return true;
                    } catch (e) {
                        console.warn("Example prompt not found (Step 5):", e);
                        return false;
                    }
                },
                action: {
                    type: 'click',
                    selector: '.prompter-welcome .prompter-example',
                    proceedOnClick: true,
                    autoExecuteDelay: 2200 // SLOWER: Time to read and see example highlight
                }
            },
            { // Step 6: Highlight Input Area
                title: "Step 6: Your Prompt Area",
                content: `<p>The example text appears in the chat input area below.</p><p>You can <strong>edit this text</strong> ${this.icons.edit} or replace it entirely with your own animation idea.</p>`,
                targetSelector: '#user-input',
                targetGroupSelector: '.input-wrapper',
                highlightPadding: 8,
                placement: 'top',
                stepIcon: this.icons.edit, // Use Edit icon
                action: {
                    type: 'highlight_only',
                    autoExecuteDelay: 3000 // SLOWER: Longer highlight duration
                }
            },
            { // Step 7: Highlight Send Button
                title: "Step 7: Generate the Plan",
                content: `<p>Once your prompt is ready, use the <strong>Send button</strong> ${this.icons.rocket}.</p><p>This sends your idea to the AI, which will generate a step-by-step animation plan.</p>`,
                targetSelector: '#send-button',
                highlightPadding: 8,
                placement: 'top-end',
                stepIcon: this.icons.rocket,
                action: {
                    type: 'highlight_only',
                    autoExecuteDelay: 3500 // SLOWER: Longest highlight duration
                }
            },
            { // Step 8: Finish Tour
                title: "Ready to Create!",
                content: `<p>You've seen the basics! Now you're all set to create amazing animations.</p><p>Experiment with different prompts and have fun! ${this.icons.sparkles}</p>`,
                targetSelector: null, // No target for final step
                placement: 'center',
                stepIcon: this.icons.check,
                isFinalStep: true,
                action: null, // No action, just display
                readDelay: 4000 // Longer final display before auto-close
            }
        ];
        this.totalSteps = this.steps.length;

        // Initialize when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // --- Core Methods ---

    init() {
        console.log('Onboarding v9 (Improved Flow) initializing...');
        if (this.onboardingShown) {
            console.log('Onboarding already completed.');
            return;
        }

        // Add CSS for auto-click animation (keep from v8)
        const styleExists = document.getElementById('onboarding-v9-styles');
        if (!styleExists) {
            const style = document.createElement('style');
            style.id = 'onboarding-v9-styles';
            style.textContent = `
                .onboarding-auto-click {
                    position: relative; z-index: 10001;
                    animation: onboardingClickPulse 0.7s cubic-bezier(0.22, 1, 0.36, 1);
                }
                @keyframes onboardingClickPulse {
                    0% { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb), 0.7); }
                    50% { box-shadow: 0 0 0 25px rgba(var(--primary-color-rgb), 0); } /* Wider pulse */
                    100% { box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb), 0); }
                }
            `;
            document.head.appendChild(style);
        }

        // Add debug button for testing (keep from v8)
        const triggerBtnExists = document.getElementById('onboarding-test-trigger');
        if (!triggerBtnExists) {
            const triggerBtn = document.createElement('button');
            triggerBtn.id = 'onboarding-test-trigger';
            triggerBtn.textContent = 'Start Tour (V9)'; // Update text
            triggerBtn.style.cssText = `position: fixed; bottom: 10px; right: 10px; z-index: 10001; padding: 8px 12px; background-color: #8A2BE2; color: white; border: none; border-radius: 5px; cursor: pointer; opacity: 0.8; font-size: 12px;`; // Different color
            triggerBtn.onclick = () => this.startOnboarding();
            document.body.appendChild(triggerBtn);
        }

        // Global listeners (keep from v8)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.onboardingElement) {
                this.completeOnboarding();
            }
        });
        window.addEventListener('resize', this.boundHandleResize);
    }

    startOnboarding() {
        if (this.onboardingElement) {
            console.warn("Onboarding already in progress.");
            return;
        }
        console.log('Starting Onboarding Tour (v9)...');
        this.createOverlay();

        this.onboardingElement = document.createElement('div');
        this.onboardingElement.className = 'onboarding-container'; // Start hidden
        document.body.appendChild(this.onboardingElement);

        this.currentStepIndex = -1;
        this.isAutoExecuting = false; // Reset auto-execute flag
        this.showStep(0); // Show the first (welcome) step

        // Delay adding visible class for smoother init animation (keep from v8)
        setTimeout(() => this.onboardingElement?.classList.add('visible'), 50);
    }

    createOverlay() {
        // Keep existing overlay creation logic... uses SVG mask
        if (this.overlay) return;
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        this.overlay.id = 'onboarding-overlay';

        document.body.appendChild(this.overlay);
        requestAnimationFrame(() => {
            this.overlay?.classList.add('active');
        });
    }

    removeOverlay() {
        // Keep improved forceful removal...
        this.clearHighlight();
        const overlayElement = document.getElementById('onboarding-overlay');
        if (overlayElement) {
            overlayElement.remove();
            // console.log("Overlay element removed from DOM."); // Less noisy log
        }
        this.overlay = null;
    }

    handleResize() {
        // Keep existing resize logic...
        if (!this.onboardingElement || this.currentStepIndex < 0) return;
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const currentStep = this.steps[this.currentStepIndex];
            if (!currentStep) return;
            const targetSel = currentStep.targetGroupSelector || currentStep.targetSelector;
            const targetElement = targetSel ? document.querySelector(targetSel) : null;
            this.updateSpotlight(targetElement, currentStep.highlightPadding);
            this.positionOnboarding(targetElement, currentStep.placement);
        }, 100); // Slightly longer debounce
    }

    async showStep(stepIndex) {
        if (!this.overlay || !this.onboardingElement) {
            console.warn("Onboarding not initialized. Attempting cleanup.");
            this.completeOnboarding(true);
            return;
        }

        if (stepIndex >= this.steps.length) {
            this.completeOnboarding(); // Tour finished
            return;
        }
        if (stepIndex < 0) return;

        // --- Pre-step Cleanup ---
        this.clearActionListeners();
        this.clearHighlight();
        this.onboardingElement.classList.remove('visible'); // Hide for transition

        if (this.autoExecuteTimeout) clearTimeout(this.autoExecuteTimeout);

        await new Promise(resolve => setTimeout(resolve, this.animationsEnabled ? 150 : 0)); // Short delay for UI transition out

        this.currentStepIndex = stepIndex;
        const step = this.steps[stepIndex];
        console.log(`Showing Step ${stepIndex}: ${step.title}`);

        // --- Precondition Check ---
        if (step.precondition) {
            let conditionMet = false;
            try {
                conditionMet = await Promise.resolve(step.precondition());
                if (!conditionMet && this.isAutoExecuting) {
                    // Wait a bit longer if auto-executing and precondition fails initially
                    console.log(`Precondition failed for step ${stepIndex}, waiting...`);
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    conditionMet = await Promise.resolve(step.precondition());
                }
            } catch (e) { console.warn(`Precondition error step ${stepIndex}:`, e); }

            if (!conditionMet) {
                console.error(`Precondition failed definitively for step ${stepIndex}. Stopping tour.`);
                this.completeOnboarding(); // Stop if precondition fails
                return;
            }
        }

        // --- Render Step Content ---
        this.onboardingElement.innerHTML = ''; // Clear previous
        this.onboardingElement.className = 'onboarding-container'; // Reset classes

        const progressBar = this.createProgressBar(stepIndex);
        const stepContent = document.createElement('div');
        stepContent.className = 'onboarding-step';
        const footer = this.createFooter(step);
        const closeButton = this.createCloseButton();

        const headerIcon = step.stepIcon || this.icons.sparkles; // Default to sparkles

        stepContent.innerHTML = `
            <div class="onboarding-header">
                <div class="onboarding-icon">${headerIcon}</div>
                <h2>${step.title}</h2>
            </div>
            ${step.content}
        `;

        this.onboardingElement.appendChild(progressBar);
        this.onboardingElement.appendChild(stepContent);
        this.onboardingElement.appendChild(footer);
        this.onboardingElement.appendChild(closeButton);

        // --- Highlighting and Positioning ---
        const highlightSelector = step.targetGroupSelector || step.targetSelector;
        const targetElementForHighlight = highlightSelector ? document.querySelector(highlightSelector) : null;
        const targetElementForAction = step.targetSelector ? document.querySelector(step.targetSelector) : null;

        this.updateSpotlight(targetElementForHighlight, step.highlightPadding, step.skipHighlightClass);

        requestAnimationFrame(() => {
            this.positionOnboarding(targetElementForAction || targetElementForHighlight, step.placement);
            // Add slight delay before making visible for smoother animation
            setTimeout(() => {
                this.onboardingElement.classList.add('visible');
            }, this.animationsEnabled ? 50 : 0);
        });

        // --- Setup Actions (Only for Auto-Execute) ---
        this.setupButtonListeners(step, footer); // Setup "Show me" listener

        // --- Auto-Execution Logic ---
        if (this.isAutoExecuting) {
            if (step.action) {
                this.scheduleAutoExecuteAction(step);
            } else if (step.isFinalStep) {
                // Final step reached during auto-execution
                console.log(`Final step displayed. Auto-completing in ${step.readDelay || 4000}ms`);
                this.autoExecuteTimeout = setTimeout(() => this.completeOnboarding(), step.readDelay || 4000);
            } else {
                 // If no action and not final, likely an informational step or highlight only.
                 // The highlight_only action now handles its own delay before nextStep.
                 // If truly no action defined AND not highlight_only, add a default read delay.
                if(step.action?.type !== 'highlight_only') {
                    const readDelay = step.readDelay || 2000; // Default read delay if no action
                    console.log(`No action for step ${stepIndex}, pausing for ${readDelay}ms before next step.`);
                    this.autoExecuteTimeout = setTimeout(() => this.nextStep(), readDelay);
                }
            }
        } else if (step.isFinalStep) {
            // If manually navigated to the final step, show it but don't auto-close
            console.log("Final step reached manually.");
        }
    }

    createProgressBar(activeIndex) {
        // Keep existing progress bar creation logic... looks fine
        const container = document.createElement('div');
        container.className = 'onboarding-progress-bar-container';
        container.setAttribute('data-step-current', activeIndex + 1);
        container.setAttribute('data-step-total', this.totalSteps);

        const progressBar = document.createElement('progress');
        progressBar.className = 'onboarding-progress-bar';
        progressBar.max = this.totalSteps;
        progressBar.value = activeIndex + 1;

        container.appendChild(progressBar);
        return container;
    }

    createFooter(step) {
        // Keep existing simplified footer logic...
        const footer = document.createElement('div');
        footer.className = 'onboarding-footer';

        const showMeHtml = step.showShowMeButton
            ? `<button class="onboarding-button primary onboarding-show-me">
                 ${this.icons.magic} Show me the Magic!
               </button>` // Changed text slightly
            : '';

        footer.innerHTML = showMeHtml;
        return footer;
    }

    createCloseButton() {
        // Keep existing close button logic...
        const closeButton = document.createElement('button');
        closeButton.className = 'onboarding-close';
        closeButton.innerHTML = this.icons.close; // Use SVG icon
        closeButton.title = 'Close Tour (Esc)';
        closeButton.addEventListener('click', () => this.completeOnboarding());
        return closeButton;
    }

    setupButtonListeners(step, footer) {
        // Keep existing listener logic for "Show me" button...
        const showMeButton = footer.querySelector('.onboarding-show-me');

        if (showMeButton) {
            showMeButton.onclick = () => {
                console.log("Starting automated tour via 'Show me'...");
                this.isAutoExecuting = true;
                showMeButton.disabled = true; // Disable after click
                showMeButton.style.opacity = '0.7';
                showMeButton.style.cursor = 'default';
                // Start the sequence by moving to the next step after a brief pause
                setTimeout(() => this.nextStep(), 300);
            };
        }
    }

    // --- Auto-Execution Methods ---

    scheduleAutoExecuteAction(step) {
        if (!this.isAutoExecuting || !step.action) return;

        // Use the specific delay from the action, or a default (longer now)
        const delay = step.action.autoExecuteDelay || 2000; // Increased default delay
        console.log(`Scheduling action [${step.action.type}] for step ${this.currentStepIndex} in ${delay}ms`);

        this.autoExecuteTimeout = setTimeout(() => {
            this.performAutoExecuteAction(step);
        }, delay);
    }

    async performAutoExecuteAction(step) {
        if (!this.isAutoExecuting || !step.action) return;

        const targetSelector = step.action.selector || step.targetSelector;
        const target = targetSelector ? document.querySelector(targetSelector) : null;
        const actionType = step.action.type;

        console.log(`Auto-executing action (${actionType}) on ${targetSelector || 'N/A'}...`);

        // Handle highlight_only separately - schedule next step after its delay
        if (actionType === 'highlight_only') {
            // Highlight was already applied by showStep.
            // The autoExecuteDelay defined for this step IS the duration of the highlight.
            // After this delay finishes, proceed to the next step.
            const highlightDuration = step.action.autoExecuteDelay || 2500; // Use its own delay or a default
            console.log(`Highlighting ${targetSelector} for ${highlightDuration}ms`);
            // Clear previous timeout just in case, then set timeout to proceed
            if (this.autoExecuteTimeout) clearTimeout(this.autoExecuteTimeout);
            this.autoExecuteTimeout = setTimeout(() => {
                console.log(`Highlight finished for ${targetSelector}, proceeding.`);
                this.nextStep();
            }, highlightDuration);
            return; // Don't proceed further in this function
        }

        // Handle actions requiring a target element
        if (!target && actionType !== 'modal_close') { // Modal close might not need initial target if button selector provided
            console.warn(`Auto-execute target not found: ${targetSelector}. Skipping step ${this.currentStepIndex}.`);
            this.nextStep(); // Try to recover by moving on
            return;
        }

        let actionCompleted = false;
        const postActionDelay = 50; // Significantly reduced delay (e.g., 50ms)

        try {
            switch (actionType) {
                case 'click':
                    await this.simulateClick(target);
                    actionCompleted = true;
                    break;
                case 'change': // Primarily for checkboxes
                    if (target.type === 'checkbox') {
                        if (step.action.condition(target)) {
                            console.log("Checkbox already in desired state.");
                            actionCompleted = true;
                        } else {
                            await this.simulateClick(target); // Click to change state
                             // Wait a moment for state change potentially
                            await new Promise(resolve => setTimeout(resolve, 100));
                            actionCompleted = step.action.condition(target); // Verify change
                            if (!actionCompleted) console.warn("Checkbox state did not meet condition after click.");
                        }
                    } else {
                         console.warn("Action type 'change' only implemented for checkboxes.");
                    }
                    break;
                 case 'modal_close':
                    const closeButtonSelector = step.action.closeButtonSelector || '#settings-modal .modal-content .close-button'; // Default or specific
                    const closeButton = document.querySelector(closeButtonSelector);
                    const modalElement = step.action.selector ? document.querySelector(step.action.selector) : null;

                    if (closeButton && modalElement && modalElement.style.display !== 'none') {
                        await this.simulateClick(closeButton);
                         // Short wait for modal to animate closed is okay here, but postActionDelay is reduced
                        await new Promise(resolve => setTimeout(resolve, 300)); // Keep a small wait for animation
                        actionCompleted = step.action.condition(modalElement); // Check if display is none
                        if(!actionCompleted) console.warn("Modal did not close as expected.");
                    } else if(modalElement && modalElement.style.display === 'none') {
                        console.log("Modal already closed.");
                        actionCompleted = true; // Already closed
                    } else {
                        console.warn(`Modal close failed: button (${closeButtonSelector}) or modal (${step.action.selector}) not found or modal not open.`);
                    }
                    break;
                default:
                    console.warn(`Unknown auto-execute action type: ${actionType}`);
            }
        } catch (error) {
            console.error(`Error during auto-execute action: ${actionType} on ${targetSelector}`, error);
            actionCompleted = false;
        }

        // Proceed to the next step with a delay only if the action was successful
        if (actionCompleted) {
            console.log(`Action [${actionType}] successful. Proceeding to next step after ${postActionDelay}ms.`);
            if (this.autoExecuteTimeout) clearTimeout(this.autoExecuteTimeout);
            this.autoExecuteTimeout = setTimeout(() => this.nextStep(), postActionDelay);
        } else {
            console.error(`Action [${actionType}] on ${targetSelector} failed or condition not met. Stopping auto-execution.`);
            this.completeOnboarding(); // Stop the tour if an action fails
        }
    }

    async simulateClick(element) {
        // Check if this is a close button and skip animation if so
        const isCloseButton = element.classList.contains('close-button') || 
                               element.closest('.close-button') !== null;
        
        if (!isCloseButton) {
            // Only add visual feedback for non-close buttons
            element.classList.add('onboarding-auto-click');
            // Ensure repaint for animation
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        return new Promise(resolve => {
            // Short delay *before* click to make effect visible (shorter for close buttons)
            const preClickDelay = isCloseButton ? 50 : (this.animationsEnabled ? 400 : 50);
            
            setTimeout(() => {
                element.click();
                console.log("Simulated click on:", element);
                
                // Remove feedback class after another short delay
                setTimeout(() => {
                    if (!isCloseButton) {
                        element.classList.remove('onboarding-auto-click');
                    }
                    resolve(); // Resolve promise after click and cleanup
                }, isCloseButton ? 50 : 300); // Faster cleanup for close buttons
                
            }, preClickDelay);
        });
    }

    // --- UI Update Methods ---

    updateSpotlight(targetElement, padding = 10, skipHighlightClass = false) {
        this.clearHighlight(skipHighlightClass); // Pass skip flag

        if (targetElement) {
            this.highlightElement = targetElement; // Store ref

            if (!skipHighlightClass) {
                targetElement.classList.add('onboarding-highlight-target');
                // console.log("Added highlight class to:", targetElement); // Less noisy log
            } else {
                // console.log("Skipped highlight class for:", targetElement); // Less noisy log
            }
        }
    }

    clearHighlight(isSkipped = false) {
        if (this.highlightElement && !isSkipped) {
            this.highlightElement.classList.remove('onboarding-highlight-target');
            // console.log("Removed highlight class from:", this.highlightElement);
        }
        this.highlightElement = null; // Clear reference
    }

    positionOnboarding(targetElement, placement = 'bottom') {
        // Keep existing positioning logic... it seems robust enough
        if (!this.onboardingElement) return;
        const box = this.onboardingElement;
        requestAnimationFrame(() => {
             // Add a check for box dimensions early
            let boxRect = { width: box.offsetWidth, height: box.offsetHeight };
            if (!boxRect.width || !boxRect.height) {
                console.warn("Onboarding box has zero dimensions, attempting recalculation...");
                // Force redraw/reflow? Might not work reliably. Use defaults.
                box.style.display = 'block'; // Ensure it's block
                boxRect = { width: box.offsetWidth || 400, height: box.offsetHeight || 300 }; // Use defaults if still 0
                 if(!box.offsetWidth) console.error("Failed to get onboarding box dimensions.");
            }

            const margin = 20;
            const vpPadding = 15; // More padding from viewport edges
            let idealTop, idealLeft;

            if (!targetElement || placement === 'center') { // Handle explicit 'center'
                idealTop = window.innerHeight / 2 - boxRect.height / 2;
                idealLeft = window.innerWidth / 2 - boxRect.width / 2;
            } else {
                const targetRect = targetElement.getBoundingClientRect();
                // Placements dictionary (ensure keys match step definitions)
                const placements = {
                    'top': { top: targetRect.top - boxRect.height - margin, left: targetRect.left + targetRect.width / 2 - boxRect.width / 2 },
                    'bottom': { top: targetRect.bottom + margin, left: targetRect.left + targetRect.width / 2 - boxRect.width / 2 },
                    'left': { top: targetRect.top + targetRect.height / 2 - boxRect.height / 2, left: targetRect.left - boxRect.width - margin },
                    'right': { top: targetRect.top + targetRect.height / 2 - boxRect.height / 2, left: targetRect.right + margin },
                    'top-start': { top: targetRect.top - boxRect.height - margin, left: targetRect.left },
                    'top-end': { top: targetRect.top - boxRect.height - margin, left: targetRect.right - boxRect.width },
                    'bottom-start': { top: targetRect.bottom + margin, left: targetRect.left },
                    'bottom-end': { top: targetRect.bottom + margin, left: targetRect.right - boxRect.width },
                    'left-start': { top: targetRect.top, left: targetRect.left - boxRect.width - margin },
                    'left-end': { top: targetRect.bottom - boxRect.height, left: targetRect.left - boxRect.width - margin },
                    'right-start': { top: targetRect.top, left: targetRect.right + margin },
                    'right-end': { top: targetRect.bottom - boxRect.height, left: targetRect.right + margin },
                    'center': { top: window.innerHeight / 2 - boxRect.height / 2, left: window.innerWidth / 2 - boxRect.width / 2 }
                };


                const chosenPlacement = placements[placement] || placements['bottom']; // Default to bottom if placement is invalid
                idealTop = chosenPlacement.top;
                idealLeft = chosenPlacement.left;

                // Fallback positioning logic (keep as is, seems reasonable)
                const isVisible = (top, left, width, height) => {
                    return top >= vpPadding && left >= vpPadding && top + height <= window.innerHeight - vpPadding && left + width <= window.innerWidth - vpPadding;
                };

                if (!isVisible(idealTop, idealLeft, boxRect.width, boxRect.height)) {
                    const fallbackPlacements = ['bottom', 'top', 'right', 'left', 'center']; // Add center as last resort
                    let foundFallback = false;
                    for (const fallback of fallbackPlacements) {
                        if (fallback === placement) continue;
                        const pos = placements[fallback];
                        if (pos && isVisible(pos.top, pos.left, boxRect.width, boxRect.height)) {
                            // console.log(`Placement '${placement}' collided, using fallback '${fallback}'`); // Less noisy
                            idealTop = pos.top;
                            idealLeft = pos.left;
                            foundFallback = true;
                            break;
                        }
                    }
                    // If no fallback works, clamp to viewport
                    if (!foundFallback) {
                        console.warn(`No suitable fallback placement found for step ${this.currentStepIndex}, clamping to viewport.`);
                        idealTop = Math.max(vpPadding, Math.min(idealTop, window.innerHeight - boxRect.height - vpPadding));
                        idealLeft = Math.max(vpPadding, Math.min(idealLeft, window.innerWidth - boxRect.width - vpPadding));
                    }
                }
            }

            // Apply final position
            box.style.top = `${Math.round(idealTop)}px`;
            box.style.left = `${Math.round(idealLeft)}px`;
            // Ensure transform is reset for correct positioning if changed by animations
            // box.style.transform = 'translateY(0) scale(1)'; // This might interfere with entry animation, handle in CSS
        });
    }

    // --- Navigation & Completion ---

    nextStep() {
        // Simple progression, potentially add small delay for visual flow
        const delay = this.animationsEnabled ? 100 : 0; // Small delay between steps if animating
        setTimeout(() => {
             this.showStep(this.currentStepIndex + 1);
        }, delay);
    }

    clearActionListeners() {
        // Keep this method for safety...
        if (this.actionListenerAbortController) {
            this.actionListenerAbortController.abort();
            this.actionListenerAbortController = null;
            this.boundHandleAction = null;
        }
    }

    completeOnboarding(force = false) {
        // Keep improved forceful cleanup...
        if (!force && !this.onboardingElement && !document.getElementById('onboarding-overlay')) {
            // console.log("Onboarding already seemingly complete or not started."); // Less noisy
            return;
        }

        console.log('Completing Onboarding Tour (v9)... Force:', force);
        this.clearActionListeners();

        this.isAutoExecuting = false; // Ensure auto-execute stops
        if (this.autoExecuteTimeout) clearTimeout(this.autoExecuteTimeout);
        this.autoExecuteTimeout = null;

        // Forcefully remove overlay and container with animation if possible
        const overlayElement = document.getElementById('onboarding-overlay');
        const containerElement = this.onboardingElement; // Use stored ref

        if (overlayElement) {
            overlayElement.style.opacity = '0'; // Fade out
             setTimeout(() => overlayElement.remove(), 400); // Remove after fade
        }
        if (containerElement) {
            containerElement.classList.remove('visible'); // Trigger exit animation
            containerElement.style.opacity = '0'; // Ensure it fades
            containerElement.style.transform = 'translateY(20px) scale(0.95)'; // Example exit animation
            setTimeout(() => containerElement.remove(), 400); // Remove after fade/animation
        }

        this.clearHighlight(); // Final highlight clear

        // Nullify references
        this.overlay = null;
        this.onboardingElement = null;
        this.currentStepIndex = -1;

        // Set completion flag & remove listeners
        localStorage.setItem('prompterOnboardingComplete', 'true');
        this.onboardingShown = true;
        window.removeEventListener('resize', this.boundHandleResize);
        // TODO: Remove global keydown listener if added specifically for onboarding

        // Optionally remove the test trigger button on completion
        document.getElementById('onboarding-test-trigger')?.remove();
        console.log("Onboarding cleanup complete.");
    }

    // --- Utility ---

    waitForElement(selector, timeout = 3000) { // Increased default timeout
        // Keep existing waitForElement logic... seems okay
        return new Promise((resolve, reject) => {
            // Check immediately
            let element = document.querySelector(selector);
            // Add visibility check (offsetParent is null for hidden elements, or check dimensions)
            if (element && element.offsetParent !== null && element.getBoundingClientRect().width > 0) {
                resolve(element); return;
            }

            let observer;
            const timer = setTimeout(() => {
                observer?.disconnect();
                reject(new Error(`Element ${selector} not found or not visible within ${timeout}ms`));
            }, timeout);

            observer = new MutationObserver(() => {
                element = document.querySelector(selector);
                if (element && element.offsetParent !== null && element.getBoundingClientRect().width > 0) {
                    observer.disconnect(); clearTimeout(timer); resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true, // Detect additions/removals
                subtree: true,   // Check entire DOM subtree
                attributes: true, // Detect attribute changes (like style="display: block;")
                attributeFilter: ['style', 'class', 'id', 'hidden'] // Relevant attributes
             });
        });
    }

    // --- Restart Logic ---

    restartOnboarding() {
        // Keep existing restart logic... seems okay
        if (this.onboardingElement || this.overlay) {
            console.log("Force closing existing onboarding before restart.");
            this.completeOnboarding(true); // Force immediate cleanup
            setTimeout(() => this._startFresh(), 200); // Slightly longer delay for cleanup
        } else {
            this._startFresh();
        }
    }

    _startFresh() {
        console.log("Starting onboarding fresh...");
        localStorage.removeItem('prompterOnboardingComplete');
        this.onboardingShown = false;
        this.currentStepIndex = -1;
        this.isAutoExecuting = false;
        // Clean up just in case (though completeOnboarding should handle it)
        document.querySelector('.onboarding-overlay')?.remove();
        document.querySelector('.onboarding-container')?.remove();
        this.overlay = null;
        this.onboardingElement = null;
        // Add global listeners back if they were removed
        window.addEventListener('resize', this.boundHandleResize);
        // TODO: Add back ESC listener if needed
        // Start the onboarding process
        this.startOnboarding();
    }
}

// Initialize the onboarding
document.addEventListener('DOMContentLoaded', () => {
    if (!window.prompterOnboardingInstance) { // Prevent multiple initializations
        window.prompterOnboardingInstance = new PrompterOnboarding();
        console.log("PrompterOnboarding instance created.");

        // Example: Add a button elsewhere in the app to restart the tour
        // This should be integrated into your settings modal logic from app.js
        const restartButton = document.getElementById('show-prompter-onboarding'); // Your button ID
        if (restartButton) {
            restartButton.addEventListener('click', (e) => {
                 e.preventDefault();
                 console.log("Restart onboarding triggered from settings.");
                 // Close settings modal if open (assuming you have a function for that)
                 // e.g., closeSettingsModal();
                 // Find the instance and restart
                 if (window.prompterOnboardingInstance) {
                    window.prompterOnboardingInstance.restartOnboarding();
                 }
            });
        }
    }
    // Auto-start logic (keep commented unless desired)
    /*
    if (!window.prompterOnboardingInstance.onboardingShown) {
         console.log("Auto-starting onboarding tour (v9).");
         setTimeout(() => window.prompterOnboardingInstance.startOnboarding(), 2500);
    }
    */
}); 
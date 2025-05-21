/*
This JavaScript file is responsible for rendering Markdown content
within the web application. It utilizes the Marked.js library
to convert Markdown-formatted text into HTML, enabling rich text
formatting for chat messages and other dynamic content areas.
The MarkdownBuffer class handles incremental rendering and
enhancements like syntax highlighting for code blocks.
*/
class MarkdownBuffer {
    constructor(targetElement) {
        this.buffer = '';
        this.targetElement = targetElement;
        this.pendingRender = null;
        this.renderContainer = null;
        this.isFirstRender = true;
        this.renderDebounceTime = 60; // Increased for better performance
        
        // Create a container for the rendered markdown
        this.renderContainer = document.createElement('div');
        this.renderContainer.className = 'markdown-render-container streaming';
        this.targetElement.appendChild(this.renderContainer);
        
        // Get reference to marked library
        if (window.marked) {
            this.marked = window.marked;
            this.configureMarked();
        } else if (typeof marked !== 'undefined') {
            this.marked = marked;
            this.configureMarked();
        } else {
            console.error("Marked library not found. Make sure it's loaded before MarkdownBuffer.");
            this.marked = null;
        }
    }

    configureMarked() {
        // Configure marked with options
        this.marked.setOptions({
            renderer: new this.marked.Renderer(),
            highlight: function(code, lang) {
                // Check if highlight.js is available
                if (window.hljs && lang && window.hljs.getLanguage(lang)) {
                    try {
                        return window.hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        console.error('Error highlighting code:', e);
                    }
                }
                // Fallback to auto-detect or plain text
                return window.hljs ? window.hljs.highlightAuto(code).value : code;
            },
            langPrefix: 'hljs language-',
            breaks: true,
            gfm: true,
            smartLists: true,
            smartypants: true
        });
    }

    async appendText(text) {
        this.buffer += text;

        // Debounce rendering to avoid excessive DOM updates
        if (this.pendingRender) {
            window.clearTimeout(this.pendingRender);
        }

        this.pendingRender = window.setTimeout(() => {
            this.render();
        }, this.renderDebounceTime);
    }

    async render() {
        if (!this.renderContainer) return;

        // Use requestAnimationFrame for better performance
        window.requestAnimationFrame(() => {
            // Create a temporary div to hold the new markdown content
            const tempDiv = document.createElement('div');
            
            // Render markdown using marked
            if (this.marked) {
                try {
                    tempDiv.innerHTML = this.marked.parse(this.buffer);
                } catch (error) {
                    console.error("Error parsing markdown:", error);
                    tempDiv.textContent = this.buffer; // Fallback to plain text
                }
            } else {
                // Fallback if marked isn't available
                tempDiv.textContent = this.buffer;
            }

            // Process code blocks and add headers with copy buttons
            this.processCodeBlocks(tempDiv);

            // Update the render container with the new content
            this.renderContainer.innerHTML = '';
            this.renderContainer.appendChild(tempDiv);

            // Improved smooth scrolling with requestAnimationFrame for nested scrolling
            const scrollContainer = this.targetElement.closest('#messages-container');
            if (scrollContainer) {
                // Use requestAnimationFrame for smoother animation
                requestAnimationFrame(() => {
                    // Find the last element we just added
                    const lastElement = this.renderContainer.lastElementChild;
                    if (lastElement) {
                        lastElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'end',
                            inline: 'nearest'
                        });
                    } else {
                        scrollContainer.scrollTo({
                            top: scrollContainer.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                });
            }
        });
    }

    processCodeBlocks(container) {
        // Find all code blocks in the container
        const preElements = container.querySelectorAll('pre');
        
        // Process each pre element (code block)
        preElements.forEach(pre => {
            // Only process if it hasn't been processed already
            if (!pre.querySelector('.code-block-header')) {
                const codeElement = pre.querySelector('code');
                
                // Extract language from class if it exists
                let languageClass = '';
                if (codeElement) {
                    languageClass = Array.from(codeElement.classList)
                        .find(cls => cls.startsWith('language-')) || '';
                }
                
                const language = languageClass 
                    ? languageClass.replace('language-', '') 
                    : 'text';
                
                // Create header for the code block
                const header = document.createElement('div');
                header.className = 'code-block-header';
                
                // Language label
                const langLabel = document.createElement('div');
                langLabel.className = 'code-block-language';
                
                const langIcon = document.createElement('span');
                langIcon.className = 'language-icon';
                langIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
                
                const langText = document.createElement('span');
                langText.className = 'language-text';
                langText.textContent = language;
                
                langLabel.appendChild(langIcon);
                langLabel.appendChild(langText);
                
                // Copy button
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-button';
                copyButton.setAttribute('aria-label', 'Copy code');
                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                
                // Add copy functionality
                copyButton.addEventListener('click', async () => {
                    // Get the code content
                    const code = codeElement ? codeElement.textContent : pre.textContent;
                    
                    if (code) {
                        try {
                            // Copy to clipboard
                            await navigator.clipboard.writeText(code.trim());
                            
                            // Change button appearance to indicate success
                            copyButton.classList.add('copied');
                            copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                            
                            // Reset after 2 seconds
                            setTimeout(() => {
                                copyButton.classList.remove('copied');
                                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                            }, 2000);
                        } catch (err) {
                            console.error('Failed to copy:', err);
                        }
                    }
                });
                
                // Assemble the header
                header.appendChild(langLabel);
                header.appendChild(copyButton);
                
                // Add header to the pre element
                pre.insertBefore(header, pre.firstChild);
                
                // Add animations and class to indicate processing is complete
                pre.classList.add('processed');
            }
        });
    }

    reset() {
        // Clear the buffer and reset state
        this.buffer = '';
        this.isFirstRender = true;
        
        // Clear any pending renders
        if (this.pendingRender) {
            window.clearTimeout(this.pendingRender);
            this.pendingRender = null;
        }
        
        // Clear the render container
        if (this.renderContainer) {
            this.renderContainer.innerHTML = '';
        }
    }
}
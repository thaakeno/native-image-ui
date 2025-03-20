class GitHubReleases {
    constructor(options = {}) {
        this.options = {
            owner: options.owner || 'thaakeno',
            repo: options.repo || 'native-image-ui',
            maxReleases: options.maxReleases || 5,
            container: options.container || null,
            showOnStartup: options.showOnStartup || true,
            apiUrl: options.apiUrl || 'https://api.github.com'
        };
        
        this.releases = [];
        this.initialized = false;
        this.lastChecked = null;
        
        // Create UI elements
        this.createUI();
        
        // Bind methods
        this.toggleReleasePanel = this.toggleReleasePanel.bind(this);
        this.closeReleasePanel = this.closeReleasePanel.bind(this);
        this.checkForUpdates = this.checkForUpdates.bind(this);
        
        // Initialize
        this.init();
    }
    
    async init() {
        try {
            // Check local storage for cached releases
            this.loadFromCache();
            
            // Create event listeners
            this.setupEventListeners();
            
            // Fetch releases if enough time has passed since last check
            await this.fetchIfNeeded();
            
            // Show panel on startup if option is enabled and we have releases
            if (this.options.showOnStartup && this.releases.length > 0) {
                setTimeout(() => {
                    this.showReleasePanel();
                }, 1000);
            }
            
            this.initialized = true;
            this.logDebug('GitHub Releases initialized');
        } catch (error) {
            this.logDebug('Failed to initialize GitHub Releases', { error: error.message });
        }
    }
    
    createUI() {
        // Create releases panel if it doesn't exist
        if (!document.querySelector('.github-releases-panel')) {
            const panel = document.createElement('div');
            panel.className = 'github-releases-panel';
            panel.innerHTML = `
                <div class="releases-header">
                    <div class="releases-title">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                        </svg>
                        <h3>GitHub Updates</h3>
                    </div>
                    <div class="releases-actions">
                        <button class="check-updates-btn" title="Check for Updates">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
                            </svg>
                        </button>
                        <button class="close-releases-btn" title="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="releases-content">
                    <div class="releases-loading">
                        <div class="loading-spinner"></div>
                        <span>Loading releases...</span>
                    </div>
                    <div class="releases-list"></div>
                </div>
                <div class="releases-update-instructions">
                    <div class="update-command">
                        <span>To update, run:</span>
                        <code>git pull origin main</code>
                        <button class="copy-command-btn" title="Copy to clipboard">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Create the toggle button to show in header
            const toggleButton = document.createElement('button');
            toggleButton.className = 'releases-toggle-btn';
            toggleButton.title = 'GitHub Updates';
            toggleButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
                <span class="update-indicator"></span>
            `;
            
            // Add the panel to the DOM
            document.body.appendChild(panel);
            
            // Add the toggle button to the header
            const headerButtons = document.querySelector('.header-buttons');
            if (headerButtons) {
                headerButtons.insertBefore(toggleButton, headerButtons.firstChild);
            } else {
                // Fallback: add to header
                const header = document.querySelector('header');
                if (header) {
                    header.appendChild(toggleButton);
                }
            }
            
            // Store references to the elements
            this.panel = panel;
            this.toggleBtn = toggleButton;
            this.releasesList = panel.querySelector('.releases-list');
            this.loadingIndicator = panel.querySelector('.releases-loading');
            
            // Add release notification badge
            this.updateIndicator = toggleButton.querySelector('.update-indicator');
        }
    }
    
    setupEventListeners() {
        // Toggle panel visibility
        this.toggleBtn.addEventListener('click', this.toggleReleasePanel);
        
        // Close button
        const closeBtn = this.panel.querySelector('.close-releases-btn');
        closeBtn.addEventListener('click', this.closeReleasePanel);
        
        // Check for updates button
        const checkUpdatesBtn = this.panel.querySelector('.check-updates-btn');
        checkUpdatesBtn.addEventListener('click', this.checkForUpdates);
        
        // Copy command button
        const copyCommandBtn = this.panel.querySelector('.copy-command-btn');
        copyCommandBtn.addEventListener('click', () => {
            const command = this.panel.querySelector('.update-command code').textContent;
            navigator.clipboard.writeText(command)
                .then(() => {
                    this.showToast('Command copied to clipboard');
                })
                .catch(err => {
                    this.logDebug('Failed to copy command', { error: err.message });
                });
        });
        
        // Close panel when clicking outside
        document.addEventListener('click', (event) => {
            if (this.panel.classList.contains('visible') && 
                !this.panel.contains(event.target) && 
                !this.toggleBtn.contains(event.target)) {
                this.closeReleasePanel();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.panel.classList.contains('visible')) {
                this.closeReleasePanel();
            }
        });
    }
    
    toggleReleasePanel() {
        if (this.panel.classList.contains('visible')) {
            this.closeReleasePanel();
        } else {
            this.showReleasePanel();
        }
    }
    
    showReleasePanel() {
        this.panel.classList.add('visible');
        this.toggleBtn.classList.add('active');
        
        // Clear notification indicator when panel is shown
        this.clearUpdateNotification();
        
        // Check for updates if it's been a while
        this.fetchIfNeeded();
    }
    
    closeReleasePanel() {
        this.panel.classList.remove('visible');
        this.toggleBtn.classList.remove('active');
    }
    
    showUpdateNotification() {
        this.updateIndicator.classList.add('visible');
    }
    
    clearUpdateNotification() {
        this.updateIndicator.classList.remove('visible');
    }
    
    async checkForUpdates() {
        try {
            this.showLoading();
            await this.fetchReleases();
            this.hideLoading();
            this.showToast('GitHub releases updated');
        } catch (error) {
            this.hideLoading();
            this.showToast('Failed to check for updates', true);
            this.logDebug('Failed to check for updates', { error: error.message });
        }
    }
    
    showLoading() {
        this.loadingIndicator.style.display = 'flex';
        
        // Add loading class to check updates button
        const checkBtn = this.panel.querySelector('.check-updates-btn');
        checkBtn.classList.add('loading');
    }
    
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
        
        // Remove loading class from check updates button
        const checkBtn = this.panel.querySelector('.check-updates-btn');
        checkBtn.classList.remove('loading');
    }
    
    async fetchIfNeeded() {
        // Check if we need to fetch new releases (no releases or last checked > 6 hours ago)
        const SIX_HOURS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        if (!this.releases.length || !this.lastChecked || (Date.now() - this.lastChecked > SIX_HOURS)) {
            await this.fetchReleases();
        }
    }
    
    async fetchReleases() {
        try {
            this.logDebug('Fetching GitHub releases');
            
            const apiUrl = `${this.options.apiUrl}/repos/${this.options.owner}/${this.options.repo}/releases`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if we have new releases
            const hasNewReleases = this.hasNewReleasesAvailable(data);
            
            // Process the releases
            this.releases = data.slice(0, this.options.maxReleases).map(release => {
                return {
                    id: release.id,
                    tag: release.tag_name,
                    name: release.name || release.tag_name,
                    url: release.html_url,
                    body: release.body,
                    published: new Date(release.published_at),
                    assets: release.assets.map(asset => ({
                        name: asset.name,
                        size: asset.size,
                        url: asset.browser_download_url,
                        downloadCount: asset.download_count
                    }))
                };
            });
            
            // Cache the releases
            this.saveToCache();
            
            // Update last checked timestamp
            this.lastChecked = Date.now();
            localStorage.setItem('github_releases_last_checked', this.lastChecked);
            
            // Render the releases
            this.renderReleases();
            
            // Show notification if there are new releases
            if (hasNewReleases) {
                this.showUpdateNotification();
            }
            
            return this.releases;
        } catch (error) {
            this.logDebug('Failed to fetch GitHub releases', { error: error.message });
            
            // If we have cached releases, use those instead
            if (this.releases.length === 0) {
                this.loadFromCache();
                if (this.releases.length > 0) {
                    this.renderReleases();
                }
            }
            
            throw error;
        }
    }
    
    hasNewReleasesAvailable(newReleases) {
        if (!this.releases.length || !newReleases.length) return false;
        
        // Compare latest release tag to see if it's different
        const latestNewRelease = newReleases[0];
        const latestCurrentRelease = this.releases[0];
        
        return latestNewRelease.id !== latestCurrentRelease.id;
    }
    
    renderReleases() {
        if (!this.releasesList) return;
        
        // Clear the list
        this.releasesList.innerHTML = '';
        
        if (this.releases.length === 0) {
            this.releasesList.innerHTML = `
                <div class="no-releases">
                    <p>No releases found</p>
                </div>
            `;
            return;
        }
        
        // Get theme for styling
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        // Render each release
        this.releases.forEach((release, index) => {
            const releaseEl = document.createElement('div');
            releaseEl.className = `release-item ${index === 0 ? 'latest' : ''}`;
            
            if (theme === 'light') {
                releaseEl.classList.add('light');
            }
            
            // Format the release date
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = release.published.toLocaleDateString(undefined, dateOptions);
            
            // Process markdown in release body
            let processedBody = this.processReleaseBody(release.body);
            
            // Extract the first section as a title if there's no explicit name
            let releaseName = release.name || release.tag;
            let releaseTitle = "";
            
            if (releaseName === release.tag && processedBody.includes('<h')) {
                // Try to extract a title from the first heading
                const headingMatch = processedBody.match(/<h[1-6]>(.+?)<\/h[1-6]>/);
                if (headingMatch && headingMatch[1]) {
                    releaseTitle = `<div class="release-title">${headingMatch[1]}</div>`;
                    // Remove the heading from the body to avoid duplication
                    processedBody = processedBody.replace(headingMatch[0], '');
                }
            }
            
            releaseEl.innerHTML = `
                <div class="release-header">
                    <div class="release-tag-wrapper">
                        ${index === 0 ? '<span class="latest-tag">Latest</span>' : ''}
                        <span class="version-tag">${release.tag}</span>
                    </div>
                    <div class="release-date">${formattedDate}</div>
                </div>
                ${releaseTitle}
                <div class="release-name">${releaseName !== release.tag ? releaseName : ''}</div>
                <div class="release-body">${processedBody}</div>
                <div class="release-footer">
                    <a href="${release.url}" target="_blank" class="release-link">
                        View on GitHub
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            `;
            
            this.releasesList.appendChild(releaseEl);
        });
    }
    
    processReleaseBody(body) {
        if (!body) return '<p><em>No description provided</em></p>';
        
        // Handle code blocks first to prevent interference with other formatting
        body = body.replace(/```([^`]+?)```/gs, (match, codeContent) => {
            // Escape HTML entities in code blocks
            const escapedCode = this.escapeHtml(codeContent);
            return `<pre><code>${escapedCode}</code></pre>`;
        });
        
        body = body.replace(/`([^`]+?)`/g, (match, codeContent) => {
            // Escape HTML entities in inline code
            const escapedCode = this.escapeHtml(codeContent);
            return `<code>${escapedCode}</code>`;
        });
        
        // Handle bold with both ** and __ syntax
        body = body.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        body = body.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // Handle italic with both * and _ syntax - avoid matching already processed bold
        body = body.replace(/(?<!\*)\*(?!\*)([^\*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        body = body.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
        
        // Handle strikethrough
        body = body.replace(/~~(.+?)~~/g, '<del>$1</del>');
        
        // Handle headings with proper hierarchy
        body = body.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
        body = body.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
        body = body.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
        body = body.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
        body = body.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
        body = body.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
        
        // Improve list handling for both unordered and ordered lists
        // First, handle unordered lists with various markers
        body = body.replace(/^[\s]*[-*+][\s]+(.+)$/gm, '<li>$1</li>');
        
        // Handle ordered lists
        body = body.replace(/^[\s]*(\d+)\.[\s]+(.+)$/gm, '<li value="$1">$2</li>');
        
        // Group list items
        let inList = false;
        let listType = '';
        const lines = body.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('<li')) {
                if (!inList) {
                    // Check if this is the start of an ordered list by looking for 'value' attribute
                    listType = lines[i].includes('value=') ? 'ol' : 'ul';
                    lines[i] = `<${listType}>${lines[i]}`;
                    inList = true;
                }
            } else if (inList) {
                lines[i-1] += `</${listType}>`;
                inList = false;
            }
        }
        
        // Close any open list at the end
        if (inList && lines.length > 0) {
            lines[lines.length-1] += `</${listType}>`;
        }
        
        body = lines.join('\n');
        
        // Replace markdown links
        body = body.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Handle checkboxes in lists
        body = body.replace(/<li>\[\s\]\s+(.+?)<\/li>/g, '<li class="task-list-item"><span class="task-checkbox">☐</span> $1</li>');
        body = body.replace(/<li>\[x\]\s+(.+?)<\/li>/g, '<li class="task-list-item checked"><span class="task-checkbox">☑</span> $1</li>');
        
        // Replace horizontal rules
        body = body.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '<hr>');
        
        // Handle remaining line breaks and paragraphs
        // Look for consecutive lines that aren't HTML tags and join them with <br>
        const wrappedLines = [];
        let currentParagraph = '';
        
        lines.forEach(line => {
            line = line.trim();
            
            // Skip empty lines
            if (!line) {
                if (currentParagraph) {
                    wrappedLines.push(`<p>${currentParagraph}</p>`);
                    currentParagraph = '';
                }
                return;
            }
            
            // Skip lines that are already HTML elements
            if (line.startsWith('<')) {
                if (currentParagraph) {
                    wrappedLines.push(`<p>${currentParagraph}</p>`);
                    currentParagraph = '';
                }
                wrappedLines.push(line);
                return;
            }
            
            // Add to current paragraph
            if (currentParagraph) {
                currentParagraph += '<br>' + line;
            } else {
                currentParagraph = line;
            }
        });
        
        // Add any remaining paragraph
        if (currentParagraph) {
            wrappedLines.push(`<p>${currentParagraph}</p>`);
        }
        
        return wrappedLines.join('\n');
    }
    
    // Helper method to escape HTML entities
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    saveToCache() {
        try {
            localStorage.setItem('github_releases_cache', JSON.stringify(this.releases));
        } catch (error) {
            this.logDebug('Failed to save releases to cache', { error: error.message });
        }
    }
    
    loadFromCache() {
        try {
            const cached = localStorage.getItem('github_releases_cache');
            
            if (cached) {
                const parsed = JSON.parse(cached);
                
                // Convert date strings back to Date objects
                this.releases = parsed.map(release => ({
                    ...release,
                    published: new Date(release.published)
                }));
                
                // Load last checked timestamp
                this.lastChecked = parseInt(localStorage.getItem('github_releases_last_checked'), 10) || null;
                
                this.logDebug('Loaded releases from cache', { count: this.releases.length });
            }
        } catch (error) {
            this.logDebug('Failed to load releases from cache', { error: error.message });
            this.releases = [];
        }
    }
    
    showToast(message, isError = false) {
        // Create toast element if it doesn't exist
        let toast = document.querySelector('.github-releases-toast');
        
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'github-releases-toast';
            document.body.appendChild(toast);
        }
        
        // Set message and show
        toast.textContent = message;
        toast.className = `github-releases-toast ${isError ? 'error' : ''}`;
        
        // Show the toast
        toast.classList.add('visible');
        
        // Hide after a delay
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }
    
    logDebug(message, data = null) {
        // Check if there's a global debug function
        if (typeof window.debugLog === 'function') {
            window.debugLog(`[GitHubReleases] ${message}`, data);
        } else if (window.app && typeof window.app.debugLog === 'function') {
            window.app.debugLog(`[GitHubReleases] ${message}`, data);
        } else {
            console.log(`[GitHubReleases] ${message}`, data);
        }
    }
}

// Initialize GitHub Releases when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.githubReleases = new GitHubReleases({
        owner: 'thaakeno',
        repo: 'native-image-ui',
        maxReleases: 5,
        showOnStartup: true
    });
}); 
/*
This JavaScript file is responsible for managing the display of GitHub
release information within the web application. It handles:
- Fetching release data from the GitHub API for a specified repository.
- Caching the fetched data to optimize performance and reduce API calls.
- Processing the release data, including parsing release notes (Markdown),
  extracting tags, and identifying media like screenshots and GIFs.
- Dynamically rendering the releases in the UI, including a modal for
  viewing release details and a gallery for screenshots.
- Notifying users of new releases and providing update instructions.
- Managing user interactions, such as filtering releases and copying
  update commands.
*/
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
        this.lastVisited = parseInt(localStorage.getItem('github_releases_last_visited') || '0');
        this.triggerOnboardingOnClose = false;
        
        // Create UI elements
        this.createUI();
        
        // Bind methods
        this.toggleReleasePanel = this.toggleReleasePanel.bind(this);
        this.closeReleasePanel = this.closeReleasePanel.bind(this);
        this.checkForUpdates = this.checkForUpdates.bind(this);
        this.toggleReleaseContent = this.toggleReleaseContent.bind(this);
        this.applyFilters = this.applyFilters.bind(this);
        
        // Initialize
        this.init();
    }
    
    async init() {
        try {
            // Check local storage for cached releases
            this.loadFromCache();
            
            // Fetch releases immediately on startup
            await this.fetchReleases();
            this.lastChecked = Date.now();
            localStorage.setItem('github_releases_last_checked', this.lastChecked.toString());
            
            // Create event listeners
            this.setupEventListeners();
            
            // Check if this is a first-time user
            const isFirstTimeUser = localStorage.getItem('onboarding_completed') !== 'true';
            
            // Get the timestamp from localStorage directly
            const lastVisitedTimestamp = parseInt(localStorage.getItem('github_releases_last_visited') || '0');
            
            const hasNewReleases = this.releases.some(release => 
                release.publishedTimestamp > lastVisitedTimestamp
            );
            
            // Show notification badge if there are new releases (always check this)
            if (hasNewReleases) {
                this.showUpdateNotification();
                this.showWhatsNewBadges();
            }
            
            // ---MODIFIED LOGIC FOR SHOWING PANEL---
            let shouldShowPanel = false;
            if (isFirstTimeUser) {
                // First-time user: Show the panel so they see the latest info & set flag for onboarding
                shouldShowPanel = true;
                this.triggerOnboardingOnClose = true;
                this.logDebug('First time user, scheduling panel show and onboarding trigger.');
            } else if (this.options.showOnStartup && hasNewReleases) {
                // Returning user: Only show if enabled and there are *new* releases
                shouldShowPanel = true;
                this.triggerOnboardingOnClose = false; // Ensure flag is false for returning users
                this.logDebug('Returning user with new releases, scheduling panel show.');
            }
            // ---END MODIFIED LOGIC---
            
            if (shouldShowPanel) {
                setTimeout(() => {
                    this.showReleasePanel();
                        
                    // If "show only new" is checked, apply the filter immediately
                    const showOnlyNew = localStorage.getItem('github_releases_show_only_new') === 'true';
                    if (showOnlyNew) {
                        this.applyFilters();
                    }
                }, 1000); // Delay showing panel slightly
            }
            
            // Set up auto-updates while app is running
            this.setupAutoUpdates();
            
            this.initialized = true;
            this.logDebug('GitHub Releases initialized');
        } catch (error) {
            this.logDebug('Failed to initialize GitHub Releases', { error: error.message });
            
            // If we have cached releases, still try to use those
            if (this.releases.length === 0) {
                this.loadFromCache();
                 // If cache loaded, render them
                 if (this.releases.length > 0) {
                     this.renderReleases();
                     // Still apply filters if needed after loading from cache
                     const showOnlyNew = localStorage.getItem('github_releases_show_only_new') === 'true';
                     if (showOnlyNew) {
                         this.applyFilters();
                     }
                 }
            }
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
                    <div class="show-only-new-checkbox">
                        <input type="checkbox" id="show-only-new" />
                        <label for="show-only-new">Show only new</label>
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
            
            // Add the panel to the DOM
            document.body.appendChild(panel);
            
            // Create screenshot gallery modal
            const galleryModal = document.createElement('div');
            galleryModal.className = 'screenshot-gallery-modal';
            galleryModal.innerHTML = `
                <div class="gallery-content">
                    <div class="gallery-header">
                        <h3>Screenshots</h3>
                        <button class="close-gallery-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="gallery-main">
                        <button class="gallery-prev">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div class="gallery-image-container">
                            <img src="" alt="Screenshot" class="gallery-image">
                        </div>
                        <button class="gallery-next">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="gallery-caption"></div>
                    <div class="gallery-thumbnails"></div>
                </div>
            `;
            document.body.appendChild(galleryModal);
            
            // Store references to the elements
            this.panel = panel;
            this.releasesList = panel.querySelector('.releases-list');
            this.loadingIndicator = panel.querySelector('.releases-loading');
            this.galleryModal = galleryModal;
            
            // Add whats-new badge to show on profile GitHub links when new updates are available
            // Find all github-link elements to add badges to them
            const githubLinks = document.querySelectorAll('.github-link');
            githubLinks.forEach(link => {
                if (!link.querySelector('.whats-new-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'whats-new-badge';
                    badge.style.display = 'none';
                    badge.textContent = 'NEW';
                    link.appendChild(badge);
                }
            });
            
            // Store references to the badges
            this.whatsNewBadges = document.querySelectorAll('.github-link .whats-new-badge');
        }
    }
    
    setupEventListeners() {
        // Add listener to GitHub link in profile card
        const githubLinks = document.querySelectorAll('.profile-link.github-link, .profile-modal-link.github-link');
        
        githubLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Automatically check for updates when link is clicked
                this.checkForUpdates(true);
                this.showReleasePanel();
            });
        });
        
        // Add listener to close button
        const closeBtn = this.panel.querySelector('.close-releases-btn');
        this.closeBtn = closeBtn;
        closeBtn.addEventListener('click', this.closeReleasePanel);
        
        // Add listener to check for updates button
        const checkUpdatesBtn = this.panel.querySelector('.check-updates-btn');
        this.checkUpdatesBtn = checkUpdatesBtn;
        checkUpdatesBtn.addEventListener('click', () => this.checkForUpdates());
        
        // Add listener to show only new checkbox
        const showOnlyNewCheckbox = this.panel.querySelector('#show-only-new');
        showOnlyNewCheckbox.checked = localStorage.getItem('github_releases_show_only_new') === 'true';
        showOnlyNewCheckbox.addEventListener('change', () => {
            localStorage.setItem('github_releases_show_only_new', showOnlyNewCheckbox.checked);
            this.applyFilters();
        });
        
        // Add listener to close gallery button
        const closeGalleryBtn = this.galleryModal.querySelector('.close-gallery-btn');
        closeGalleryBtn.addEventListener('click', () => this.closeGallery());
        
        // Add listeners to gallery navigation buttons
        const galleryPrevBtn = this.galleryModal.querySelector('.gallery-prev');
        if (galleryPrevBtn) {
            galleryPrevBtn.addEventListener('click', () => this.navigateGallery('prev'));
        }
        
        const galleryNextBtn = this.galleryModal.querySelector('.gallery-next');
        if (galleryNextBtn) {
            galleryNextBtn.addEventListener('click', () => this.navigateGallery('next'));
        }
        
        // Copy command button
        const copyCommandBtn = this.panel.querySelector('.copy-command-btn');
        copyCommandBtn.addEventListener('click', () => {
            const command = this.panel.querySelector('.update-command code').textContent;
            navigator.clipboard.writeText(command)
                .then(() => {
                    this.showToast('Command copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy command', err);
                });
        });
        
        // Add listener to release items for toggle content
        this.releasesList.addEventListener('click', (e) => {
            const releaseItem = e.target.closest('.release-item');
            if (!releaseItem) return;
            
            const showMoreBtn = e.target.closest('.show-more-btn');
            if (showMoreBtn) {
                // Handle show more button click
                const container = releaseItem.querySelector('.release-body-container');
                if (container) {
                    container.classList.toggle('expanded');
                }
                return;
            }
            
            const isLink = e.target.tagName === 'A' || e.target.closest('a');
            if (isLink) return; // Don't toggle when clicking on links
            
            // Don't trigger gallery when clicking on release-media elements
            if (e.target.closest('.release-media')) return;
            
            const galleryThumbnail = e.target.closest('.screenshot-thumbnail');
            if (galleryThumbnail) {
                // Handle gallery thumbnail click
                const release = this.releases.find(r => r.id === parseInt(releaseItem.dataset.releaseId));
                if (release) {
                    const imageIndex = Array.from(releaseItem.querySelectorAll('.screenshot-thumbnail')).indexOf(galleryThumbnail);
                    this.openGallery(release, imageIndex);
                }
                return;
            }
            
            this.toggleReleaseContent(releaseItem);
        });
        
        // Create the view all releases button
        const viewAllBtn = document.createElement('a');
        viewAllBtn.className = 'view-all-releases';
        viewAllBtn.href = `https://github.com/${this.options.owner}/${this.options.repo}/releases`;
        viewAllBtn.target = '_blank';
        viewAllBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            View All Releases on GitHub
        `;
        this.panel.querySelector('.releases-content').appendChild(viewAllBtn);
        
        // Add escape key listener to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panel.classList.contains('visible')) {
                this.closeReleasePanel();
            }
            
            // Also close the gallery modal if open
            if (e.key === 'Escape' && this.galleryModal && this.galleryModal.classList.contains('visible')) {
                this.closeGallery();
            }
        });
        
        // Add click on backdrop to close
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
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
        document.body.classList.add('releases-panel-open');
        
        // Mark releases as visited FIRST (updates localStorage)
        this.markReleasesAsVisited();
        
        // THEN apply the "show only new" filter if checkbox is checked
        // This ensures the UI still shows "new" items for filtering purposes
        const showOnlyNew = document.querySelector('#show-only-new')?.checked || false;
        if (showOnlyNew) {
            this.applyFilters();
        }
        
        // Clear any notification badges
        this.clearUpdateNotification();
    }
    
    closeReleasePanel() {
        this.panel.classList.remove('visible');
        document.body.classList.remove('releases-panel-open');

        // Mark releases as visited when panel is closed
        this.markReleasesAsVisited(); // This already handles updating lastVisited and clearing badges

        // ---MODIFIED LOGIC FOR ONBOARDING---
        // Check if onboarding should be triggered *after* closing this panel
        if (this.triggerOnboardingOnClose) {
             this.logDebug('Panel closed, attempting to trigger onboarding.');
             // Use a timeout to ensure panel closing animation completes
             setTimeout(() => {
                // Double-check the onboarding instance and first-time status *just before* starting
                if (window.prompterOnboarding && localStorage.getItem('onboarding_completed') !== 'true') {
                     this.logDebug('Starting onboarding.');
                     window.prompterOnboarding.startOnboarding();
                 } else {
                     this.logDebug('Onboarding condition no longer met (already completed or instance missing).');
                 }
             }, 300); // Delay matches typical animation time

             // IMPORTANT: Reset the flag so it doesn't trigger again
             this.triggerOnboardingOnClose = false;
        } else {
            this.logDebug('Panel closed, onboarding trigger not set.');
        }
         // ---END MODIFIED LOGIC---
    }
    
    showUpdateNotification() {
        this.whatsNewBadges.forEach(badge => {
            badge.style.display = 'block';
        });
    }
    
    clearUpdateNotification() {
        this.whatsNewBadges.forEach(badge => {
            badge.style.display = 'none';
        });
    }
    
    showWhatsNewBadges() {
        this.whatsNewBadges.forEach(badge => {
            badge.style.display = 'block';
        });
    }
    
    async checkForUpdates(silent = false) {
        try {
            if (!silent) {
            this.showLoading();
            }
            
            // Fetch new releases
            const newReleases = await this.fetchReleases();
            
            // Update last checked timestamp
            this.lastChecked = Date.now();
            localStorage.setItem('github_releases_last_checked', this.lastChecked.toString());
            
            // Check if there are new releases
            if (this.hasNewReleasesAvailable(newReleases)) {
                this.showUpdateNotification();
            }
            
            if (!silent) {
            this.hideLoading();
                this.showToast('Successfully checked for updates');
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            if (!silent) {
            this.hideLoading();
            this.showToast('Failed to check for updates', true);
            }
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
        const lastChecked = parseInt(localStorage.getItem('github_releases_last_checked') || '0');
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000; // One hour in milliseconds
        
        if (!lastChecked || now - lastChecked > oneHourMs || this.releases.length === 0) {
            // More than one hour has passed since last check, or no releases cached
            try {
            await this.fetchReleases();
                this.lastChecked = now;
                localStorage.setItem('github_releases_last_checked', now.toString());
                
                // After fetching, check if we have any new releases
                const hasNew = this.releases.some(release => 
                    release.publishedTimestamp > this.lastVisited
                );
                
                if (hasNew) {
                    this.showUpdateNotification();
                }
            } catch (error) {
                console.error("Failed to fetch releases:", error);
                // Still use cached releases if available
                this.loadFromCache();
            }
        } else {
            // Use cached data, but still check if we need to show notification
            const hasNew = this.releases.some(release => 
                release.publishedTimestamp > this.lastVisited
            );
            
            if (hasNew) {
                this.showUpdateNotification();
            }
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
                // Extract tags from release notes
                const tags = this.extractTags(release.body || '');
                
                // Extract screenshots
                const screenshots = this.extractScreenshots(release.body || '');
                
                return {
                    id: release.id,
                    tag: release.tag_name,
                    name: release.name || release.tag_name,
                    url: release.html_url,
                    body: release.body,
                    published: new Date(release.published_at),
                    publishedTimestamp: new Date(release.published_at).getTime(),
                    tags: tags,
                    screenshots: screenshots,
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
        if (!newReleases || !newReleases.length) return false;
        
        // If we have no cached releases, any release is new
        if (!this.releases.length) return true;
        
        // Find the most recent release and compare with last visited time
        const latestRelease = newReleases[0];
        const latestPublishedTime = new Date(latestRelease.published_at).getTime();
        
        // If latest release is newer than our last visited time, it's new
        if (latestPublishedTime > this.lastVisited) {
            return true;
        }

        // Also check if the latest release ID is different from our cached one AND it wasn't published before last visit
        const latestCachedId = this.releases[0]?.id;
        return latestCachedId !== latestRelease.id && latestPublishedTime > this.lastVisited;
    }
    
    renderReleases() {
        // Clear the releases list
            this.releasesList.innerHTML = '';
            
        // If no releases, show empty state
        if (!this.releases || this.releases.length === 0) {
                this.releasesList.innerHTML = `
                    <div class="no-releases">
                <p>No releases found</p>
                    </div>
                `;
                return;
            }
            
        // Get the latest release
        const latestRelease = this.releases[0];
        
        // Get the timestamp from localStorage directly to ensure we have the latest value
        const lastVisitedTimestamp = parseInt(localStorage.getItem('github_releases_last_visited') || '0');
        
        // Render each release
            this.releases.forEach((release, index) => {
            // Check if this is a new release - compare against the lastVisitedTimestamp from localStorage
            const isNew = lastVisitedTimestamp ? release.publishedTimestamp > lastVisitedTimestamp : false;
            
            // Create release element
            const releaseEl = document.createElement('div');
            releaseEl.className = `release-item ${index === 0 ? 'latest' : ''} ${isNew ? 'new' : ''}`;
            releaseEl.dataset.releaseId = release.id;
            releaseEl.dataset.id = release.id;
            releaseEl.dataset.timestamp = release.publishedTimestamp;
                
                // Format the date
            const releaseDate = new Date(release.published);
            const formattedDate = new Intl.DateTimeFormat(navigator.language, { 
                    year: 'numeric', 
                month: 'long', 
                    day: 'numeric' 
            }).format(releaseDate);
            
            // Ensure tag_name exists
            const tagName = release.tag || release.tag_name || '';
            
            // Check if the body is long enough to need the "show more" button
            const needsExpand = release.body.length > 300;
            
            // Process the release body with proper markdown to HTML conversion
            const processedBody = this.formatReleaseBody(release.body);
            
            // Generate tag badges
            const tagBadges = (release.tags || []).map(tag => {
                return `<span class="tag-badge ${tag}">${tag}</span>`;
            }).join('');
            
            // Render the screenshots if any
            const screenshotsHTML = this.renderScreenshots(release);
            
            // Create the HTML for the release
            releaseEl.innerHTML = `
                    <div class="release-header">
                        <div class="release-title-row">
                        <h3 class="release-name">${release.name || tagName}</h3>
                        ${isNew ? '<span class="new-release-badge">New</span>' : ''}
                        <div class="tag-badges">
                            ${tagBadges}
                        </div>
                        </div>
                        <div class="release-meta">
                        <div class="release-tag-wrapper">
                            ${index === 0 ? '<span class="latest-tag">Latest</span>' : ''}
                            <span class="release-tag">${tagName}</span>
                        </div>
                            <span class="release-date">${formattedDate}</span>
                        </div>
                    </div>
                <div class="release-body-container${needsExpand ? ' expandable' : ''}">
                        <div class="release-body">${processedBody}</div>
                    ${needsExpand ? `
                            <button class="show-more-btn">
                                <span class="show-text">Show more</span>
                                <span class="hide-text">Show less</span>
                            <svg class="show-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                ${screenshotsHTML}
            `;
            
            // Add to the list
            this.releasesList.appendChild(releaseEl);
            
            // Add event listeners to screenshots if any
            if (release.screenshots && release.screenshots.length > 0) {
                const thumbsContainer = releaseEl.querySelector('.screenshots-container');
                if (thumbsContainer) {
                    const thumbs = thumbsContainer.querySelectorAll('.screenshot-thumbnail');
                    thumbs.forEach((thumb, i) => {
                        thumb.addEventListener('click', () => {
                            this.openGallery(release, i);
                    });
                });
                }
            }
            
            // Add event listener to the "show more" button if present
            const showMoreBtn = releaseEl.querySelector('.show-more-btn');
            if (showMoreBtn) {
                showMoreBtn.addEventListener('click', () => {
                    this.toggleReleaseContent(releaseEl);
                });
            }
        });
        
        // Display all releases
            this.applyFilters();
    }
    
    renderScreenshots(release) {
        if (!release.screenshots || release.screenshots.length === 0) {
            return '';
        }
        
        const thumbnails = release.screenshots.map((screenshot, i) => {
            // Determine if this is a GIF from either the URL or the metadata
            const isGif = screenshot.isGif || 
                          screenshot.url.match(/\.gif$/i) || 
                          (screenshot.caption && (
                            screenshot.caption.toLowerCase().includes('gif') || 
                            screenshot.caption.toLowerCase().includes('animation')
                          ));
            
            const className = isGif ? 'screenshot-thumbnail gif' : 'screenshot-thumbnail';
            
            return `<div class="${className}" data-index="${i}">
                <img src="${screenshot.url}" alt="${screenshot.caption || 'Screenshot'}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Crect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'%3E%3C/rect%3E%3Ccircle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'%3E%3C/circle%3E%3Cpolyline points=\\'21 15 16 10 5 21\\'%3E%3C/polyline%3E%3C/svg%3E';this.parentNode.classList.add('error');">
                ${isGif ? '<span class="gif-badge">GIF</span>' : ''}
            </div>`;
        }).join('');
        
        return `
            <div class="release-screenshots">
                <h4>Media & Screenshots</h4>
                <div class="screenshots-container">
                    ${thumbnails}
                </div>
            </div>
        `;
    }
    
    formatReleaseBody(body) {
        return this.processReleaseBody(body);
    }
    
    toggleReleaseContent(releaseEl) {
        const container = releaseEl.querySelector('.release-body-container');
        container.classList.toggle('expanded');
    }
    
    openGallery(release, imageIndex) {
        if (!release || !release.screenshots || !release.screenshots.length) return;
        
        this.currentGallery = {
            release: release,
            images: release.screenshots,
            currentIndex: imageIndex || 0
        };
        
        // Update gallery content
        this.updateGalleryImage();
        
        // Generate thumbnails
        const thumbnailsContainer = this.galleryModal.querySelector('.gallery-thumbnails');
        thumbnailsContainer.innerHTML = '';
        
        release.screenshots.forEach((screenshot, i) => {
            // Determine if this is a GIF from the URL or metadata
            const isGif = screenshot.isGif || 
                        screenshot.url.match(/\.gif$/i) || 
                        (screenshot.caption && (
                            screenshot.caption.toLowerCase().includes('gif') || 
                            screenshot.caption.toLowerCase().includes('animation')
                        ));
            
            const thumb = document.createElement('div');
            thumb.className = `gallery-thumbnail ${i === imageIndex ? 'active' : ''} ${isGif ? 'gif' : ''}`;
            thumb.innerHTML = `
                <img src="${screenshot.url}" alt="Thumbnail" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Crect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'%3E%3C/rect%3E%3Ccircle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'%3E%3C/circle%3E%3Cpolyline points=\\'21 15 16 10 5 21\\'%3E%3C/polyline%3E%3C/svg%3E';this.parentNode.classList.add('error');">
                ${isGif ? '<span class="gif-badge">GIF</span>' : ''}
            `;
            
            thumb.addEventListener('click', () => {
                this.currentGallery.currentIndex = i;
                this.updateGalleryImage();
            });
            
            thumbnailsContainer.appendChild(thumb);
        });
        
        // Update gallery title
        const title = this.galleryModal.querySelector('.gallery-header h3');
        const releaseName = release.name || release.tag || release.tag_name || 'Release';
        title.textContent = `${releaseName} - Media (${imageIndex + 1}/${release.screenshots.length})`;
        
        // Show the modal
        this.galleryModal.classList.add('visible');
        
        // Add keyboard navigation
        document.addEventListener('keydown', this.galleryKeyHandler);
    }
    
    updateGalleryImage() {
        if (!this.currentGallery) return;
        
        const { release, images, currentIndex } = this.currentGallery;
        const screenshot = images[currentIndex];
        
        // Determine if this is a GIF from the URL or metadata
        const isGif = screenshot.isGif || 
                    screenshot.url.match(/\.gif$/i) || 
                    (screenshot.caption && (
                        screenshot.caption.toLowerCase().includes('gif') || 
                        screenshot.caption.toLowerCase().includes('animation')
                    ));
        
        // Update main image container
        const imageContainer = this.galleryModal.querySelector('.gallery-image-container');
        if (imageContainer) {
            // Add loading state
            imageContainer.classList.add('loading');
            imageContainer.classList.remove('error');
        
        // Update main image
        const image = this.galleryModal.querySelector('.gallery-image');
            if (image) {
        image.src = screenshot.url;
        image.alt = screenshot.caption || 'Screenshot';
                image.dataset.isGif = isGif ? 'true' : 'false';
                
                // Add error handling
                image.onerror = () => {
                    imageContainer.classList.add('error');
                    imageContainer.classList.remove('loading');
                    image.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect x=\'3\' y=\'3\' width=\'18\' height=\'18\' rx=\'2\' ry=\'2\'%3E%3C/rect%3E%3Ccircle cx=\'8.5\' cy=\'8.5\' r=\'1.5\'%3E%3C/circle%3E%3Cpolyline points=\'21 15 16 10 5 21\'%3E%3C/polyline%3E%3C/svg%3E';
                };
                
                // Add load complete handling
                image.onload = () => {
                    imageContainer.classList.remove('loading');
                };
            }
            
            // Add GIF badge if needed
            let gifBadge = imageContainer.querySelector('.gallery-gif-badge');
            if (isGif) {
                if (!gifBadge) {
                    gifBadge = document.createElement('span');
                    gifBadge.className = 'gallery-gif-badge';
                    gifBadge.textContent = 'GIF';
                    imageContainer.appendChild(gifBadge);
                }
            } else if (gifBadge) {
                gifBadge.remove();
            }
        }
        
        // Update caption
        const caption = this.galleryModal.querySelector('.gallery-caption');
        if (caption) {
        caption.textContent = screenshot.caption || '';
        }
        
        // Update active thumbnail
        const thumbnails = this.galleryModal.querySelectorAll('.gallery-thumbnail');
        thumbnails.forEach((thumb, i) => {
            if (i === currentIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
        
        // Update title
        const title = this.galleryModal.querySelector('.gallery-header h3');
        if (title) {
            const releaseName = release.name || release.tag || release.tag_name || 'Release';
            title.textContent = `${releaseName} - Media (${currentIndex + 1}/${images.length})`;
        }
    }
    
    navigateGallery(direction) {
        if (!this.currentGallery) return;
        
        const { images, currentIndex } = this.currentGallery;
        
        if (direction === 'prev') {
            this.currentGallery.currentIndex = (currentIndex - 1 + images.length) % images.length;
        } else {
            this.currentGallery.currentIndex = (currentIndex + 1) % images.length;
        }
        
        this.updateGalleryImage();
    }
    
    galleryKeyHandler = (e) => {
        if (e.key === 'ArrowLeft') {
            this.navigateGallery('prev');
        } else if (e.key === 'ArrowRight') {
            this.navigateGallery('next');
        }
    }
    
    closeGallery() {
        this.galleryModal.classList.remove('visible');
        this.currentGallery = null;
        
        // Remove keyboard handler
        document.removeEventListener('keydown', this.galleryKeyHandler);
    }
    
    processReleaseBody(body) {
        if (!body) return '<p><em>No description provided</em></p>';
        
        // First process special media elements 
        
        // Handle GIFs and image links with enhanced support
        body = body.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            // Check if it's a GIF
            if (url.match(/\.(gif)$/i) || url.includes("/assets/") && alt.toLowerCase().includes("gif")) {
                return `<div class="release-media gif-container" style="pointer-events: none;">
                    <img src="${url}" alt="${alt || 'Animated GIF'}" class="release-gif" loading="lazy" onload="this.parentNode.classList.add('loaded')">
                    <span class="gif-badge">GIF</span>
                    ${alt ? `<div class="media-caption">${alt}</div>` : ''}
                </div>`;
            }
            // Regular image
            else if (url.match(/\.(jpg|jpeg|png|webp)$/i) || url.includes("/assets/")) {
                return `<div class="release-media image-container" style="pointer-events: none;">
                    <img src="${url}" alt="${alt || 'Image'}" class="release-image" loading="lazy" onload="this.parentNode.classList.add('loaded')">
                    ${alt ? `<div class="media-caption">${alt}</div>` : ''}
                </div>`;
            }
            return match; // Return original if not image
        });
        
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
        
        // Handle direct URLs to images and gifs that might not be in markdown format
        body = body.replace(/(?<!["'=(])(https?:\/\/[^\s]+?\/[^\s]*?\.(?:png|jpg|jpeg|gif|webp))(?!['")\]])/gi, (match) => {
            if (match.match(/\.(gif)$/i)) {
                return `<div class="release-media gif-container" style="pointer-events: none;">
                    <img src="${match}" alt="Animated GIF" class="release-gif" loading="lazy" onload="this.parentNode.classList.add('loaded')">
                    <span class="gif-badge">GIF</span>
                </div>`;
            } else {
                return `<div class="release-media image-container" style="pointer-events: none;">
                    <img src="${match}" alt="Image" class="release-image" loading="lazy" onload="this.parentNode.classList.add('loaded')">
                </div>`;
            }
        });
        
        // Handle GitHub asset URLs that might not have a file extension
        body = body.replace(/(?<!["'=(])(https?:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+)(?!['")\]])/gi, (match) => {
            return `<div class="release-media image-container" style="pointer-events: none;">
                <img src="${match}" alt="Image" class="release-image" loading="lazy" onload="this.parentNode.classList.add('loaded')">
            </div>`;
        });
        
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
    
    extractTags(body) {
        const tags = [];
        
        // Extract tags from common formats
        // Look for tags in format #tag or [tag]
        const tagPatterns = [
            /#(\w+)/g,  // #tag format
            /\[(\w+)\]/g  // [tag] format
        ];
        
        tagPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(body)) !== null) {
                const tag = match[1].toLowerCase();
                // Only add if it's a relevant tag and not already included
                if (['major', 'feature', 'bugfix', 'ui', 'minor', 'breaking'].includes(tag) && !tags.includes(tag)) {
                    tags.push(tag);
                }
            }
        });
        
        // Infer tags from content if none explicitly defined
        if (tags.length === 0) {
            if (body.match(/breaking change/i) || body.match(/major update/i)) {
                tags.push('major');
            }
            
            if (body.match(/fix(ed|es|ing)?(\s+a)?\s+bug/i) || body.match(/issue(\s+has been)?\s+fixed/i)) {
                tags.push('bugfix');
            }
            
            if (body.match(/new feature/i) || body.match(/added support for/i)) {
                tags.push('feature');
            }
            
            if (body.match(/visual/i) || body.match(/UI/i) || body.match(/interface/i) || body.match(/design/i)) {
                tags.push('ui');
            }
        }
        
        return tags;
    }
    
    extractScreenshots(body) {
        const screenshots = [];
        
        // Look for image links in markdown format - support more formats including GIFs
        const imagePattern = /!\[(.*?)\]\((.*?)\)/g;
        let match;
        
        while ((match = imagePattern.exec(body)) !== null) {
            const alt = match[1];
            const url = match[2];
            
            // Support more image formats including GIFs and GitHub asset URLs
            if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || url.includes('/assets/')) {
                screenshots.push({
                    url,
                    caption: alt || 'Screenshot',
                    isGif: url.match(/\.gif$/i) || alt.toLowerCase().includes('gif') || alt.toLowerCase().includes('animation')
                });
            }
        }
        
        // Also look for direct image URLs
        const urlPattern = /(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp|svg))/gi;
        while ((match = urlPattern.exec(body)) !== null) {
            const url = match[1];
            
            // Check if this URL is already added from markdown format
            const alreadyAdded = screenshots.some(screenshot => screenshot.url === url);
            
            if (!alreadyAdded) {
                screenshots.push({
                    url,
                    caption: 'Screenshot',
                    isGif: url.match(/\.gif$/i) ? true : false
                });
            }
        }
        
        // Also look for GitHub asset URLs
        const assetPattern = /(https?:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+)/gi;
        while ((match = assetPattern.exec(body)) !== null) {
            const url = match[1];
            
            // Check if this URL is already added from markdown format
            const alreadyAdded = screenshots.some(screenshot => screenshot.url === url);
            
            if (!alreadyAdded) {
                screenshots.push({
                    url,
                    caption: 'Screenshot',
                    isGif: false // We can't determine this from the URL alone
                });
            }
        }
        
        return screenshots;
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
    
    applyFilters() {
        // Get the "show only new" checkbox state
        const showOnlyNew = document.querySelector('#show-only-new')?.checked || false;

        // Apply filter based on checkbox
            this.releasesList.querySelectorAll('.release-item').forEach(item => {
            if (showOnlyNew) {
                // Only show new releases if the checkbox is checked
                const isNew = item.classList.contains('new');
                item.style.display = isNew ? '' : 'none';
            } else {
                // Show all releases if checkbox is unchecked
                item.style.display = '';
            }
        });
        
        // Check if any releases are visible after filtering
        const hasVisibleReleases = Array.from(this.releasesList.querySelectorAll('.release-item'))
            .some(item => item.style.display !== 'none');
        
        // Show a "no matching releases" message if all are filtered out
        let noMatchingEl = this.releasesList.querySelector('.no-matching-releases');
        
        if (!hasVisibleReleases) {
            if (!noMatchingEl) {
                noMatchingEl = document.createElement('div');
                noMatchingEl.className = 'no-matching-releases';
                noMatchingEl.innerHTML = '<p>No unread releases available</p>';
                this.releasesList.appendChild(noMatchingEl);
            }
        } else if (noMatchingEl) {
            noMatchingEl.remove();
        }
    }
    
    setupAutoUpdates() {
        // Check for updates every 30 minutes (more frequent than before)
        setInterval(() => {
            this.checkForUpdates(true);
        }, 30 * 60 * 1000);  // 30 minute interval
    }
    
    markReleasesAsVisited() {
        // ALWAYS update last visited timestamp when the panel is opened
        this.lastVisited = Date.now();
        localStorage.setItem('github_releases_last_visited', this.lastVisited.toString());
        
        // Mark all releases as not new in the data
        this.releases.forEach(release => {
            release.isNew = false;
        });
        
        // Save the updated data to cache
        this.saveToCache();
        
        // Get the "show only new" checkbox state
        const showOnlyNew = document.querySelector('#show-only-new')?.checked || false;
        
        // If "show only new" is checked, we need to preserve the "new" class for filtering,
        // but we've already updated localStorage so these won't be considered new on page reload
        if (!showOnlyNew) {
            // Update the UI to reflect the changes immediately if we're not in "show only new" mode
            const newItems = this.releasesList.querySelectorAll('.release-item.new');
            newItems.forEach(item => {
                item.classList.remove('new');
            });
        }
        
        // Always clear notifications
        this.clearUpdateNotification();
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
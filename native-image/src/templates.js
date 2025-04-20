class TemplateManager {
    constructor() {
        // Database information
        this.dbName = 'templatesDB';
        this.dbVersion = 1;
        this.storeName = 'templates';
        
        // DOM elements
        this.templatesModal = null;
        this.templatesBtn = null;
        this.templatesListContainer = null;
        this.templatesForm = null;
        this.templateFormActive = false;
        
        // Current templates data
        this.templates = [];
        this.currentTemplate = null;
        this.templateImages = [];
        this.totalStorageUsed = 0; // Track total storage
        this.searchTerm = ''; // For search functionality
        
        this.MAX_IMAGES = 8; // Define max images constant
        
        // Initialize the manager
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing Template Manager...');
            await this.initDB();
            await this.loadTemplates();
            this.calculateStorageUsed(); // Calculate storage on init
            this.createUI();
            this.setupEventListeners();
            this.renderTemplatesList();
            console.log('Template Manager initialized with', this.templates.length, 'templates');
        } catch (error) {
            console.error('Error initializing Template Manager:', error);
        }
    }
    
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event);
                reject(event);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('dateCreated', 'dateCreated', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
        });
    }
    
    async loadTemplates() {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.templates = request.result || [];
                this.templates.sort((a, b) => (b.dateModified || b.dateCreated) - (a.dateModified || a.dateCreated)); // Sort by modified/created
                resolve(this.templates);
            };
            
            request.onerror = (event) => {
                console.error('Failed to load templates:', event);
                this.templates = [];
                resolve([]);
            };
        });
    }
    
    async saveTemplate(template) {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }
        
        if (!template.id) {
            template.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            template.dateCreated = Date.now();
        }
        template.dateModified = Date.now();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(template);
            
            request.onsuccess = (event) => {
                resolve(template);
            };
            
            request.onerror = (event) => {
                console.error('Error saving template:', event);
                reject(event);
            };
        });
    }
    
    async deleteTemplate(id) {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            
            request.onsuccess = (event) => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('Error deleting template:', event);
                reject(event);
            };
        });
    }
    
    createUI() {
        // Create Templates button
        this.templatesBtn = document.createElement('button');
        this.templatesBtn.className = 'templates-btn';
        this.templatesBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="m10 14 2 2 4-4"></path>
            </svg>
            Templates
        `;
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.style.position = 'relative';
            inputContainer.appendChild(this.templatesBtn);
        }
        
        // Create Templates modal structure
        this.templatesModal = document.createElement('div');
        this.templatesModal.className = 'templates-modal';
        this.templatesModal.innerHTML = `
            <div class="templates-content">
                <div class="templates-header">
                    <h2>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                            <path d="M14 2v6h6"/>
                            <path d="M12 18v-6"/>
                            <path d="M9 15h6"/>
                         </svg>
                        Prompt Templates
                    </h2>
                    <div class="header-actions">
                        <div class="templates-search-wrapper">
                            <input type="text" class="templates-search-input" placeholder="Search templates...">
                            <svg class="templates-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <button class="templates-search-clear" title="Clear search">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                         <button class="templates-storage-info">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                            </svg>
                            <span class="storage-used">0 MB</span>
                        </button>
                         <button class="templates-clear-all-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Clear All
                        </button>
                         <button class="templates-create-new-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Create New
                        </button>
                        <button class="templates-close" aria-label="Close Templates">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="templates-body">
                    <div class="templates-list-container">
                        <div class="templates-list"></div>
                    </div>
                    <div class="template-form">
                        <div class="template-form-header">
                           <h3>Create Template</h3>
                           <svg class="edit-indicator-icon" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </div>
                        <div class="template-form-body">
                            <div class="form-group">
                                <label for="template-name">Template Name</label>
                                <input type="text" id="template-name" class="template-input" placeholder="e.g., Cinematic Portrait Style">
                            </div>
                            <div class="form-group">
                                <label for="template-text">Prompt Text</label>
                                <textarea id="template-text" class="template-textarea" placeholder="Enter prompt keywords, style descriptions, negative prompts..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>Reference Images</label>
                                <div class="template-image-section">
                                    <div class="template-image-controls">
                                        <div class="template-image-counter">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                <polyline points="21 15 16 10 5 21"></polyline>
                                            </svg>
                                            <span class="count">0/${this.MAX_IMAGES}</span>
                                        </div>
                                    </div>
                                    <input type="file" id="template-image-input" accept="image/jpeg,image/png,image/webp,image/heic" multiple style="display: none;">
                                    <div class="template-preview-container">
                                        <div class="template-add-image-btn">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <div class="template-actions-buttons">
                            <button class="template-save">Save Template</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="storage-cleared-popup">
                <div class="popup-content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h3>Storage Cleared</h3>
                    <p>You've cleared <span class="cleared-storage-amount">0 MB</span> of storage space</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.templatesModal);
        
        // Set element references
        this.templatesListContainer = this.templatesModal.querySelector('.templates-list-container');
        this.templatesForm = this.templatesModal.querySelector('.template-form');
    }
    
    setupEventListeners() {
        // Open modal
        this.templatesBtn.addEventListener('click', () => this.openModal());
        
        // Close button
        const closeBtn = this.templatesModal.querySelector('.templates-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Click outside to close
        this.templatesModal.addEventListener('click', (e) => {
            if (e.target === this.templatesModal) {
                this.closeModal();
            }
        });
        
        // Search input events
        const searchInput = this.templatesModal.querySelector('.templates-search-input');
        const searchClear = this.templatesModal.querySelector('.templates-search-clear');
        
        if (searchInput) {
            // Add input event to filter templates as the user types
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim().toLowerCase();
                this.renderTemplatesList();
                
                // Toggle clear button visibility
                if (searchClear) {
                    searchClear.style.display = this.searchTerm ? 'flex' : 'none';
                }
            });
            
            // Add clear button functionality
            if (searchClear) {
                searchClear.style.display = 'none'; // Initially hidden
                searchClear.addEventListener('click', () => {
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.renderTemplatesList();
                    searchClear.style.display = 'none';
                    searchInput.focus();
                });
            }
        }
        
        // Create New button (header)
        const createNewBtn = this.templatesModal.querySelector('.templates-create-new-btn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => this.showTemplateForm());
        }
        
        // Clear All Templates button
        const clearAllBtn = this.templatesModal.querySelector('.templates-clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllTemplates());
        }
        
        // Create button within empty state
        this.templatesListContainer.addEventListener('click', (e) => {
            if (e.target.closest('.template-create-btn')) {
                this.showTemplateForm();
            }
        });
        
        // Add image button in form
        this.templatesForm.addEventListener('click', (e) => {
            if (e.target.closest('.template-add-image-btn')) {
                const imageInput = this.templatesForm.querySelector('#template-image-input');
                if (imageInput && this.templateImages.length < this.MAX_IMAGES) {
                    imageInput.click();
                }
            }
        });
        
        // Load template on item click (excluding actions area)
        this.templatesListContainer.addEventListener('click', (e) => {
            const templateItem = e.target.closest('.template-item');
            if (templateItem && !e.target.closest('.template-actions')) {
                const id = templateItem.dataset.id;
                const template = this.templates.find(t => t.id === id);
                if (template) {
                    this.loadTemplateToInput(template);
                    this.closeModal();
                }
            }
        });
        
        // Edit button
        this.templatesListContainer.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.template-edit-btn');
            if (editBtn) {
                e.stopPropagation();
                const id = editBtn.closest('.template-item').dataset.id;
                const template = this.templates.find(t => t.id === id);
                if (template) {
                    this.editTemplate(template);
                }
            }
        });
        
        // Delete button
        this.templatesListContainer.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.template-delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const id = deleteBtn.closest('.template-item').dataset.id;
                if (confirm('Are you sure you want to permanently delete this template? This cannot be undone.')) {
                    await this.deleteTemplate(id);
                    await this.loadTemplates(); // Reload data
                    this.calculateStorageUsed(); // Recalculate storage
                    this.updateStorageDisplay(); // Update the display
                    this.renderTemplatesList(); // Refresh UI
                }
            }
        });
        
        // Form: Image upload button
        const imageInput = this.templatesForm.querySelector('#template-image-input');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
                imageInput.value = ''; // Reset
            });
        }
        
        // Form: Save button
        const saveBtn = this.templatesForm.querySelector('.template-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => await this.saveTemplateFromForm());
        }

        // Add mouse move listener to template items for the glow effect
        this.templatesListContainer.addEventListener('mousemove', (e) => {
            const item = e.target.closest('.template-item');
            if (item) {
                const rect = item.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                item.style.setProperty('--mouse-x', `${x}px`);
                item.style.setProperty('--mouse-y', `${y}px`);
            }
        });
    }
    
    openModal() {
        this.templatesModal.classList.add('active');
        
        // Add a frame delay before loading data - helps with animation smoothness
        requestAnimationFrame(() => {
            // Show loading state if needed
            
            this.loadTemplates().then(() => {
                this.calculateStorageUsed();
                this.updateStorageDisplay();
                
                // Render template list first
                this.renderTemplatesList();
                
                // Then after a small delay, show template form for smoother UI
                requestAnimationFrame(() => {
                    // Auto-activate create new form when opening
                    if (!this.templateFormActive) {
                        this.showTemplateForm();
                    }
                });
            });
        });
    }
    
    closeModal() {
        // Always close the entire modal directly
        this.templatesModal.classList.remove('active');
        
        // Reset the form state without animation when the modal is closed
        if (this.templateFormActive) {
            this.templateFormActive = false;
            
            // Reset the form immediately without animation
            const form = this.templatesForm;
            if (form) {
                form.classList.remove('active');
                // Reset form fields when closed from X button
                const nameInput = form.querySelector('#template-name');
                const textInput = form.querySelector('#template-text');
                if (nameInput) nameInput.value = '';
                if (textInput) textInput.value = '';
            }
            
            // Clear any template being edited
            this.currentTemplate = null;
            this.templateImages = [];
        }
        
        // Clear search
        this.searchTerm = '';
        const searchInput = this.templatesModal.querySelector('.templates-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        const searchClear = this.templatesModal.querySelector('.templates-search-clear');
        if (searchClear) {
            searchClear.style.display = 'none';
        }
    }
    
    renderTemplatesList() {
        const listElement = this.templatesListContainer.querySelector('.templates-list');
        if (!listElement) return;

        listElement.innerHTML = ''; // Clear existing

        if (this.templates.length === 0) {
            this.renderEmptyState(listElement, false); // Pass the target element
            return;
        }

        // Filter templates by search term if one exists
        let filteredTemplates = this.templates;
        if (this.searchTerm) {
            filteredTemplates = this.templates.filter(template => {
                const nameMatch = template.name.toLowerCase().includes(this.searchTerm);
                const textMatch = template.text.toLowerCase().includes(this.searchTerm);
                return nameMatch || textMatch;
            });
        }

        // Show no results message if search returned nothing
        if (filteredTemplates.length === 0) {
            this.renderEmptyState(listElement, true); // Pass search=true to show no results message
            return;
        }

        filteredTemplates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.dataset.id = template.id;

            const imageCount = template.images ? template.images.length : 0;
            const firstImageSrc = imageCount > 0 ? `data:${template.images[0].mimeType};base64,${template.images[0].data}` : null;
            const templateSize = this.calculateTemplateSize(template);

            const imagePreviewHtml = firstImageSrc
                ? `<div class="template-item-image-preview"><img src="${firstImageSrc}" alt="Template Preview" loading="lazy"></div>` // Added lazy loading
                : `<div class="template-item-no-image-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                   </div>`;

            const imageCountBadgeHtml = imageCount > 0
                ? `<span class="template-image-count">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                       <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                       <circle cx="8.5" cy="8.5" r="1.5"></circle>
                       <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    ${imageCount} Image${imageCount > 1 ? 's' : ''}
                   </span>`
                : '';

            // Basic sanitation
            const safeName = template.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeText = template.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            // Highlight matched terms if there's a search term
            let displayName = safeName || 'Untitled Template';
            let displayText = safeText || 'No prompt text';
            
            if (this.searchTerm) {
                // Highlight matches in name
                const nameRegex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayName = displayName.replace(nameRegex, '<mark>$1</mark>');
                
                // Highlight matches in text 
                const textRegex = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                displayText = displayText.replace(textRegex, '<mark>$1</mark>');
            }

            item.innerHTML = `
                ${imagePreviewHtml}
                <div class="template-item-content">
                    <div class="template-name">${displayName}</div>
                    <div class="template-text">${displayText}</div>
                    <div class="template-footer">
                        <div class="template-meta">
                            ${imageCountBadgeHtml}
                            <span class="template-size">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                ${templateSize} MB
                            </span>
                        </div>
                        <div class="template-actions">
                            <button class="template-btn template-edit-btn" title="Edit template">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                            </button>
                            <button class="template-btn template-delete-btn" title="Delete template">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            listElement.appendChild(item);
        });
    }
    
    renderEmptyState(targetElement, isSearchResult = false) { // Accept target element and search state
        targetElement.innerHTML = `
            <div class="template-empty">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${isSearchResult ? 
                    `<circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>` :
                    `<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M12 18v-6"></path>
                    <path d="M8 15h8"></path>`}
                </svg>
                <div class="template-empty-text">${isSearchResult ? 'No matching templates' : 'No Templates Saved'}</div>
                <div class="template-empty-desc">${isSearchResult ? 
                    `No templates found matching "${this.searchTerm}". Try a different search term or clear the search.` : 
                    'Use the "Create New" button to save prompts and images you use often.'}</div>
                 ${!isSearchResult ? `<button class="templates-create-btn template-create-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create Your First Template
                </button>` : ''}
            </div>
        `;
    }
    
    showTemplateForm(template = null) {
        const nameInput = this.templatesForm.querySelector('#template-name');
        const textInput = this.templatesForm.querySelector('#template-text');
        const formTitle = this.templatesForm.querySelector('.template-form-header h3');
        const editIcon = this.templatesForm.querySelector('.edit-indicator-icon');
        const saveButton = this.templatesForm.querySelector('.template-save');

        this.currentTemplate = template;
        this.templateImages = template && template.images ? [...template.images] : [];

        nameInput.value = template ? template.name : '';
        textInput.value = template ? template.text : '';
        formTitle.textContent = template ? 'Edit Template' : 'Create New Template';
        saveButton.textContent = template ? 'Save Changes' : 'Create Template';
        editIcon.style.display = template ? 'inline-block' : 'none'; // Show edit icon if editing

        this.renderImagePreviews(); // Render previews and update counter
        this.updateImageCounter(); // Initial counter update

        this.templatesForm.classList.add('active');
        this.templateFormActive = true;
    }
    
    hideTemplateForm() {
        this.templatesForm.classList.remove('active');
        this.templateFormActive = false;
        this.currentTemplate = null;
        this.templateImages = []; // Clear images when hiding
    }
    
    editTemplate(template) {
        this.showTemplateForm(template);
    }
    
    handleImageUpload(files) {
        if (!files || files.length === 0) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        const currentImageCount = this.templateImages.length;
        const remainingSlots = this.MAX_IMAGES - currentImageCount;

        if (remainingSlots <= 0) {
            alert(`Maximum of ${this.MAX_IMAGES} images already added.`);
            return;
        }

        // Batch file processing to avoid UI freezing with many files
        const processFiles = async () => {
            // Show loading indicator or disable form temporarily if needed
            
            // Process files in batches
            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            let addedCount = 0;
            
            // Process files one by one but don't wait for all to complete before updating UI
            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                
                if (!allowedTypes.includes(file.type)) {
                    console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
                    continue;
                }
                
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    alert(`Image ${file.name} is too large (max 5MB).`);
                    continue;
                }
                
                try {
                    const result = await readFileAsDataURL(file);
                    if (result) {
                        const base64Data = result.split(',')[1];
                        this.templateImages.push({ data: base64Data, mimeType: file.type });
                        addedCount++;
                        
                        // Update UI every few files to show progress
                        if (addedCount % 2 === 0 || i === filesToProcess.length - 1) {
                            this.renderImagePreviews();
                            this.updateImageCounter();
                        }
                    }
                } catch (error) {
                    console.error(`Error reading file ${file.name}:`, error);
                }
            }
            
            // Final UI update for any remaining files
            this.renderImagePreviews();
            this.updateImageCounter();
            
            if (files.length > remainingSlots && addedCount < files.length) {
                alert(`Added ${addedCount} image(s). Some files were skipped due to limits or errors.`);
            }
        };
        
        // Helper function to read file as data URL
        const readFileAsDataURL = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
        };
        
        // Start processing
        processFiles();
    }
    
    renderImagePreviews() {
        const previewContainer = this.templatesForm.querySelector('.template-preview-container');
        if (!previewContainer) return;
        
        // Use documentFragment for better performance - avoids multiple reflows
        const fragment = document.createDocumentFragment();
        
        // Add the "+" button first
        const addButton = document.createElement('div');
        addButton.className = 'template-add-image-btn';
        addButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        `;
        
        // Only show add button if we haven't reached the max
        if (this.templateImages.length < this.MAX_IMAGES) {
            fragment.appendChild(addButton);
        }
        
        // Then add the existing images - create all elements before appending to DOM
        this.templateImages.forEach((imgData, index) => {
            const preview = document.createElement('div');
            preview.className = 'template-preview';
            
            // Use a simple class-based animation approach instead of inline styles
            // This reduces style recalculations during scrolling
            preview.classList.add(`preview-delay-${index % 4}`);
            
            const imgElement = document.createElement('img');
            imgElement.src = `data:${imgData.mimeType};base64,${imgData.data}`;
            imgElement.alt = `Preview ${index + 1}`;
            imgElement.loading = 'lazy'; // Lazy load preview images
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'template-remove-image';
            removeBtn.innerHTML = '×'; // Use multiplication sign for 'x'
            removeBtn.title = 'Remove Image';
            removeBtn.setAttribute('aria-label', 'Remove Image'); // Accessibility
            
            // Store index as data attribute instead of using closure
            removeBtn.dataset.index = index;
            
            preview.appendChild(imgElement);
            preview.appendChild(removeBtn);
            fragment.appendChild(preview);
        });
        
        // Clear and append all elements at once - single reflow
        previewContainer.innerHTML = '';
        previewContainer.appendChild(fragment);
        
        // Add event listeners after DOM is updated
        const removeButtons = previewContainer.querySelectorAll('.template-remove-image');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.dataset.index, 10);
                if (!isNaN(index) && index >= 0 && index < this.templateImages.length) {
                    this.templateImages.splice(index, 1);
                    this.renderImagePreviews(); // Re-render previews
                    this.updateImageCounter(); // Update counter after removal
                }
            });
        });
    }
    
    updateImageCounter() {
        const counterElement = this.templatesForm.querySelector('.template-image-counter .count');
        if (counterElement) {
            counterElement.textContent = `${this.templateImages.length}/${this.MAX_IMAGES}`;
        }
         // Optionally disable upload button if max is reached
         const uploadBtn = this.templatesForm.querySelector('.template-upload-btn');
         if(uploadBtn) {
            uploadBtn.disabled = this.templateImages.length >= this.MAX_IMAGES;
         }
    }
    
    async saveTemplateFromForm() {
        const nameInput = this.templatesForm.querySelector('#template-name');
        const textInput = this.templatesForm.querySelector('#template-text');
        
        const name = nameInput.value.trim();
        const text = textInput.value.trim();
        
        if (!name) {
            alert('Template name cannot be empty.');
            nameInput.focus();
            return;
        }

        const templateData = {
            id: this.currentTemplate ? this.currentTemplate.id : null,
            name: name,
            text: text,
            images: this.templateImages
        };

        try {
            await this.saveTemplate(templateData);
            await this.loadTemplates();
            this.calculateStorageUsed(); // Recalculate storage
            this.updateStorageDisplay(); // Update the display
            this.renderTemplatesList();
            
            // Don't hide the form - reset it for a new template
            // Clear form for a new template
            nameInput.value = '';
            textInput.value = '';
            this.templateImages = [];
            this.currentTemplate = null;
            this.renderImagePreviews();
            this.updateImageCounter();
            
            // Update form title back to create mode
            const formTitle = this.templatesForm.querySelector('.template-form-header h3');
            const editIcon = this.templatesForm.querySelector('.edit-indicator-icon');
            const saveButton = this.templatesForm.querySelector('.template-save');
            
            if (formTitle) formTitle.textContent = 'Create New Template';
            if (editIcon) editIcon.style.display = 'none';
            if (saveButton) saveButton.textContent = 'Create Template';
            
        } catch (error) {
            console.error('Error saving template from form:', error);
            alert('Failed to save template. Check console for details.');
        }
    }
    
    loadTemplateToInput(template) {
        if (!template || !window.app) return;
        
        const userInput = document.getElementById('user-input');
        if (!userInput) return;
        
        userInput.value = template.text;
        userInput.dispatchEvent(new Event('input', { bubbles: true }));

        if (window.app.clearUploadedImages) {
            window.app.clearUploadedImages();
        }

        if (template.images && template.images.length > 0) {
            template.images.forEach(imgData => {
                try {
                    const imageDataUrl = `data:${imgData.mimeType};base64,${imgData.data}`;
                    const byteString = atob(imgData.data);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
                    const blob = new Blob([ab], { type: imgData.mimeType });
                    const fileName = `template_${template.id}_${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: imgData.mimeType });

                    if (window.app.addImageToChat) {
                        window.app.addImageToChat(imageDataUrl, file);
                    }
                } catch (error) {
                    console.error("Error processing template image:", error, imgData);
                }
            });
        }
        userInput.focus();
    }

    // Calculate the storage size of a template in MB
    calculateTemplateSize(template) {
        if (!template || !template.images) return 0;
        
        let size = 0;
        // Estimate text size
        size += (template.name.length + template.text.length) * 2; // UTF-16 characters ~2 bytes each
        
        // Add image sizes (base64 data)
        template.images.forEach(img => {
            size += img.data.length * 0.75; // base64 is ~4/3 of the original size
        });
        
        // Convert to MB with 2 decimal places (as a number, not string)
        return parseFloat((size / (1024 * 1024)).toFixed(2));
    }
    
    // Calculate total storage used with proper formatting
    calculateStorageUsed() {
        this.totalStorageUsed = 0;
        this.templates.forEach(template => {
            this.totalStorageUsed += this.calculateTemplateSize(template);
        });
        // Return with 2 decimal places (as a string for display)
        return this.totalStorageUsed.toFixed(2);
    }

    // Clear all templates with confirmation
    async clearAllTemplates() {
        if (this.templates.length === 0) {
            alert('No templates to clear.');
            return;
        }
        
        const confirmClear = confirm(`Are you sure you want to delete ALL ${this.templates.length} templates? This cannot be undone.`);
        if (!confirmClear) return;
        
        const storageCleared = this.totalStorageUsed;
        
        try {
            // Delete all templates from the database
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                this.templates = [];
                this.calculateStorageUsed();
                this.updateStorageDisplay();
                this.renderTemplatesList();
                this.showStorageClearedPopup(storageCleared);
                console.log('All templates cleared successfully');
            };
            
            clearRequest.onerror = (event) => {
                console.error('Failed to clear templates:', event);
                alert('Failed to clear templates. Please try again.');
            };
        } catch (error) {
            console.error('Error clearing templates:', error);
            alert('An error occurred while clearing templates.');
        }
    }
    
    // Show storage cleared popup
    showStorageClearedPopup(clearedAmount) {
        const popup = this.templatesModal.querySelector('.storage-cleared-popup');
        const amountElement = popup.querySelector('.cleared-storage-amount');
        
        amountElement.textContent = `${clearedAmount} MB`;
        popup.classList.add('active');
        
        // Hide popup after delay
        setTimeout(() => {
            popup.classList.remove('active');
        }, 3000);
    }
    
    // Update storage display
    updateStorageDisplay() {
        const storageElement = this.templatesModal.querySelector('.storage-used');
        if (storageElement) {
            storageElement.textContent = `${this.calculateStorageUsed()} MB`;
        }
    }
}

// Initialize the Template Manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
         window.templateManager = new TemplateManager();
    }, 100); // Small delay just in case app initialization takes a moment
}); 
class ChatHistory {
    constructor(app) {
        this.app = app;
        this.conversations = [];
        this.currentConversationId = null;
        this.activeTab = 'all'; // all, favorites, or pinned
        this.totalStorageSize = 0; // Track total storage size
        
        // DOM elements
        this.historyPanel = null;
        this.historyContent = null;
        this.historyToggle = null;
        this.overlay = null;
        this.storageSizeDisplay = null; // Element to display storage size
        
        // IndexedDB instance
        this.db = null;
        
        // Kick off async initialization
        this.init().then(() => {
            this.debugLog('Chat history initialized', { conversationCount: this.conversations.length });
            this.calculateTotalStorageSize();
        }).catch(error => {
            console.error('Failed to initialize IndexedDB', error);
        });
    }
    
    async init() {
        await this.initDB();
        await this.loadFromStorage();
        this.createHistoryUI();
        this.addEventListeners();
    }
    
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("chatHistoryDB", 1);
            request.onerror = (event) => {
                console.error("IndexedDB error:", event);
                reject(event);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("conversations")) {
                    db.createObjectStore("conversations", { keyPath: "id" });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
        });
    }
    
    loadFromStorage() {
        return new Promise((resolve) => {
            if (!this.db) {
                this.debugLog("DB not initialized. Cannot load conversations.");
                resolve();
                return;
            }
            const transaction = this.db.transaction("conversations", "readonly");
            const store = transaction.objectStore("conversations");
            const request = store.getAll();
            request.onsuccess = () => {
                this.conversations = request.result || [];
                this.debugLog('Loaded conversations from IndexedDB', { count: this.conversations.length });
                resolve();
            };
            request.onerror = (event) => {
                console.error("Failed to load conversations from IndexedDB:", event);
                this.debugLog('Failed to load conversations', event);
                this.conversations = [];
                resolve();
            };
        });
    }
    
    saveToStorage() {
        if (!this.db) {
            this.debugLog("DB not initialized. Cannot save conversations.");
            return;
        }
        const transaction = this.db.transaction("conversations", "readwrite");
        const store = transaction.objectStore("conversations");
        // Clear the entire store and then add all conversations anew.
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            this.conversations.forEach(conv => {
                store.put(conv);
            });
            transaction.oncomplete = () => {
                this.debugLog('Saved conversations to IndexedDB', { count: this.conversations.length });
            };
        };
        clearRequest.onerror = (event) => {
            console.error("Failed to clear conversations in IndexedDB:", event);
            this.debugLog('Failed to clear conversations', event);
        };
    }
    
    createHistoryUI() {
        // Create overlay for mobile/tablet
        this.overlay = document.createElement('div');
        this.overlay.className = 'overlay';
        document.body.appendChild(this.overlay);
        
        // Create history panel
        this.historyPanel = document.createElement('div');
        this.historyPanel.className = 'history-panel';
        this.historyPanel.innerHTML = `
            <div class="history-header">
                <div class="header-title-container">
                    <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Chat History
                    </h2>
                    <div class="storage-size-display">0 Bytes used</div>
                </div>
                <button class="history-close">×</button>
            </div>
            <div class="history-tabs">
                <button class="history-tab active" data-tab="all">All Chats</button>
                <button class="history-tab" data-tab="favorites">Favorites</button>
                <button class="history-tab" data-tab="pinned">Pinned</button>
            </div>
            <div class="history-content"></div>
            <div class="history-actions">
                <button class="history-button" id="new-chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Chat
                </button>
                <button class="history-button" id="clear-history">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Clear All
                </button>
            </div>
        `;
        document.body.appendChild(this.historyPanel);
        
        // Store reference to content area and storage size display
        this.historyContent = this.historyPanel.querySelector('.history-content');
        this.storageSizeDisplay = this.historyPanel.querySelector('.storage-size-display');
        
        // Tab switching functionality
        const tabs = this.historyPanel.querySelectorAll('.history-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.renderConversationsList();
            });
        });
        
        // Render initial conversations list
        this.renderConversationsList();
    }
    
    addEventListeners() {
        // Toggle history panel via header button
        document.getElementById('history-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.toggleHistoryPanel();
        });
        
        // Add touch events for mobile swipe
        let startX, moveX;
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!startX) return;
            
            moveX = e.touches[0].clientX;
            const diffX = moveX - startX;
            
            // If swipe right from left edge of screen (increased from 30px to 50px)
            if (startX < 50 && diffX > 30 && !this.historyPanel.classList.contains('open')) {
                this.toggleHistoryPanel();
                startX = null; // Reset to prevent multiple triggers
            }
            
            // If swipe left when panel is open
            if (this.historyPanel.classList.contains('open') && diffX < -50) {
                this.closeHistoryPanel();
                startX = null; // Reset to prevent multiple triggers
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            startX = null;
            moveX = null;
        }, { passive: true });
        
        // Close history panel
        this.historyPanel.querySelector('.history-close').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            this.closeHistoryPanel();
        });
        
        // Close on overlay click
        this.overlay.addEventListener('click', () => {
            this.closeHistoryPanel();
        });
        
        // New chat button
        document.getElementById('new-chat').addEventListener('click', () => {
            this.startNewChat();
        });
        
        // Clear all history button
        document.getElementById('clear-history').addEventListener('click', () => {
            this.clearAllHistory();
        });
    }
    
    toggleHistoryPanel() {
        this.historyPanel.classList.toggle('open');
        this.overlay.classList.toggle('active');
        
        // Prevent body scrolling when panel is open
        if (this.historyPanel.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
            this.renderConversationsList();
            this.updateStorageSizeDisplay(); // Update storage size when panel opens
        } else {
            document.body.style.overflow = '';
        }
        
        this.debugLog('History panel toggled', { isOpen: this.historyPanel.classList.contains('open') });
    }
    
    closeHistoryPanel() {
        this.historyPanel.classList.remove('open');
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    renderConversationsList() {
        this.historyContent.innerHTML = '';
        
        if (this.conversations.length === 0) {
            this.historyContent.innerHTML = `
                <div class="empty-history">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No conversation history yet</p>
                    <p>Start a new chat to see it here</p>
                </div>
            `;
            return;
        }
        
        const chatList = document.createElement('div');
        chatList.className = 'chat-list';
        
        // Filter conversations based on active tab
        let filteredConversations = [...this.conversations];
        if (this.activeTab === 'favorites') {
            filteredConversations = filteredConversations.filter(c => c.favorite);
        } else if (this.activeTab === 'pinned') {
            filteredConversations = filteredConversations.filter(c => c.pinned);
        }
        
        // Sort by last updated (most recent first)
        filteredConversations.sort((a, b) => {
            // Pinned items first in ALL tab
            if (this.activeTab === 'all') {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
            }
            return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        });
        
        if (filteredConversations.length === 0) {
            this.historyContent.innerHTML = `
                <div class="empty-history">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No ${this.activeTab === 'favorites' ? 'favorited' : 'pinned'} conversations yet</p>
                </div>
            `;
            return;
        }
        
        filteredConversations.forEach(conversation => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item animate-in';
            if (conversation.id === this.currentConversationId) {
                chatItem.classList.add('active');
            }
            if (conversation.pinned) {
                chatItem.classList.add('pinned');
            }
            if (conversation.favorite) {
                chatItem.classList.add('favorite');
            }
            
            // Calculate conversation size
            const size = this.calculateConversationSize(conversation);
            const formattedSize = this.formatBytes(size);
            
            // Get message count
            const messageCount = conversation.messages ? conversation.messages.length : 0;
            
            // Format date
            const lastUpdated = new Date(conversation.lastUpdated);
            const now = new Date();
            const diffTime = Math.abs(now - lastUpdated);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            let dateStr = '';
            
            if (diffDays === 0) {
                // Today - show time
                dateStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                // Yesterday
                dateStr = 'Yesterday';
            } else if (diffDays < 7) {
                // Within a week - show day name
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                dateStr = days[lastUpdated.getDay()];
            } else {
                // More than a week - show date
                dateStr = lastUpdated.toLocaleDateString();
            }
            
            // Extract a preview of the conversation - get last user message
            let previewText = '';
            if (conversation.messages && conversation.messages.length > 0) {
                // Find the most recent user message
                for (let i = conversation.messages.length - 1; i >= 0; i--) {
                    const message = conversation.messages[i];
                    if (message.role === 'user' && message.parts && message.parts.some(p => p.text)) {
                        const textPart = message.parts.find(p => p.text);
                        if (textPart && textPart.text) {
                            previewText = textPart.text.substring(0, 60) + (textPart.text.length > 60 ? '...' : '');
                            break;
                        }
                    }
                }
                
                // If no user message found, try to use an AI message
                if (!previewText) {
                    for (let i = conversation.messages.length - 1; i >= 0; i--) {
                        const message = conversation.messages[i];
                        if (message.role === 'model' && message.parts && message.parts.some(p => p.text)) {
                            const textPart = message.parts.find(p => p.text);
                            if (textPart && textPart.text) {
                                previewText = textPart.text.substring(0, 60) + (textPart.text.length > 60 ? '...' : '');
                                break;
                            }
                        }
                    }
                }
            }
            
            // Build badges
            let badgesHTML = '';
            if (conversation.pinned || conversation.favorite) {
                badgesHTML = `<div class="chat-item-badges">`;
                if (conversation.pinned) {
                    badgesHTML += `<span class="badge pinned-badge">Pinned</span>`;
                }
                if (conversation.favorite) {
                    badgesHTML += `<span class="badge favorite-badge">Favorite</span>`;
                }
                badgesHTML += `</div>`;
            }
            
            chatItem.innerHTML = `
                <div class="chat-item-header">
                    <div class="chat-item-title">${this.escapeHTML(conversation.title)}</div>
                    <div class="chat-item-actions">
                        <button class="chat-action favorite ${conversation.favorite ? 'active' : ''}" data-id="${conversation.id}" title="Favorite">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${conversation.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </button>
                        <button class="chat-action pinned ${conversation.pinned ? 'active' : ''}" data-id="${conversation.id}" title="Pin">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22"></line>
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                            </svg>
                        </button>
                        <button class="chat-action rename" data-id="${conversation.id}" title="Rename">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>
                        <button class="chat-action delete" data-id="${conversation.id}" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                ${badgesHTML}
                <div class="chat-item-preview">${this.escapeHTML(previewText)}</div>
                <div class="chat-item-metadata">
                    <div class="chat-item-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${dateStr}
                    </div>
                    <div class="chat-message-count" title="${messageCount} messages, ${formattedSize}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${messageCount} • ${formattedSize}</span>
                    </div>
                </div>
            `;
            
            // Add load event listener
            chatItem.addEventListener('click', (e) => {
                const target = e.target;
                
                // Don't load if clicking on any of the action buttons
                if (target.closest('.chat-action')) {
                    return;
                }
                
                this.loadConversation(conversation.id);
            });
            
            chatList.appendChild(chatItem);
        });
        
        this.historyContent.appendChild(chatList);
        
        // Add event listeners for action buttons
        this.addActionListeners();
    }
    
    addActionListeners() {
        this.historyContent.querySelectorAll('.rename').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.dataset.id;
                this.renameConversation(id);
            });
        });
        
        this.historyContent.querySelectorAll('.delete').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.dataset.id;
                this.deleteConversation(id);
            });
        });
        
        this.historyContent.querySelectorAll('.favorite').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.dataset.id;
                this.toggleFavorite(id);
            });
        });
        
        this.historyContent.querySelectorAll('.pinned').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.dataset.id;
                this.togglePin(id);
            });
        });
    }
    
    startNewChat() {
        this.app.clearChat(true);
        this.currentConversationId = null;
        this.closeHistoryPanel();
        this.debugLog('Started new chat');
    }
    
    loadConversation(id) {
        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) {
            this.debugLog('Conversation not found', { id });
            return;
        }
        
        this.currentConversationId = id;
        const messagesCopy = JSON.parse(JSON.stringify(conversation.messages));
        
        // Debug the conversation content to check if deleted messages are still there
        this.debugLog('Loading conversation content', { 
            id, 
            messageCount: messagesCopy.length,
            userMessages: messagesCopy.filter(m => m.role === 'user').length,
            modelMessages: messagesCopy.filter(m => m.role === 'model').length,
            firstFewMessages: messagesCopy.slice(0, 3).map(m => ({
                role: m.role,
                textPreview: m.parts && m.parts[0] && m.parts[0].text ? 
                    m.parts[0].text.substring(0, 30) + '...' : '[no text]'
            }))
        });
        
        messagesCopy.forEach(message => {
            if (!message.parts || message.parts.length === 0) {
                message.parts = [{ text: " " }];
            }
        });
        
        this.app.chatHistory = messagesCopy;
        
        if (this.app.model) {
            try {
                this.app.chatSession = this.app.model.startChat({
                    history: this.app.chatHistory,
                    systemInstruction: this.app.config.systemInstruction,
                    generationConfig: {
                        temperature: this.app.config.temperature,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: this.app.config.maxOutputTokens,
                        responseModalities: ['Text', 'Image']
                    }
                });
                this.debugLog('Reinitialized chat session with history', { messageCount: conversation.messages.length });
            } catch (error) {
                this.debugLog('Error initializing chat session', { error: error.message });
                this.app.chatSession = this.app.model.startChat({
                    systemInstruction: this.app.config.systemInstruction,
                    generationConfig: {
                        temperature: this.app.config.temperature,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: this.app.config.maxOutputTokens,
                        responseModalities: ['Text', 'Image']
                    }
                });
            }
        }
        
        this.app.renderStoredMessages(conversation.messages);
        this.closeHistoryPanel();
        this.debugLog('Loaded conversation', { id, messageCount: conversation.messages.length });
    }
    
    renameConversation(id) {
        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) return;
        
        const chatItemSelector = `.chat-item .rename[data-id="${id}"]`;
        const chatActionButton = this.historyContent.querySelector(chatItemSelector);
        if (!chatActionButton) {
            this.debugLog('Rename button not found', { id });
            return;
        }
        
        const chatItem = chatActionButton.closest('.chat-item');
        const titleElement = chatItem.querySelector('.chat-item-title');
        const originalTitle = conversation.title;
        
        // Hide the original title
        titleElement.style.display = 'none';
        
        // Create an input for editing
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = originalTitle;
        input.setAttribute('maxlength', '50');
        titleElement.parentNode.insertBefore(input, titleElement);
        
        // Focus the input
        input.focus();
        input.select();
        
        // Disable click event on the chat item while editing
        chatItem.style.pointerEvents = 'none';
        
        // Enable click events on the input
        input.style.pointerEvents = 'auto';
        
        // Function to save the updated title
        const saveNewTitle = () => {
            const newTitle = input.value.trim();
            
            // Restore original state
            titleElement.style.display = '';
            chatItem.style.pointerEvents = '';
            input.remove();
            
            // If input is not empty, update the title
            if (newTitle && newTitle !== originalTitle) {
                titleElement.textContent = newTitle;
                conversation.title = newTitle;
                conversation.needsTitleGeneration = false;
                this.saveToStorage();
                this.debugLog('Renamed conversation', { id, oldTitle: originalTitle, newTitle });
            }
        };
        
        // Handle input events
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveNewTitle();
            } else if (e.key === 'Escape') {
                // Cancel editing
                titleElement.style.display = '';
                chatItem.style.pointerEvents = '';
                input.remove();
            }
            e.stopPropagation();
        });
        
        input.addEventListener('blur', saveNewTitle);
    }
    
    deleteConversation(id) {
        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) return;
        
        // Calculate size before deletion
        const conversationSize = this.calculateConversationSize(conversation);
        const formattedSize = this.formatBytes(conversationSize);
        
        const confirmMessage = `Are you sure you want to delete this conversation? (${formattedSize})`;
        if (!confirm(confirmMessage)) return;
        
        // Delete the conversation
        this.deleteConversationById(id);
        
        // Show a notification about freed space
        this.showStorageNotification(`Freed up ${formattedSize} of storage`);
    }
    
    deleteConversationById(id) {
        if (!id) return false;
        
        this.debugLog('Deleting conversation by ID', { id });
        const index = this.conversations.findIndex(c => c.id === id);
        
        if (index === -1) {
            this.debugLog('Conversation not found for deletion', { id });
            return false;
        }
        
        // Remove from array
        this.conversations.splice(index, 1);
        
        // Reset current conversation ID if it matches
        if (this.currentConversationId === id) {
            this.currentConversationId = null;
        }
        
        // Save to storage
        this.saveToStorage();
        
        // Recalculate total storage size
        this.calculateTotalStorageSize();
        
        // Update UI if history panel is open
        if (this.historyPanel && this.historyPanel.classList.contains('open')) {
            this.renderConversationsList();
            this.updateStorageSizeDisplay();
        }
        
        this.debugLog('Successfully deleted conversation by ID', { id, remainingConversations: this.conversations.length });
        return true;
    }
    
    clearAllHistory() {
        // Calculate total size before clearing
        const totalSize = this.totalStorageSize;
        const formattedSize = this.formatBytes(totalSize);
        
        if (!confirm(`Are you sure you want to delete all conversations? This will free up ${formattedSize} and cannot be undone.`)) return;
        
        this.conversations = [];
        this.currentConversationId = null;
        this.saveToStorage();
        this.renderConversationsList();
        this.app.clearChat(true);
        
        // Update storage size to zero
        this.totalStorageSize = 0;
        this.updateStorageSizeDisplay();
        
        // Show notification about freed space
        this.showStorageNotification(`Freed up ${formattedSize} of storage`);
        
        this.debugLog('Cleared all conversation history');
    }
    
    toggleFavorite(id) {
        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) return;
        conversation.favorite = !conversation.favorite;
        this.saveToStorage();
        this.renderConversationsList();
        this.debugLog('Toggled favorite status', { id, favorite: conversation.favorite });
    }
    
    togglePin(id) {
        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) return;
        conversation.pinned = !conversation.pinned;
        this.saveToStorage();
        this.renderConversationsList();
        this.debugLog('Toggled pin status', { id, pinned: conversation.pinned });
    }
    
    saveCurrentConversation(forceUpdate = false) {
        // Don't save empty chat history
        if (!this.app.chatHistory || this.app.chatHistory.length === 0) {
            // If chat history is empty and we have a current conversation, delete it
            if (this.currentConversationId) {
                const index = this.conversations.findIndex(c => c.id === this.currentConversationId);
                if (index !== -1) {
                    this.conversations.splice(index, 1);
                    this.debugLog('Deleted empty conversation', { id: this.currentConversationId });
                    this.currentConversationId = null;
                    this.saveToStorage();
                    
                    // Update storage size
                    this.calculateTotalStorageSize();
                    
                    // Force render the conversations list to reflect changes immediately
                    if (this.historyPanel && this.historyPanel.classList.contains('open')) {
                        this.renderConversationsList();
                    }
                }
            }
            this.debugLog('No messages to save, skipping save operation');
            return;
        }
        
        const now = new Date();
        if (this.currentConversationId) {
            const existingConversation = this.conversations.find(c => c.id === this.currentConversationId);
            if (existingConversation) {
                // If force update or content has changed
                if (forceUpdate || JSON.stringify(existingConversation.messages) !== JSON.stringify(this.app.chatHistory)) {
                    // CRITICAL: Replace the entire message array with a fresh copy
                    existingConversation.messages = JSON.parse(JSON.stringify(this.app.chatHistory));
                    existingConversation.lastUpdated = now.toISOString();
                    if (existingConversation.title === 'New Conversation' || existingConversation.needsTitleGeneration) {
                        this.generateTitleFromContent(existingConversation);
                    }
                    this.saveToStorage();
                    
                    // Update storage size
                    this.calculateTotalStorageSize();
                    
                    this.debugLog('Updated existing conversation', { 
                        id: this.currentConversationId,
                        forceUpdate: forceUpdate,
                        messageCount: this.app.chatHistory.length
                    });
                    return;
                }
                return;
            }
        }
        
        const firstUserMessage = this.app.chatHistory.find(m => m.role === 'user');
        let title = 'New Conversation';
        if (firstUserMessage) {
            const textPart = firstUserMessage.parts.find(p => p.text);
            if (textPart && textPart.text) {
                title = textPart.text.substring(0, 30) + (textPart.text.length > 30 ? '...' : '');
            } else {
                const hasImages = firstUserMessage.parts.some(p => p.inlineData);
                if (hasImages) title = 'Image Conversation';
            }
        }
        const newConversation = {
            id: this.generateId(),
            title: title,
            messages: JSON.parse(JSON.stringify(this.app.chatHistory)),
            created: now.toISOString(),
            lastUpdated: now.toISOString(),
            favorite: false,
            pinned: false,
            needsTitleGeneration: true
        };
        this.conversations.push(newConversation);
        this.currentConversationId = newConversation.id;
        this.saveToStorage();
        
        // Update storage size for new conversation
        this.calculateTotalStorageSize();
        
        this.debugLog('Created new conversation', { id: newConversation.id, title });
    }
    
    generateTitleFromContent(conversation) {
        const modelResponse = conversation.messages.find(m => 
            m.role === 'model' && m.parts && m.parts.some(p => p.text && p.text.trim().length > 0)
        );
        if (modelResponse) {
            const responsePart = modelResponse.parts.find(p => p.text && p.text.trim().length > 0);
            if (responsePart && responsePart.text) {
                const sentences = responsePart.text.split(/[.!?]/);
                if (sentences.length > 0) {
                    const firstSentence = sentences.find(s => s.trim().length > 0);
                    if (firstSentence && firstSentence.length < 60) {
                        const words = firstSentence.trim().split(/\s+/).filter(w => w.length > 0);
                        if (words.length > 0) {
                            const title = words.slice(0, Math.min(4, words.length)).join(' ');
                            conversation.title = title;
                            conversation.needsTitleGeneration = false;
                            this.debugLog('Generated title from content', { title });
                            return;
                        }
                    }
                }
            }
        }
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            const textPart = firstUserMessage.parts.find(p => p.text);
            if (textPart && textPart.text) {
                // Clean the text by removing system instructions and User: prefix
                let cleanText = textPart.text;
                if (cleanText.includes("This is a system prompt for guidance")) {
                    cleanText = cleanText.split("\n\n" + "This is a system prompt for guidance")[0];
                }
                if (cleanText.startsWith("User:")) {
                    cleanText = cleanText.substring(5);
                }
                
                const words = cleanText.trim().split(/\s+/).filter(w => w.length > 0);
                if (words.length > 0) {
                    const title = words.slice(0, Math.min(5, words.length)).join(' ');
                    conversation.title = title;
                    conversation.needsTitleGeneration = false;
                    this.debugLog('Generated title from user message', { title });
                }
            }
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    }
    
    debugLog(message, data = null) {
        if (this.app.config && this.app.config.debugMode) {
            console.log(`[ChatHistory] ${message}`, data);
            if (typeof this.app.debugLog === 'function') {
                this.app.debugLog(`[History] ${message}`, data);
            }
        }
    }
    
    // Calculate size of a single conversation in bytes
    calculateConversationSize(conversation) {
        // Convert the conversation object to JSON string and measure its length
        const jsonString = JSON.stringify(conversation);
        return new Blob([jsonString]).size;
    }
    
    // Calculate total storage size of all conversations
    calculateTotalStorageSize() {
        let totalSize = 0;
        
        for (const conversation of this.conversations) {
            totalSize += this.calculateConversationSize(conversation);
        }
        
        this.totalStorageSize = totalSize;
        this.updateStorageSizeDisplay();
        return totalSize;
    }
    
    // Update the storage size display in the UI
    updateStorageSizeDisplay() {
        if (this.storageSizeDisplay) {
            this.storageSizeDisplay.textContent = `${this.formatBytes(this.totalStorageSize)} used`;
        }
    }
    
    // Format bytes to human-readable format
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    // Show a notification about storage changes
    showStorageNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'storage-notification';
        notification.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"></path>
            </svg>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after animation completes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }
}
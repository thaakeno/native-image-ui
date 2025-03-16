document.addEventListener('DOMContentLoaded', () => {
    const examplePrompts = [
        {
            title: "Create a sketch of...",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>',
            prompt: "Create a sketch of a futuristic cityscape in the year 2150 with flying vehicles, vertical gardens integrated into skyscrapers, and renewable energy structures, all with a cyberpunk aesthetic. Include details of how humans interact with AI-powered city systems. The sketch should have dynamic perspective with strong contrast between light and shadows. Create the image with detailed line work."
        },
        {
            title: "Create an animation of...",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>',
            prompt: "Create an animation by generating multiple frames, depicting a seed sprouting roots, then growing into a stem with leaves, and finally blooming into a vibrant flower. The animation should be in a pixel art style, with each stage of growth transitioning smoothly for a natural and fluid effect. Ensure that the movement of the leaves and petals is dynamic, adding slight sways or subtle wind effects to enhance realism. The colors should gradually shift as the plant matures, reflecting natural growth patterns. Create the image for each frame."
        },
        {
            title: "Create pictogram sequence of...",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line><line x1="8" y1="8" x2="16" y2="8"></line></svg>',
            prompt: "Generate pictogram sequence of exactly 8 steps explaining how to shade a JoJo character in anime style. You must use extended logic to think about the intricacies of JoJo's distinct art style, focusing on dynamic lighting, exaggerated shadows, and intricate details like muscle shading, clothing textures, and facial expressions. Ensure each step builds up the intensity of shading and highlights, creating depth and drama. Create the image for each frame."
        }
    ];

    function createExamplesUI() {
        // Don't create duplicate examples
        if (document.querySelector('.examples-container')) return;
        
        const examplesContainer = document.createElement('div');
        examplesContainer.className = 'examples-container';

        const examplesHeader = document.createElement('div');
        examplesHeader.className = 'examples-header';
        examplesHeader.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Try these examples:
        `;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'examples-buttons';

        // Create buttons for each example prompt
        examplePrompts.forEach(example => {
            const button = document.createElement('button');
            button.className = 'example-button';
            button.innerHTML = `${example.icon} ${example.title}`;
            button.addEventListener('click', () => {
                const userInput = document.getElementById('user-input');
                userInput.value = example.prompt;
                userInput.style.height = 'auto';
                userInput.style.height = `${userInput.scrollHeight}px`;
                userInput.focus();
            });
            buttonsContainer.appendChild(button);
        });

        examplesContainer.appendChild(examplesHeader);
        examplesContainer.appendChild(buttonsContainer);

        // Insert examples UI in the middle of the messages container
        const messagesContainer = document.getElementById('messages-container');
        
        // Find a position roughly in the middle (after the first system message)
        const firstMessage = messagesContainer.querySelector('.system-message');
        if (firstMessage) {
            messagesContainer.insertBefore(examplesContainer, firstMessage.nextSibling);
        } else {
            messagesContainer.appendChild(examplesContainer);
        }
        
        // Mark examples as initialized
        window.examplesInitialized = true;
    }

    // Initialize examples UI when the page is loaded
    createExamplesUI();
    
    // Make function available globally
    window.createExamplesUI = createExamplesUI;
});

// Add event listener to new chat button to restore examples
document.addEventListener('DOMContentLoaded', () => {
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            // Wait a moment for the chat to clear before re-adding examples
            setTimeout(() => {
                if (!document.querySelector('.examples-container')) {
                    window.createExamplesUI();
                }
            }, 100);
        });
    }
    
    // Also listen for history manager's new chat button
    setTimeout(() => {
        const historyChatBtn = document.getElementById('new-chat');
        if (historyChatBtn) {
            historyChatBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (!document.querySelector('.examples-container')) {
                        window.createExamplesUI();
                    }
                }, 100);
            });
        }
    }, 1000); // Wait for history panel to initialize
});
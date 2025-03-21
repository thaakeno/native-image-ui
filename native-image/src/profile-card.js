// This file contains the JavaScript logic for the profile card component
// It handles the mobile profile modal functionality and animations

document.addEventListener('DOMContentLoaded', () => {
    // Initialize profile card functionality
    initProfileCard();
});

function initProfileCard() {
    const profileButton = document.querySelector('.profile-button');
    const profileModal = document.querySelector('.profile-modal');
    const closeButton = document.querySelector('.profile-modal-close');
    const websimLink = document.querySelector('.profile-modal-link.websim-link');
    const githubLink = document.querySelector('.profile-modal-link.github-link');
    const profileGithubLink = document.querySelector('.profile-link.github-link');
    const xLink = document.querySelector('.profile-modal-link.x-link');
    const profileName = document.querySelector('.profile-name');
    
    // Add click handler to profile name to redirect to websim.ai
    if (profileName) {
        profileName.addEventListener('click', () => {
            window.open('https://websim.ai/@thaakeno', '_blank');
        });
    }
    
    // Handle GitHub links to open releases panel instead of redirecting
    if (profileGithubLink) {
        profileGithubLink.addEventListener('click', (e) => {
            e.preventDefault();
            // The event handlers are now in github-releases.js
        });
    }
    
    if (profileButton && profileModal) {
        // Open modal when clicking profile button
        profileButton.addEventListener('click', () => {
            profileModal.classList.add('open');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
        
        // Close modal when clicking close button
        if (closeButton) {
            closeButton.addEventListener('click', closeProfileModal);
        }
        
        // Close modal when clicking outside content
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeProfileModal();
            }
        });
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileModal.classList.contains('open')) {
                closeProfileModal();
            }
        });
        
        // Add hover effect for WebSim link
        if (websimLink) {
            websimLink.addEventListener('mouseenter', () => {
                websimLink.style.transform = 'translateY(-5px) scale(1.1) translateZ(15px)';
            });
            
            websimLink.addEventListener('mouseleave', () => {
                websimLink.style.transform = '';
            });
        }
        
        // Add hover effects for GitHub and X links
        if (githubLink) {
            githubLink.addEventListener('mouseenter', () => {
                githubLink.style.transform = 'translateY(-5px) scale(1.1) translateZ(15px)';
            });
            
            githubLink.addEventListener('mouseleave', () => {
                githubLink.style.transform = '';
            });
            
            // Make modal GitHub link also open releases panel
            githubLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeProfileModal();
                // The event handlers are now in github-releases.js
            });
        }
        
        if (xLink) {
            xLink.addEventListener('mouseenter', () => {
                xLink.style.transform = 'translateY(-5px) scale(1.1) translateZ(15px)';
            });
            
            xLink.addEventListener('mouseleave', () => {
                xLink.style.transform = '';
            });
        }
    }
}

function closeProfileModal() {
    const profileModal = document.querySelector('.profile-modal');
    if (profileModal) {
        profileModal.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    }
}
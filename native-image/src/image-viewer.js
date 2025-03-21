class ImageViewer {
    constructor() {
        // Add CSS rule to hide images that are likely to be in carousels
        this.addHidingStyles();
        this.setupLightbox();
        this.enhanceExistingImages();
        
        // Listen for new images added to the DOM
        this.setupMutationObserver();
        
        // Setup tactile mode observer
        this.setupTactileObserver();
        
        // Add resize listener for responsive handling
        this.setupResizeListener();
    }
    
    // Add CSS rule to hide images that are likely to be in carousels
    addHidingStyles() {
        // Create a style element to preemptively hide multiple images in the same message
        const style = document.createElement('style');
        style.textContent = `
            /* Only hide images when carousels are enabled */
            .carousel-enabled .user-message:has(img + img) img:not(.in-carousel),
            .carousel-enabled .user-message:has(.image-container + .image-container) .image-container:not(.in-carousel),
            .carousel-enabled .user-message.processing-carousel img:not(.in-carousel),
            .carousel-enabled .user-message.processing-carousel .image-container:not(.in-carousel) {
                opacity: 0 !important;
                position: absolute !important;
                pointer-events: none !important;
                z-index: -1 !important;
            }
            
            .image-carousel {
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            }
            
            .image-carousel.loaded {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
        
        // Add a class to body to toggle carousel CSS
        this.updateCarouselEnabledState();
    }
    
    // Update carousel enabled class on document
    updateCarouselEnabledState() {
        if (this.isCarouselEnabled()) {
            document.body.classList.add('carousel-enabled');
        } else {
            document.body.classList.remove('carousel-enabled');
        }
    }
    
    // Check if carousels are enabled in the settings
    isCarouselEnabled() {
        return localStorage.getItem('carouselEnabled') !== 'false';
    }
    
    setupLightbox() {
        // Create lightbox element if it doesn't exist
        if (!document.querySelector('.image-lightbox')) {
            const lightbox = document.createElement('div');
            lightbox.className = 'image-lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <img src="" alt="Enlarged image">
                    <button class="lightbox-close" aria-label="Close lightbox">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button class="lightbox-download" aria-label="Download image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Image
                    </button>
                </div>
            `;
            document.body.appendChild(lightbox);
            
            // Add event listeners
            const closeButton = lightbox.querySelector('.lightbox-close');
            closeButton.addEventListener('click', () => this.closeLightbox());
            
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) {
                    this.closeLightbox();
                }
            });
            
            const downloadButton = lightbox.querySelector('.lightbox-download');
            downloadButton.addEventListener('click', () => this.downloadLightboxImage());
            
            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && lightbox.classList.contains('open')) {
                    this.closeLightbox();
                }
            });
        }
        
        // Create copy success message element
        if (!document.querySelector('.copy-success-message')) {
            const successMsg = document.createElement('div');
            successMsg.className = 'copy-success-message';
            document.body.appendChild(successMsg);
        }
    }
    
    enhanceExistingImages() {
        // Find all existing messages and enhance their images
        const userMessages = document.querySelectorAll('.user-message');
        userMessages.forEach(message => this.processUserMessage(message));
        
        // Also enhance standalone images that aren't in carousels
        const standaloneImages = document.querySelectorAll('.ai-generated-image:not(.in-carousel), .user-uploaded-image:not(.in-carousel)');
        standaloneImages.forEach(img => this.enhanceImage(img));
    }
    
    processUserMessage(messageElement) {
        if (!messageElement) return;
        
        // Add a temporary class to mark we're processing it
        messageElement.classList.add('processing-carousel');
        
        // Check if carousels are enabled before proceeding with carousel logic
        const carouselEnabled = this.isCarouselEnabled();
        
        // Update body class in case setting changed
        this.updateCarouselEnabledState();
        
        // Clean up any existing carousel if it needs to be rebuilt
        const existingCarousel = messageElement.querySelector('.image-carousel');
        if (existingCarousel) {
            // If carousels are disabled, remove it regardless of counts
            if (!carouselEnabled) {
                existingCarousel.remove();
                
                // Unhide any previously hidden images
                messageElement.querySelectorAll('.in-carousel').forEach(img => {
                    img.classList.remove('in-carousel');
                    const container = this.findImageContainer(img);
                    if (container) {
                        container.style.display = '';
                    } else {
                        img.style.display = '';
                    }
                });
            } else {
                // Only remove if the image count has changed
                const currentSlides = existingCarousel.querySelectorAll('.carousel-slide').length;
                const currentImages = messageElement.querySelectorAll('img, .ai-generated-image, .user-uploaded-image').length;
                
                // If counts don't match, remove the carousel so we can rebuild it
                if (currentSlides !== currentImages) {
                    existingCarousel.remove();
                    
                    // Unhide any previously hidden images
                    messageElement.querySelectorAll('.in-carousel').forEach(img => {
                        img.classList.remove('in-carousel');
                        const container = this.findImageContainer(img);
                        if (container) {
                            container.style.display = '';
                        } else {
                            img.style.display = '';
                        }
                    });
                } else {
                    // Carousel exists and has the right number of slides
                    messageElement.classList.remove('processing-carousel');
                    return;
                }
            }
        }
        
        // Find all images in this message - expand selector to catch more image types
        const images = messageElement.querySelectorAll('img, .ai-generated-image, .user-uploaded-image');
        
        // If there are multiple images, create a carousel (if enabled)
        if (images.length > 1) {
            if (carouselEnabled) {
                this.logDebug('Creating carousel for message with multiple images', { imageCount: images.length });
                // Immediately hide all these images to prevent the flash
                images.forEach(img => {
                    const container = this.findImageContainer(img);
                    if (container) {
                        container.style.display = 'none';
                    } else {
                        img.style.display = 'none';
                    }
                });
                
                // Process immediately rather than waiting
                this.createCarousel(messageElement, images);
            } else {
                // If carousels are disabled, just enhance each image individually
                this.logDebug('Carousels disabled, enhancing individual images', { imageCount: images.length });
                // Make sure all images are visible with no carousel
                images.forEach(img => {
                    const container = this.findImageContainer(img);
                    if (container) {
                        container.style.display = '';
                    } else {
                        img.style.display = '';
                    }
                    this.enhanceImage(img);
                });
            }
        } else if (images.length === 1) {
            // Just one image, enhance it normally
            const container = this.findImageContainer(images[0]);
            if (container) {
                container.style.display = '';
            } else {
                images[0].style.display = '';
            }
            this.enhanceImage(images[0]);
        }
        
        messageElement.classList.remove('processing-carousel');
    }
    
    createCarousel(messageElement, images) {
        // Skip if this message already has a carousel
        if (messageElement.querySelector('.image-carousel')) return;
        
        // Create the carousel container
        const carousel = document.createElement('div');
        carousel.className = 'image-carousel';
        
        // Check if tactile mode is enabled
        const isTactileMode = document.documentElement.getAttribute('data-tactile') === 'true';
        this.logDebug('Creating carousel', { tactileMode: isTactileMode });
        
        // Create carousel viewport
        const viewport = document.createElement('div');
        viewport.className = 'carousel-viewport';
        
        // Create slides for each image
        const slides = [];
        let validImages = 0;
        
        // Pre-process images - check which ones are valid
        const validImageNodes = [];
        images.forEach(img => {
            if (img.src && (img.complete || img.naturalWidth > 0)) {
                validImageNodes.push(img);
            } else if (img.src) {
                // If image is still loading, check dimensions on load
                img.onload = () => {
                    // Trigger a re-processing of this message once the image is loaded
                    if (img.naturalWidth > 20 && img.naturalHeight > 20) {
                        this.processUserMessage(messageElement);
                    }
                };
            }
        });
        
        validImageNodes.forEach((img, index) => {
            // Skip non-loaded images or decorative elements
            if (!img.src || img.width < 20 || img.height < 20) return;
            
            validImages++;
            
            // Mark the image as being in a carousel
            img.classList.add('in-carousel');
            
            // Create a slide
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.setAttribute('data-index', index);
            
            // Clone the image for the carousel
            const imgClone = img.cloneNode(true);
            slide.appendChild(imgClone);
            
            // Add the slide to the viewport
            viewport.appendChild(slide);
            slides.push(slide);
            
            // Add image actions to the slide
            this.addImageActions(slide, imgClone);
            
            // Hide the original image or its container
            const container = this.findImageContainer(img);
            if (container) {
                container.style.display = 'none';
            } else {
                img.style.display = 'none';
            }
        });
        
        // Only proceed if we have slides
        if (slides.length <= 1) {
            this.logDebug('Not enough valid images for carousel', { found: images.length, valid: slides.length });
            // Unhide any images we might have hidden
            validImageNodes.forEach(img => {
                img.classList.remove('in-carousel');
                const container = this.findImageContainer(img);
                if (container) {
                    container.style.display = '';
                } else {
                    img.style.display = '';
                }
            });
            return;
        }
        
        // Add next/prev buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-control carousel-prev';
        prevBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        `;
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-control carousel-next';
        nextBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;
        
        // Add image counter
        const counter = document.createElement('div');
        counter.className = 'carousel-counter';
        counter.innerHTML = `<span>1</span> / <span>${slides.length}</span>`;
        
        // Create thumbnail strip
        const thumbnails = document.createElement('div');
        thumbnails.className = 'carousel-thumbnails';
        
        slides.forEach((slide, index) => {
            const img = slide.querySelector('img');
            
            const thumb = document.createElement('div');
            thumb.className = 'carousel-thumbnail';
            if (index === 0) thumb.classList.add('active');
            
            const thumbImg = document.createElement('img');
            thumbImg.src = img.src;
            thumbImg.alt = `Thumbnail ${index + 1}`;
            
            thumb.appendChild(thumbImg);
            thumbnails.appendChild(thumb);
            
            // Add click event to thumbnail
            thumb.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToSlide(carousel, index);
            });
        });
        
        // Indicator dots
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-indicator';
            if (index === 0) dot.classList.add('active');
            dot.setAttribute('data-index', index);
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToSlide(carousel, index);
            });
            
            indicators.appendChild(dot);
        });
        
        // Add all elements to the carousel
        carousel.appendChild(viewport);
        carousel.appendChild(counter);
        carousel.appendChild(prevBtn);
        carousel.appendChild(nextBtn);
        carousel.appendChild(thumbnails);
        carousel.appendChild(indicators);
        
        // Set current slide index
        carousel.setAttribute('data-current', '0');
        carousel.setAttribute('data-direction', 'next');
        
        // Find a good place to insert the carousel - try to find the first image container
        // or insert at the beginning of the message content
        const firstImageContainer = this.findImageContainer(images[0]);
        const messageContent = messageElement.querySelector('.message-content') || messageElement;
        
        if (firstImageContainer) {
            firstImageContainer.parentNode.insertBefore(carousel, firstImageContainer);
        } else {
            // Insert at beginning of message content
            const firstChild = messageContent.firstChild;
            if (firstChild) {
                messageContent.insertBefore(carousel, firstChild);
            } else {
                messageContent.appendChild(carousel);
            }
        }
        
        // Add event listeners for the controls
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            this.prevSlide(carousel);
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.nextSlide(carousel);
        });
        
        // Add keyboard support
        carousel.tabIndex = 0;
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevSlide(carousel);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextSlide(carousel); 
            }
        });
        
        // Add swipe/drag support
        this.addSwipeSupport(carousel, viewport);
        
        // Initialize first slide
        this.updateCarouselState(carousel, 0);
        
        // Reveal the carousel with a smooth fade-in
        requestAnimationFrame(() => {
            carousel.classList.add('loaded');
        });
        
        this.logDebug('Carousel created', { imagesCount: slides.length });
    }
    
    // Helper method to find the best container for an image
    findImageContainer(img) {
        if (!img) return null;
        
        // Try to find direct .image-container parent
        let container = img.closest('.image-container');
        if (container) return container;
        
        // Try parent element if it only contains this image
        const parent = img.parentElement;
        if (parent && parent.childNodes.length === 1) return parent;
        
        // Try grandparent if parent is just a wrapper
        const grandparent = parent?.parentElement;
        if (parent && grandparent && parent.childNodes.length === 1 && 
            !parent.textContent.trim().replace(img.alt || '', '')) {
            return grandparent;
        }
        
        return null;
    }
    
    goToSlide(carousel, index) {
        const slides = carousel.querySelectorAll('.carousel-slide');
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        
        const currentIndex = parseInt(carousel.getAttribute('data-current'), 10);
        
        // Set direction for animation
        if (index > currentIndex) {
            carousel.setAttribute('data-direction', 'next');
        } else if (index < currentIndex) {
            carousel.setAttribute('data-direction', 'prev');
        }
        
        this.updateCarouselState(carousel, index);
    }
    
    prevSlide(carousel) {
        const current = parseInt(carousel.getAttribute('data-current'), 10);
        const slides = carousel.querySelectorAll('.carousel-slide');
        let newIndex = current - 1;
        if (newIndex < 0) newIndex = slides.length - 1;
        
        // Set direction for animation
        carousel.setAttribute('data-direction', 'prev');
        
        this.updateCarouselState(carousel, newIndex);
    }
    
    nextSlide(carousel) {
        const current = parseInt(carousel.getAttribute('data-current'), 10);
        const slides = carousel.querySelectorAll('.carousel-slide');
        let newIndex = current + 1;
        if (newIndex >= slides.length) newIndex = 0;
        
        // Set direction for animation
        carousel.setAttribute('data-direction', 'next');
        
        this.updateCarouselState(carousel, newIndex);
    }
    
    updateCarouselState(carousel, index) {
        // Update current attribute
        const currentIndex = parseInt(carousel.getAttribute('data-current'), 10);
        const direction = carousel.getAttribute('data-direction') || 'next';
        
        carousel.setAttribute('data-current', index);
        
        // Get elements
        const viewport = carousel.querySelector('.carousel-viewport');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const thumbnails = carousel.querySelectorAll('.carousel-thumbnail');
        const indicators = carousel.querySelectorAll('.carousel-indicator');
        const counter = carousel.querySelector('.carousel-counter');
        
        // Update counter
        if (counter) {
            counter.innerHTML = `<span>${index + 1}</span> / <span>${slides.length}</span>`;
        }
        
        // Check if we're in tactile mode
        const isTactileMode = document.documentElement.getAttribute('data-tactile') === 'true';
        const isMobile = window.innerWidth <= 768;
        
        // Clear any existing animation classes
        slides.forEach(slide => {
            slide.classList.remove('slide-in-next', 'slide-out-prev', 'slide-in-prev', 'slide-out-next');
        });
        
        // Apply new animation classes based on direction
        slides.forEach((slide, i) => {
            const slideIndex = parseInt(slide.getAttribute('data-index'), 10);
            
            // Special case for tactile on mobile - no slide animations, just fade
            if (isTactileMode && isMobile) {
                // Remove all transforms - we'll use absolute positioning and opacity instead
                slide.style.transform = '';
                slide.style.transition = 'opacity 0.3s ease-in-out';
                
                if (slideIndex === index) {
                    slide.style.zIndex = '2';
                    slide.style.opacity = '1';
                    slide.classList.add('active');
                } else {
                    slide.style.zIndex = '1';
                    slide.style.opacity = '0';
                    slide.classList.remove('active');
                }
            } else {
                // Desktop or non-tactile: Use standard slide animations
                if (direction === 'next') {
                    if (slideIndex === index) {
                        // New slide coming in from right
                        slide.classList.add('slide-in-next');
                    } else if (slideIndex === currentIndex) {
                        // Current slide going out to left
                        slide.classList.add('slide-out-prev');
                    }
                } else {
                    if (slideIndex === index) {
                        // New slide coming in from left
                        slide.classList.add('slide-in-prev');
                    } else if (slideIndex === currentIndex) {
                        // Current slide going out to right
                        slide.classList.add('slide-out-next');
                    }
                }
                
                // Update slide positions 
                const position = slideIndex - index;
                slide.style.transform = `translateX(${position * 100}%)`;
                
                // Update active state
                if (slideIndex === index) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            }
        });
        
        // Update thumbnails
        thumbnails.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
                
                // Prevent main content scrolling - only scroll within the thumbnail container
                const thumbnailsContainer = carousel.querySelector('.carousel-thumbnails');
                if (thumbnailsContainer && thumb) {
                    // Get the parent container
                    const container = thumbnailsContainer;
                    const thumbLeft = thumb.offsetLeft;
                    const containerWidth = container.clientWidth;
                    const scrollLeft = container.scrollLeft;
                    
                    // Calculate the position needed to center the thumbnail
                    const newScrollLeft = thumbLeft - (containerWidth / 2) + (thumb.offsetWidth / 2);
                    
                    // Smoothly scroll only within the container without affecting the page
                    // Use requestAnimationFrame to ensure this doesn't interfere with page scrolling
                    requestAnimationFrame(() => {
                        // Use direct scrollLeft assignment instead of scrollTo for better compatibility
                        // with ongoing page scroll operations
                        try {
                            // Method 1: Use scrollTo with a catch in case it conflicts with page scrolling
                            container.scrollTo({
                                left: newScrollLeft,
                                behavior: 'smooth'
                            });
                        } catch (e) {
                            // Method 2: Direct property setting as fallback
                            container.scrollLeft = newScrollLeft;
                        }
                    });
                }
            } else {
                thumb.classList.remove('active');
            }
        });
        
        // Update indicators
        indicators.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    addSwipeSupport(carousel, viewport) {
        let startX, endX;
        const minSwipeDistance = 50; // Minimum distance to trigger a swipe
        
        viewport.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        
        viewport.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            
            const distance = endX - startX;
            
            if (Math.abs(distance) >= minSwipeDistance) {
                if (distance > 0) {
                    // Swipe right, go to previous slide
                    this.prevSlide(carousel);
                } else {
                    // Swipe left, go to next slide
                    this.nextSlide(carousel);
                }
            }
        }, { passive: true });
        
        // Also support mouse drag
        let isDragging = false;
        
        viewport.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            viewport.style.cursor = 'grabbing';
        });
        
        viewport.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
        });
        
        viewport.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            endX = e.clientX;
            isDragging = false;
            viewport.style.cursor = '';
            
            const distance = endX - startX;
            
            if (Math.abs(distance) >= minSwipeDistance) {
                if (distance > 0) {
                    this.prevSlide(carousel);
                } else {
                    this.nextSlide(carousel);
                }
            }
        });
        
        viewport.addEventListener('mouseleave', () => {
            isDragging = false;
            viewport.style.cursor = '';
        });
    }
    
    addImageActions(slide, img) {
        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'image-actions';
        actionsDiv.innerHTML = `
            <button class="image-action-btn image-view-btn" title="View larger" aria-label="View larger image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14 21 3"></path>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
            </button>
            <button class="image-action-btn image-download-btn" title="Download" aria-label="Download image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            <button class="image-action-btn image-copy-btn" title="Copy to clipboard" aria-label="Copy image to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        `;
        
        // Add action buttons to slide
        slide.appendChild(actionsDiv);
        
        // Add event listeners
        const viewBtn = actionsDiv.querySelector('.image-view-btn');
        viewBtn.addEventListener('click', () => this.openLightbox(img.src));
        
        const downloadBtn = actionsDiv.querySelector('.image-download-btn');
        downloadBtn.addEventListener('click', () => this.downloadImage(img.src));
        
        const copyBtn = actionsDiv.querySelector('.image-copy-btn');
        copyBtn.addEventListener('click', () => this.copyImageToClipboard(img));
        
        // Add click on image to view larger
        img.addEventListener('click', () => this.openLightbox(img.src));
    }
    
    enhanceImage(img) {
        // Skip if already enhanced or if image container doesn't exist
        if (!img || !img.closest('.image-container')) {
            return;
        }
        
        // Skip if already enhanced
        if (img.closest('.image-container').querySelector('.image-actions')) {
            return;
        }
        
        // Make sure the container has the proper size for the image
        const container = img.closest('.image-container');
        
        // Remove any fixed height/width that might create the grey space
        container.style.height = 'auto';
        container.style.width = 'auto';
        
        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'image-actions';
        actionsDiv.innerHTML = `
            <button class="image-action-btn image-view-btn" title="View larger" aria-label="View larger image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14 21 3"></path>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
            </button>
            <button class="image-action-btn image-download-btn" title="Download" aria-label="Download image">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            <button class="image-action-btn image-copy-btn" title="Copy to clipboard" aria-label="Copy image to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        `;
        
        // Add action buttons to container
        img.closest('.image-container').appendChild(actionsDiv);
        
        // Add event listeners
        const viewBtn = actionsDiv.querySelector('.image-view-btn');
        viewBtn.addEventListener('click', () => this.openLightbox(img.src));
        
        const downloadBtn = actionsDiv.querySelector('.image-download-btn');
        downloadBtn.addEventListener('click', () => this.downloadImage(img.src));
        
        const copyBtn = actionsDiv.querySelector('.image-copy-btn');
        copyBtn.addEventListener('click', () => this.copyImageToClipboard(img));
        
        // Add click on image to view larger
        img.addEventListener('click', () => this.openLightbox(img.src));
    }
    
    openLightbox(imageSrc) {
        const lightbox = document.querySelector('.image-lightbox');
        const lightboxImg = lightbox.querySelector('img');
        lightboxImg.src = imageSrc;
        
        // Store the original src for downloading
        lightboxImg.dataset.originalSrc = imageSrc;
        
        // Show lightbox
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    closeLightbox() {
        const lightbox = document.querySelector('.image-lightbox');
        lightbox.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    downloadImage(imageSrc) {
        const link = document.createElement('a');
        link.href = imageSrc;
        
        // Generate a filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `ai-image-${timestamp}.png`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.logDebug('Image downloaded', { src: imageSrc });
    }
    
    downloadLightboxImage() {
        const lightboxImg = document.querySelector('.image-lightbox img');
        if (lightboxImg && lightboxImg.src) {
            this.downloadImage(lightboxImg.src);
        }
    }
    
    async copyImageToClipboard(imgElement) {
        try {
            // Create a canvas to get the image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Wait for image to load
            await new Promise((resolve) => {
                if (imgElement.complete) {
                    resolve();
                } else {
                    imgElement.onload = resolve;
                }
            });
            
            // Set canvas size to match image
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            
            // Draw image to canvas
            ctx.drawImage(imgElement, 0, 0);
            
            // Get the blob data
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            
            // Copy to clipboard
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            
            // Show success message
            this.showSuccessMessage('Image copied to clipboard');
            this.logDebug('Image copied to clipboard', { width: canvas.width, height: canvas.height });
        } catch (error) {
            console.error('Failed to copy image:', error);
            this.logDebug('Failed to copy image', { error: error.message });
            
            // Fallback for browsers that don't support clipboard API
            this.showSuccessMessage('Copy not supported in this browser. Try downloading instead.');
        }
    }
    
    showSuccessMessage(message) {
        const successMsg = document.querySelector('.copy-success-message');
        successMsg.textContent = message;
        successMsg.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 3000);
    }
    
    setupMutationObserver() {
        // Watch for new images and messages added to the DOM
        const observer = new MutationObserver((mutations) => {
            // Track modified user messages to prevent duplicates
            const processedMessages = new Set();
            const pendingImageMessages = new Map(); // Track messages with pending images
            
            mutations.forEach(mutation => {
                // Process added nodes
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        // Check if node is an element
                        if (node.nodeType === 1) {
                            // Check if it's a user message
                            if (node.classList && node.classList.contains('user-message') && !processedMessages.has(node)) {
                                processedMessages.add(node);
                                // Preemptively hide images if there are multiple
                                const images = node.querySelectorAll('img, .ai-generated-image, .user-uploaded-image');
                                if (images.length > 1) {
                                    node.classList.add('has-multiple-images');
                                }
                                // Process immediately rather than waiting
                                this.processUserMessage(node);
                            }
                            
                            // Look for user messages within the added node
                            const userMessages = node.querySelectorAll('.user-message');
                            userMessages.forEach(message => {
                                if (!processedMessages.has(message)) {
                                    processedMessages.add(message);
                                    // Process immediately
                                    this.processUserMessage(message);
                                }
                            });
                            
                            // Check for standalone images
                            const standaloneImages = node.querySelectorAll('img:not(.in-carousel), .ai-generated-image:not(.in-carousel), .user-uploaded-image:not(.in-carousel)');
                            standaloneImages.forEach(img => {
                                if (img.complete) {
                                    this.enhanceImage(img);
                                } else {
                                    img.addEventListener('load', () => this.enhanceImage(img));
                                }
                            });
                        }
                    });
                    
                    // Check if target is a user message or contains user messages
                    // This catches when images are added to existing messages
                    const targetEl = mutation.target;
                    if (targetEl && targetEl.nodeType === 1) {
                        // Direct check if the target is a user message
                        if (targetEl.classList && targetEl.classList.contains('user-message') && !processedMessages.has(targetEl)) {
                            processedMessages.add(targetEl);
                            // Process immediately 
                            this.processUserMessage(targetEl);
                        }
                        
                        // Check for any user messages inside the modified node
                        const containedMessages = targetEl.querySelectorAll('.user-message');
                        containedMessages.forEach(message => {
                            if (!processedMessages.has(message)) {
                                processedMessages.add(message);
                                // Process immediately
                                this.processUserMessage(message);
                            }
                        });
                    }
                }
                
                // Also check for attribute mutations on images which might indicate
                // new images being loaded or src attributes changing
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'src' && 
                    mutation.target.nodeName === 'IMG') {
                    
                    const img = mutation.target;
                    const userMessage = img.closest('.user-message');
                    
                    if (userMessage && !processedMessages.has(userMessage)) {
                        processedMessages.add(userMessage);
                        // Process immediately
                        this.processUserMessage(userMessage);
                    }
                }
            });
        });
        
        // Start observing with expanded options to catch more changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'class']
        });
        
        // Add a global handler for message edits to immediately catch changes
        document.addEventListener('messageEdited', (event) => {
            if (event.detail && event.detail.messageElement) {
                this.processUserMessage(event.detail.messageElement);
            }
        });
        
        // Set up listener for carousel toggle
        this.setupCarouselToggleListener();
        
        // Process existing messages immediately on page load
        // Don't use setTimeout here, do it now
        const existingMessages = document.querySelectorAll('.user-message');
        existingMessages.forEach(message => this.processUserMessage(message));
        this.logDebug('Processed existing messages on page load', { count: existingMessages.length });
    }
    
    logDebug(message, data = null) {
        // Check if there's a global debug function
        if (typeof window.debugLog === 'function') {
            window.debugLog(`[ImageViewer] ${message}`, data);
        } else if (window.app && typeof window.app.debugLog === 'function') {
            window.app.debugLog(`[ImageViewer] ${message}`, data);
        } else {
            console.log(`[ImageViewer] ${message}`, data);
        }
    }
    
    // Add a global handler for carousel toggle
    setupCarouselToggleListener() {
        window.addEventListener('carouselSettingChanged', () => {
            this.updateCarouselEnabledState();
            
            // Re-process all messages with the new setting
            const userMessages = document.querySelectorAll('.user-message');
            userMessages.forEach(message => this.processUserMessage(message));
            
            this.logDebug('Carousel setting changed, reprocessed all messages', 
                        { enabled: this.isCarouselEnabled() });
        });
    }
    
    setupTactileObserver() {
        // Add observer for tactile mode changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'data-tactile') {
                    this.refreshAllCarousels();
                }
            });
        });
        
        // Start observing document for tactile changes
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-tactile']
        });
        
        // Also check on init
        this.logDebug('Setting up tactile observer');
    }
    
    refreshAllCarousels() {
        // Find all carousels and refresh them
        const carousels = document.querySelectorAll('.image-carousel');
        if (carousels.length > 0) {
            this.logDebug('Refreshing carousels due to tactile mode change', { count: carousels.length });
            
            // Remove existing carousels and rebuild them
            carousels.forEach(carousel => {
                const messageElement = carousel.closest('.user-message');
                if (messageElement) {
                    // Remove carousel
                    carousel.remove();
                    
                    // Reset image classes
                    messageElement.querySelectorAll('.in-carousel').forEach(img => {
                        img.classList.remove('in-carousel');
                        const container = this.findImageContainer(img);
                        if (container) {
                            container.style.display = '';
                        } else {
                            img.style.display = '';
                        }
                    });
                    
                    // Reprocess message
                    this.processUserMessage(messageElement);
                }
            });
        }
    }
    
    setupResizeListener() {
        // Track previous width to avoid unnecessary processing
        let previousWidth = window.innerWidth;
        
        // Debounce function to avoid excessive processing
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            
            resizeTimeout = setTimeout(() => {
                const currentWidth = window.innerWidth;
                
                // Only reprocess if crossing the mobile breakpoint
                if ((previousWidth <= 768 && currentWidth > 768) || 
                    (previousWidth > 768 && currentWidth <= 768)) {
                    this.logDebug('Screen size changed across mobile breakpoint, refreshing carousels', 
                                { from: previousWidth, to: currentWidth });
                    
                    // Rebuild all carousels
                    this.refreshAllCarousels();
                }
                
                previousWidth = currentWidth;
            }, 250); // Small delay to avoid frequent processing
        });
    }
}

// Initialize the image viewer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.imageViewer = new ImageViewer();
});
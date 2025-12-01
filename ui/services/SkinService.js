/**
 * Skin Service
 * Handles loading and applying application skins dynamically
 */

class SkinService {
    constructor() {
        this.currentSkin = null;
        this.brandTitle = 'Ona Energy Management'; // Default
        this.skinLinkElement = null;
    }

    /**
     * Initialize skin from user data or localStorage
     */
    init(skinData) {
        if (skinData && skinData.skin_id) {
            this.loadSkin(skinData.skin_id, skinData.brand_title || skinData.skin_name);
        } else {
            // Try to get from localStorage (from previous session)
            const savedSkin = localStorage.getItem('current_skin');
            const savedBrandTitle = localStorage.getItem('brand_title');
            if (savedSkin && savedBrandTitle) {
                this.loadSkin(savedSkin, savedBrandTitle);
            } else {
                // Use default
                this.loadSkin('default', 'Ona Energy Management');
            }
        }
    }

    /**
     * Load skin CSS and apply branding
     */
    loadSkin(skinId, brandTitle) {
        if (!brandTitle) {
            brandTitle = 'Ona Energy Management';
        }

        this.brandTitle = brandTitle;
        this.currentSkin = skinId;

        // Save to localStorage
        localStorage.setItem('current_skin', skinId);
        localStorage.setItem('brand_title', brandTitle);

        // Load CSS file
        const cssFile = `includes/skins/${skinId}.css`;
        
        // Remove existing skin link if any
        if (this.skinLinkElement) {
            this.skinLinkElement.remove();
        }

        // Create and add new skin link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssFile;
        link.id = 'skin-stylesheet';
        link.onerror = () => {
            console.warn(`Skin CSS file not found: ${cssFile}, using default styling`);
        };
        
        document.head.appendChild(link);
        this.skinLinkElement = link;

        // Apply branding text
        this.applyBranding(brandTitle);
    }

    /**
     * Apply branding text throughout the page
     */
    applyBranding(brandTitle) {
        if (!brandTitle) {
            brandTitle = this.brandTitle || 'Ona Energy Management';
        }

        // Update page title
        const originalTitle = document.title;
        if (originalTitle.includes('Ona Energy Management')) {
            document.title = originalTitle.replace(/Ona Energy Management/g, brandTitle);
        }

        // Update all elements with branding text
        const selectors = [
            '.site-title',
            '.header-title',
            '.brand-title',
            '.welcome-title',
            '[data-brand-title]'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const originalText = element.getAttribute('data-original-text') || element.textContent;
                if (!element.getAttribute('data-original-text')) {
                    element.setAttribute('data-original-text', originalText);
                }
                
                // Replace "Ona Energy Management" with brand title
                if (originalText.includes('Ona Energy Management')) {
                    element.textContent = originalText.replace(/Ona Energy Management/g, brandTitle);
                }
            });
        });

        // Update specific text patterns
        const textNodes = this.getTextNodes(document.body);
        textNodes.forEach(node => {
            if (node.nodeValue && node.nodeValue.includes('Ona Energy Management')) {
                // Check if parent is not a script or style tag
                let parent = node.parentNode;
                while (parent && parent !== document.body) {
                    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                        return;
                    }
                    parent = parent.parentNode;
                }
                
                node.nodeValue = node.nodeValue.replace(/Ona Energy Management/g, brandTitle);
            }
        });
    }

    /**
     * Get all text nodes in the document
     */
    getTextNodes(node) {
        const textNodes = [];
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            textNodes.push(textNode);
        }

        return textNodes;
    }

    /**
     * Get current brand title
     */
    getBrandTitle() {
        return this.brandTitle || 'Ona Energy Management';
    }

    /**
     * Get current skin ID
     */
    getCurrentSkin() {
        return this.currentSkin || 'default';
    }
}

// Create global instance
window.skinService = new SkinService();

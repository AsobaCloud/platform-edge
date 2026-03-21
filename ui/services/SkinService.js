/**
 * Skin Service
 * Handles loading and applying application skins dynamically
 */

class SkinService {
    constructor() {
        this.currentSkin = null;
        this.currentSkinId = null;
        this.currentLogoKey = null;
        this.currentLogoUrl = null;
        this.currentLogoVersion = null;
        this.brandTitle = 'Ona Energy Management'; // Default
        this.skinLinkElement = document.getElementById('skin-stylesheet');
        this.defaultBrandTitle = 'Ona Energy Management';
        this.originalDocumentTitle = window.__ONA_ORIGINAL_DOCUMENT_TITLE || document.title;
        this.refreshRequestId = 0;
    }

    getBrandLogoElements() {
        return document.querySelectorAll('.branding img, .logo-section .logo, [data-brand-logo]');
    }

    /**
     * Add a cache-busting version when the skin record provides one.
     */
    buildVersionedLogoUrl(url, version) {
        if (!url) {
            return url;
        }

        if (!version) {
            return url;
        }

        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${encodeURIComponent(version)}`;
    }

    /**
     * Resolve a skin logo using authoritative URL when available, otherwise
     * fall back to the canonical logo key with extension probing.
     */
    resolveSkinLogoSrc(img, originalSrc) {
        if (this.currentLogoUrl) {
            img.onerror = () => {
                this.resolveSkinLogoFallback(this.currentLogoKey, img, originalSrc);
            };
            img.src = this.buildVersionedLogoUrl(this.currentLogoUrl, this.currentLogoVersion);
            return;
        }

        this.resolveSkinLogoFallback(this.currentLogoKey, img, originalSrc);
    }

    /**
     * Fall back across supported image extensions when there is no exact logo URL.
     */
    resolveSkinLogoFallback(logoKey, img, originalSrc) {
        const extensions = ['png', 'jpg', 'svg'];
        let index = 0;

        const tryNext = () => {
            if (index >= extensions.length) {
                img.src = originalSrc;
                img.onerror = null;
                return;
            }

            const ext = extensions[index++];
            const url = `includes/skins/${logoKey}-logo.${ext}`;
            img.src = this.buildVersionedLogoUrl(url, this.currentLogoVersion);
        };

        img.onerror = tryNext;
        tryNext();
    }

    /**
     * Normalize a skin payload into the fields SkinService actually uses.
     */
    normalizeSkinConfig(skinData) {
        const skinId = skinData.skin_id
            || skinData.skinId
            || skinData.logo_key
            || skinData.logoKey
            || skinData.skin_name
            || skinData.css_key
            || skinData.cssKey;
        const cssKey = skinData.skin_name || skinData.css_key || skinData.cssKey || skinId;
        const brandTitle = skinData.brand_title || skinData.brandTitle || skinData.skin_name || this.defaultBrandTitle;
        const logoKey = skinData.logo_key || skinData.logoKey || skinId || cssKey;
        const logoUrl = skinData.logo_url || skinData.logoUrl || null;
        const logoVersion = skinData.logo_updated_at || skinData.logoVersion || skinData.updated_at || null;

        return {
            skinId,
            cssKey,
            brandTitle,
            logoKey,
            logoUrl,
            logoVersion,
        };
    }

    /**
     * Persist the current skin state so other pages can render from the last
     * selected record before the server refresh completes.
     */
    persistSkinState(config) {
        localStorage.setItem('current_skin', config.cssKey);
        localStorage.setItem('brand_title', config.brandTitle);
        localStorage.setItem('current_logo_key', config.logoKey);
        localStorage.setItem('current_skin_id', config.skinId || config.cssKey);
        localStorage.setItem('current_skin_state', JSON.stringify(config));
    }

    /**
     * Read the last known skin state from localStorage.
     */
    getStoredSkinState() {
        try {
            const rawState = localStorage.getItem('current_skin_state');
            if (rawState) {
                return JSON.parse(rawState);
            }
        } catch (error) {
            console.warn('Failed to parse current_skin_state, falling back to legacy keys', error);
        }

        const cssKey = localStorage.getItem('current_skin');
        const brandTitle = localStorage.getItem('brand_title');
        const logoKey = localStorage.getItem('current_logo_key');
        const skinId = localStorage.getItem('current_skin_id') || cssKey;

        if (!cssKey || !brandTitle) {
            return null;
        }

        return {
            skinId,
            cssKey,
            brandTitle,
            logoKey: logoKey || skinId || cssKey,
            logoUrl: null,
            logoVersion: null,
        };
    }

    /**
     * Fetch the authoritative skin record from the backend so title/logo updates
     * made by another admin replace stale localStorage state on reload.
     */
    async refreshSkinConfig(skinId) {
        const token = localStorage.getItem('ona_auth_token');
        const apiEndpoint = window.AUTH_API_ENDPOINT;

        if (!skinId || !token || !apiEndpoint) {
            return;
        }

        const requestId = ++this.refreshRequestId;

        try {
            const response = await fetch(`${apiEndpoint}/api/skins/${skinId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const skin = data.skin;
            if (!skin) {
                return;
            }

            if (requestId !== this.refreshRequestId) {
                return;
            }

            if (this.currentSkinId !== skinId) {
                return;
            }

            this.loadSkin(this.normalizeSkinConfig(skin));
        } catch (error) {
            console.warn('Skin refresh failed, keeping cached skin state', error);
        }
    }

    /**
     * Initialize skin from user data or localStorage
     */
    init(skinData) {
        if (skinData && (skinData.skin_id || skinData.skin_name)) {
            const config = this.normalizeSkinConfig(skinData);
            this.loadSkin(config);
            if (config.skinId) {
                void this.refreshSkinConfig(config.skinId);
            }
            return;
        }

        const storedState = this.getStoredSkinState();
        if (storedState) {
            const config = this.normalizeSkinConfig(storedState);
            this.loadSkin(config);
            if (config.skinId) {
                void this.refreshSkinConfig(config.skinId);
            }
            return;
        }

        this.loadSkin({
            skinId: 'default',
            cssKey: 'default',
            brandTitle: this.defaultBrandTitle,
            logoKey: 'default',
            logoUrl: null,
            logoVersion: null,
        });
    }

    /**
     * Load skin CSS and apply branding
     */
    loadSkin(skinOrCssKey, brandTitle, logoKey = skinOrCssKey) {
        const config = typeof skinOrCssKey === 'object'
            ? this.normalizeSkinConfig(skinOrCssKey)
            : this.normalizeSkinConfig({
                skinId: logoKey || skinOrCssKey,
                skin_name: skinOrCssKey,
                brand_title: brandTitle,
                logo_key: logoKey,
            });

        this.brandTitle = config.brandTitle;
        this.currentSkin = config.cssKey;
        this.currentSkinId = config.skinId || config.cssKey;
        this.currentLogoKey = config.logoKey || config.skinId || config.cssKey;
        this.currentLogoUrl = config.logoUrl;
        this.currentLogoVersion = config.logoVersion;

        this.persistSkinState(config);

        // Load CSS file
        const cssFile = `includes/skins/${config.cssKey}.css`;
        
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

        // Swap logo for skin-specific version
        const brandingImgs = this.getBrandLogoElements();
        brandingImgs.forEach(img => {
            // Save original src for revert
            if (!img.getAttribute('data-original-src')) {
                img.setAttribute('data-original-src', img.getAttribute('src'));
            }
            if (!img.getAttribute('data-original-alt')) {
                img.setAttribute('data-original-alt', img.getAttribute('alt') || '');
            }
            const originalSrc = img.getAttribute('data-original-src');
            const originalAlt = img.getAttribute('data-original-alt');

            if (config.cssKey === 'default') {
                // Restore original logo
                img.src = originalSrc;
                img.alt = originalAlt;
                img.onerror = null;
            } else {
                img.alt = config.brandTitle;
                this.resolveSkinLogoSrc(img, originalSrc);
            }
        });

        // Apply branding text
        this.applyBranding(config.brandTitle);
    }

    /**
     * Apply branding text throughout the page
     */
    applyBranding(brandTitle) {
        if (!brandTitle) {
            brandTitle = this.brandTitle || 'Ona Energy Management';
        }

        // Always render title from original baseline to avoid one-way replacement drift
        document.title = this.originalDocumentTitle.replace(
            new RegExp(this.defaultBrandTitle, 'g'),
            brandTitle
        );

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
                if (!element.getAttribute('data-original-text')) {
                    element.setAttribute('data-original-text', element.textContent);
                }
                const originalText = element.getAttribute('data-original-text') || '';

                // Branding selectors always get the brand title set directly
                // (these are branding elements by definition)
                if (brandTitle === this.defaultBrandTitle) {
                    // Revert to original text
                    element.textContent = originalText;
                } else {
                    element.textContent = brandTitle;
                }
            });
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

    /**
     * Get current logo key
     */
    getCurrentLogoKey() {
        return this.currentLogoKey || this.getCurrentSkin();
    }
}

// Create global instance
window.skinService = new SkinService();

// Auto-initialize skin from localStorage on page load
// Pages that call init() with user data will override this
document.addEventListener('DOMContentLoaded', () => {
    if (window.skinService && !window.skinService.currentSkin) {
        window.skinService.init();
    }
});

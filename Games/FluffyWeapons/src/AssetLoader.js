export class AssetLoader {
    constructor() {
        this.images = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    // Call this to queue up an image asset
    loadImage(key, src) {
        this.totalAssets++;
        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.loadedAssets++;
        };
        this.images[key] = img;
    }

    // Resolves true once all queued files are finished loading
    isReady() {
        if (this.totalAssets === 0) return true;
        return this.loadedAssets === this.totalAssets;
    }
}
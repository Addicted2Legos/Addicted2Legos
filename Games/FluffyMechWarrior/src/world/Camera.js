export class Camera {
    constructor(width, height, mapWidth, mapHeight) {
        this.x = 0;
        this.y = 0;
        this.width = width;       // Canvas view width (e.g., 1024)
        this.height = height;     // Canvas view height (e.g., 576)
        this.mapWidth = mapWidth; // Maximum horizontal world size
        this.mapHeight = mapHeight; // Maximum vertical world size
        
        this.lerpFactor = 0.1;    // Speed of camera smoothing (1 = rigid attachment, 0.1 = smooth lag)
    }

    follow(targetX, targetY, targetWidth, targetHeight, dt) {
        // Calculate the ideal centered anchor coordinate for the camera
        const targetCamX = (targetX + targetWidth / 2) - this.width / 2;
        const targetCamY = (targetY + targetHeight / 2) - this.height / 2;

        // Smoothly interpolate (Lerp) towards the target position
        // Bypassing dt variation checking ensures consistent smoothing across variable refresh rates
        this.x += (targetCamX - this.x) * this.lerpFactor;
        this.y += (targetCamY - this.y) * this.lerpFactor;

        // Clamp values to prevent the camera from showing the empty void outside the map boundaries
        this.x = Math.max(0, Math.min(this.x, this.mapWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.mapHeight - this.height));
    }
}
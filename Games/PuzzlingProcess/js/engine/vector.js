/**
 * Pop & Protect - 2D Vector & Geometry Utility Library
 */

class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    clone() {
        return new Vec2(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    static add(a, b) {
        return new Vec2(a.x + b.x, a.y + b.y);
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    static sub(a, b) {
        return new Vec2(a.x - b.x, a.y - b.y);
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }

    static scale(v, s) {
        return new Vec2(v.x * s, v.y * s);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    static cross(a, b) {
        return a.x * b.y - a.y * b.x;
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    normalize() {
        const len = this.length();
        if (len > 1e-8) {
            this.x /= len;
            this.y /= len;
        } else {
            this.x = 0;
            this.y = 0;
        }
        return this;
    }

    normalized() {
        return this.clone().normalize();
    }

    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    dist(v) {
        return Math.sqrt(this.distSq(v));
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = this.x * cos - this.y * sin;
        const ny = this.x * sin + this.y * cos;
        this.x = nx;
        this.y = ny;
        return this;
    }

    static rotate(v, angle) {
        return v.clone().rotate(angle);
    }

    perp() {
        return new Vec2(-this.y, this.x);
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    lerp(v, t) {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    }
}

const Geom = {
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    degToRad(deg) {
        return deg * (Math.PI / 180);
    },

    radToDeg(rad) {
        return rad * (180 / Math.PI);
    },

    closestPointOnSegment(p, a, b) {
        const ab = Vec2.sub(b, a);
        const t = Geom.clamp(Vec2.dot(Vec2.sub(p, a), ab) / (ab.lengthSq() || 1), 0, 1);
        return Vec2.add(a, Vec2.scale(ab, t));
    },

    distanceToSegmentSq(p, a, b) {
        const closest = Geom.closestPointOnSegment(p, a, b);
        return p.distSq(closest);
    },

    projectVertices(vertices, axis) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < vertices.length; i++) {
            const val = Vec2.dot(vertices[i], axis);
            if (val < min) min = val;
            if (val > max) max = val;
        }
        return { min, max };
    },

    isPointInPolygon(p, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            const intersect = ((yi > p.y) !== (yj > p.y)) &&
                (p.x < (xj - xi) * (p.y - yi) / (yj - yi + 1e-12) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
};

window.Vec2 = Vec2;
window.Geom = Geom;

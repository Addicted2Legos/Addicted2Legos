/**
 * Pop & Protect - 2D Rigid & Soft Physics Engine with Corner Puncture Detection
 */

class Body {
    constructor(options = {}) {
        this.id = options.id || ('body_' + Math.random().toString(36).substr(2, 9));
        this.type = options.type || 'circle'; // 'circle', 'polygon'
        this.pos = options.pos ? options.pos.clone() : new Vec2();
        this.prevPos = this.pos.clone();
        this.vel = options.vel ? options.vel.clone() : new Vec2();
        this.force = new Vec2();

        this.angle = options.angle || 0;
        this.angularVel = options.angularVel || 0;
        this.torque = 0;

        this.isStatic = options.isStatic || false;
        this.mass = this.isStatic ? Infinity : (options.mass || 1);
        this.invMass = this.isStatic ? 0 : 1 / this.mass;

        this.restitution = options.restitution !== undefined ? options.restitution : 0.4;
        this.friction = options.friction !== undefined ? options.friction : 0.3;

        // Circle specific
        this.radius = options.radius || 20;

        // Polygon specific (local vertices centered around 0,0)
        this.localVertices = options.vertices ? options.vertices.map(v => v.clone()) : [];
        this.worldVertices = [];

        // Inertia calculation
        if (this.isStatic) {
            this.inertia = Infinity;
            this.invInertia = 0;
        } else if (this.type === 'circle') {
            this.inertia = 0.5 * this.mass * this.radius * this.radius;
            this.invInertia = 1 / this.inertia;
        } else {
            // Rough polygon moment of inertia
            let rSqSum = 0;
            for (let v of this.localVertices) rSqSum += v.lengthSq();
            this.inertia = (this.mass * rSqSum) / (this.localVertices.length || 1);
            this.invInertia = 1 / (this.inertia || 1);
        }

        // Gameplay specific properties
        this.isVulnerable = options.isVulnerable || false; // Protagonist Circle
        this.isSharpHazard = options.isSharpHazard || false; // Triangle, Square, Star
        this.isCushion = options.isCushion || false; // Rubber/Felt safe barrier
        this.isGoal = options.isGoal || false; // Exit portal
        this.isStar = options.isStar || false; // Collectible star
        this.isSensor = options.isSensor || false;
        this.isPlayerPlaced = options.isPlayerPlaced || false;
        this.label = options.label || 'body';
        this.sharpCornerAngles = []; // degrees at each vertex
        this.color = options.color || '#4A90E2';
        this.texture = options.texture || 'flat'; // 'candy', 'wood', 'metal', 'felt', 'stone', 'star'

        // Squeeze deformation animation state for squishy rendering
        this.squishX = 1;
        this.squishY = 1;
        this.squishAngle = 0;

        this.updateWorldVertices();
        this.calculateCornerSharpness();
    }

    updateWorldVertices() {
        if (this.type === 'polygon' && this.localVertices.length > 0) {
            this.worldVertices = this.localVertices.map(v => {
                const rotated = Vec2.rotate(v, this.angle);
                return Vec2.add(this.pos, rotated);
            });
        }
    }

    calculateCornerSharpness() {
        if (this.type !== 'polygon' || this.localVertices.length < 3) return;
        this.sharpCornerAngles = [];
        const n = this.localVertices.length;
        for (let i = 0; i < n; i++) {
            const prev = this.localVertices[(i - 1 + n) % n];
            const curr = this.localVertices[i];
            const next = this.localVertices[(i + 1) % n];
            
            const v1 = Vec2.sub(prev, curr).normalize();
            const v2 = Vec2.sub(next, curr).normalize();
            const dot = Geom.clamp(Vec2.dot(v1, v2), -1, 1);
            const interiorAngle = Math.acos(dot) * (180 / Math.PI);
            this.sharpCornerAngles.push(interiorAngle);
        }
    }

    applyForce(f) {
        if (this.isStatic) return;
        this.force.add(f);
    }

    applyImpulse(impulse, contactPoint = null) {
        if (this.isStatic) return;
        this.vel.add(Vec2.scale(impulse, this.invMass));
        if (contactPoint) {
            const r = Vec2.sub(contactPoint, this.pos);
            this.angularVel += Vec2.cross(r, impulse) * this.invInertia;
        }
    }

    integrate(dt, gravity, damping = 0.998, angularDamping = 0.98) {
        if (this.isStatic) return;

        // Apply gravity and accumulated forces
        this.vel.add(Vec2.scale(gravity, dt));
        this.vel.add(Vec2.scale(this.force, this.invMass * dt));
        this.vel.scale(damping);

        // Position update
        this.pos.add(Vec2.scale(this.vel, dt));

        // Angular update
        this.angularVel += this.torque * this.invInertia * dt;
        this.angularVel *= angularDamping;
        this.angle += this.angularVel * dt;

        // Reset forces
        this.force.set(0, 0);
        this.torque = 0;

        // Update polygon world geometry
        this.updateWorldVertices();

        // Ease squish back to 1
        this.squishX += (1 - this.squishX) * 0.15;
        this.squishY += (1 - this.squishY) * 0.15;
    }
}

class DistanceJoint {
    constructor(bodyA, bodyB, length, options = {}) {
        this.bodyA = bodyA;
        this.bodyB = bodyB;
        this.anchorA = options.anchorA ? options.anchorA.clone() : new Vec2(); // local to bodyA
        this.anchorB = options.anchorB ? options.anchorB.clone() : new Vec2(); // local or world if bodyB is null
        this.fixedWorldPoint = options.fixedWorldPoint ? options.fixedWorldPoint.clone() : null;
        this.length = length !== undefined ? length : this.getCurrentDistance();
        this.stiffness = options.stiffness !== undefined ? options.stiffness : 1.0;
        this.isRope = options.isRope || false; // if true, only resists stretching, not compression
        this.isCuttable = options.isCuttable || false;
        this.isCut = false;
        this.color = options.color || '#8B5A2B';
    }

    getWorldPointA() {
        if (!this.bodyA) return this.fixedWorldPoint ? this.fixedWorldPoint.clone() : new Vec2();
        return Vec2.add(this.bodyA.pos, Vec2.rotate(this.anchorA, this.bodyA.angle));
    }

    getWorldPointB() {
        if (!this.bodyB) return this.fixedWorldPoint ? this.fixedWorldPoint.clone() : new Vec2();
        return Vec2.add(this.bodyB.pos, Vec2.rotate(this.anchorB, this.bodyB.angle));
    }

    getCurrentDistance() {
        const pa = this.getWorldPointA();
        const pb = this.getWorldPointB();
        return pa.dist(pb);
    }

    solve() {
        if (this.isCut) return;

        const pa = this.getWorldPointA();
        const pb = this.getWorldPointB();
        const delta = Vec2.sub(pb, pa);
        const dist = delta.length();
        if (dist < 1e-6) return;

        if (this.isRope && dist <= this.length) {
            return; // Rope is slack
        }

        const diff = (dist - this.length) / dist;
        const correction = Vec2.scale(delta, diff * 0.5 * this.stiffness);

        const totalInvMass = (this.bodyA ? this.bodyA.invMass : 0) + (this.bodyB ? this.bodyB.invMass : 0);
        if (totalInvMass === 0) return;

        if (this.bodyA && !this.bodyA.isStatic) {
            const ratioA = this.bodyA.invMass / totalInvMass;
            this.bodyA.pos.add(Vec2.scale(correction, ratioA));
            this.bodyA.updateWorldVertices();
        }
        if (this.bodyB && !this.bodyB.isStatic) {
            const ratioB = this.bodyB.invMass / totalInvMass;
            this.bodyB.pos.sub(Vec2.scale(correction, ratioB));
            this.bodyB.updateWorldVertices();
        }
    }
}

class PhysicsWorld {
    constructor() {
        this.bodies = [];
        this.joints = [];
        this.gravity = new Vec2(0, 980); // standard snappy 2D gravity (pixels/sec^2)
        this.substeps = 8;
        this.onPuncture = null; // callback(vulnerableBody, hazardBody, puncturePoint)
        this.onSensorTrigger = null; // callback(sensorBody, visitorBody)
        this.onCollision = null; // callback(bodyA, bodyB, contactPoint, normal, impulse)
    }

    addBody(body) {
        this.bodies.push(body);
        return body;
    }

    removeBody(body) {
        const idx = this.bodies.indexOf(body);
        if (idx !== -1) this.bodies.splice(idx, 1);
        // Also remove associated joints
        this.joints = this.joints.filter(j => j.bodyA !== body && j.bodyB !== body);
    }

    addJoint(joint) {
        this.joints.push(joint);
        return joint;
    }

    removeJoint(joint) {
        const idx = this.joints.indexOf(joint);
        if (idx !== -1) this.joints.splice(idx, 1);
    }

    clear() {
        this.bodies = [];
        this.joints = [];
    }

    step(dt) {
        const subDt = dt / this.substeps;
        for (let s = 0; s < this.substeps; s++) {
            // 1. Integrate motion
            for (let b of this.bodies) {
                b.integrate(subDt, this.gravity);
            }

            // 2. Solve joints
            for (let j of this.joints) {
                j.solve();
            }

            // 3. Detect and resolve collisions
            this.solveCollisions(subDt);
        }
    }

    solveCollisions(subDt) {
        const n = this.bodies.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const bA = this.bodies[i];
                const bB = this.bodies[j];

                if (bA.isStatic && bB.isStatic) continue;

                // Sensor interactions (goals, stars)
                if (bA.isSensor || bB.isSensor) {
                    if (this.checkOverlap(bA, bB)) {
                        if (this.onSensorTrigger) {
                            const sensor = bA.isSensor ? bA : bB;
                            const visitor = bA.isSensor ? bB : bA;
                            this.onSensorTrigger(sensor, visitor);
                        }
                    }
                    continue;
                }

                // Regular collision resolution
                this.resolveCollisionPair(bA, bB, subDt);
            }
        }
    }

    checkOverlap(bA, bB) {
        if (bA.type === 'circle' && bB.type === 'circle') {
            return bA.pos.distSq(bB.pos) <= Math.pow(bA.radius + bB.radius, 2);
        }
        if (bA.type === 'circle' && bB.type === 'polygon') {
            return this.testCirclePolygonOverlap(bA, bB);
        }
        if (bA.type === 'polygon' && bB.type === 'circle') {
            return this.testCirclePolygonOverlap(bB, bA);
        }
        return false;
    }

    testCirclePolygonOverlap(circle, poly) {
        // Quick AABB check
        const r = circle.radius;
        const cp = circle.pos;
        for (let i = 0; i < poly.worldVertices.length; i++) {
            const v1 = poly.worldVertices[i];
            const v2 = poly.worldVertices[(i + 1) % poly.worldVertices.length];
            const distSq = Geom.distanceToSegmentSq(cp, v1, v2);
            if (distSq <= r * r) return true;
        }
        return Geom.isPointInPolygon(cp, poly.worldVertices);
    }

    resolveCollisionPair(bA, bB, subDt) {
        if (bA.type === 'circle' && bB.type === 'circle') {
            this.resolveCircleCircle(bA, bB);
        } else if (bA.type === 'circle' && bB.type === 'polygon') {
            this.resolveCirclePolygon(bA, bB);
        } else if (bA.type === 'polygon' && bB.type === 'circle') {
            this.resolveCirclePolygon(bB, bA);
        } else if (bA.type === 'polygon' && bB.type === 'polygon') {
            this.resolvePolygonPolygon(bA, bB);
        }
    }

    resolveCircleCircle(c1, c2) {
        const delta = Vec2.sub(c2.pos, c1.pos);
        const distSq = delta.lengthSq();
        const radSum = c1.radius + c2.radius;

        if (distSq >= radSum * radSum || distSq < 1e-8) return;

        const dist = Math.sqrt(distSq);
        const normal = Vec2.scale(delta, 1 / dist);
        const penetration = radSum - dist;

        // Position correction
        const totalInvMass = c1.invMass + c2.invMass;
        if (totalInvMass === 0) return;

        const correction = Vec2.scale(normal, penetration / totalInvMass);
        if (!c1.isStatic) c1.pos.sub(Vec2.scale(correction, c1.invMass));
        if (!c2.isStatic) c2.pos.add(Vec2.scale(correction, c2.invMass));

        // Velocity impulse
        const relVel = Vec2.sub(c2.vel, c1.vel);
        const velAlongNormal = Vec2.dot(relVel, normal);
        if (velAlongNormal > 0) return;

        const restitution = Math.min(c1.restitution, c2.restitution);
        const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;
        const impulse = Vec2.scale(normal, impulseMag);

        c1.vel.sub(Vec2.scale(impulse, c1.invMass));
        c2.vel.add(Vec2.scale(impulse, c2.invMass));

        // Squish deformation
        c1.squishX = 0.85; c1.squishY = 1.18; c1.squishAngle = normal.angle();
        c2.squishX = 0.85; c2.squishY = 1.18; c2.squishAngle = normal.angle();

        if (this.onCollision) {
            const contactPoint = Vec2.add(c1.pos, Vec2.scale(normal, c1.radius));
            this.onCollision(c1, c2, contactPoint, normal, impulseMag);
        }
    }

    resolveCirclePolygon(circle, poly) {
        const cp = circle.pos;
        const r = circle.radius;
        const verts = poly.worldVertices;
        const n = verts.length;
        if (n < 3) return;

        let minDistanceSq = Infinity;
        let closestContact = null;
        let collisionNormal = null;
        let isVertexContact = false;
        let vertexIndex = -1;

        // 1. Check all polygon edges and vertices
        for (let i = 0; i < n; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % n];

            const edge = Vec2.sub(v2, v1);
            const edgeLenSq = edge.lengthSq();
            let t = Vec2.dot(Vec2.sub(cp, v1), edge) / (edgeLenSq || 1);
            t = Geom.clamp(t, 0, 1);

            const pt = Vec2.add(v1, Vec2.scale(edge, t));
            const distSq = cp.distSq(pt);

            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                closestContact = pt;
                if (t <= 0.05) {
                    isVertexContact = true;
                    vertexIndex = i;
                } else if (t >= 0.95) {
                    isVertexContact = true;
                    vertexIndex = (i + 1) % n;
                } else {
                    isVertexContact = false;
                }
            }
        }

        const isInside = Geom.isPointInPolygon(cp, verts);

        if (!isInside && minDistanceSq > r * r) {
            return; // No collision
        }

        let penetration = 0;
        let normal = new Vec2();

        if (isInside) {
            // Find closest edge to push circle out
            let closestEdgeDist = Infinity;
            for (let i = 0; i < n; i++) {
                const v1 = verts[i];
                const v2 = verts[(i + 1) % n];
                const edge = Vec2.sub(v2, v1);
                const edgeNormal = edge.perp().normalize();
                const d = Math.abs(Vec2.dot(Vec2.sub(cp, v1), edgeNormal));
                if (d < closestEdgeDist) {
                    closestEdgeDist = d;
                    normal = Vec2.scale(edgeNormal, -1);
                }
            }
            penetration = closestEdgeDist + r;
        } else {
            const dist = Math.sqrt(minDistanceSq);
            if (dist < 1e-6) {
                normal = new Vec2(0, -1);
                penetration = r;
            } else {
                normal = Vec2.sub(cp, closestContact).normalize();
                penetration = r - dist;
            }
        }

        // --- PUNCTURE DETECTION ---
        // If the circle is vulnerable, and the polygon is a sharp hazard,
        // and contact was made with a sharp vertex or high-angle wedge corner:
        if (circle.isVulnerable && poly.isSharpHazard) {
            let angleAtVertex = 90;
            if (vertexIndex >= 0 && poly.sharpCornerAngles && poly.sharpCornerAngles[vertexIndex] !== undefined) {
                angleAtVertex = poly.sharpCornerAngles[vertexIndex];
            }

            // A corner with angle < 110 degrees is pointy enough to puncture!
            // Even a flat face hitting at high impact with corner protrusion will pop
            if (isVertexContact || isInside || penetration > r * 0.4) {
                if (this.onPuncture) {
                    this.onPuncture(circle, poly, closestContact || circle.pos);
                    return; // Circle popped!
                }
            }
        }

        // Positional resolution
        const totalInvMass = circle.invMass + poly.invMass;
        if (totalInvMass === 0) return;

        const correction = Vec2.scale(normal, penetration / totalInvMass);
        if (!circle.isStatic) circle.pos.add(Vec2.scale(correction, circle.invMass));
        if (!poly.isStatic) poly.pos.sub(Vec2.scale(correction, poly.invMass));

        circle.updateWorldVertices();
        poly.updateWorldVertices();

        // Velocity resolution with friction
        const rCircle = Vec2.sub(closestContact || circle.pos, circle.pos);
        const rPoly = Vec2.sub(closestContact || circle.pos, poly.pos);

        const circleVelAtPoint = Vec2.add(circle.vel, new Vec2(-circle.angularVel * rCircle.y, circle.angularVel * rCircle.x));
        const polyVelAtPoint = Vec2.add(poly.vel, new Vec2(-poly.angularVel * rPoly.y, poly.angularVel * rPoly.x));
        const relVel = Vec2.sub(circleVelAtPoint, polyVelAtPoint);

        const velAlongNormal = Vec2.dot(relVel, normal);
        if (velAlongNormal < 0) {
            const restitution = poly.isCushion ? 0.75 : Math.min(circle.restitution, poly.restitution);
            const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;
            const impulse = Vec2.scale(normal, impulseMag);

            circle.applyImpulse(impulse, closestContact);
            poly.applyImpulse(Vec2.scale(impulse, -1), closestContact);

            // Friction impulse
            const tangent = new Vec2(-normal.y, normal.x);
            const velAlongTangent = Vec2.dot(relVel, tangent);
            const friction = Math.sqrt(circle.friction * poly.friction);
            const frictionImpulseMag = Geom.clamp(-velAlongTangent * friction / totalInvMass, -impulseMag * friction, impulseMag * friction);
            const frictionImpulse = Vec2.scale(tangent, frictionImpulseMag);

            circle.applyImpulse(frictionImpulse, closestContact);
            poly.applyImpulse(Vec2.scale(frictionImpulse, -1), closestContact);

            // Squish on impact
            circle.squishX = poly.isCushion ? 0.7 : 0.85;
            circle.squishY = poly.isCushion ? 1.35 : 1.18;
            circle.squishAngle = normal.angle() + Math.PI / 2;

            if (this.onCollision) {
                this.onCollision(circle, poly, closestContact, normal, impulseMag);
            }
        }
    }

    resolvePolygonPolygon(pA, pB) {
        // SAT (Separating Axis Theorem)
        let minOverlap = Infinity;
        let smallestAxis = null;

        const getAxes = (poly) => {
            const axes = [];
            const verts = poly.worldVertices;
            for (let i = 0; i < verts.length; i++) {
                const v1 = verts[i];
                const v2 = verts[(i + 1) % verts.length];
                const edge = Vec2.sub(v2, v1);
                axes.push(edge.perp().normalize());
            }
            return axes;
        };

        const axes = [...getAxes(pA), ...getAxes(pB)];

        for (let axis of axes) {
            const projA = Geom.projectVertices(pA.worldVertices, axis);
            const projB = Geom.projectVertices(pB.worldVertices, axis);

            if (projA.max < projB.min || projB.max < projA.min) {
                return; // Separating axis found, no collision
            }

            const overlap = Math.min(projA.max - projB.min, projB.max - projA.min);
            if (overlap < minOverlap) {
                minOverlap = overlap;
                smallestAxis = axis;
            }
        }

        // Ensure normal points from pA to pB
        const dir = Vec2.sub(pB.pos, pA.pos);
        if (Vec2.dot(dir, smallestAxis) < 0) {
            smallestAxis.scale(-1);
        }

        const totalInvMass = pA.invMass + pB.invMass;
        if (totalInvMass === 0) return;

        const correction = Vec2.scale(smallestAxis, minOverlap / totalInvMass);
        if (!pA.isStatic) pA.pos.sub(Vec2.scale(correction, pA.invMass));
        if (!pB.isStatic) pB.pos.add(Vec2.scale(correction, pB.invMass));

        pA.updateWorldVertices();
        pB.updateWorldVertices();

        // Velocity resolution
        const relVel = Vec2.sub(pB.vel, pA.vel);
        const velAlongNormal = Vec2.dot(relVel, smallestAxis);
        if (velAlongNormal < 0) {
            const restitution = Math.min(pA.restitution, pB.restitution);
            const impulseMag = -(1 + restitution) * velAlongNormal / totalInvMass;
            const impulse = Vec2.scale(smallestAxis, impulseMag);

            pA.applyImpulse(Vec2.scale(impulse, -1));
            pB.applyImpulse(impulse);

            if (this.onCollision) {
                const contactPoint = Vec2.lerp(pA.pos, pB.pos, 0.5);
                this.onCollision(pA, pB, contactPoint, smallestAxis, impulseMag);
            }
        }
    }
}

window.Body = Body;
window.DistanceJoint = DistanceJoint;
window.PhysicsWorld = PhysicsWorld;

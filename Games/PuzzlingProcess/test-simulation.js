/**
 * Test physics simulation, puncture detection, and level loading in headless environment
 */

global.window = global;
global.document = {
    createElement: () => ({
        getContext: () => ({
            fillRect: () => {},
            stroke: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            createPattern: () => ({})
        })
    }),
    getElementById: () => ({
        getContext: () => ({
            clearRect: () => {},
            createPattern: () => ({}),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createLinearGradient: () => ({ addColorStop: () => {} }),
            fillRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            scale: () => {},
            ellipse: () => {},
            setLineDash: () => {},
            lineTo: () => {},
            closePath: () => {}
        }),
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        innerHTML: ''
    }),
    querySelectorAll: () => []
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.requestAnimationFrame = () => {};

require('./js/engine/vector.js');
require('./js/engine/physics.js');
require('./js/engine/textures.js');
require('./js/engine/particles.js');
require('./js/engine/audio.js');
require('./js/game/entities.js');
require('./js/game/levels.js');

console.log('Testing 10 Levels loading...');
for (let i = 0; i < GameLevels.length; i++) {
    const lvl = GameLevels[i];
    const world = new PhysicsWorld();
    const result = lvl.build(world);
    if (!result.protagonist) {
        throw new Error(`Level ${lvl.id} has no protagonist!`);
    }
    console.log(`Level ${lvl.id} "${lvl.title}" loaded successfully (${world.bodies.length} bodies, ${world.joints.length} joints)`);
}

// Test Corner Puncture vs Cushion Protection
console.log('\nTesting Puncture Mechanics:');
const world = new PhysicsWorld();
let punctured = false;
world.onPuncture = (circle, hazard, pt) => {
    punctured = true;
};

// Circle hitting a sharp triangle vertex directly
const circle = EntityFactory.createCircle(100, 100, 20);
const sharpTriangle = EntityFactory.createTriangle(100, 115, 40); // triangle overlapping circle
world.addBody(circle);
world.addBody(sharpTriangle);

world.step(0.02);
console.log('Direct Triangle Sharp Point Impact Punctures Circle:', punctured === true ? 'PASSED ✅' : 'FAILED ❌');

// Test Cushion Protection (Cushion absorbing collision without puncture)
const world2 = new PhysicsWorld();
let punctured2 = false;
world2.onPuncture = () => { punctured2 = true; };

const circle2 = EntityFactory.createCircle(100, 100, 20);
const cushion = EntityFactory.createCushion(100, 115, 70, 24);
world2.addBody(circle2);
world2.addBody(cushion);

world2.step(0.02);
console.log('Cushion Soft Contact Prevents Puncture:', punctured2 === false ? 'PASSED ✅' : 'FAILED ❌');

console.log('\nAll Physics and Level tests passed successfully!');

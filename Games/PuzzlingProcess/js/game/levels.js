/**
 * Pop & Protect - Handcrafted Levels with Progressive Shape Hazard Introduction
 */

const GameLevels = [
    // ==========================================
    // LEVEL 1: INTRODUCE THE CIRCLE
    // ==========================================
    {
        id: 1,
        title: "Level 1: The Gentle Roll",
        subtitle: "Meet the Circle!",
        description: "The Circle is delicate and squishy. Place a Safety Cushion to bridge the gap and bounce the Circle safely into the portal!",
        shapeBadge: "Circle Introduced",
        shapeIcon: "●",
        inventory: [
            { type: 'cushion', count: 2, label: 'Safety Cushion', desc: 'Soft felt barrier, safe for Circle' }
        ],
        build: (world) => {
            // Protagonist Circle
            const circle = EntityFactory.createCircle(120, 140, 20);
            world.addBody(circle);

            // Starting ramp
            world.addBody(EntityFactory.createWall(120, 200, 180, 20, 0.25));

            // Gap in the middle...

            // Landing platform toward Goal
            world.addBody(EntityFactory.createWall(650, 420, 260, 20, -0.15));

            // Bottom floor safety boundary
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Goal portal
            world.addBody(EntityFactory.createGoal(740, 370, 30));

            // Bonus Stars
            world.addBody(EntityFactory.createBonusStar(380, 290));
            world.addBody(EntityFactory.createBonusStar(540, 350));
            world.addBody(EntityFactory.createBonusStar(740, 270));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 2: INTRODUCE THE TRIANGLE
    // ==========================================
    {
        id: 2,
        title: "Level 2: The Pointy Pike",
        subtitle: "Danger! Triangles have 3 sharp corners!",
        description: "Triangles have razor-sharp corners that will poke and POP the Circle! Place a protective barrier or canopy to shield the Circle from the tumbling triangle!",
        shapeBadge: "Triangle Hazard Introduced",
        shapeIcon: "▲",
        inventory: [
            { type: 'cushion', count: 2, label: 'Safety Cushion', desc: 'Absorbs sharp pokes' },
            { type: 'plank', count: 1, label: 'Wood Plank', desc: 'Deflects tumbling shapes' }
        ],
        build: (world) => {
            // Protagonist Circle
            const circle = EntityFactory.createCircle(100, 420, 20);
            world.addBody(circle);

            // Circle track
            world.addBody(EntityFactory.createWall(250, 480, 400, 20, 0.08));
            world.addBody(EntityFactory.createWall(650, 500, 300, 20, -0.05));

            // Upper hazard slope with Sharp Triangle
            world.addBody(EntityFactory.createWall(360, 150, 260, 20, 0.45));
            const triangle = EntityFactory.createTriangle(280, 100, 42);
            world.addBody(triangle);

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Goal
            world.addBody(EntityFactory.createGoal(760, 440, 30));

            // Stars
            world.addBody(EntityFactory.createBonusStar(320, 420));
            world.addBody(EntityFactory.createBonusStar(520, 450));
            world.addBody(EntityFactory.createBonusStar(760, 360));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 3: INTRODUCE THE SQUARE
    // ==========================================
    {
        id: 3,
        title: "Level 3: Box Avalanche",
        subtitle: "Heavy Squares with 4 sharp corners!",
        description: "Heavy crates can crush and pierce! Build a sturdy A-frame roof using Planks and Cushions to divert the falling squares into the side pit.",
        shapeBadge: "Square Hazard Introduced",
        shapeIcon: "■",
        inventory: [
            { type: 'plank', count: 2, label: 'Wood Plank', desc: 'Rigid deflector ramp' },
            { type: 'cushion', count: 1, label: 'Safety Cushion', desc: 'Soft felt cushion' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(80, 200, 20);
            world.addBody(circle);

            // Circle track
            world.addBody(EntityFactory.createWall(160, 270, 220, 20, 0.3));
            world.addBody(EntityFactory.createWall(500, 480, 400, 20, 0.05));

            // Overhead chute with 2 Heavy Squares
            world.addBody(EntityFactory.createWall(420, 80, 20, 140));
            world.addBody(EntityFactory.createWall(540, 80, 20, 140));

            const box1 = EntityFactory.createSquare(480, 40, 44, 44, { mass: 4 });
            const box2 = EntityFactory.createSquare(480, 110, 44, 44, { mass: 4 });
            world.addBody(box1);
            world.addBody(box2);

            // Floor & side hazard pit
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Goal
            world.addBody(EntityFactory.createGoal(800, 440, 30));

            // Stars
            world.addBody(EntityFactory.createBonusStar(260, 320));
            world.addBody(EntityFactory.createBonusStar(480, 420));
            world.addBody(EntityFactory.createBonusStar(720, 430));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 4: INTRODUCE SPIKY STAR
    // ==========================================
    {
        id: 4,
        title: "Level 4: Starry Sawmills",
        subtitle: "Multi-pointed Spikes & Spring Launchers!",
        description: "A spiky star rolls rapidly across the low corridor. Use a Spring Pad to launch the Circle high up over the spinning spikes!",
        shapeBadge: "Spiky Star Introduced",
        shapeIcon: "★",
        inventory: [
            { type: 'spring', count: 1, label: 'Spring Pad', desc: 'High-bounce launch pad' },
            { type: 'cushion', count: 2, label: 'Safety Cushion', desc: 'Soft landing cushion' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(80, 320, 20);
            world.addBody(circle);

            // Starting ramp
            world.addBody(EntityFactory.createWall(140, 380, 180, 20, 0.2));

            // Middle spike corridor with rolling star
            world.addBody(EntityFactory.createWall(450, 500, 420, 20));
            const starBlade = EntityFactory.createSpikyStar(600, 460, 28, 12, 6, { vel: new Vec2(-80, 0) });
            world.addBody(starBlade);

            // High upper exit ledge
            world.addBody(EntityFactory.createWall(740, 260, 200, 20));
            world.addBody(EntityFactory.createGoal(800, 200, 30));

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(220, 340));
            world.addBody(EntityFactory.createBonusStar(450, 180));
            world.addBody(EntityFactory.createBonusStar(740, 150));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 5: THE PENDULUM GUILOTINE
    // ==========================================
    {
        id: 5,
        title: "Level 5: The Swinging Pike",
        subtitle: "Cut the Rope to drop the hazard!",
        description: "A deadly sharp triangle swings from a rope right across the Circle's path. Click on the rope to cut it or shield the Circle with cushions!",
        shapeBadge: "Rope Mechanics",
        shapeIcon: "✂",
        inventory: [
            { type: 'cushion', count: 2, label: 'Safety Cushion', desc: 'Place on drop zone' },
            { type: 'plank', count: 1, label: 'Wood Plank', desc: 'Bridge / Deflector' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(80, 280, 20);
            world.addBody(circle);

            // Circle track
            world.addBody(EntityFactory.createWall(180, 340, 240, 20, 0.15));
            world.addBody(EntityFactory.createWall(680, 440, 320, 20, -0.05));

            // Pendulum Triangle hanging from rope
            const triPendulum = EntityFactory.createTriangle(440, 220, 38, { mass: 2 });
            world.addBody(triPendulum);

            const rope = new DistanceJoint(null, triPendulum, 160, {
                fixedWorldPoint: new Vec2(440, 60),
                isRope: true,
                isCuttable: true
            });
            world.addJoint(rope);

            // Hazard drop pit below
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Goal
            world.addBody(EntityFactory.createGoal(800, 380, 30));

            // Stars
            world.addBody(EntityFactory.createBonusStar(280, 320));
            world.addBody(EntityFactory.createBonusStar(440, 360));
            world.addBody(EntityFactory.createBonusStar(680, 380));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 6: WIND TUNNEL DEFLECTION
    // ==========================================
    {
        id: 6,
        title: "Level 6: Gale Force Deflection",
        subtitle: "Air Fans & Crosswinds!",
        description: "A powerful turbine blows tumbling triangles directly at the Circle! Place a heavy deflector plank to redirect the airflow and protect your path.",
        shapeBadge: "Fan Mechanics",
        shapeIcon: "💨",
        inventory: [
            { type: 'plank', count: 2, label: 'Wood Plank', desc: 'Blocks wind & deflects pikes' },
            { type: 'cushion', count: 1, label: 'Safety Cushion', desc: 'Soft cushion' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(100, 160, 20);
            world.addBody(circle);

            // Upper track
            world.addBody(EntityFactory.createWall(180, 220, 200, 20, 0.25));

            // Lower landing & goal
            world.addBody(EntityFactory.createWall(680, 480, 320, 20, -0.1));
            world.addBody(EntityFactory.createGoal(800, 410, 30));

            // Wind Fan on bottom blowing upwards
            const fan = EntityFactory.createFan(450, 520, 60, 30, 0, 1200, 320);
            world.addBody(fan);

            // Falling sharp triangle from top
            const tri1 = EntityFactory.createTriangle(430, 40, 36);
            const tri2 = EntityFactory.createTriangle(470, 70, 36);
            world.addBody(tri1);
            world.addBody(tri2);

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(260, 260));
            world.addBody(EntityFactory.createBonusStar(450, 300));
            world.addBody(EntityFactory.createBonusStar(650, 420));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 7: THE PINBALL GAUNTLET
    // ==========================================
    {
        id: 7,
        title: "Level 7: The Pinball Maze",
        subtitle: "Triangles & Squares cascading together!",
        description: "Multiple sharp wedges and crates are bouncing through the flippers! Set up cushions to form a safe corridor for the Circle.",
        shapeBadge: "Multi-Shape Chaos",
        shapeIcon: "▲■",
        inventory: [
            { type: 'cushion', count: 3, label: 'Safety Cushion', desc: 'Protect all impact angles' },
            { type: 'spring', count: 1, label: 'Spring Pad', desc: 'Boost circle over danger' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(80, 120, 20);
            world.addBody(circle);

            // Upper guide
            world.addBody(EntityFactory.createWall(140, 180, 160, 20, 0.3));

            // Pinball bumpers / wedges
            world.addBody(EntityFactory.createWall(320, 240, 140, 20, -0.4));
            world.addBody(EntityFactory.createWall(560, 280, 140, 20, 0.4));
            world.addBody(EntityFactory.createWall(420, 420, 180, 20, -0.15));

            // Hazards falling from top
            world.addBody(EntityFactory.createTriangle(340, 50, 36));
            world.addBody(EntityFactory.createSquare(540, 40, 40, 40));

            // Goal at bottom right
            world.addBody(EntityFactory.createWall(740, 520, 220, 20));
            world.addBody(EntityFactory.createGoal(800, 460, 30));

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(280, 180));
            world.addBody(EntityFactory.createBonusStar(480, 320));
            world.addBody(EntityFactory.createBonusStar(680, 460));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 8: ELEVATOR SHAFT
    // ==========================================
    {
        id: 8,
        title: "Level 8: Vertical Drop",
        subtitle: "High Altitude Puzzle",
        description: "The Circle must drop down a narrow shaft lined with sharp triangles. Place cushions along the walls to guide the descent safely!",
        shapeBadge: "Precision Physics",
        shapeIcon: "⇵",
        inventory: [
            { type: 'cushion', count: 3, label: 'Safety Cushion', desc: 'Wall padding' },
            { type: 'plank', count: 1, label: 'Wood Plank', desc: 'Deflector funnel' }
        ],
        build: (world) => {
            // Circle at top
            const circle = EntityFactory.createCircle(450, 60, 20);
            world.addBody(circle);

            // Left and Right shaft walls
            world.addBody(EntityFactory.createWall(320, 300, 20, 450));
            world.addBody(EntityFactory.createWall(580, 300, 20, 450));

            // Protruding sharp triangle hazards inside shaft
            world.addBody(EntityFactory.createTriangle(350, 200, 34, { isStatic: true, angle: Math.PI / 2 }));
            world.addBody(EntityFactory.createTriangle(550, 340, 34, { isStatic: true, angle: -Math.PI / 2 }));

            // Bottom exit ramp
            world.addBody(EntityFactory.createWall(500, 520, 240, 20, 0.25));
            world.addBody(EntityFactory.createGoal(750, 520, 30));

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(450, 160));
            world.addBody(EntityFactory.createBonusStar(450, 380));
            world.addBody(EntityFactory.createBonusStar(640, 500));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 9: THE COLLAPSING TOWER
    // ==========================================
    {
        id: 9,
        title: "Level 9: The Domino Tower",
        subtitle: "Chain Reaction Alert!",
        description: "A tower of heavy squares and triangles is tipping over! Build a bunker to shelter the rolling Circle as debris crashes overhead.",
        shapeBadge: "Structural Collapse",
        shapeIcon: "🏛",
        inventory: [
            { type: 'plank', count: 2, label: 'Wood Plank', desc: 'Bunker roof beams' },
            { type: 'cushion', count: 2, label: 'Safety Cushion', desc: 'Impact absorption' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(80, 460, 20);
            world.addBody(circle);

            // Circle path
            world.addBody(EntityFactory.createWall(450, 520, 800, 20));

            // Stacked tower of squares & triangles on a pedestal
            world.addBody(EntityFactory.createWall(320, 350, 100, 20));
            const box1 = EntityFactory.createSquare(320, 310, 40, 40);
            const box2 = EntityFactory.createSquare(320, 265, 36, 36);
            const tri1 = EntityFactory.createTriangle(320, 220, 36, { angle: 0.1 });
            world.addBody(box1);
            world.addBody(box2);
            world.addBody(tri1);

            // Nudge ball to trigger collapse
            const triggerBall = new Body({
                type: 'circle',
                pos: new Vec2(220, 150),
                radius: 18,
                mass: 2,
                vel: new Vec2(80, 0),
                label: 'Nudge Ball',
                texture: 'metal'
            });
            world.addBody(triggerBall);
            world.addBody(EntityFactory.createWall(200, 190, 120, 16, 0.25));

            // Goal
            world.addBody(EntityFactory.createGoal(800, 460, 30));

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(240, 460));
            world.addBody(EntityFactory.createBonusStar(480, 460));
            world.addBody(EntityFactory.createBonusStar(700, 460));

            return { protagonist: circle };
        }
    },

    // ==========================================
    // LEVEL 10: GRAND FINALE - THE SHAPE CITADEL
    // ==========================================
    {
        id: 10,
        title: "Level 10: Master Citadel",
        subtitle: "The Ultimate Shape Gauntlet!",
        description: "The grand finale combines Triangles, Heavy Squares, Spiky Stars, Swinging Pendulums, and Wind Fans! Troubleshoot and engineer the ultimate rescue path!",
        shapeBadge: "Final Gauntlet",
        shapeIcon: "👑",
        inventory: [
            { type: 'plank', count: 3, label: 'Wood Plank', desc: 'Ramps & Deflectors' },
            { type: 'cushion', count: 3, label: 'Safety Cushion', desc: 'Corner armor' },
            { type: 'spring', count: 1, label: 'Spring Pad', desc: 'Super boost' }
        ],
        build: (world) => {
            // Circle
            const circle = EntityFactory.createCircle(70, 100, 20);
            world.addBody(circle);

            // Upper rolling ramp
            world.addBody(EntityFactory.createWall(140, 160, 180, 20, 0.25));

            // Mid tier platforms
            world.addBody(EntityFactory.createWall(420, 280, 160, 20, -0.15));
            world.addBody(EntityFactory.createWall(680, 380, 200, 20, 0.2));

            // Hazards:
            // 1. Swinging Sharp Triangle
            const triPendulum = EntityFactory.createTriangle(300, 200, 38, { mass: 2.5 });
            world.addBody(triPendulum);
            const rope = new DistanceJoint(null, triPendulum, 130, {
                fixedWorldPoint: new Vec2(300, 70),
                isRope: true,
                isCuttable: true
            });
            world.addJoint(rope);

            // 2. Heavy Falling Crate
            world.addBody(EntityFactory.createSquare(500, 80, 45, 45, { mass: 4.5 }));

            // 3. Spiky Saw Star
            world.addBody(EntityFactory.createSpikyStar(620, 280, 26, 12, 5, { vel: new Vec2(-60, 0) }));

            // 4. Air Fan blowing across the gap
            const fan = EntityFactory.createFan(350, 520, 60, 30, 0, 900, 260);
            world.addBody(fan);

            // Goal
            world.addBody(EntityFactory.createGoal(820, 490, 32));

            // Floor
            world.addBody(EntityFactory.createWall(450, 580, 900, 20));

            // Stars
            world.addBody(EntityFactory.createBonusStar(280, 240));
            world.addBody(EntityFactory.createBonusStar(520, 240));
            world.addBody(EntityFactory.createBonusStar(760, 420));

            return { protagonist: circle };
        }
    }
];

window.GameLevels = GameLevels;

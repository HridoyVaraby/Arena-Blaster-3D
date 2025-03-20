// Game state
let gameState = {
    isPlaying: false,
    score: 0,
    time: 0,
    wave: 0,
    health: 100,
    ammo: 50,
    enemies: [],
    particles: [],
    bullets: []
};

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Enhanced Lighting
const directionalLight = new THREE.DirectionalLight(0xffd700, 1.2);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x6495ed, 0.6);
scene.add(ambientLight);

// Add colored spotlights for dramatic effect
const spotLight1 = new THREE.SpotLight(0xff4500, 1);
spotLight1.position.set(-15, 10, -15);
spotLight1.angle = Math.PI / 6;
spotLight1.penumbra = 0.3;
scene.add(spotLight1);

const spotLight2 = new THREE.SpotLight(0x00ff7f, 1);
spotLight2.position.set(15, 10, 15);
spotLight2.angle = Math.PI / 6;
spotLight2.penumbra = 0.3;
scene.add(spotLight2);

// Enable shadow rendering
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Arena setup
// Enhanced ground with metallic texture
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        metalness: 0.7,
        roughness: 0.3,
        envMapIntensity: 1.0
    })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Add obstacles
const obstacles = [
    { pos: [-10, 1, -10] },
    { pos: [10, 1, -10] },
    { pos: [-10, 1, 10] },
    { pos: [10, 1, 10] }
].map(({ pos }) => {
    const obstacle = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshStandardMaterial({
            color: 0x2196f3,
            metalness: 0.8,
            roughness: 0.2,
            envMapIntensity: 1.0
        })
    );
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    obstacle.position.set(...pos);
    scene.add(obstacle);
    return obstacle;
});

// Player setup
camera.position.set(0, 1, 0);
let playerVelocity = new THREE.Vector3();
let playerRotation = new THREE.Euler(0, 0, 0, 'YXZ');

// Keyboard state
let keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

// Mouse state
let mouseState = {
    isLocked: false,
    sensitivity: 0.002
};

// Input device detection
let activeInputDevice = 'touch';

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!gameState.isPlaying) return;
    activeInputDevice = 'keyboard';
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keyState.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keyState.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keyState.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keyState.right = true;
            break;
        case 'Space':
            shoot();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keyState.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keyState.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keyState.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keyState.right = false;
            break;
    }
});

// Mouse controls
document.addEventListener('click', () => {
    if (!mouseState.isLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    mouseState.isLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (e) => {
    if (mouseState.isLocked && gameState.isPlaying) {
        activeInputDevice = 'keyboard';
        playerRotation.y -= e.movementX * mouseState.sensitivity;
        playerRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, 
            playerRotation.x - e.movementY * mouseState.sensitivity
        ));
        camera.rotation.copy(playerRotation);
    }
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && mouseState.isLocked && gameState.isPlaying) {
        shoot();
    }
});

// Joystick state
let joystickState = {
    active: false,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0
};

// Touch controls
const joystick = document.getElementById('virtual-joystick');
const joystickKnob = document.getElementById('joystick-knob');
const shootButton = document.getElementById('shoot-button');

joystick.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = joystick.getBoundingClientRect();
    joystickState.active = true;
    joystickState.startX = touch.clientX - rect.left - rect.width / 2;
    joystickState.startY = touch.clientY - rect.top - rect.height / 2;
});

joystick.addEventListener('touchmove', (e) => {
    if (!joystickState.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = joystick.getBoundingClientRect();
    joystickState.moveX = touch.clientX - rect.left - rect.width / 2;
    joystickState.moveY = touch.clientY - rect.top - rect.height / 2;
    
    const maxDistance = 30;
    const dx = joystickState.moveX - joystickState.startX;
    const dy = joystickState.moveY - joystickState.startY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    
    joystickKnob.style.transform = `translate(${distance * Math.cos(angle)}px, ${distance * Math.sin(angle)}px)`;
});

joystick.addEventListener('touchend', () => {
    joystickState.active = false;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
});

// Shooting controls
const raycaster = new THREE.Raycaster();
shootButton.addEventListener('touchstart', shoot);

function shoot() {
    if (gameState.ammo <= 0) return;
    gameState.ammo--;
    document.getElementById('ammo-count').textContent = `Ammo: ${gameState.ammo}`;
    
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshPhongMaterial({
            color: 0xff9500,
            emissive: 0xff7b00,
            emissiveIntensity: 0.5,
            shininess: 100
        })
    );
    bullet.castShadow = true;
    bullet.position.copy(camera.position);
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const direction = new THREE.Vector3();
    raycaster.ray.direction.normalize();
    direction.copy(raycaster.ray.direction);
    
    bullet.velocity = direction.multiplyScalar(0.5);
    bullet.alive = true;
    bullet.lifetime = 0;
    
    scene.add(bullet);
    gameState.bullets.push(bullet);
}

// Particle effects
function createParticles(position) {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const particleColors = [0xff0000, 0xff7f00, 0xffff00, 0xff00ff];
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = position.x;
        positions[i + 1] = position.y;
        positions[i + 2] = position.z;
        
        const color = new THREE.Color(particleColors[Math.floor(Math.random() * particleColors.length)]);
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    gameState.particles.push({
        mesh: particles,
        life: 0.5,
        velocities: Array(particleCount).fill().map(() => new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        ))
    });
}

// Enemy spawning
function spawnEnemy() {
    const enemy = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 15 + 5;
    enemy.position.set(
        Math.cos(angle) * radius,
        0.5,
        Math.sin(angle) * radius
    );
    
    scene.add(enemy);
    gameState.enemies.push(enemy);
}

function startNextWave() {
    gameState.wave++;
    const enemyCount = Math.min(3 + gameState.wave * 2, 20);
    for (let i = 0; i < enemyCount; i++) {
        spawnEnemy();
    }
}

// UI updates
function updateScore() {
    document.getElementById('score-timer').textContent = 
        `Score: ${gameState.score} | Time: ${Math.floor(gameState.time)}s`;
}

function updateHealth() {
    document.getElementById('health-fill').style.width = `${gameState.health}%`;
}

// Game loop
let lastTime = 0;
function animate(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;
    
    if (gameState.isPlaying) {
        gameState.time += delta;
        updateScore();
        
        // Player movement
        if (activeInputDevice === 'touch' && joystickState.active) {
            const dx = joystickState.moveX - joystickState.startX;
            const dy = joystickState.moveY - joystickState.startY;
            const moveAngle = Math.atan2(dx, dy);
            const moveSpeed = Math.min(Math.sqrt(dx * dx + dy * dy) / 30, 1) * 0.1;
            
            playerVelocity.x = Math.sin(moveAngle) * moveSpeed;
            playerVelocity.z = Math.cos(moveAngle) * moveSpeed;
        } else if (activeInputDevice === 'keyboard') {
            const moveSpeed = 0.1;
            playerVelocity.set(0, 0, 0);
            
            if (keyState.forward) {
                playerVelocity.z = -Math.cos(playerRotation.y) * moveSpeed;
                playerVelocity.x = -Math.sin(playerRotation.y) * moveSpeed;
            }
            if (keyState.backward) {
                playerVelocity.z = Math.cos(playerRotation.y) * moveSpeed;
                playerVelocity.x = Math.sin(playerRotation.y) * moveSpeed;
            }
            if (keyState.left) {
                playerVelocity.x = -Math.cos(playerRotation.y) * moveSpeed;
                playerVelocity.z = Math.sin(playerRotation.y) * moveSpeed;
            }
            if (keyState.right) {
                playerVelocity.x = Math.cos(playerRotation.y) * moveSpeed;
                playerVelocity.z = -Math.sin(playerRotation.y) * moveSpeed;
            }
        }
        
        const newPosition = camera.position.clone().add(playerVelocity);
        if (Math.abs(newPosition.x) < 24 && Math.abs(newPosition.z) < 24) {
            camera.position.copy(newPosition);
        }
        
        // Enemy movement and attacks
        gameState.enemies.forEach(enemy => {
            const direction = new THREE.Vector3()
                .subVectors(camera.position, enemy.position)
                .normalize();
            enemy.position.add(direction.multiplyScalar(0.05));
            
            if (enemy.position.distanceTo(camera.position) < 2) {
                gameState.health -= 10 * delta;
                updateHealth();
                
                if (gameState.health <= 0) {
                    gameOver();
                }
            }
        });
        
        // Update particles
        gameState.particles = gameState.particles.filter(particle => {
            particle.life -= delta;
            if (particle.life <= 0) {
                scene.remove(particle.mesh);
                return false;
            }
            
            const positions = particle.mesh.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += particle.velocities[i/3].x * delta;
                positions[i + 1] += particle.velocities[i/3].y * delta;
                positions[i + 2] += particle.velocities[i/3].z * delta;
            }
            particle.mesh.geometry.attributes.position.needsUpdate = true;
            return true;
        });

        // Update bullets
        gameState.bullets = gameState.bullets.filter(bullet => {
            bullet.position.add(bullet.velocity);
            bullet.lifetime += delta;

            // Check bullet collision with enemies
            const hitEnemy = gameState.enemies.find(enemy => 
                bullet.position.distanceTo(enemy.position) < 1
            );

            if (hitEnemy) {
                createParticles(hitEnemy.position);
                scene.remove(hitEnemy);
                scene.remove(bullet);
                gameState.enemies = gameState.enemies.filter(e => e !== hitEnemy);
                gameState.score += 10;
                updateScore();
                
                if (gameState.enemies.length === 0) {
                    setTimeout(startNextWave, 3000);
                }
                return false;
            }

            // Remove bullets that are too old or out of bounds
            if (bullet.lifetime > 2 || 
                Math.abs(bullet.position.x) > 25 || 
                Math.abs(bullet.position.z) > 25) {
                scene.remove(bullet);
                return false;
            }
            return true;
        });
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Game state management
function startGame() {
    gameState = {
        isPlaying: true,
        score: 0,
        time: 0,
        wave: 0,
        health: 100,
        ammo: 50,
        enemies: [],
        particles: []
    };
    
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    updateHealth();
    startNextWave();
}

function gameOver() {
    gameState.isPlaying = false;
    const highScore = Math.max(
        parseInt(localStorage.getItem('highScore') || '0'),
        gameState.score
    );
    localStorage.setItem('highScore', highScore);
    
    document.getElementById('final-score').textContent = `Score: ${gameState.score}`;
    document.getElementById('high-score').textContent = `High Score: ${highScore}`;
    document.getElementById('game-over-screen').style.display = 'flex';
}

// Event listeners
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('restart-button').addEventListener('click', startGame);
document.getElementById('share-button').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: 'Arena Blaster 3D',
            text: `I scored ${gameState.score} points in Arena Blaster 3D! Can you beat my score?`
        }).catch(console.error);
    } else {
        alert(`Share your score: ${gameState.score} points!`);
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation loop
animate(0);
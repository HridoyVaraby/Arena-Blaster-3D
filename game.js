// Game state
let gameState = {
    isPlaying: false,
    score: 0,
    time: 0,
    wave: 0,
    health: 100,
    ammo: 50,
    enemies: [],
    particles: []
};

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Arena setup
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
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
        new THREE.MeshStandardMaterial({ color: 0x808080 })
    );
    obstacle.position.set(...pos);
    scene.add(obstacle);
    return obstacle;
});

// Player setup
camera.position.set(0, 1, 0);
let playerVelocity = new THREE.Vector3();
let playerRotation = new THREE.Euler(0, 0, 0, 'YXZ');

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
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(gameState.enemies);
    
    if (intersects.length > 0) {
        const enemy = intersects[0].object;
        createParticles(enemy.position);
        scene.remove(enemy);
        gameState.enemies = gameState.enemies.filter(e => e !== enemy);
        gameState.score += 10;
        updateScore();
        
        if (gameState.enemies.length === 0) {
            setTimeout(startNextWave, 3000);
        }
    }
}

// Particle effects
function createParticles(position) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = position.x;
        positions[i + 1] = position.y;
        positions[i + 2] = position.z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffff00,
        size: 0.1,
        transparent: true
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
        if (joystickState.active) {
            const dx = joystickState.moveX - joystickState.startX;
            const dy = joystickState.moveY - joystickState.startY;
            const moveAngle = Math.atan2(dx, dy);
            const moveSpeed = Math.min(Math.sqrt(dx * dx + dy * dy) / 30, 1) * 0.1;
            
            playerVelocity.x = Math.sin(moveAngle) * moveSpeed;
            playerVelocity.z = Math.cos(moveAngle) * moveSpeed;
            
            camera.position.add(playerVelocity);
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
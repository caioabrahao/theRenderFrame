import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 800;

// Create arrays for positions and store original positions
const posArray = new Float32Array(particlesCount * 3);
const originalPositions = new Float32Array(particlesCount * 3);

// Create random positions for particles
for(let i = 0; i < particlesCount * 3; i++) {
    const position = (Math.random() - 0.5) * 50;
    posArray[i] = position;
    originalPositions[i] = position;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

// Create particle material
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.1,
    color: 0xff8c00,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});

// Create particle system
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Create torus
const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshBasicMaterial({ 
    color: 0xff8c00,
    wireframe: true 
});
const torus = new THREE.Mesh(geometry, material);
scene.add(torus);

// Position camera
camera.position.z = 30;

// Animation variables
let targetX = 0;
let currentX = 0;

// Drag interaction variables
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationSpeed = { x: 0, y: 0 };

// Variables for particle movement
const time = {
    value: 0
};
const moveSpeed = 0.05;
const moveAmount = 0.5;

// Mouse tracking for particles
const mouse3D = new THREE.Vector3();
let mouseX = 0;
let mouseY = 0;

// Raycaster for drag detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Mouse event handlers
window.addEventListener('mousedown', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(torus);
    
    if (intersects.length > 0) {
        isDragging = true;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});

window.addEventListener('mousemove', (event) => {
    // Update mouse position for particles
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    mouse3D.set(mouseX * 25, mouseY * 25, 0);

    // Handle torus dragging
    if (isDragging) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;
        
        rotationSpeed.x = deltaY * 0.005;
        rotationSpeed.y = deltaX * 0.005;
        
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

// Scroll handler
window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    
    if (scrollPosition < windowHeight) {
        const progress = Math.min(scrollPosition / windowHeight, 1);
        targetX = progress * 20;
    } else if (scrollPosition < windowHeight * 2) {
        targetX = 20;
    } else {
        targetX = -20;
    }
});

// Animation function
function animate() {
    requestAnimationFrame(animate);

    // Update time for particle movement
    time.value += 0.01;

    // Update particles
    const positions = particlesGeometry.attributes.position.array;
    
    for(let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Mouse repulsion
        const dx = x - mouse3D.x;
        const dy = y - mouse3D.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const repulsionRadius = 10;
        if (dist < repulsionRadius) {
            const force = (1 - dist / repulsionRadius) * 0.2;
            positions[i] += (dx / dist) * force;
            positions[i + 1] += (dy / dist) * force;
            
            originalPositions[i] = positions[i];
            originalPositions[i + 1] = positions[i + 1];
        } else {
            // Gentle autonomous movement from current position
            positions[i] += Math.sin(time.value + i * 0.1) * moveAmount * moveSpeed;
            positions[i + 1] += Math.cos(time.value + i * 0.1) * moveAmount * moveSpeed;
            positions[i + 2] += Math.sin(time.value + i * 0.05) * moveAmount * moveSpeed;
            
            originalPositions[i] = positions[i];
            originalPositions[i + 1] = positions[i + 1];
            originalPositions[i + 2] = positions[i + 2];
        }
    }
    
    particlesGeometry.attributes.position.needsUpdate = true;

    // Torus animation
    currentX += (targetX - currentX) * 0.1;
    torus.position.x = currentX;

    if (isDragging) {
        torus.rotation.x += rotationSpeed.x;
        torus.rotation.y += rotationSpeed.y;
    } else {
        torus.rotation.x += 0.01;
        torus.rotation.y += 0.01;
        rotationSpeed.x *= 0.95;
        rotationSpeed.y *= 0.95;
    }

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start animation
animate(); 
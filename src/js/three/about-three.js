import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Torus class
class Torus {
    constructor(scene) {
        this.scene = scene;
        this.setup();
    }

    setup() {
        const geometry = new THREE.TorusGeometry(10, 4, 16, 100);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff8c00,
            wireframe: true 
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);

        // Initial position and rotation
        this.mesh.position.x = -15;
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.rotation.y = 0;

        // Rotation variables
        this.targetRotationY = 0;
        this.currentRotationY = 0;
        this.MAX_ROTATION = 0.3;
    }

    updateRotation(mouseY) {
        this.targetRotationY = Math.max(Math.min(mouseY * 0.3, this.MAX_ROTATION), -this.MAX_ROTATION);
    }

    animate() {
        this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;
        this.mesh.rotation.y = this.currentRotationY;
        this.mesh.rotation.z += 0.005;
    }
}

// Particle system setup
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particlesCount = 800;
        this.mouse3D = new THREE.Vector3();
        this.time = { value: 0 };
        this.moveSpeed = 0.05;
        this.moveAmount = 0.5;
        this.setup();
    }

    setup() {
        this.geometry = new THREE.BufferGeometry();
        const posArray = new Float32Array(this.particlesCount * 3);
        this.originalPositions = new Float32Array(this.particlesCount * 3);

        // Create random positions
        for(let i = 0; i < this.particlesCount * 3; i++) {
            const position = (Math.random() - 0.5) * 50;
            posArray[i] = position;
            this.originalPositions[i] = position;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        this.material = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xff8c00,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        this.mesh = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    updateParticles(mouseX, mouseY) {
        this.time.value += 0.01;
        this.mouse3D.set(mouseX * 25, mouseY * 25, 0);

        const positions = this.geometry.attributes.position.array;
        
        for(let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Mouse repulsion
            const dx = x - this.mouse3D.x;
            const dy = y - this.mouse3D.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const repulsionRadius = 10;
            if (dist < repulsionRadius) {
                const force = (1 - dist / repulsionRadius) * 0.2;
                positions[i] += (dx / dist) * force;
                positions[i + 1] += (dy / dist) * force;
                
                this.originalPositions[i] = positions[i];
                this.originalPositions[i + 1] = positions[i + 1];
            } else {
                // Gentle autonomous movement
                positions[i] += Math.sin(this.time.value + i * 0.1) * this.moveAmount * this.moveSpeed;
                positions[i + 1] += Math.cos(this.time.value + i * 0.1) * this.moveAmount * this.moveSpeed;
                positions[i + 2] += Math.sin(this.time.value + i * 0.05) * this.moveAmount * this.moveSpeed;
                
                this.originalPositions[i] = positions[i];
                this.originalPositions[i + 1] = positions[i + 1];
                this.originalPositions[i + 2] = positions[i + 2];
            }
        }
        
        this.geometry.attributes.position.needsUpdate = true;
    }
}

// Create torus
const torus = new Torus(scene);

// Create particle system
let mouseX = 0;
let mouseY = 0;
const particles = new ParticleSystem(scene);

// Position camera
camera.position.z = 15;

// Mouse move handler
window.addEventListener('mousemove', (event) => {
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    torus.updateRotation(mouseY);
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Animation function
function animate() {
    requestAnimationFrame(animate);
    torus.animate();
    particles.updateParticles(mouseX, mouseY);
    renderer.render(scene, camera);
}

// Handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Start animation
animate();
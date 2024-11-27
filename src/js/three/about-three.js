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

// Create torus
const torus = new Torus(scene);

// Position camera
camera.position.z = 15;

// Mouse move handler
window.addEventListener('mousemove', (event) => {
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    torus.updateRotation(mouseY);
});

// Animation function
function animate() {
    requestAnimationFrame(animate);
    torus.animate();
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
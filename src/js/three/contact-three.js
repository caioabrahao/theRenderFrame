import * as THREE from 'three';

class GridBackground {
    constructor() {
        this.canvas = document.getElementById('gridCanvas');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.squares = [];
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Setup camera
        this.camera.position.set(0, 2, 5);
        this.camera.rotation.x = -0.3;

        // Create squares
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff8c00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });

        // Create grid of squares
        for (let i = 0; i < 100; i++) {
            const square = new THREE.Mesh(geometry, material);
            
            // Random position within a grid pattern
            square.position.x = (Math.random() - 0.5) * 10;
            square.position.y = (Math.random() - 0.5) * 10;
            square.position.z = (Math.random() - 0.5) * 10;
            
            // Store initial z position for resetting
            square.userData.initialZ = square.position.z;
            
            this.squares.push(square);
            this.scene.add(square);
        }

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start animation
        this.animate();
    }

    onWindowResize() {
        const section = document.querySelector('.grid-section');
        const width = section.offsetWidth;
        const height = section.offsetHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Move squares
        this.squares.forEach(square => {
            // Move towards camera
            square.position.z += 0.05;
            
            // Rotate square
            square.rotation.z += 0.01;
            
            // Reset position when square gets too close
            if (square.position.z > 5) {
                square.position.z = -10;
                square.position.x = (Math.random() - 0.5) * 10;
                square.position.y = (Math.random() - 0.5) * 10;
            }
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GridBackground();
}); 
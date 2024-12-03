import * as THREE from 'three';

let scene, camera, renderer, gridHelper, skySphere, skyRing, outerSphere, innerSphere, pivotPoint;
let particleSystem, particleGeometry, particles;
const MAX_PARTICLES = 1000;
const PARTICLE_LIFE = 50; // frames before fade out

let mouseX = 0;
let mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;

function createSkySphere() {
    const geometry = new THREE.SphereGeometry(30, 15, 15);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    
    skySphere = new THREE.Mesh(geometry, material);
    scene.add(skySphere);
}

function createSkyRing() {
    const geometry = new THREE.TorusGeometry(40, 3, 2, 10);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    
    skyRing = new THREE.Mesh(geometry, material);
    skyRing.rotation.x = Math.PI / 2; // Align horizontally
    
    // Position relative to skySphere
    skyRing.position.x = skySphere.position.x;
    skyRing.position.y = skySphere.position.y;
    skyRing.position.z = skySphere.position.z;
    
    scene.add(skyRing);
}

function createNestedSpheres() {
    // Large outer sphere
    const outerGeometry = new THREE.SphereGeometry(60, 20, 20);
    const outerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    outerSphere = new THREE.Mesh(outerGeometry, outerMaterial);
    scene.add(outerSphere);

    // Create pivot point
    pivotPoint = new THREE.Object3D();
    scene.add(pivotPoint);

    // Small inner sphere
    const innerGeometry = new THREE.SphereGeometry(25, 12, 12);
    const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffa500,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });
    innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
    innerSphere.position.x = 40; // Orbit radius
    pivotPoint.add(innerSphere);
}

function createParticleSystem() {
    // Create geometry for particles
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const alphas = new Float32Array(MAX_PARTICLES);
    
    // Initialize all particles
    for(let i = 0; i < MAX_PARTICLES; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        alphas[i] = 0;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Custom shader material
    const material = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
            color: { value: new THREE.Color(0xffa500) }
        },
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 2.0;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(color, vAlpha);
            }
        `
    });

    particleSystem = new THREE.Points(particleGeometry, material);
    scene.add(particleSystem);
    
    // Initialize particles array
    particles = [];
    for(let i = 0; i < MAX_PARTICLES; i++) {
        particles.push({
            life: 0
        });
    }
}

function updateParticles() {
    const positions = particleGeometry.attributes.position.array;
    const alphas = particleGeometry.attributes.alpha.array;
    
    // Get inner sphere world position
    const sphereWorldPos = new THREE.Vector3();
    innerSphere.getWorldPosition(sphereWorldPos);
    
    // Add new particle
    for(let i = 0; i < particles.length; i++) {
        if(particles[i].life <= 0) {
            particles[i].life = PARTICLE_LIFE;
            positions[i * 3] = sphereWorldPos.x;
            positions[i * 3 + 1] = sphereWorldPos.y;
            positions[i * 3 + 2] = sphereWorldPos.z;
            break;
        }
    }
    
    // Update existing particles
    for(let i = 0; i < particles.length; i++) {
        if(particles[i].life > 0) {
            particles[i].life--;
            alphas[i] = particles[i].life / PARTICLE_LIFE;
        }
    }
    
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.alpha.needsUpdate = true;
}

function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
}

function updateObjectRotations() {
    // Smooth rotation targets
    targetRotationX += (mouseY * 0.05 - targetRotationX) * 0.05;
    targetRotationY += (mouseX * 0.05 - targetRotationY) * 0.05;

    // Rotate sky sphere
    if (skySphere) {
        skySphere.rotation.x += targetRotationX * 0.3;
        skySphere.rotation.y += targetRotationY * 0.3;
    }

    // Rotate sky ring
    if (skyRing) {
        skyRing.rotation.y += targetRotationY * 0.2;
        // Keep x rotation fixed to maintain horizontal alignment
        skyRing.rotation.z += targetRotationX * 0.2;
    }

    // Rotate outer sphere
    if (outerSphere) {
        outerSphere.rotation.x += targetRotationX * 0.15;
        outerSphere.rotation.y += targetRotationY * 0.15;
    }

    // Rotate pivot point (affects inner sphere orbit)
    if (pivotPoint) {
        pivotPoint.rotation.x += targetRotationX * 0.1;
        pivotPoint.rotation.y += targetRotationY * 0.1;
    }
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 5;

    const canvas = document.querySelector('#editor-menu-three');
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create grid helper
    gridHelper = new THREE.GridHelper(75, 75, 0xffa500, 0xffa500);
    scene.add(gridHelper);

    // Add sky sphere after grid helper
    createSkySphere();

    skySphere.position.x = -250;
    skySphere.position.y = 100;
    skySphere.position.z = -250;

    createSkyRing();
    createNestedSpheres();
    createParticleSystem();

    outerSphere.position.x = 250;
    outerSphere.position.y = 100;
    outerSphere.position.z = -250;

    innerSphere.position.x = 250;
    innerSphere.position.y = 100;
    innerSphere.position.z = -250;

    pivotPoint.position.x = 250;
    pivotPoint.position.y = 100;
    pivotPoint.position.z = -250;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add mouse move event listener
    document.addEventListener('mousemove', onMouseMove);

    // Start animation
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Animate grid
    gridHelper.position.z = (gridHelper.position.z - 0.01) % 1;
    
    // Animate sky sphere
    if (skySphere) {
        skySphere.rotation.x += 0.0002;
        skySphere.rotation.y += 0.0001;
    }
    
    if (skyRing) {
        skyRing.rotation.z += 0.001;
    }
    
    if (outerSphere && innerSphere && pivotPoint) {
        outerSphere.rotation.y += 0.0001;
        outerSphere.rotation.x += 0.0001;
        
        pivotPoint.rotation.y += 0.005; // Orbit rotation
        innerSphere.rotation.y += 0.02; // Self rotation
    }
    
    if(particleSystem) {
        updateParticles();
    }

    // Update object rotations based on mouse movement
    updateObjectRotations();
    
    renderer.render(scene, camera);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
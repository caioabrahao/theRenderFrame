import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class Editor {
    constructor() {
        this.initialize();
        this.setupShapeSelector();
        this.objectCount = {
            box: 0,
            sphere: 0,
            cylinder: 0,
            cone: 0,
            torus: 0
        };
    }

    initialize() {
        // Initialize objects array
        this.objects = [];

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#scene-canvas'),
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.updateRendererSize();

        // Add grid helper
        const size = 10;
        const divisions = 10;
        const gridHelper = new THREE.GridHelper(size, divisions);
        this.scene.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Handle window resize
        window.addEventListener('resize', () => this.updateRendererSize());

        // Start animation loop
        this.animate();
    }

    updateRendererSize() {
        const container = document.querySelector('#viewport');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    addShape(shapeType) {
        let geometry;
        let material = new THREE.MeshStandardMaterial({ 
            color: 0xff8c00,
            metalness: 0.3,
            roughness: 0.4,
        });

        switch(shapeType) {
            case 'box':
                geometry = new THREE.BoxGeometry(1, 1, 1);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(0.5, 32, 32);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(0.5, 1, 32);
                break;
            case 'torus':
                geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
                break;
            default:
                return;
        }

        const mesh = new THREE.Mesh(geometry, material);
        
        // Increment counter for this shape type
        this.objectCount[shapeType]++;
        
        // Add name to the mesh
        mesh.name = `${shapeType}_${this.objectCount[shapeType]}`;
        
        // Add to scene and objects array
        this.scene.add(mesh);
        this.objects.push(mesh);

        // Update the objects list
        this.updateObjectsList();

        // Add lighting if it's the first object
        if (this.objects.length === 1) {
            this.setupLighting();
        }
    }

    updateObjectsList() {
        const objectsList = document.getElementById('objects-list');
        
        // Clear the current list
        objectsList.innerHTML = '';
        
        if (this.objects.length === 0) {
            objectsList.innerHTML = '<p class="empty-message">No objects in scene</p>';
            return;
        }

        // Add each object to the list
        this.objects.forEach((obj, index) => {
            const objectItem = document.createElement('div');
            objectItem.className = 'object-item';
            objectItem.innerHTML = `
                <span class="object-name">${obj.name}</span>
                <button class="delete-btn" data-index="${index}">×</button>
            `;
            objectsList.appendChild(objectItem);
        });

        // Add event listeners to delete buttons
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.deleteObject(index);
            });
        });
    }

    deleteObject(index) {
        // Remove from scene
        const object = this.objects[index];
        this.scene.remove(object);
        
        // Remove from objects array
        this.objects.splice(index, 1);
        
        // Update the objects list
        this.updateObjectsList();
    }

    setupShapeSelector() {
        const shapeSelect = document.getElementById('shape-select');
        shapeSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.addShape(e.target.value);
                // Reset select to default option
                e.target.value = '';
            }
        });
    }

    setupLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add point light
        const pointLight = new THREE.PointLight(0xff8c00, 0.5);
        pointLight.position.set(-5, 5, -5);
        this.scene.add(pointLight);
    }
}

// Initialize the editor when the page loads
window.addEventListener('load', () => {
    new Editor();
}); 
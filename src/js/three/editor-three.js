import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

class Editor {
    constructor() {
        this.arrowHelpers = null;
        this.isDragging = false;
        this.dragPlane = new THREE.Plane();
        this.dragOffset = new THREE.Vector3();
        this.intersectionPoint = new THREE.Vector3();
        this.dragStartPoint = new THREE.Vector2();
        this.dragMode = null;
        this.initialRotation = new THREE.Euler();
        this.initialScale = new THREE.Vector3();
        this.renderSettings = {
            showGrid: true,
            showHelpers: true,
            width: 1920,
            height: 1080
        };
        this.initialize();
        this.setupShapeSelector();
        this.setupRaycaster();
        this.objectCount = {
            box: 0,
            sphere: 0,
            cylinder: 0,
            cone: 0,
            torus: 0
        };
        this.history = [];
        this.currentHistoryIndex = -1;
        this.maxHistorySteps = 50;  // Maximum number of undo steps
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

        // Add arrow helpers
        this.createArrowHelpers();
        this.hideArrowHelpers(); // Hide initially

        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Modify mouse button controls
        this.controls.mouseButtons = {
            MIDDLE: THREE.MOUSE.ROTATE,
            RIGHT: THREE.MOUSE.PAN
        };
        
        // Set zoom to mouse wheel
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 1.0;

        // Add transform controls with better configuration
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            if (!event.value && this.selectedObject) {
                // Save state when transform control drag ends
                this.saveState('transform');
            }
        });
        
        // Add transform mode change listener
        this.transformControls.addEventListener('change', () => {
            if (this.selectedObject) {
                this.updatePropertiesPanel();
            }
        });
        
        // Adjust transform controls settings
        this.transformControls.setSize(0.7);
        this.transformControls.showX = true;
        this.transformControls.showY = true;
        this.transformControls.showZ = true;
        
        this.scene.add(this.transformControls);

        // Handle window resize
        window.addEventListener('resize', () => this.updateRendererSize());

        // Start animation loop
        this.animate();

        // Add selected object property
        this.selectedObject = null;

        // Bind event handlers
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);

        // Update keyboard event listener
        window.addEventListener('keydown', (event) => {
            if (!this.selectedObject) return;

            switch(event.key.toLowerCase()) {
                case 'escape':
                    this.clearSelection();
                    break;
                case 'g':
                    this.transformControls.setMode('translate');
                    break;
                case 'r':
                    this.transformControls.setMode('rotate');
                    break;
                case 's':
                    this.transformControls.setMode('scale');
                    break;
                case 'delete':
                    const index = this.objects.indexOf(this.selectedObject);
                    if (index !== -1) {
                        this.deleteObject(index);
                    }
                    break;
                case 'z':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.undo();
                    }
                    break;
            }
        });

        // Update mouse position tracking
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // Setup export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportDialog());
        }

        // Setup render settings button
        const renderSettingsBtn = document.getElementById('render-settings-btn');
        if (renderSettingsBtn) {
            renderSettingsBtn.addEventListener('click', () => this.showRenderSettings());
        }

        // Setup transform mode buttons
        const transformButtons = document.querySelectorAll('.transform-btn');
        transformButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.transformControls.setMode(mode);
                
                // Update active button state
                transformButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
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
        
        if (this.selectedObject) {
            // Update arrow helpers position
            Object.values(this.arrowHelpers).forEach(arrow => {
                arrow.position.copy(this.selectedObject.position);
            });
            
            // Update transform controls size based on distance
            const newSize = this.calculateControlsSize();
            this.transformControls.setSize(newSize);
            
            // Update properties panel if object is being transformed
            if (this.transformControls.dragging) {
                this.updatePropertiesPanel();
            }
        }
        
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

        // Save state after adding shape
        this.saveState('add');
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.isDragging) return; // Don't select new objects while dragging
            
            // Calculate mouse position in normalized device coordinates
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects(this.objects);

            if (intersects.length > 0) {
                this.selectObject(this.objects.indexOf(intersects[0].object));
            }
        });
    }

    selectObject(index) {
        // Clear previous selection
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
            this.transformControls.detach();
            this.hideArrowHelpers();
        }

        // Set new selection
        this.selectedObject = this.objects[index];
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x666666);
            this.transformControls.attach(this.selectedObject);
            
            // Set initial size based on distance
            const initialSize = this.calculateControlsSize();
            this.transformControls.setSize(initialSize);
            
            // Show and position arrow helpers at selected object
            this.showArrowHelpers();
            this.updateHelperPositions();
            
            // Update UI selection
            const objectItems = document.querySelectorAll('.object-item');
            objectItems.forEach((item, i) => {
                item.classList.toggle('selected', i === index);
            });

            // Update properties panel
            this.updatePropertiesPanel();
        }
    }

    clearSelection() {
        if (this.selectedObject) {
            this.selectedObject.material.emissive.setHex(0x000000);
            this.transformControls.detach();
            this.hideArrowHelpers();
            this.selectedObject = null;

            // Clear UI selection
            const objectItems = document.querySelectorAll('.object-item');
            objectItems.forEach(item => item.classList.remove('selected'));

            // Update properties panel
            this.updatePropertiesPanel();
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
            if (obj === this.selectedObject) {
                objectItem.classList.add('selected');
            }
            objectItem.innerHTML = `
                <span class="object-name">${obj.name}</span>
                <button class="delete-btn" data-index="${index}">×</button>
            `;
            objectsList.appendChild(objectItem);

            // Add click event for selecting object
            objectItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    this.selectObject(index);
                }
            });
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
        // Save state before deleting
        this.saveState('delete');
        
        // Remove from scene
        const object = this.objects[index];
        
        // Clear selection if deleting selected object
        if (object === this.selectedObject) {
            this.clearSelection();
        }
        
        this.scene.remove(object);
        this.objects.splice(index, 1);
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

    // Add new method to create arrow helpers
    createArrowHelpers() {
        const arrowLength = 2;
        const headLength = 0.4;
        const headWidth = 0.2;

        this.arrowHelpers = {
            x: new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 0, 0),
                arrowLength,
                0xff0000,
                headLength,
                headWidth
            ),
            y: new THREE.ArrowHelper(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 0),
                arrowLength,
                0x00ff00,
                headLength,
                headWidth
            ),
            z: new THREE.ArrowHelper(
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, 0),
                arrowLength,
                0x0000ff,
                headLength,
                headWidth
            )
        };

        // Add arrows to scene
        Object.values(this.arrowHelpers).forEach(arrow => this.scene.add(arrow));
    }

    // Add methods to show/hide arrow helpers
    showArrowHelpers() {
        Object.values(this.arrowHelpers).forEach(arrow => {
            arrow.visible = true;
        });
    }

    hideArrowHelpers() {
        Object.values(this.arrowHelpers).forEach(arrow => {
            arrow.visible = false;
        });
    }

    // Add this method to update the properties panel
    updatePropertiesPanel() {
        const propertiesContent = document.getElementById('properties-content');
        
        if (!this.selectedObject) {
            propertiesContent.innerHTML = '<p class="empty-message">No object selected</p>';
            return;
        }

        // Store current scroll position
        const scrollPosition = propertiesContent.scrollTop;

        propertiesContent.innerHTML = `
            <div class="property-group">
                <div class="property-group-title">Position</div>
                <div class="property-row">
                    <span class="property-label">X</span>
                    <input type="number" class="property-input" id="pos-x" value="${this.selectedObject.position.x.toFixed(2)}" step="0.1">
                </div>
                <div class="property-row">
                    <span class="property-label">Y</span>
                    <input type="number" class="property-input" id="pos-y" value="${this.selectedObject.position.y.toFixed(2)}" step="0.1">
                </div>
                <div class="property-row">
                    <span class="property-label">Z</span>
                    <input type="number" class="property-input" id="pos-z" value="${this.selectedObject.position.z.toFixed(2)}" step="0.1">
                </div>
            </div>
            <div class="property-group">
                <div class="property-group-title">Rotation (deg)</div>
                <div class="property-row">
                    <span class="property-label">X</span>
                    <input type="number" class="property-input" id="rot-x" value="${(this.selectedObject.rotation.x * 180 / Math.PI).toFixed(1)}" step="5">
                </div>
                <div class="property-row">
                    <span class="property-label">Y</span>
                    <input type="number" class="property-input" id="rot-y" value="${(this.selectedObject.rotation.y * 180 / Math.PI).toFixed(1)}" step="5">
                </div>
                <div class="property-row">
                    <span class="property-label">Z</span>
                    <input type="number" class="property-input" id="rot-z" value="${(this.selectedObject.rotation.z * 180 / Math.PI).toFixed(1)}" step="5">
                </div>
            </div>
            <div class="property-group">
                <div class="property-group-title">Scale</div>
                <div class="property-row">
                    <span class="property-label">X</span>
                    <input type="number" class="property-input" id="scale-x" value="${this.selectedObject.scale.x.toFixed(2)}" step="0.1" min="0.1">
                </div>
                <div class="property-row">
                    <span class="property-label">Y</span>
                    <input type="number" class="property-input" id="scale-y" value="${this.selectedObject.scale.y.toFixed(2)}" step="0.1" min="0.1">
                </div>
                <div class="property-row">
                    <span class="property-label">Z</span>
                    <input type="number" class="property-input" id="scale-z" value="${this.selectedObject.scale.z.toFixed(2)}" step="0.1" min="0.1">
                </div>
            </div>
            <div class="property-group">
                <div class="property-group-title">Material</div>
                <div class="property-row">
                    <span class="property-label">Type</span>
                    <select class="property-input" id="material-type">
                        <option value="standard" ${this.selectedObject.material instanceof THREE.MeshStandardMaterial ? 'selected' : ''}>Standard</option>
                        <option value="phong" ${this.selectedObject.material instanceof THREE.MeshPhongMaterial ? 'selected' : ''}>Phong</option>
                        <option value="basic" ${this.selectedObject.material instanceof THREE.MeshBasicMaterial ? 'selected' : ''}>Basic</option>
                        <option value="normal" ${this.selectedObject.material instanceof THREE.MeshNormalMaterial ? 'selected' : ''}>Normal</option>
                    </select>
                </div>
                <div class="property-row">
                    <span class="property-label">Wireframe</span>
                    <input type="checkbox" class="property-checkbox" id="wireframe-toggle" 
                        ${this.selectedObject.material.wireframe ? 'checked' : ''}>
                </div>
                <div class="property-row">
                    <span class="property-label">Color</span>
                    <input type="color" class="property-color" id="material-color" 
                        value="${'#' + this.selectedObject.material.color?.getHexString() || 'ff8c00'}"
                        ${this.selectedObject.material instanceof THREE.MeshNormalMaterial ? 'disabled' : ''}>
                </div>
            </div>
        `;

        // Restore scroll position
        propertiesContent.scrollTop = scrollPosition;

        // Setup all input handlers
        this.setupPropertyInputs();
        this.setupMaterialControls();
        
        // Add color change handler
        const colorPicker = document.getElementById('material-color');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                if (this.selectedObject && this.selectedObject.material.color) {
                    this.selectedObject.material.color.setStyle(e.target.value);
                }
            });
        }
    }

    // Add this method to handle property input changes
    setupPropertyInputs() {
        const inputs = document.querySelectorAll('.property-input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (!this.selectedObject) return;

                const value = parseFloat(e.target.value);
                const [property, axis] = e.target.id.split('-');

                switch(property) {
                    case 'pos':
                        this.selectedObject.position[axis] = value;
                        break;
                    case 'rot':
                        this.selectedObject.rotation[axis] = value * Math.PI / 180;
                        break;
                    case 'scale':
                        if (value > 0) {
                            this.selectedObject.scale[axis] = value;
                        }
                        break;
                }

                // Save state after property change
                this.saveState('modify');
            });
        });
    }

    // Add this method to the Editor class to handle material changes
    setupMaterialControls() {
        // Wireframe toggle
        const wireframeToggle = document.getElementById('wireframe-toggle');
        if (wireframeToggle) {
            wireframeToggle.addEventListener('change', () => {
                if (this.selectedObject) {
                    this.selectedObject.material.wireframe = wireframeToggle.checked;
                }
            });
        }

        // Material type selector
        const materialSelect = document.getElementById('material-type');
        if (materialSelect) {
            materialSelect.addEventListener('change', () => {
                if (!this.selectedObject) return;
                
                const type = materialSelect.value;
                const currentColor = this.selectedObject.material.color;
                let newMaterial;

                switch(type) {
                    case 'standard':
                        newMaterial = new THREE.MeshStandardMaterial({
                            color: currentColor,
                            metalness: 0.3,
                            roughness: 0.4
                        });
                        break;
                    case 'phong':
                        newMaterial = new THREE.MeshPhongMaterial({
                            color: currentColor,
                            shininess: 30
                        });
                        break;
                    case 'basic':
                        newMaterial = new THREE.MeshBasicMaterial({
                            color: currentColor
                        });
                        break;
                    case 'normal':
                        newMaterial = new THREE.MeshNormalMaterial();
                        break;
                }

                // Preserve wireframe state
                newMaterial.wireframe = this.selectedObject.material.wireframe;
                this.selectedObject.material = newMaterial;
            });
        }
    }

    // Add method to toggle transform mode
    setTransformMode(mode) {
        if (this.transformControls) {
            this.transformControls.setMode(mode);
        }
    }

    // Add method to update helper positions
    updateHelperPositions() {
        if (this.selectedObject && this.arrowHelpers) {
            Object.values(this.arrowHelpers).forEach(arrow => {
                arrow.position.copy(this.selectedObject.position);
            });
        }
    }

    // Add this new method
    startDrag(mode) {
        if (!this.selectedObject) return;
        
        this.isDragging = true;
        this.dragMode = mode;
        
        // Store initial values
        this.dragStartPoint.set(this.mouse.x, this.mouse.y);
        this.initialRotation.copy(this.selectedObject.rotation);
        this.initialScale.copy(this.selectedObject.scale);
        
        // Create a plane perpendicular to the camera
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        this.dragPlane.setFromNormalAndCoplanarPoint(
            cameraDirection,
            this.selectedObject.position
        );
        
        if (mode === 'translate') {
            // Calculate and store the offset between object and intersection point
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(this.mouse, this.camera);
            raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint);
            this.dragOffset.copy(this.selectedObject.position).sub(this.intersectionPoint);
        }
        
        // Add mousemove and mouseup listeners
        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
    }

    // Add drag move handler
    onDragMove = (event) => {
        if (!this.isDragging || !this.selectedObject) return;

        switch(this.dragMode) {
            case 'translate':
                this.handleTranslate();
                break;
            case 'rotate':
                this.handleRotate();
                break;
            case 'scale':
                this.handleScale();
                break;
        }

        this.updatePropertiesPanel();
        this.updateHelperPositions();
    }

    // Add new handler methods
    handleTranslate() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.mouse, this.camera);
        
        if (raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
            this.selectedObject.position.copy(this.intersectionPoint.add(this.dragOffset));
        }
    }

    handleRotate() {
        // Calculate rotation based on mouse movement from start point
        const deltaX = this.mouse.x - this.dragStartPoint.x;
        const deltaY = this.mouse.y - this.dragStartPoint.y;
        
        // Apply rotation around camera's up and right vectors
        const rotationSpeed = 5;
        this.selectedObject.rotation.x = this.initialRotation.x + deltaY * rotationSpeed;
        this.selectedObject.rotation.y = this.initialRotation.y + deltaX * rotationSpeed;
    }

    handleScale() {
        // Calculate scale based on mouse movement from start point
        const deltaY = this.mouse.y - this.dragStartPoint.y;
        
        // Apply uniform scaling
        const scaleFactor = 1 + deltaY * 2;
        const newScale = Math.max(0.1, this.initialScale.x * scaleFactor);
        
        this.selectedObject.scale.set(newScale, newScale, newScale);
    }

    // Add drag end handler
    onDragEnd = () => {
        if (this.isDragging) {
            // Save state after transformation
            this.saveState('transform');
        }
        
        this.isDragging = false;
        this.dragMode = null;
        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
    }

    // Add this method to calculate the distance-based size
    calculateControlsSize() {
        if (!this.selectedObject) return 0.7; // default size

        // Get camera distance to object
        const distance = this.camera.position.distanceTo(this.selectedObject.position);
        
        // Base size calculation (adjust these values to tune the scaling)
        const baseSize = 0.7;
        const scaleFactor = distance * 0.1;  // Increase size with distance
        const minSize = 0.5;                 // Minimum size
        const maxSize = 2.0;                 // Maximum size
        
        // Clamp the size between min and max
        return Math.max(minSize, Math.min(maxSize, baseSize + scaleFactor));
    }

    // Add these new methods
    showExportDialog() {
        // Create dialog elements
        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        
        const dialog = document.createElement('div');
        dialog.className = 'export-dialog';
        
        // Render the current view
        const imageUrl = this.renderToImage();
        
        dialog.innerHTML = `
            <h2>Export Viewport</h2>
            <img src="${imageUrl}" class="export-preview" />
            <div class="export-options">
                <button class="top-bar-btn" id="download-btn">Download</button>
                <button class="top-bar-btn" id="close-dialog-btn">Cancel</button>
            </div>
        `;
        
        // Add dialog to document
        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);
        
        // Setup event listeners
        const downloadBtn = dialog.querySelector('#download-btn');
        const closeBtn = dialog.querySelector('#close-dialog-btn');
        
        downloadBtn.addEventListener('click', () => {
            this.downloadImage(imageUrl);
            this.closeExportDialog(backdrop, dialog);
        });
        
        closeBtn.addEventListener('click', () => {
            this.closeExportDialog(backdrop, dialog);
        });
        
        backdrop.addEventListener('click', () => {
            this.closeExportDialog(backdrop, dialog);
        });
    }

    closeExportDialog(backdrop, dialog) {
        backdrop.remove();
        dialog.remove();
    }

    renderToImage() {
        // Store current renderer size
        const currentWidth = this.renderer.domElement.width;
        const currentHeight = this.renderer.domElement.height;
        
        // Set higher resolution for export
        this.renderer.setSize(currentWidth * 2, currentHeight * 2);
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Get the image data
        const imageUrl = this.renderer.domElement.toDataURL('image/png');
        
        // Restore original size
        this.renderer.setSize(currentWidth, currentHeight);
        
        return imageUrl;
    }

    downloadImage(imageUrl) {
        const link = document.createElement('a');
        link.download = 'viewport-export.png';
        link.href = imageUrl;
        link.click();
    }

    showRenderSettings() {
        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        
        const dialog = document.createElement('div');
        dialog.className = 'settings-dialog';
        
        dialog.innerHTML = `
            <h2>Render Settings</h2>
            <div class="settings-group">
                <div class="settings-row">
                    <span class="settings-label">Show Grid in Render</span>
                    <input type="checkbox" class="settings-checkbox" id="show-grid" 
                        ${this.renderSettings.showGrid ? 'checked' : ''}>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Show Helpers in Render</span>
                    <input type="checkbox" class="settings-checkbox" id="show-helpers" 
                        ${this.renderSettings.showHelpers ? 'checked' : ''}>
                </div>
            </div>
            <div class="settings-group">
                <div class="settings-row">
                    <span class="settings-label">Output Width</span>
                    <input type="number" class="settings-input" id="render-width" 
                        value="${this.renderSettings.width}" min="100" step="1">
                </div>
                <div class="settings-row">
                    <span class="settings-label">Output Height</span>
                    <input type="number" class="settings-input" id="render-height" 
                        value="${this.renderSettings.height}" min="100" step="1">
                </div>
            </div>
            <div class="dialog-buttons">
                <button class="top-bar-btn" id="save-settings">Save</button>
                <button class="top-bar-btn" id="cancel-settings">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);
        
        // Setup event listeners
        dialog.querySelector('#save-settings').addEventListener('click', () => {
            this.saveRenderSettings(dialog);
            this.closeDialog(backdrop, dialog);
        });
        
        dialog.querySelector('#cancel-settings').addEventListener('click', () => {
            this.closeDialog(backdrop, dialog);
        });
        
        backdrop.addEventListener('click', () => {
            this.closeDialog(backdrop, dialog);
        });
    }

    saveRenderSettings(dialog) {
        this.renderSettings = {
            showGrid: dialog.querySelector('#show-grid').checked,
            showHelpers: dialog.querySelector('#show-helpers').checked,
            width: parseInt(dialog.querySelector('#render-width').value),
            height: parseInt(dialog.querySelector('#render-height').value)
        };
    }

    closeDialog(backdrop, dialog) {
        backdrop.remove();
        dialog.remove();
    }

    // Update the renderToImage method to use render settings
    renderToImage() {
        // Store current states
        const currentWidth = this.renderer.domElement.width;
        const currentHeight = this.renderer.domElement.height;
        const gridVisible = this.scene.children.find(child => child instanceof THREE.GridHelper)?.visible;
        const helpersVisible = Object.values(this.arrowHelpers).map(helper => helper.visible);
        const axesHelperVisible = this.scene.children.find(child => child instanceof THREE.AxesHelper)?.visible;
        
        // Apply render settings
        this.renderer.setSize(this.renderSettings.width, this.renderSettings.height);
        
        // Show/hide grid and helpers based on settings
        if (!this.renderSettings.showGrid) {
            this.scene.children.forEach(child => {
                if (child instanceof THREE.GridHelper) {
                    child.visible = false;
                }
                if (child instanceof THREE.AxesHelper) {
                    child.visible = false;
                }
            });
        }
        
        if (!this.renderSettings.showHelpers) {
            Object.values(this.arrowHelpers).forEach(helper => {
                helper.visible = false;
            });
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Get the image data
        const imageUrl = this.renderer.domElement.toDataURL('image/png');
        
        // Restore original states
        this.renderer.setSize(currentWidth, currentHeight);
        
        // Restore visibility states
        if (!this.renderSettings.showGrid) {
            this.scene.children.forEach(child => {
                if (child instanceof THREE.GridHelper) {
                    child.visible = gridVisible;
                }
                if (child instanceof THREE.AxesHelper) {
                    child.visible = axesHelperVisible;
                }
            });
        }
        
        if (!this.renderSettings.showHelpers) {
            Object.values(this.arrowHelpers).forEach((helper, index) => {
                helper.visible = helpersVisible[index];
            });
        }
        
        return imageUrl;
    }

    // Add new method to save state
    saveState(action = 'unknown') {
        // Remove any future states if we're in the middle of the history
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history.splice(this.currentHistoryIndex + 1);
        }

        // Create a new state
        const state = {
            action: action,
            objects: this.objects.map(obj => ({
                position: obj.position.clone(),
                rotation: obj.rotation.clone(),
                scale: obj.scale.clone(),
                material: obj.material.clone(),
                geometry: obj.geometry.clone(),
                name: obj.name
            }))
        };

        // Add state to history
        this.history.push(state);
        this.currentHistoryIndex++;

        // Limit history size
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
            this.currentHistoryIndex--;
        }
    }

    // Add undo method
    undo() {
        if (this.currentHistoryIndex <= 0) return;

        this.currentHistoryIndex--;
        this.restoreState(this.history[this.currentHistoryIndex]);
    }

    // Add method to restore state
    restoreState(state) {
        // Clear current scene objects
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];

        // Restore objects from state
        state.objects.forEach(savedObj => {
            let geometry;
            switch(true) {
                case savedObj.geometry instanceof THREE.BoxGeometry:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
                    break;
                case savedObj.geometry instanceof THREE.SphereGeometry:
                    geometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case savedObj.geometry instanceof THREE.CylinderGeometry:
                    geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case savedObj.geometry instanceof THREE.ConeGeometry:
                    geometry = new THREE.ConeGeometry(0.5, 1, 32);
                    break;
                case savedObj.geometry instanceof THREE.TorusGeometry:
                    geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
                    break;
            }

            const mesh = new THREE.Mesh(geometry, savedObj.material);
            mesh.position.copy(savedObj.position);
            mesh.rotation.copy(savedObj.rotation);
            mesh.scale.copy(savedObj.scale);
            mesh.name = savedObj.name;

            this.scene.add(mesh);
            this.objects.push(mesh);
        });

        // Update UI
        this.updateObjectsList();
        if (this.selectedObject) {
            this.clearSelection();
        }
    }
}

// Initialize the editor when the page loads
window.addEventListener('load', () => {
    new Editor();
}); 
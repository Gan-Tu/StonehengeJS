/************************************* VARIABLES *************************************/

// Particle
var tick = 0;
var particleSystem;

// Three.js Rendering Logics
var container, stats;
var camera, controls, scene, renderer;
var textureLoader = new THREE.TextureLoader();;
var jsonLoader = new THREE.JSONLoader()
var clock = new THREE.Clock();
var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();

// Predefined Materials
var ballMaterial = new THREE.MeshPhongMaterial();

// Physics variables
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var margin = 0.05;
var convexBreaker = new THREE.ConvexObjectBreaker();


// Rigid bodies include all movable objects
var rigidBodies = [];
var pos = new THREE.Vector3();
var quat = new THREE.Quaternion();
var transformAux1 = new Ammo.btTransform();
var tempBtVec3_1 = new Ammo.btVector3( 0, 0, 0 );
var time = 0;
var objectsToRemove = [];
for ( var i = 0; i < 500; i++ ) {
    objectsToRemove[ i ] = null;
}
var numObjectsToRemove = 0;
var impactPoint = new THREE.Vector3();
var impactNormal = new THREE.Vector3();

/************************************* INITIALIZATIONS *************************************/

initGraphics();
createObjects();


// Initialize Graphics
function initGraphics() {

    // Initialize Graphics Canvas Container
    container.innerHTML = "";
    container = document.getElementById( 'container' );

    // Initialize Camera Settings
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    camera.position.set( -14, 8, 16 );

    // Initialize Scene
    scene = new THREE.Scene();
    scene.background = textureLoader.load( 'textures/dark-room.jpg' );

    // Initialize Orbit Controls
    controls = new THREE.OrbitControls( camera);
    controls.target.set( 0, 2, 0 );
    controls.update();

    // Initialize Web rendering
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild( renderer.domElement );

    // Initialize Ambient Lights
    var ambientLight = new THREE.AmbientLight( 0x707070 );
    scene.add( ambientLight );

    // Initialize Directional Lights
    var light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( -10, 18, 5 );
    light.castShadow = true;
    var d = 14;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;
    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;
    scene.add( light );

    // Initialize Stats
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );
}

/************************************* OBJECTS CREATION *************************************/

function createObjects() {
    place_ground();
    place_main_scene();
    place_teapot();
    place_bunny();
    place_tree();
    place_particles();
}



function place_ground() {
    pos.set( 0, - 0.5, 0 );
    quat.set( 0, 0, 0, 1 );
    var ground = createCylinderWithPhysics( 40, 1, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
    ground.receiveShadow = true;
    textureLoader.load( "textures/water/Water_1_M_Normal.jpg", function( texture ) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 40, 40 );
        ground.material.map = texture;
        ground.material.needsUpdate = true;
    } );
}


function place_main_scene() {
    // Tower 1
    var towerMass = _gui_controls.towerMass;
    var towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
    pos.set( -8, 5, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF0A024 ) );

    // Tower 2
    pos.set( 8, 5, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF4A321 ) );

    // Bridge
    var bridgeMass = _gui_controls.bridgeMass;
    var bridgeHalfExtents = new THREE.Vector3( 7, 0.2, 1.5 );
    pos.set( 0, 10.2, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( bridgeMass, bridgeHalfExtents, pos, quat, createMaterial( 0xB38835 ) );

    // Stones
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
    var numStones = _gui_controls.numStones;
    quat.set( 0, 0, 0, 1 );
    for ( var i = 0; i < numStones; i++ ) {
        pos.set( 0, 2, 15 * ( 0.5 - i / ( numStones + 1 ) ) );
        createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0xB0B0B0 ) );
    }

    // Mountain
    var mountainMass = _gui_controls.mountainMass;
    var mountainHalfExtents = new THREE.Vector3( 4, 5, 4 );
    pos.set( 5, mountainHalfExtents.y * 0.5, - 7 );
    quat.set( 0, 0, 0, 1 );
    var mountainPoints = [];
    mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
    mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
    mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
    mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
    mountainPoints.push( new THREE.Vector3( 0, mountainHalfExtents.y, 0 ) );
    var mountain = new THREE.Mesh( new THREE.ConvexGeometry( mountainPoints ), createMaterial( 0xFFB443 ) );
    mountain.position.copy( pos );
    mountain.quaternion.copy( quat );
    convexBreaker.prepareBreakableObject( mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( mountain );
}


function place_teapot() {
    var teapotMass = _gui_controls.teapotMass;
    pos.set(0, 11.2, 0);
    quat.set( 0, 0, 0, 1 );
    var threeGeo = new THREE.Geometry().fromBufferGeometry(
                new THREE.TeapotBufferGeometry(2, 5, true, true, true, false, true));
    var teapot = new THREE.Mesh( threeGeo, createMaterial (0xA2A09F));
    teapot.position.copy( pos );
    teapot.quaternion.copy( quat );
    convexBreaker.prepareBreakableObject( teapot, teapotMass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( teapot );

}

function place_bunny() {
    jsonLoader.load(
        'models/bunny.json',
        function ( geometry, materials ) {
            var bunny_mass = _gui_controls.bunnyMass;
            pos.set(0, -1.5, 15);
            quat.set( 0, 0, 0, 1 );

            var bunny_scale = 30.;
            geometry.scale(bunny_scale,bunny_scale,bunny_scale);

            var bunny;

            textureLoader.load( "textures/metal.jpg",
                function( texture )
            {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set( 40, 40 );
                bunny = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
                bunny.material.map = texture;
                bunny.position.copy( pos );
                bunny.quaternion.copy( quat );
                convexBreaker.prepareBreakableObject( bunny, bunny_mass, new THREE.Vector3(), new THREE.Vector3(), true );
                createDebrisFromBreakableObject( bunny );
            } );
            createDebrisFromBreakableObject( bunny );
        }
    );
}

function place_tree() {
    jsonLoader.load(
        'models/tree.json',
        function ( geometry, materials ) {
            var tree_mass = _gui_controls.treeMass;
            pos.set(0, -1.5, 25);
            quat.set( 0, 0, 0, 1 );

            var tree_scale = 10.;
            geometry.scale(tree_scale,tree_scale,tree_scale);

            var tree;

            textureLoader.load( "textures/terrain/grasslight-big.jpg",
                function( texture )
            {
                console.log(texture);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set( 40, 40 );
                tree = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
                tree.material.map = texture;
                tree.position.copy( pos );
                tree.quaternion.copy( quat );
                convexBreaker.prepareBreakableObject( tree, tree_mass, new THREE.Vector3(), new THREE.Vector3(), true );
                createDebrisFromBreakableObject( tree );
            } );
        }
    );
}

function place_particles() {
    particleSystem = new THREE.GPUParticleSystem( {
        maxParticles: 250000
    } );
    scene.add( particleSystem );
}

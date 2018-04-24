/************************************* VARIABLES *************************************/

// Experiment

var points;


// Particle
var tick = 0;
var particleSystem;

// Three.js Rendering Logics
var container;
var stats;
var camera, controls, scene, renderer;
var textureLoader = new THREE.TextureLoader();
var jsonLoader = new THREE.JSONLoader();
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
var convexBreaker = new THREE.ConvexObjectBreaker(0.02, 0.001);


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

init(); 

function init() {
    initGraphics();
    createObjects();
}

// Initialize Graphics
function initGraphics() {

    // Initialize Graphics Canvas Container
    container = document.getElementById( 'container' );
    container.innerHTML = "";

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
    // place bunny
    place_mesh_with_texture(    mesh_path = 'models/bunny.json', 
                                texture_path = 'textures/metal.jpg', 
                                pos = new THREE.Vector3(0, -1.5, 15), 
                                quat = new THREE.Vector4( 0, 0, 0, 1 ), 
                                mesh_scale = 30, 
                                mass = _gui_controls.bunnyMass
                            );
    // place tree
    place_mesh_with_texture(    mesh_path = 'models/tree.json', 
                                texture_path = 'textures/terrain/grasslight-big.jpg', 
                                pos = new THREE.Vector3(10, -1.5, 25), 
                                quat = new THREE.Vector4( 0, 0, 0, 1 ), 
                                mesh_scale = 10., 
                                mass =_gui_controls.treeMass
                            );
    
    // place rock stone
    place_mesh_with_texture(    mesh_path = 'models/stone2.json', 
                                texture_path = 'textures/stone.jpg', 
                                pos = new THREE.Vector3(-20, 0, 20), 
                                quat = quat, 
                                mesh_scale = 0.01, 
                                mass = 200
                            );

    place_particles();
    place_teapot_particle_mesh();
}

function place_ground() {
    pos.set( 0, - 0.5, 0 );
    quat.set( 0, 0, 0, 1 );
    var ground = createCylinderWithPhysics( 40, 1, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
    ground.receiveShadow = true;
    textureLoader.load( "textures/water/Water_1_M_Normal.jpg", function( texture ) {
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
    var teapot_pos = new THREE.Vector3(0, 11.2, 0);
    var teapot_quat = new THREE.Vector4( 0, 0, 0, 1 );

    var threeGeo = new THREE.Geometry().fromBufferGeometry(
                new THREE.TeapotBufferGeometry(2, 5, true, true, true, false, true));
    var teapot = new THREE.Mesh( threeGeo, createMaterial (0xA2A09F));
    teapot.position.copy( teapot_pos );
    teapot.quaternion.copy( teapot_quat );
    convexBreaker.prepareBreakableObject( teapot, teapotMass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( teapot );

}


function place_particles() {
    particleSystem =  new THREE.GPUParticleSystem( {
        maxParticles: 250000
    });
    scene.add( particleSystem );
}


function place_teapot_particle_mesh() {
    var particles = 50000;
    var geometry = new THREE.BufferGeometry();
    var positions = [];
    var colors = [];
    var color = new THREE.Color();
    var n = 20, n2 = n / 2; // particles spread in the cube

    var threeGeo = new THREE.TeapotBufferGeometry(2, 5, true, true, true, false, true)

    for ( var i = 0; i < threeGeo.attributes.position.array.length; i += 3 ) {
        // positions
        
        var x = 10 + threeGeo.attributes.position.array[i];//Math.random() * n - n2 + 40;
        var y = 15 + threeGeo.attributes.position.array[i+1];//Math.random() * n - n2 + 40;
        var z = threeGeo.attributes.position.array[i+2];//Math.random() * n - n2 + 40;


        positions.push( x, y, z );

        // colors
        var vx = ( x / n ) + 1.5;
        var vy = ( y / n ) + 1.5;
        var vz = ( z / n ) + 1.5;
        color.setRGB( vx, vy, vz );
        colors.push( color.r, color.g, color.b );
    }
    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    var material = new THREE.PointsMaterial( { 
            size: 0.5, 
            map: textureLoader.load(
                "textures/ps_ball.png"
              ),
            blending: THREE.AdditiveBlending,
            transparent: true
        } );

    points = new THREE.Points( geometry, material );

    points.name = "experiment";
    scene.add( points );
}


function place_mesh_with_texture(mesh_path, texture_path, pos, quat, 
                                mesh_scale, mass) {
    jsonLoader.load(
        mesh_path,
        function (geometry, material) {
            geometry.scale(mesh_scale, mesh_scale, mesh_scale);
            textureLoader.load( texture_path,
                function( texture )
            {
                var mesh_obj;
                var mesh_material = new THREE.MeshPhongMaterial( { map: texture });
                mesh_obj = new THREE.Mesh( geometry, mesh_material );
                mesh_obj.position.copy( pos );
                mesh_obj.quaternion.copy( quat );
                convexBreaker.prepareBreakableObject( mesh_obj, mass, new THREE.Vector3(), new THREE.Vector3(), true );
                createDebrisFromBreakableObject( mesh_obj );
            } );
        }
    );
}
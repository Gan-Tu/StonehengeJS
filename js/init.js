/************************************* VARIABLES *************************************/

// Particle Collapse

var points = [];
var move_points = false;

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

// Object Creation
var collapsable_object_creation_fn = {
    "outer_ring" : place_outer_ring,
    "outer_ceiling" : place_outer_ceiling,
    "inter_ring" : place_inter_ring,
    "centerpiece" : function() {
          place_centerpiece(period=0, radius=10);
          place_centerpiece(period=1.25, radius=9);
          place_centerpiece(period=-1.25, radius=9);
          place_centerpiece(period=2.25, radius=9);
          place_centerpiece(period=-2.25, radius=9);
    },
    "centerceiling" : function() {
          place_centerceiling(period=0, radius=10);
          place_centerceiling(period=1.25, radius=9);
          place_centerceiling(period=-1.25, radius=9);
          place_centerceiling(period=2.25, radius=9);
          place_centerceiling(period=-2.25, radius=9);
    },
    "centerblock" : place_centerblock,
    // "tower1" : place_tower1,
    // "tower2" : place_tower2,
    // "bridge": place_bridge,
    // "stones": place_initial_stones,
    // "mountain": place_mountain,
    "teapot": function() {
        place_teapot(name="teapot")
    },
    "bunny": function() {
        place_mesh_with_texture(    mesh_path = 'models/bunny.json',
                                    texture_path = 'textures/metal.jpg',
                                    pos = new THREE.Vector3(-10, -1, 0),
                                    quat = new THREE.Vector4( 0, 0, 0, 1 ),
                                    mesh_scale = 30,
                                    mass = _gui_controls.bunnyMass,
                                    name = "bunny"
                                );
    },
    // "tree": function() {
    //     place_mesh_with_texture(    mesh_path = 'models/tree.json',
    //                                 texture_path = 'textures/terrain/grasslight-big.jpg',
    //                                 pos = new THREE.Vector3(10, -2, 10),
    //                                 quat = new THREE.Vector4( 0, 0, 0, 1 ),
    //                                 mesh_scale = 10.,
    //                                 mass =_gui_controls.treeMass,
    //                                 name = "tree"
    //                             );
    // },
    // "rock-stone": function() {
    //     place_mesh_with_texture(    mesh_path = 'models/stone2.json',
    //                                 texture_path = 'textures/stone.jpg',
    //                                 pos = new THREE.Vector3(-20, 0, 20),
    //                                 quat = quat,
    //                                 mesh_scale = 0.01,
    //                                 mass = 400,
    //                                 name = "rock-stone"
    //                             );
    // }
};

// Material
var stone_material;

// Sound
var sound, audioLoader;

/************************************* INITIALIZATOIN *************************************/

init();

function init() {
    initGraphics();
    initSound();
    place_ground();
    place_particles();

    textureLoader.load( 'textures/stone4.jpg', function( texture ) {
        stone_material = new THREE.MeshPhongMaterial( { map: texture });
        // Create Objects in the Scene that can collapse into particles
        for (var obj in collapsable_object_creation_fn) {
            collapsable_object_creation_fn[obj]();
        }
    } );


    _gui_p = gui.addFolder("Particle Objects");
    _gui_p.add(_gui_controls, 'chosen_object',
                 Object.keys(collapsable_object_creation_fn)).name("Object Chosen:");

    _gui_p.add(_gui_controls, 'collapse').name("Explode Object!");


    _gui_controls.add_object_by_name = function() {
        if (this.chosen_object) {
            var obj = scene.getObjectByName(this.chosen_object);
            if (!obj) {
                collapsable_object_creation_fn[this.chosen_object]();
            }
        }
    }
    _gui_p.add(_gui_controls, 'add_object_by_name').name("Put Back Object!");
    _gui_p.open();


    // GUI Reload
    gui.add(_gui_controls, 'reload').name("Reload Scene");
}

// Initialize Graphics
function initGraphics() {

    // Initialize Graphics Canvas Container
    container = document.getElementById( 'container' );
    container.innerHTML = "";

    // Initialize Camera Settings
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    camera.position.set( -30, 30, -5);

    // Initialize Scene
    scene = new THREE.Scene();
    scene.background = textureLoader.load( 'textures/sky.jpg' );

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


// Initialize Sound
function initSound() {
    // create an AudioListener and add it to the camera
    var listener = new THREE.AudioListener();
    camera.add( listener );

    // create a global audio source
    sound = new THREE.Audio( listener );

    // load a sound and set it as the Audio object's buffer
    audioLoader = new THREE.AudioLoader();
    audioLoader.load( 'models/mysterious_floating.mp3', function( buffer ) {
        sound.setBuffer( buffer );
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });

    // GUI Audio
    _gui_controls.playSound = function() {
        sound.play();
    };
    _gui_controls.stopSound = function() {
        sound.stop();
    };
    _gui_audio = gui.addFolder("Audio")
    _gui_audio.add(_gui_controls, 'playSound').name("Play Audio");
    _gui_audio.add(_gui_controls, 'stopSound').name("Stop Audio");
    _gui_audio.open();

}
/************************************* STONEHENGE FUNCTIONS *************************************/

function place_outer_ring() {
    var quat = new THREE.Quaternion();
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 0.75, 4, 1.25 );
    var radius = 20.0;
    for (var i = 0; i < 30; i++) {
        var period = i * 2.0 * Math.PI / 30.0;
        pos.set( radius * Math.cos(period), 0.0,  radius * Math.sin(period));
        quat.set( 0, 0, 0, 1 );
        quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * (30.0 - i) * Math.PI / 30.0);
        createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "outer_ring");
    }
}

function place_outer_ceiling() {
    var quat = new THREE.Quaternion();
  var stoneMass = _gui_controls.stoneMass;
  var stoneHalfExtents = new THREE.Vector3( 0.75, 0.5, 1.95 );
  var radius = 20.0;
  var offset = Math.PI / 30.0
  for (var i = 0; i < 30; i++) {
      var period = i * 2.0 * Math.PI / 30.0 + offset;
      pos.set( radius * Math.cos(period), 8.0,  radius * Math.sin(period));
      quat.set( 0, 0, 0, 1 );
      quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * (30.0 - i) * Math.PI / 30.0 - offset);
      createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "outer_ceiling");
  }
}

function place_inter_ring() {
    var quat = new THREE.Quaternion();
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 0.15, 2, 0.35 );
    var radius = 15.0;
    for (var i = 0; i < 60; i++) {
        var period = i * 2.0 * Math.PI / 60.0;
        pos.set( radius * Math.cos(period), 0.0,  radius * Math.sin(period));
        quat.set( 0, 0, 0, 1 );
        quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * (60.0 - i) * Math.PI / 60.0);
        createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "inter_ring");
    }
}

function place_centerpiece(period, radius) {
    var quat = new THREE.Quaternion();

    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 1, 4.5, 1.5 );
    pos.set( radius * Math.cos(period + 0.1), 0.0,  radius * Math.sin(period + 0.1));
    quat.set( 0, 0, 0, 1 );
    quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * Math.PI - period - 0.1);
    createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "centerpiece");

    pos.set( radius * Math.cos(period - 0.1), 0.0,  radius * Math.sin(period - 0.1));
    quat.set( 0, 0, 0, 1 );
    quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * Math.PI - period + 0.1);
    createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "centerpiece");
}

function place_centerceiling(period, radius) {
    var quat = new THREE.Quaternion();
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 1.5, 0.75, 3 );
    pos.set( radius * Math.cos(period), 10.0,  radius * Math.sin(period));
    quat.set( 0, 0, 0, 1 );
    quat.setFromAxisAngle(new THREE.Vector3(0.0, 1.0, 0.0), 2.0 * Math.PI - period);
    createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "centerceiling");
}

function place_centerblock() {
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 0.5, 2, 1 );
    pos.set( 5.0, 0,  0);
    quat.set( 0, 0, 0, 1 );
    createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "centerblock");
}

/************************************* OBJECTS CREATION *************************************/

function place_ground() {
    pos.set( 0, - 0.5, 0 );
    quat.set( 0, 0, 0, 1 );
    var ground = createCylinderWithPhysics( 40, 1, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
    ground.receiveShadow = true;
    textureLoader.load( "textures/terrain/grasslight-big.jpg", function( texture ) {
        ground.material.map = texture;
        ground.material.needsUpdate = true;
    } );
}

function place_tower1() {
    var towerMass = _gui_controls.towerMass;
    var towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
    pos.set( -8, 5, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF0A024 ), "tower1" );
}

function place_tower2() {
    var towerMass = _gui_controls.towerMass;
    var towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
    pos.set( 8, 5, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF4A321 ), "tower2" );
}

function place_bridge() {
    var bridgeMass = _gui_controls.bridgeMass;
    var bridgeHalfExtents = new THREE.Vector3( 7, 0.2, 1.5 );
    pos.set( 0, 10.2, 0 );
    quat.set( 0, 0, 0, 1 );
    createObject( bridgeMass, bridgeHalfExtents, pos, quat, createMaterial( 0xB38835 ), "bridge");
}

function place_initial_stones() {
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
    var numStones = _gui_controls.initNumStones;
    quat.set( 0, 0, 0, 1 );
    for ( var i = 0; i < numStones; i++ ) {
        pos.set( 0, 2, 15 * ( 0.5 - i / ( numStones + 1 ) ) );
        createObject( stoneMass, stoneHalfExtents, pos, quat, stone_material, "stones");
    }
}

function place_mountain() {
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
    mountain.name = "mountain";
    convexBreaker.prepareBreakableObject( mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( mountain );
}

function place_teapot() {
    var teapotMass = _gui_controls.teapotMass;
    var teapot_pos = new THREE.Vector3(0, 0, 0);
    var teapot_quat = new THREE.Vector4( 0, 0, 0, 1 );

    var threeGeo = new THREE.Geometry().fromBufferGeometry(
                new THREE.TeapotBufferGeometry(2, 5, true, true, true, false, true));
    var teapot = new THREE.Mesh( threeGeo, createMaterial (0xA2A09F));
    teapot.name = "teapot";
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


function place_mesh_as_particles(mesh) {
    var geometry = new THREE.BufferGeometry();
    var positions = [];
    var colors = [];
    var color = new THREE.Color();
    var n = 20, n2 = n / 2; // particles spread in the cube

    var threeGeo = new THREE.BufferGeometry().fromGeometry(mesh.geometry);

    for ( var i = 0; i < threeGeo.attributes.position.array.length; i += 3 ) {
        // positions

        var x = threeGeo.attributes.position.array[i];
        var y = threeGeo.attributes.position.array[i+1];
        var z = threeGeo.attributes.position.array[i+2];


        positions.push( x, y, z );

        // colors
        var vx = ( x / n ) + 1.5;
        var vy = ( y / n ) + 1.5;
        var vz = ( z / n ) + 1.5;
        color.setRGB( vx, vy, vz );
        colors.push( color.r, color.g, color.b );
    }

    // Increase the number of particles
    while (positions.length < 400) {
        var i = Math.floor(Math.random() * positions.length / 3);
        positions.push(
            positions[i] + Math.random() * 3 - 1.5,
            positions[i+1] + Math.random() * 3 - 1.5,
            positions[i+2] + Math.random() * 3 - 1.5);
        colors.push( colors[i], colors[i+1], colors[i+2] );
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

    var mesh_points = new THREE.Points( geometry, material );
    mesh_points.position.copy(mesh.position);
    scene.add( mesh_points );

    points.push( mesh_points );
}


function place_mesh_with_texture(mesh_path, texture_path, pos, quat,
                                 mesh_scale, mass, name) {
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
                mesh_obj.name = name;
                convexBreaker.prepareBreakableObject( mesh_obj, mass, new THREE.Vector3(), new THREE.Vector3(), true );
                createDebrisFromBreakableObject( mesh_obj );
            } );
        }
    );
}

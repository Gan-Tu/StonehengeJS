// GUIs
var tick = 0;
var GUI_Control = function() {
    this.ballMass = 35;
    this.ballRadius = 0.4;
    this.ballColor = '#202020';

    this.towerMass = 1000;
    this.bridgeMass = 250;
    this.stoneMass = 120;
    this.numStones = 5;
    this.mountainMass = 860;
    this.teapotMass = 300;

    this.numStonesAdd = 2;

    this.addStone = function add_stones() {
        var stoneMass = _gui_controls.stoneMass;
        var stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
        quat.set( 0, Math.random(), 0, 1 );
        var num = this.numStonesAdd;

        for ( var i = 0; i < num; i++ ) {
            pos.set( Math.random() * 10 - 5,
                    Math.random() * 10 - 5,
                    15 * ( Math.random() - i / ( num + 1 ) ) );
            createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0xB0B0B0 ) );
        }
    };
}


var _gui_controls = new GUI_Control();
var gui = new dat.GUI();


_guid_ball = gui.addFolder("Ball Parameters")

var gui_ball_color = _guid_ball.add(_gui_controls, 'ballColor').name("Ball Color");
_guid_ball.add(_gui_controls, 'ballMass', 5, 50, 1).name("Ball Mass");
_guid_ball.add(_gui_controls, 'ballRadius', 0.05, 2, 0.01).name("Ball Radius");
_guid_ball.open();


_guid_scene = gui.addFolder("Scene Objects")
_guid_scene.add(_gui_controls, 'towerMass', 100, 2000, 50).name("Tower Mass");
_guid_scene.add(_gui_controls, 'bridgeMass', 10, 500, 10).name("Bridge Mass");
_guid_scene.add(_gui_controls, 'stoneMass', 10, 500, 10).name("Stone Mass");
_guid_scene.add(_gui_controls, 'mountainMass', 100, 2000, 10).name("Mountain Mass");
_guid_scene.add(_gui_controls, 'teapotMass', 100, 2000, 10).name("Teapot Mass");
_guid_scene.open();

_guid_add = gui.addFolder("Add Things")
_guid_add.add(_gui_controls, 'numStonesAdd', 1, 5, 1).name("Number of Stones to Add");
_guid_add.add(_gui_controls, 'addStone');
_guid_add.open();

// Disable event listeners on menu
gui.domElement.addEventListener('mousedown', _stopPropagation);

function _stopPropagation(evt) {
    evt.stopPropagation();
}

// PARTICLES
var container, stats;
var camera, controls, scene, renderer;
var textureLoader;
var clock = new THREE.Clock();
var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var ballMaterial = new THREE.MeshPhongMaterial();



// Physics variables
var gravityConstant = 7.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var physicsWorld;
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

// Particle Cow
var avgVertexNormals = [];
var avgVertexCount = [];
var doExplode = true;
var sphere;


init();
animate();

function init() {

    initGraphics();
    initPhysics();
    createObjects();
    initInput();

}

function initGraphics() {
    container = document.getElementById( 'container' );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.2, 2000 );
    scene = new THREE.Scene();
    scene.background = new THREE.TextureLoader().load( 'textures/dark-room.jpg' );

    camera.position.set( -14, 8, 16 );

    controls = new THREE.OrbitControls( camera);
    controls.target.set( 0, 2, 0 );
    controls.update();

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;

    textureLoader = new THREE.TextureLoader();

    var ambientLight = new THREE.AmbientLight( 0x707070 );
    scene.add( ambientLight );

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

    container.innerHTML = "";
    container.appendChild( renderer.domElement );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
}

function initPhysics() {
    // Physics configuration
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    physicsWorld.setGravity( new Ammo.btVector3( 0, - gravityConstant, 0 ) );
}

function createObject( mass, halfExtents, pos, quat, material ) {
    var object = new THREE.Mesh(
        new THREE.BoxGeometry(  halfExtents.x * 2,
                                halfExtents.y * 2,
                                halfExtents.z * 2 ), material );
    object.position.copy( pos );
    object.quaternion.copy( quat );
    convexBreaker.prepareBreakableObject( object, mass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( object );
}

function createObjects() {
    // Ground
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

    //Bridge
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

    // Teapot 

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

    // Bunny

    (new THREE.JSONLoader()).load(
        'models/bunny.json',
        function ( geometry, materials ) {
            var bunny_mass = 300;
            pos.set(5, -1.5, 15);
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

    // Tree
    (new THREE.JSONLoader()).load(
        'models/tree.json',
        function ( geometry, materials ) {
            var tree_mass = 300;
            pos.set(5, -1.5, 25);
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

    particleSystem = new THREE.GPUParticleSystem( {
        maxParticles: 250000
    } );
    scene.add( particleSystem );
    options = {
        position: new THREE.Vector3(10,10,10),
        positionRandomness: .3,
        velocity: new THREE.Vector3(),
        velocityRandomness: .5,
        color: 0xaa88ff,
        colorRandomness: .2,
        turbulence: 0,
        lifetime: 2,
        size: 5,
        sizeRandomness: 1
    };
    spawnerOptions = {
        spawnRate: 15000,
        horizontalSpeed: 1.5,
        verticalSpeed: 1.33,
        timeScale: 1
    };
    //
    _gui_particles = gui.addFolder("Particles")
    _gui_particles.add( options, "velocityRandomness", 0, 3 );
    _gui_particles.add( options, "positionRandomness", 0, 3 );
    _gui_particles.add( options, "size", 1, 20 );
    _gui_particles.add( options, "sizeRandomness", 0, 25 );
    _gui_particles.add( options, "colorRandomness", 0, 1 );
    _gui_particles.add( options, "lifetime", .1, 10 );
    _gui_particles.add( options, "turbulence", 0, 1 );
    _gui_particles.add( spawnerOptions, "spawnRate", 10, 30000 );
    _gui_particles.add( spawnerOptions, "timeScale", -1, 1 );
}

function createParalellepipedWithPhysics( sx, sy, sz, mass, pos, quat, material ) {
    var object = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
    var shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
    shape.setMargin( margin );
    createRigidBody( object, shape, mass, pos, quat );
    return object;
}

function createCylinderWithPhysics( radius, height, mass, pos, quat, material ) {
    object = new THREE.Mesh( new THREE.CylinderGeometry( radius, radius, height, 20, 1 ), material );
    shape = new Ammo.btCylinderShape( new Ammo.btVector3( radius, height * 0.5, radius ) );
    shape.setMargin(margin);
    createRigidBody( object, shape, mass, pos, quat );
    return object;
}

function createDebrisFromBreakableObject( object ) {
    object.castShadow = true;
    object.receiveShadow = true;
    var shape = createConvexHullPhysicsShape( object.geometry.vertices );
    shape.setMargin( margin );
    var body = createRigidBody( object, shape, object.userData.mass, null, null, object.userData.velocity, object.userData.angularVelocity );
    // Set pointer back to the three object only in the debris objects
    var btVecUserData = new Ammo.btVector3( 0, 0, 0 );
    btVecUserData.threeObject = object;
    body.setUserPointer( btVecUserData );
}

function removeDebris( object ) {
    scene.remove( object );
    physicsWorld.removeRigidBody( object.userData.physicsBody );
}

function createConvexHullPhysicsShape( points ) {
    var shape = new Ammo.btConvexHullShape();
    for ( var i = 0, il = points.length; i < il; i++ ) {
        var p = points[ i ];
        this.tempBtVec3_1.setValue( p.x, p.y, p.z );
        var lastOne = ( i === ( il - 1 ) );
        shape.addPoint( this.tempBtVec3_1, lastOne );
    }
    return shape;
}

function createRigidBody( object, physicsShape, mass, pos, quat, vel, angVel ) {
    if ( pos ) {
        object.position.copy( pos );
    }
    else {
        pos = object.position;
    }
    if ( quat ) {
        object.quaternion.copy( quat );
    }
    else {
        quat = object.quaternion;
    }
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    var motionState = new Ammo.btDefaultMotionState( transform );
    var localInertia = new Ammo.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );
    var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    var body = new Ammo.btRigidBody( rbInfo );
    body.setFriction( 0.5 );
    if ( vel ) {
        body.setLinearVelocity( new Ammo.btVector3( vel.x, vel.y, vel.z ) );
    }
    if ( angVel ) {
        body.setAngularVelocity( new Ammo.btVector3( angVel.x, angVel.y, angVel.z ) );
    }
    object.userData.physicsBody = body;
    object.userData.collided = false;
    scene.add( object );
    if ( mass > 0 ) {
        rigidBodies.push( object );
        // Disable deactivation
        body.setActivationState( 4 );
    }
    physicsWorld.addRigidBody( body );
    return body;
}

function createRandomColor() {
    return Math.floor( Math.random() * ( 1 << 24 ) );
}

function createMaterial( color ) {
    color = color || createRandomColor();
    return new THREE.MeshPhongMaterial( { color: color } );
}

function initInput() {
    window.addEventListener( 'mousedown', function( event ) {
        mouseCoords.set(
            ( event.clientX / window.innerWidth ) * 2 - 1,
            - ( event.clientY / window.innerHeight ) * 2 + 1
        );
        raycaster.setFromCamera( mouseCoords, camera );

        var ball = new THREE.Mesh( new THREE.SphereGeometry( _gui_controls.ballRadius, 14, 10 ), ballMaterial );

        textureLoader.load( "textures/marble.jpg", function( texture ) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set( 40, 40 );
            ball.material.map = texture;
            ball.material.needsUpdate = true;
        } );

        ball.castShadow = true;
        ball.receiveShadow = true;
        var ballShape = new Ammo.btSphereShape( _gui_controls.ballRadius );
        ballShape.setMargin( margin );
        pos.copy( raycaster.ray.direction );
        pos.add( raycaster.ray.origin );
        quat.set( 0, 0, 0, 1 );
        var ballBody = createRigidBody( ball, ballShape, _gui_controls.ballMass, pos, quat );
        pos.copy( raycaster.ray.direction );
        pos.multiplyScalar( 24 );
        ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    }, false );
}

function updatePhysics( deltaTime ) {
    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );
    // Update rigid bodies
    for ( var i = 0, il = rigidBodies.length; i < il; i++ ) {
        var objThree = rigidBodies[ i ];
        var objPhys = objThree.userData.physicsBody;
        var ms = objPhys.getMotionState();
        if ( ms ) {
            ms.getWorldTransform( transformAux1 );
            var p = transformAux1.getOrigin();
            var q = transformAux1.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );
            objThree.userData.collided = false;
        }
    }
    for ( var i = 0, il = dispatcher.getNumManifolds(); i < il; i ++ ) {
        var contactManifold = dispatcher.getManifoldByIndexInternal( i );
        var rb0 = contactManifold.getBody0();
        var rb1 = contactManifold.getBody1();
        var threeObject0 = Ammo.castObject( rb0.getUserPointer(), Ammo.btVector3 ).threeObject;
        var threeObject1 = Ammo.castObject( rb1.getUserPointer(), Ammo.btVector3 ).threeObject;
        if ( ! threeObject0 && ! threeObject1 ) {
            continue;
        }
        var userData0 = threeObject0 ? threeObject0.userData : null;
        var userData1 = threeObject1 ? threeObject1.userData : null;
        var breakable0 = userData0 ? userData0.breakable : false;
        var breakable1 = userData1 ? userData1.breakable : false;
        var collided0 = userData0 ? userData0.collided : false;
        var collided1 = userData1 ? userData1.collided : false;
        if ( ( ! breakable0 && ! breakable1 ) || ( collided0 && collided1 ) ) {
            continue;
        }
        var contact = false;
        var maxImpulse = 0;
        for ( var j = 0, jl = contactManifold.getNumContacts(); j < jl; j ++ ) {
            var contactPoint = contactManifold.getContactPoint( j );
            if ( contactPoint.getDistance() < 0 ) {
                contact = true;
                var impulse = contactPoint.getAppliedImpulse();
                if ( impulse > maxImpulse ) {
                    maxImpulse = impulse;
                    var pos = contactPoint.get_m_positionWorldOnB();
                    var normal = contactPoint.get_m_normalWorldOnB();
                    impactPoint.set( pos.x(), pos.y(), pos.z() );
                    impactNormal.set( normal.x(), normal.y(), normal.z() );
                }
                break;
            }
        }
        // If no point has contact, abort
        if ( ! contact ) {
            continue;
        }
        // Subdivision
        var fractureImpulse = 250;
        if ( breakable0 && !collided0 && maxImpulse > fractureImpulse ) {
            var debris = convexBreaker.subdivideByImpact( threeObject0, impactPoint, impactNormal , 1, 2, 1.5 );
            var numObjects = debris.length;
            for ( var j = 0; j < numObjects; j++ ) {
                createDebrisFromBreakableObject( debris[ j ] );
            }
            objectsToRemove[ numObjectsToRemove++ ] = threeObject0;
            userData0.collided = true;
        }
        if ( breakable1 && !collided1 && maxImpulse > fractureImpulse ) {
            var debris = convexBreaker.subdivideByImpact( threeObject1, impactPoint, impactNormal , 1, 2, 1.5 );
            var numObjects = debris.length;
            for ( var j = 0; j < numObjects; j++ ) {
                createDebrisFromBreakableObject( debris[ j ] );
            }
            objectsToRemove[ numObjectsToRemove++ ] = threeObject1;
            userData1.collided = true;
        }
    }
    for ( var i = 0; i < numObjectsToRemove; i++ ) {
        removeDebris( objectsToRemove[ i ] );
    }
    numObjectsToRemove = 0;
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}

function render() {
    var deltaTime = clock.getDelta();
    updatePhysics( deltaTime );


    var delta = deltaTime * spawnerOptions.timeScale;
    tick += delta;
    if ( tick < 0 ) tick = 0;
    if ( delta > 0 ) {
        // options.position.x = Math.sin( tick * spawnerOptions.horizontalSpeed ) * 20;
        // options.position.y = Math.sin( tick * spawnerOptions.verticalSpeed ) * 10;
        // options.position.z = Math.sin( tick * spawnerOptions.horizontalSpeed + spawnerOptions.verticalSpeed ) * 5;
        for ( var x = 0; x < spawnerOptions.spawnRate * delta; x++ ) {
            // Yep, that's really it.   Spawning particles is super cheap, and once you spawn them, the rest of
            // their lifecycle is handled entirely on the GPU, driven by a time uniform updated below
            particleSystem.spawnParticle( options );
        }
    }
    particleSystem.update( tick );

    renderer.render( scene, camera );
    time += deltaTime;
}

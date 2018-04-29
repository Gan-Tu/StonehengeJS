var physicsWorld;
var gravityConstant = 7.8;

function initPhysics() {
    // Physics configuration
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    physicsWorld.setGravity( new Ammo.btVector3( 0, - gravityConstant, 0 ) );
}

initPhysics();

function createObject( mass, halfExtents, pos, quat, material, name = null) {
    var object = new THREE.Mesh(
        new THREE.BoxGeometry(  halfExtents.x * 2,
                                halfExtents.y * 2,
                                halfExtents.z * 2 ), material );
    object.position.copy( pos );
    object.quaternion.copy( quat );
    convexBreaker.prepareBreakableObject( object, mass, new THREE.Vector3(), new THREE.Vector3(), true );
    createDebrisFromBreakableObject( object );
    if (name) {
        object.name = name;
    }

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


// Add add stone functions
_gui_controls.addStone = function add_stones() {
    var stoneMass = _gui_controls.stoneMass;
    var stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
    quat.set( 0, Math.random(), 0, 1 );
    var num = this.numStonesAdd;
    for ( var i = 0; i < num; i++ ) {
        pos.set( Math.random() * 10 - 5,
                Math.random() * 10 - 5,
                15 * ( Math.random() - i / ( num + 1 ) ) );
        createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0xB0B0B0 ), "stones" + (this.totalNumStones + i));
    }
    this.totalNumStones += num;
};
_gui_add.add(_gui_controls, 'addStone').name("add stones");


_gui_controls.ballBrigade = function createBallBrigade () {
    for (var i = 0; i < _gui_controls.numBalls; i++ ) {
        var ball = new THREE.Mesh( new THREE.SphereGeometry( _gui_controls.ballRadius, 14, 10 ), ballMaterial );
        textureLoader.load( "textures/marble.jpg", function( texture ) {
            ball.material.map = texture;
            ball.material.needsUpdate = true;
        } );
        ball.castShadow = true;
        ball.receiveShadow = true;
        var ballShape = new Ammo.btSphereShape( _gui_controls.ballRadius );
        ballShape.setMargin( margin );
        pos.set( (Math.random() - 0.5) * 100, 20, (Math.random() - 0.5) * 100);
        quat.set( 0, 0, 0, 1 );
        var ballBody = createRigidBody( ball, ballShape, _gui_controls.ballMass, pos, quat );
        pos.set( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 )
        pos.multiplyScalar( 24 );
        ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    }
}
_gui_add.add(_gui_controls, 'ballBrigade').name("add balls");



animate();

/************************************* MAIN RENDERING *************************************/

function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}

function render() {

    // Update Controls
    controls.update();

    // Update Physics of Breakable Objects
    var deltaTime = clock.getDelta();
    updatePhysics( deltaTime );
    var delta = deltaTime * spawnerOptions.timeScale;

    // Particles Rendering
    tick += delta;
    if ( tick < 0 ) tick = 0;
    if ( delta > 0 ) {
        particle_options.position.x = Math.sin( tick * spawnerOptions.horizontalSpeed ) * 20;
        particle_options.position.y = Math.sin( tick * spawnerOptions.verticalSpeed ) * 10;
        particle_options.position.z = Math.sin( tick * spawnerOptions.horizontalSpeed + spawnerOptions.verticalSpeed ) * 5;
        for ( var x = 0; x < spawnerOptions.spawnRate * delta; x++ ) {
            particleSystem.spawnParticle( particle_options );
        }
    }
    particleSystem.update( tick );

    // Increase Timer
    time += deltaTime;

    // Collapse to Particles
    var time = Date.now() * 0.001;


    // Explosion
    if (points) {
        points.forEach(function movePoints(p) {
            for ( var i = 0; i < p.geometry.attributes.position.count; i++) {

                var xdir = _gui_controls.explosion_dir[i * 3 + 0];
                var ydir = _gui_controls.explosion_dir[i * 3 + 1];
                var zdir = _gui_controls.explosion_dir[i * 3 + 2];

                var x = p.geometry.attributes.position.getX(i);
                var y = p.geometry.attributes.position.getY(i);
                var z = p.geometry.attributes.position.getZ(i);

                p.geometry.attributes.position.setXYZ(i, x + xdir, y + ydir, z + zdir);
            }
            p.geometry.attributes.position.needsUpdate = true;
        });
    }

    // Render Again
    renderer.render( scene, camera );
}


// Physics Update
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
        var fractureImpulse = 220;
        if ( breakable0 && !collided0 && maxImpulse > fractureImpulse ) {
            var debris = convexBreaker.subdivideByImpact( threeObject0, impactPoint, impactNormal , 1, 4, 1.5 );
            var numObjects = debris.length;
            for ( var j = 0; j < numObjects; j++ ) {
                createDebrisFromBreakableObject( debris[ j ] );
            }
            objectsToRemove[ numObjectsToRemove++ ] = threeObject0;
            userData0.collided = true;
        }
        if ( breakable1 && !collided1 && maxImpulse > fractureImpulse ) {
            var debris = convexBreaker.subdivideByImpact( threeObject1, impactPoint, impactNormal , 1, 4, 1.5 );
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


/************************************* EVENT LISTENERS *************************************/

// Window Resize
window.addEventListener('resize', function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}, false );


// Shot Balls to Break Things

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





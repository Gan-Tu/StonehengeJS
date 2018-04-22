
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
}

function place_tree() {
    jsonLoader.load(
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
}

function place_particles() {
    particleSystem = new THREE.GPUParticleSystem( {
        maxParticles: 250000
    } );
    scene.add( particleSystem );
}
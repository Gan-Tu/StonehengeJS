if ( ! Detector.webgl ) {
	Detector.addGetWebGLMessage();
	document.getElementById( 'container' ).innerHTML = "";
}
// - Global variables -
// Graphics variables
var container, stats;
var camera, controls, scene, renderer;
var textureLoader;
var clock = new THREE.Clock();
var mouseCoords = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var ballMaterial = new THREE.MeshPhongMaterial( { color: 0x202020 } );
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
// - Main code -
init();
animate();
// - Functions -
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
	scene.background = new THREE.Color( 0xbfd1e5 );
	camera.position.set( -14, 8, 16 );
	controls = new THREE.OrbitControls( camera );
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
	//
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
	var object = new THREE.Mesh( new THREE.BoxGeometry( halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2 ), material );
	object.position.copy( pos );
	object.quaternion.copy( quat );
	convexBreaker.prepareBreakableObject( object, mass, new THREE.Vector3(), new THREE.Vector3(), true );
	createDebrisFromBreakableObject( object );
}
function createObjects() {
	// Ground
	pos.set( 0, - 0.5, 0 );
	quat.set( 0, 0, 0, 1 );
	var ground = createParalellepipedWithPhysics( 40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
	ground.receiveShadow = true;
	textureLoader.load( "textures/grid.png", function( texture ) {
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set( 40, 40 );
		ground.material.map = texture;
		ground.material.needsUpdate = true;
	} );
	// Tower 1
	var towerMass = 1000;
	var towerHalfExtents = new THREE.Vector3( 2, 5, 2 );
	pos.set( -8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF0A024 ) );
	// Tower 2
	pos.set( 8, 5, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( towerMass, towerHalfExtents, pos, quat, createMaterial( 0xF4A321 ) );
	//Bridge
	var bridgeMass = 100;
	var bridgeHalfExtents = new THREE.Vector3( 7, 0.2, 1.5 );
	pos.set( 0, 10.2, 0 );
	quat.set( 0, 0, 0, 1 );
	createObject( bridgeMass, bridgeHalfExtents, pos, quat, createMaterial( 0xB38835 ) );
	// Stones
	var stoneMass = 120;
	var stoneHalfExtents = new THREE.Vector3( 1, 2, 0.15 );
	var numStones = 8;
	quat.set( 0, 0, 0, 1 );
	for ( var i = 0; i < numStones; i++ ) {
		pos.set( 0, 2, 15 * ( 0.5 - i / ( numStones + 1 ) ) );
		createObject( stoneMass, stoneHalfExtents, pos, quat, createMaterial( 0xB0B0B0 ) );
	}
	// Mountain
	var mountainMass = 860;
	var mountainHalfExtents = new THREE.Vector3( 4, 5, 4 );
	pos.set( 5, mountainHalfExtents.y * 0.5, - 7 );
	quat.set( 0, 0, 0, 1 );
	var mountainPoints = [];
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( - mountainHalfExtents.x, - mountainHalfExtents.y, - mountainHalfExtents.z ) );
	mountainPoints.push( new THREE.Vector3( 0, mountainHalfExtents.y, 0 ) );
	console.log(mountainPoints);
	var mountain = new THREE.Mesh( new THREE.ConvexGeometry( mountainPoints ), createMaterial( 0xFFB443 ) );
	mountain.position.copy( pos );
	mountain.quaternion.copy( quat );
	convexBreaker.prepareBreakableObject( mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true );
	createDebrisFromBreakableObject( mountain );

	// Mesh Experimentation
	var teapotMass = 800;
	// var teapotExtents = new THREE.Vector3( 2, 2, 2 );
	pos.set( 10, 0, 10 );
	quat.set( 0, 0, 0, 1 );
	// var teapotPoints = [5.929688,4.125000,0.000000,5.832031,4.494141,0.000000,5.945313,4.617188,0.000000,6.175781,4.494141,0.000000,6.429688,4.125000,0.000000,5.387188,4.125000,2.747500,5.297100,4.494141,2.709170,5.401602,4.617188,2.753633,5.614209,4.494141,2.844092,5.848437,4.125000,2.943750,3.899688,4.125000,4.970000,3.830352,4.494141,4.900664,3.910782,4.617188,4.981094,4.074414,4.494141,5.144727,4.254687,4.125000,5.325000,1.677188,4.125000,6.457500,1.638858,4.494141,6.367412,1.683320,4.617188,6.471914,1.773780,4.494141,6.684522,1.873438,4.125000,6.918750,-1.070312,4.125000,7.000000,-1.070312,4.494141,6.902344,-1.070312,4.617188,7.015625,-1.070312,4.494141,7.246094,-1.070312,4.125000,7.500000,-4.007656,4.125000,6.457500,-3.859572,4.494141,6.367412,-3.847676,4.617188,6.471914,-3.917371,4.494141,6.684522,-4.014062,4.125000,6.918750,-6.209063,4.125000,4.970000,-6.042168,4.494141,4.900664,-6.072500,4.617188,4.981094,-6.217675,4.494141,5.144727,-6.395312,4.125000,5.325000,-7.591093,4.125000,2.747500,-7.464421,4.494141,2.709170,-7.550137,4.617188,2.753633,-7.755822,4.494141,2.844092,-7.989062,4.125000,2.943750,-8.070313,4.125000,0.000000,-7.972656,4.494141,0.000000,-8.085938,4.617188,0.000000,-8.316406,4.494141,0.000000,-8.570313,4.125000,0.000000,-7.527812,4.125000,-2.747500,-7.437724,4.494141,-2.709170,-7.542227,4.617188,-2.753633,-7.754834,4.494141,-2.844092,-7.989062,4.125000,-2.943750,-6.040312,4.125000,-4.970000,-5.970977,4.494141,-4.900664,-6.051406,4.617188,-4.981094,-6.215039,4.494141,-5.144727,-6.395312,4.125000,-5.325000,-3.817812,4.125000,-6.457500,-3.779482,4.494141,-6.367412,-3.823945,4.617188,-6.471914,-3.914404,4.494141,-6.684522,-4.014062,4.125000,-6.918750,-1.070312,4.125000,-7.000000,-1.070312,4.494141,-6.902344,-1.070312,4.617188,-7.015625,-1.070312,4.494141,-7.246094,-1.070312,4.125000,-7.500000,1.677188,4.125000,-6.457500,1.638858,4.494141,-6.367412,1.683320,4.617188,-6.471914,1.773780,4.494141,-6.684522,1.873438,4.125000,-6.918750,3.899688,4.125000,-4.970000,3.830352,4.494141,-4.900664,3.910782,4.617188,-4.981094,4.074414,4.494141,-5.144727,4.254687,4.125000,-5.325000,5.387188,4.125000,-2.747500,5.297100,4.494141,-2.709170,5.401602,4.617188,-2.753633,5.614209,4.494141,-2.844092,5.848437,4.125000,-2.943750,7.347656,2.162109,0.000000,8.148438,0.234375,0.000000,8.714844,-1.623047,0.000000,8.929688,-3.375000,0.000000,6.695264,2.162109,3.304053,7.433985,0.234375,3.618360,7.956494,-1.623047,3.840674,8.154688,-3.375000,3.925000,4.906446,2.162109,5.976758,5.475000,0.234375,6.545312,5.877149,-1.623047,6.947461,6.029688,-3.375000,7.100000,2.233740,2.162109,7.765576,2.548047,0.234375,8.504297,2.770362,-1.623047,9.026807,2.854688,-3.375000,9.225000,-1.070312,2.162109,8.417969,-1.070312,0.234375,9.218750,-1.070312,-1.623047,9.785156,-1.070312,-3.375000,10.000000,-4.374365,2.162109,7.765576,-4.688672,0.234375,8.504297,-4.910986,-1.623047,9.026807,-4.995313,-3.375000,9.225000,-7.047071,2.162109,5.976758,-7.615624,0.234375,6.545312,-8.017773,-1.623047,6.947461,-8.170312,-3.375000,7.100000,-8.835889,2.162109,3.304053,-9.574610,0.234375,3.618360,-10.097119,-1.623047,3.840674,-10.295313,-3.375000,3.925000,-9.488281,2.162109,0.000000,-10.289063,0.234375,0.000000,-10.855469,-1.623047,0.000000,-11.070313,-3.375000,0.000000,-8.835889,2.162109,-3.304053,-9.574610,0.234375,-3.618360,-10.097119,-1.623047,-3.840674,-10.295313,-3.375000,-3.925000,-7.047071,2.162109,-5.976758,-7.615624,0.234375,-6.545312,-8.017773,-1.623047,-6.947461,-8.170312,-3.375000,-7.100000,-4.374365,2.162109,-7.765576,-4.688672,0.234375,-8.504297,-4.910986,-1.623047,-9.026807,-4.995313,-3.375000,-9.225000,-1.070312,2.162109,-8.417969,-1.070312,0.234375,-9.218750,-1.070312,-1.623047,-9.785156,-1.070312,-3.375000,-10.000000,2.233740,2.162109,-7.765576,2.548047,0.234375,-8.504297,2.770362,-1.623047,-9.026807,2.854688,-3.375000,-9.225000,4.906446,2.162109,-5.976758,5.475000,0.234375,-6.545312,5.877149,-1.623047,-6.947461,6.029688,-3.375000,-7.100000,6.695264,2.162109,-3.304053,7.433985,0.234375,-3.618360,7.956494,-1.623047,-3.840674,8.154688,-3.375000,-3.925000,8.539063,-4.857422,0.000000,7.679688,-5.953125,0.000000,6.820313,-6.697266,0.000000,6.429688,-7.125000,0.000000,7.794336,-4.857422,3.771680,7.001562,-5.953125,3.434375,6.208789,-6.697266,3.097070,5.848437,-7.125000,2.943750,5.752343,-4.857422,6.822656,5.142187,-5.953125,6.212500,4.532031,-6.697266,5.602344,4.254687,-7.125000,5.325000,2.701367,-4.857422,8.864649,2.364063,-5.953125,8.071875,2.026758,-6.697266,7.279101,1.873438,-7.125000,6.918750,-1.070312,-4.857422,9.609375,-1.070312,-5.953125,8.750000,-1.070312,-6.697266,7.890625,-1.070312,-7.125000,7.500000,-4.841992,-4.857422,8.864649,-4.504687,-5.953125,8.071875,-4.167383,-6.697266,7.279101,-4.014062,-7.125000,6.918750,-7.892968,-4.857422,6.822656,-7.282812,-5.953125,6.212500,-6.672656,-6.697266,5.602344,-6.395312,-7.125000,5.325000,-9.934961,-4.857422,3.771680,-9.142187,-5.953125,3.434375,-8.349414,-6.697266,3.097070,-7.989062,-7.125000,2.943750,-10.679688,-4.857422,0.000000,-9.820313,-5.953125,0.000000,-8.960938,-6.697266,0.000000,-8.570313,-7.125000,0.000000,-9.934961,-4.857422,-3.771680,-9.142187,-5.953125,-3.434375,-8.349414,-6.697266,-3.097070,-7.989062,-7.125000,-2.943750,-7.892968,-4.857422,-6.822656,-7.282812,-5.953125,-6.212500,-6.672656,-6.697266,-5.602344,-6.395312,-7.125000,-5.325000,-4.841992,-4.857422,-8.864649,-4.504687,-5.953125,-8.071875,-4.167383,-6.697266,-7.279101,-4.014062,-7.125000,-6.918750,-1.070312,-4.857422,-9.609375,-1.070312,-5.953125,-8.750000,-1.070312,-6.697266,-7.890625,-1.070312,-7.125000,-7.500000,2.701367,-4.857422,-8.864649,2.364063,-5.953125,-8.071875,2.026758,-6.697266,-7.279101,1.873438,-7.125000,-6.918750,5.752343,-4.857422,-6.822656,5.142187,-5.953125,-6.212500,4.532031,-6.697266,-5.602344,4.254687,-7.125000,-5.325000,7.794336,-4.857422,-3.771680,7.001562,-5.953125,-3.434375,6.208789,-6.697266,-3.097070,5.848437,-7.125000,-2.943750,6.259766,-7.400391,0.000000,5.351563,-7.640625,0.000000,3.107422,-7.810547,0.000000,-1.070312,-7.875000,0.000000,5.691685,-7.400391,2.877056,4.853868,-7.640625,2.520586,2.783648,-7.810547,1.639761,4.134043,-7.400391,5.204355,3.489219,-7.640625,4.559531,1.895879,-7.810547,2.966191,1.806743,-7.400391,6.761997,1.450274,-7.640625,5.924180,0.569448,-7.810547,3.853960,-1.070312,-7.400391,7.330078,-1.070312,-7.640625,6.421875,-1.070312,-7.810547,4.177734,-3.947368,-7.400391,6.761997,-3.590898,-7.640625,5.924180,-2.710073,-7.810547,3.853960,-6.274668,-7.400391,5.204355,-5.629844,-7.640625,4.559531,-4.036504,-7.810547,2.966191,-7.832309,-7.400391,2.877056,-6.994492,-7.640625,2.520586,-4.924272,-7.810547,1.639761,-8.400391,-7.400391,0.000000,-7.492188,-7.640625,0.000000,-5.248047,-7.810547,0.000000,-7.832309,-7.400391,-2.877056,-6.994492,-7.640625,-2.520586,-4.924272,-7.810547,-1.639761,-6.274668,-7.400391,-5.204355,-5.629844,-7.640625,-4.559531,-4.036504,-7.810547,-2.966191,-3.947368,-7.400391,-6.761997,-3.590898,-7.640625,-5.924180,-2.710073,-7.810547,-3.853960,-1.070312,-7.400391,-7.330078,-1.070312,-7.640625,-6.421875,-1.070312,-7.810547,-4.177734,1.806743,-7.400391,-6.761997,1.450274,-7.640625,-5.924180,0.569448,-7.810547,-3.853960,4.134043,-7.400391,-5.204355,3.489219,-7.640625,-4.559531,1.895879,-7.810547,-2.966191,5.691685,-7.400391,-2.877056,4.853868,-7.640625,-2.520586,2.783648,-7.810547,-1.639761,-9.070313,2.250000,0.000000,-11.406250,2.232422,0.000000,-13.132813,2.109375,0.000000,-14.203125,1.775391,0.000000,-14.570313,1.125000,0.000000,-8.992188,2.425781,0.843750,-11.475830,2.405457,0.843750,-13.298828,2.263184,0.843750,-14.421631,1.877014,0.843750,-14.804688,1.125000,0.843750,-8.820313,2.812500,1.125000,-11.628906,2.786134,1.125000,-13.664063,2.601563,1.125000,-14.902344,2.100586,1.125000,-15.320313,1.125000,1.125000,-8.648438,3.199219,0.843750,-11.781982,3.166809,0.843750,-14.029297,2.939941,0.843750,-15.383057,2.324158,0.843750,-15.835938,1.125000,0.843750,-8.570313,3.375000,0.000000,-11.851563,3.339844,0.000000,-14.195313,3.093750,0.000000,-15.601563,2.425781,0.000000,-16.070313,1.125000,0.000000,-8.648438,3.199219,-0.843750,-11.781982,3.166809,-0.843750,-14.029297,2.939941,-0.843750,-15.383057,2.324158,-0.843750,-15.835938,1.125000,-0.843750,-8.820313,2.812500,-1.125000,-11.628906,2.786134,-1.125000,-13.664063,2.601563,-1.125000,-14.902344,2.100586,-1.125000,-15.320313,1.125000,-1.125000,-8.992188,2.425781,-0.843750,-11.475830,2.405457,-0.843750,-13.298828,2.263184,-0.843750,-14.421631,1.877014,-0.843750,-14.804688,1.125000,-0.843750,-14.375000,0.105469,0.000000,-13.757813,-1.125000,0.000000,-12.671875,-2.355469,0.000000,-11.070313,-3.375000,0.000000,-14.588013,0.007050,0.843750,-13.909180,-1.275146,0.843750,-12.724976,-2.540863,0.843750,-10.992188,-3.609375,0.843750,-15.056641,-0.209473,1.125000,-14.242188,-1.605469,1.125000,-12.841797,-2.948730,1.125000,-10.820313,-4.125000,1.125000,-15.525269,-0.425995,0.843750,-14.575195,-1.935791,0.843750,-12.958618,-3.356598,0.843750,-10.648438,-4.640625,0.843750,-15.738281,-0.524414,0.000000,-14.726563,-2.085938,0.000000,-13.011719,-3.541992,0.000000,-10.570313,-4.875000,0.000000,-15.525269,-0.425995,-0.843750,-14.575195,-1.935791,-0.843750,-12.958618,-3.356598,-0.843750,-10.648438,-4.640625,-0.843750,-15.056641,-0.209473,-1.125000,-14.242188,-1.605469,-1.125000,-12.841797,-2.948730,-1.125000,-10.820313,-4.125000,-1.125000,-14.588013,0.007050,-0.843750,-13.909180,-1.275146,-0.843750,-12.724976,-2.540863,-0.843750,-10.992188,-3.609375,-0.843750,7.429688,-0.750000,0.000000,9.828125,-0.199219,0.000000,10.867188,1.125000,0.000000,11.437500,2.730469,0.000000,12.429688,4.125000,0.000000,7.429688,-1.394531,1.856250,10.011230,-0.677124,1.676074,11.101563,0.846680,1.279688,11.723145,2.629761,0.883301,12.898438,4.125000,0.703125,7.429688,-2.812500,2.475000,10.414063,-1.728516,2.234766,11.617188,0.234375,1.706250,12.351563,2.408203,1.177734,13.929688,4.125000,0.937500,7.429688,-4.230469,1.856250,10.816895,-2.779907,1.676074,12.132813,-0.377930,1.279688,12.979980,2.186646,0.883301,14.960938,4.125000,0.703125,7.429688,-4.875000,0.000000,11.000000,-3.257813,0.000000,12.367188,-0.656250,0.000000,13.265625,2.085938,0.000000,15.429688,4.125000,0.000000,7.429688,-4.230469,-1.856250,10.816895,-2.779907,-1.676074,12.132813,-0.377930,-1.279688,12.979980,2.186646,-0.883301,14.960938,4.125000,-0.703125,7.429688,-2.812500,-2.475000,10.414063,-1.728516,-2.234766,11.617188,0.234375,-1.706250,12.351563,2.408203,-1.177734,13.929688,4.125000,-0.937500,7.429688,-1.394531,-1.856250,10.011230,-0.677124,-1.676074,11.101563,0.846680,-1.279688,11.723145,2.629761,-0.883301,12.898438,4.125000,-0.703125,12.789063,4.335938,0.000000,13.054688,4.406250,0.000000,13.132813,4.335938,0.000000,12.929688,4.125000,0.000000,13.291077,4.346237,0.659180,13.525879,4.422729,0.562500,13.532898,4.350357,0.465820,13.242188,4.125000,0.421875,14.395508,4.368896,0.878906,14.562500,4.458984,0.750000,14.413086,4.382080,0.621094,13.929688,4.125000,0.562500,15.499939,4.391556,0.659180,15.599121,4.495239,0.562500,15.293274,4.413804,0.465820,14.617188,4.125000,0.421875,16.001953,4.401855,0.000000,16.070313,4.511719,0.000000,15.693359,4.428224,0.000000,14.929688,4.125000,0.000000,15.499939,4.391556,-0.659180,15.599121,4.495239,-0.562500,15.293274,4.413804,-0.465820,14.617188,4.125000,-0.421875,14.395508,4.368896,-0.878906,14.562500,4.458984,-0.750000,14.413086,4.382080,-0.621094,13.929688,4.125000,-0.562500,13.291077,4.346237,-0.659180,13.525879,4.422729,-0.562500,13.532898,4.350357,-0.465820,13.242188,4.125000,-0.421875,-1.070312,7.875000,0.000000,0.632813,7.628906,0.000000,0.554688,7.031250,0.000000,-0.085937,6.292969,0.000000,-0.070312,5.625000,0.000000,0.501414,7.628906,0.670256,0.429278,7.031250,0.639395,-0.162029,6.292969,0.386960,-0.147812,5.625000,0.392500,0.140489,7.628906,1.210801,0.084844,7.031250,1.155156,-0.370879,6.292969,0.699434,-0.360312,5.625000,0.710000,-0.400056,7.628906,1.571726,-0.430918,7.031250,1.499590,-0.683352,6.292969,0.908284,-0.677812,5.625000,0.922500,-1.070312,7.628906,1.703125,-1.070312,7.031250,1.625000,-1.070312,6.292969,0.984375,-1.070312,5.625000,1.000000,-1.740569,7.628906,1.571726,-1.709707,7.031250,1.499590,-1.457273,6.292969,0.908284,-1.462812,5.625000,0.922500,-2.281113,7.628906,1.210801,-2.225469,7.031250,1.155156,-1.769746,6.292969,0.699434,-1.780312,5.625000,0.710000,-2.642038,7.628906,0.670256,-2.569902,7.031250,0.639395,-1.978596,6.292969,0.386960,-1.992812,5.625000,0.392500,-2.773438,7.628906,0.000000,-2.695313,7.031250,0.000000,-2.054687,6.292969,0.000000,-2.070312,5.625000,0.000000,-2.642038,7.628906,-0.670256,-2.569902,7.031250,-0.639395,-1.978596,6.292969,-0.386960,-1.992812,5.625000,-0.392500,-2.281113,7.628906,-1.210801,-2.225469,7.031250,-1.155156,-1.769746,6.292969,-0.699434,-1.780312,5.625000,-0.710000,-1.740569,7.628906,-1.571726,-1.709707,7.031250,-1.499590,-1.457273,6.292969,-0.908284,-1.462812,5.625000,-0.922500,-1.070312,7.628906,-1.703125,-1.070312,7.031250,-1.625000,-1.070312,6.292969,-0.984375,-1.070312,5.625000,-1.000000,-0.400056,7.628906,-1.571726,-0.430918,7.031250,-1.499590,-0.683352,6.292969,-0.908284,-0.677812,5.625000,-0.922500,0.140489,7.628906,-1.210801,0.084844,7.031250,-1.155156,-0.370879,6.292969,-0.699434,-0.360312,5.625000,-0.710000,0.501414,7.628906,-0.670256,0.429278,7.031250,-0.639395,-0.162029,6.292969,-0.386960,-0.147812,5.625000,-0.392500,1.210938,5.179688,0.000000,3.054688,4.875000,0.000000,4.710938,4.570313,0.000000,5.429688,4.125000,0.000000,1.034141,5.179688,0.895391,2.735000,4.875000,1.619062,4.262891,4.570313,2.269140,4.925938,4.125000,2.551250,0.549375,5.179688,1.619688,1.858438,4.875000,2.928750,3.034375,4.570313,4.104687,3.544688,4.125000,4.615000,-0.174922,5.179688,2.104453,0.548750,4.875000,3.805313,1.198828,4.570313,5.333203,1.480938,4.125000,5.996250,-1.070312,5.179688,2.281250,-1.070312,4.875000,4.125000,-1.070312,4.570313,5.781250,-1.070312,4.125000,6.500000,-1.965703,5.179688,2.104453,-2.689375,4.875000,3.805313,-3.339453,4.570313,5.333203,-3.621562,4.125000,5.996250,-2.690000,5.179688,1.619688,-3.999062,4.875000,2.928750,-5.174999,4.570313,4.104687,-5.685312,4.125000,4.615000,-3.174765,5.179688,0.895391,-4.875625,4.875000,1.619062,-6.403516,4.570313,2.269140,-7.066563,4.125000,2.551250,-3.351562,5.179688,0.000000,-5.195313,4.875000,0.000000,-6.851563,4.570313,0.000000,-7.570313,4.125000,0.000000,-3.174765,5.179688,-0.895391,-4.875625,4.875000,-1.619062,-6.403516,4.570313,-2.269140,-7.066563,4.125000,-2.551250,-2.690000,5.179688,-1.619688,-3.999062,4.875000,-2.928750,-5.174999,4.570313,-4.104687,-5.685312,4.125000,-4.615000,-1.965703,5.179688,-2.104453,-2.689375,4.875000,-3.805313,-3.339453,4.570313,-5.333203,-3.621562,4.125000,-5.996250,-1.070312,5.179688,-2.281250,-1.070312,4.875000,-4.125000,-1.070312,4.570313,-5.781250,-1.070312,4.125000,-6.500000,-0.174922,5.179688,-2.104453,0.548750,4.875000,-3.805313,1.198828,4.570313,-5.333203,1.480938,4.125000,-5.996250,0.549375,5.179688,-1.619688,1.858438,4.875000,-2.928750,3.034375,4.570313,-4.104687,3.544688,4.125000,-4.615000,1.034141,5.179688,-0.895391,2.735000,4.875000,-1.619062,4.262891,4.570313,-2.269140,4.925938,4.125000,-2.551250];
	// teapotVertices = [];
	// var scale = 0.2;
	// for (var i = 0; i < teapotPoints.length; i += 3) {
	// 	teapotVertices.push( new THREE.Vector3 ( teapotPoints[i + 0] * scale, teapotPoints[i + 1] * scale, teapotPoints[i + 2] * scale) );
	// }
	// teapotPoints.push( new THREE.Vector3( teapotExtents.x, -teapotExtents.y, teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( -teapotExtents.x, -teapotExtents.y, teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( teapotExtents.x, -teapotExtents.y, -teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( -teapotExtents.x, -teapotExtents.y, -teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( teapotExtents.x, teapotExtents.y, teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( -teapotExtents.x, teapotExtents.y, teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( teapotExtents.x, teapotExtents.y, -teapotExtents.z ));
	// teapotPoints.push( new THREE.Vector3( -teapotExtents.x, teapotExtents.y, -teapotExtents.z ));
	// var teapot = new THREE.Mesh( new THREE.ConvexGeometry( teapotVertices ), createMaterial (0xFFB443 ));
	

	// var scale = 0.2;
	// teapotVertices = [];
	var teapotGeometry = new THREE.TeapotBufferGeometry(15, 10, true, true, true, false, true);
	// console.log(teapotGeometry.attributes.position.array);
	// var teapotPoints = teapotGeometry.attributes.position.array;
	// for (var i = 0; i < teapotPoints.length; i += 3) {
	// 	teapotVertices.push( new THREE.Vector3 ( teapotPoints[i + 0] * scale, teapotPoints[i + 1] * scale, teapotPoints[i + 2] * scale) );
	// }
	// console.log(teapotVertices);
	var wireMaterial = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } ) ;
	var teapot = new THREE.Mesh( teapotGeometry, wireMaterial);
	//var teapot = new THREE.Mesh( new THREE.ConvexGeometry( teapotVertices ), createMaterial( 0xFFB443 ));

	teapot.position.copy( pos );
	teapot.quaternion.copy( quat );
	scene.add(teapot);
	// convexBreaker.prepareBreakableObject( teapot, teapotMass, new THREE.Vector3(), new THREE.Vector3(), true );
	// createDebrisFromBreakableObject( teapot );
}
function createParalellepipedWithPhysics( sx, sy, sz, mass, pos, quat, material ) {
	var object = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
	var shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
	shape.setMargin( margin );
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
		// Creates a ball and throws it
		var ballMass = 35;
		var ballRadius = 0.4;
		var ball = new THREE.Mesh( new THREE.SphereGeometry( ballRadius, 14, 10 ), ballMaterial );
		ball.castShadow = true;
		ball.receiveShadow = true;
		var ballShape = new Ammo.btSphereShape( ballRadius );
		ballShape.setMargin( margin );
		pos.copy( raycaster.ray.direction );
		pos.add( raycaster.ray.origin );
		quat.set( 0, 0, 0, 1 );
		var ballBody = createRigidBody( ball, ballShape, ballMass, pos, quat );
		pos.copy( raycaster.ray.direction );
		pos.multiplyScalar( 24 );
		ballBody.setLinearVelocity( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
	}, false );
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
	renderer.render( scene, camera );
	time += deltaTime;
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

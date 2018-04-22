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
// _guid_scene.open();

_guid_add = gui.addFolder("Add Stones")
_guid_add.add(_gui_controls, 'numStonesAdd', 1, 5, 1).name("# To Add");
// _guid_add.open();

var particle_options = {
    position: new THREE.Vector3(),
    positionRandomness: .3,
    velocity: new THREE.Vector3(),
    velocityRandomness: .5,
    color: 0xaa88ff,
    colorRandomness: .2,
    turbulence: .5,
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

_gui_particles_randomness = gui.addFolder("Particle Randomness")
_gui_particles_randomness.add( particle_options, "velocityRandomness", 0, 3 ).name("Velocity");
_gui_particles_randomness.add( particle_options, "positionRandomness", 0, 3 ).name("Position");
_gui_particles_randomness.add( particle_options, "sizeRandomness", 0, 25 ).name("Size");
_gui_particles_randomness.add( particle_options, "colorRandomness", 0, 1 ).name("Color");


_gui_particles = gui.addFolder("Particle Parameters")
_gui_particles.add( particle_options, "size", 1, 20 );
_gui_particles.add( particle_options, "lifetime", .1, 10 );
_gui_particles.add( particle_options, "turbulence", 0, 1 );
_gui_particles.add( spawnerOptions, "spawnRate", 10, 30000 );
_gui_particles.add( spawnerOptions, "timeScale", -1, 1 );


// Disable event listeners on menu
gui.domElement.addEventListener('mousedown', _stopPropagation);

function _stopPropagation(evt) {
    evt.stopPropagation();
}




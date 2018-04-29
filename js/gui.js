
// Define GUI Control
var GUI_Control = function() {
    this.ballMass = 100;
    this.ballRadius = 0.4;
    this.ballMaterial = 'Marble';

    this.towerMass = 1000;
    this.bridgeMass = 250;
    this.stoneMass = 120;

    this.mountainMass = 860;
    this.teapotMass = 300;
    this.bunnyMass = 300;
    this.treeMass = 800;

    this.initNumStones = 5;

    this.numStonesAdd = 2;
    this.numBalls = 10;

    this.chosen_object = "teapot";

    this.explosion_dir = [];

    this.explode_by_name = function (name) {
        var collapsed_object = scene.getObjectByName(name);
        if (collapsed_object) {
            scene.remove(collapsed_object);
            for ( var i = 0, il = rigidBodies.length; i < il; i++ ) {
                if (rigidBodies[i] == collapsed_object) {
                    rigidBodies.splice(i, 1);
                }
            }
            place_mesh_as_particles(collapsed_object);

            removeDebris(collapsed_object);
            collapsed_object.geometry.dispose();
            collapsed_object.material.dispose();

            points.forEach(function movePoints(p) {
                for ( var i = 0; i < p.geometry.attributes.position.count; i++) {

                    var explosionSpeed = 2;
                    var xdir = Math.random() * explosionSpeed - explosionSpeed/2;
                    var ydir = Math.random() * explosionSpeed - explosionSpeed/2;
                    var zdir = Math.random() * explosionSpeed - explosionSpeed/2;

                    _gui_controls.explosion_dir.push(xdir, ydir, zdir);
                }
            });
        }
    };

    this.object_counts = {};

    this.explode = function () {
        if (this.chosen_object in this.object_counts) {
            for ( var i = 0; i <= this.object_counts[this.chosen_object]; i++ ) {
                this.explode_by_name(this.chosen_object + i);
            }
        } else {
            this.explode_by_name(this.chosen_object);
        }
        delete this.object_counts[this.chosen_object];
    };

    this.reload = function() {
        location.reload();
    };

}

// Declare and Initialize GUI
var _gui_controls = new GUI_Control();
var gui = new dat.GUI();

// GUI Ball Parameters
_gui_ball = gui.addFolder("Ball Parameters")
_gui_ball.add(_gui_controls, 'ballMaterial').name("Ball Material");
_gui_ball.add(_gui_controls, 'ballMass', 5, 250, 10).name("Ball Mass");
_gui_ball.add(_gui_controls, 'ballRadius', 0.05, 2, 0.01).name("Ball Radius");
_gui_ball.open();


// GUI Objects Addision
_gui_add = gui.addFolder("Add Objects to Scene")
_gui_add.add(_gui_controls, 'numStonesAdd', 1, 5, 1).name("# Stones");
_gui_add.add(_gui_controls, 'numBalls', 1, 100, 1).name("# Balls");
_gui_add.open();


// GUI Object Mass Parameters
_gui_scene = gui.addFolder("Object Mass")
_gui_scene.add(_gui_controls, 'towerMass', 100, 2000, 50).name("Tower Mass");
_gui_scene.add(_gui_controls, 'bridgeMass', 10, 500, 10).name("Bridge Mass");
_gui_scene.add(_gui_controls, 'stoneMass', 10, 500, 10).name("Stone Mass");
_gui_scene.add(_gui_controls, 'mountainMass', 100, 2000, 10).name("Mountain Mass");
_gui_scene.add(_gui_controls, 'teapotMass', 100, 2000, 10).name("Teapot Mass");
_gui_scene.add(_gui_controls, 'bunnyMass', 100, 2000, 10).name("Bunny Mass");
_gui_scene.add(_gui_controls, 'treeMass', 100, 2000, 10).name("Tree Mass");

// GUI Particle Parameters
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


// GUI Disable EventListeners
gui.domElement.addEventListener('mousedown', _stopPropagation);
function _stopPropagation(evt) {
    evt.stopPropagation();
}

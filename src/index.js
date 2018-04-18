// IMPORT MODULES

const dat = require('dat.gui');

// RENDERING LOGIC

var graphic_controls = function() {
    this.message = 'dat.gui';
    this.rotation_x = true;
    this.rotation_y = true;
    this.displayMessage = function() { 
        alert(this.message);
    };
};

window.onload = function() {
    var control = new graphic_controls();
    var gui = new dat.GUI();

    random_gui = gui.addFolder("random");
    random_gui.add(control, 'message');
    random_gui.add(control, 'displayMessage').name("display msg");
    random_gui.open();

    rotation_gui = gui.addFolder("rotation");
    x_controller = rotation_gui.add(control, 'rotation_x').name("rotate x").listen();
    y_controller = rotation_gui.add(control, 'rotation_y').name("rotate y").listen();
    rotation_gui.open();

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    var cube = new THREE.Mesh( geometry, material );
    scene.add( cube );

    camera.position.z = 5;

    var animate = function() {
        requestAnimationFrame( animate );
        if (control.rotation_x) {
            cube.rotation.x += 0.05;
        }
        if (control.rotation_y) {
            cube.rotation.y += 0.05;
        }
        renderer.render(scene, camera);
    };
    
    animate();
};



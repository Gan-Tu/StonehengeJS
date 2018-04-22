
var GUI_Control = function() {
    this.ballMass = 35;
    this.ballRadius = 0.4;
    this.ballColor = '#202020';
    
    this.towerMass = 1000;
    this.bridgeMass = 250;
    this.stoneMass = 120;
    this.mountainMass = 860;
    this.teapotMass = 860;
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


// Disable event listeners on menu
gui.domElement.addEventListener('mousedown', _stopPropagation);

function _stopPropagation(evt) {
    evt.stopPropagation();
}



var GUI_Control = function() {
    this.ballMass = 35;
    this.ballRadius = 0.4;

    this.ballColor = '#202020';

    this.message = 'dat.gui';
    this.rotation_x = true;
    this.rotation_y = true;
    this.speed = 0;
    this.option1 = "option1: 1";
    this.option2 = "option2: 1";
    this.displayMessage = function() { 
        alert(this.message);
    };
}

var _gui_controls = new GUI_Control();
var gui = new dat.GUI();



_guid_ball = gui.addFolder("Ball Parameters")

var gui_ball_color = _guid_ball.add(_gui_controls, 'ballColor').name("Ball Color");

_guid_ball.add(_gui_controls, 'ballMass', 5, 50, 1).name("Ball Mass");
_guid_ball.add(_gui_controls, 'ballRadius', 0.05, 2, 0.01).name("Ball Radius");


_guid_ball.open();



// Disable event listeners on menu
gui.domElement.addEventListener('mousedown', _stopPropagation);
gui.domElement.addEventListener('touchstart', _stopPropagation);


function _stopPropagation(evt) {
    evt.stopPropagation();
}
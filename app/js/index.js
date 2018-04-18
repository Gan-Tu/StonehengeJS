// RENDERING LOGIC

var graphic_controls = function() {
    this.message = 'dat.gui';
    this.rotation_x = true;
    this.rotation_y = true;
    this.speed = 0;
    this.option1 = "option1: 1";
    this.option2 = "option2: 1";
    this.displayMessage = function() { 
        alert(this.message);
    };
};

function init_GUI() {
    var control = new graphic_controls();
    var gui = new dat.GUI();
    // GUI
    _gui_1 = gui.addFolder("Example GUI Features");
    _gui_1.add(control, 'message');
    _gui_1.add(control, 'displayMessage').name("display msg");
    _gui_1.add(control, 'speed', -5, 10).name("speed");
    _gui_1.add(control, 'option1', 
                    ["option1: 1", "option1: 2"]).name("option1");
    _gui_1.add(control, 'option2', {"small": "option2: 1", 
                                         "high": "option2: 2"}).name("option2");
    _gui_1.open();

    _gui_2 = gui.addFolder("Another Folder");
    _gui_2.add(control, 'rotation_x').name("rotate x").listen();
    _gui_2.add(control, 'rotation_y').name("rotate y").listen();
    _gui_2.open();
}

window.onload = function() {
    init_GUI();

    // Render
    var container, stats;
    var camera, scene, renderer, composer, controls;
    var loader;
    // Initialize Three.JS
    init();
    //
    // SEA3D Loader
    //
    loader = new THREE.SEA3D( {
        autoPlay : false, // Auto play animations
        container : scene // Container to add models
    } );
    loader.onComplete = function( e ) {
        // play all animations
        for(var i = 0; i < loader.meshes.length; i++) {
            if (loader.meshes[i].animator)
                loader.meshes[i].animator.play( "root" );
        }
        // Get the first camera from SEA3D Studio
        // use loader.get... to get others objects
        var cam = loader.cameras[0];
        camera.position.copy( cam.position );
        camera.rotation.copy( cam.rotation );
        controls = new THREE.OrbitControls( camera );
        animate();
    };
    // Open3DGC - Export by SEA3D Studio
    loader.load( './models/robot.tjs.sea' );
    //
    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color( 0x333333 );
        container = document.createElement( 'div' );
        document.body.appendChild( container );
        camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild( renderer.domElement );
        stats = new Stats();
        container.appendChild( stats.dom );
        // post-processing
        composer = new THREE.EffectComposer( renderer );
        var renderPass = new THREE.RenderPass( scene, camera );
        composer.addPass( renderPass );
        var vh = 1.4, vl = 1.2;
        var colorCorrectionPass = new THREE.ShaderPass( THREE.ColorCorrectionShader );
        colorCorrectionPass.uniforms[ "powRGB" ].value = new THREE.Vector3( vh, vh, vh );
        colorCorrectionPass.uniforms[ "mulRGB" ].value = new THREE.Vector3( vl, vl, vl );
        composer.addPass( colorCorrectionPass );
        var vignettePass = new THREE.ShaderPass( THREE.VignetteShader );
        vignettePass.uniforms[ "darkness" ].value = 1.0;
        composer.addPass( vignettePass );
        var copyPass = new THREE.ShaderPass( THREE.CopyShader );
        copyPass.renderToScreen = true;
        composer.addPass( copyPass );
        // events
        window.addEventListener( 'resize', onWindowResize, false );
    }
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        composer.setSize( window.innerWidth, window.innerHeight );
        renderer.setSize( window.innerWidth, window.innerHeight );
    }
    //
    var clock = new THREE.Clock();
    function animate() {
        var delta = clock.getDelta();
        requestAnimationFrame( animate );
        // Update SEA3D Animations
        THREE.SEA3D.AnimationHandler.update( delta );
        render( delta );
        stats.update();
    }
    function render( dlt ) {
        //renderer.render( scene, camera );
        composer.render( dlt );
    }
};
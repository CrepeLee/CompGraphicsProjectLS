async function main() {
	await initialize();
	requestAnimationFrame(render);
}

let texture;

// noise data
let perlinNoiseOrigin = [];
let perlinNoiseGoal = [];
let groundDimension = Math.sqrt(groundMesh.uvs.length/2);

// animation data
let interpolationStartTime = null; 
const interpolationDuration = 1000; 
let isInterpolating = false; 
let currentPerlinNoise = []; 

// balloon data
const balloonRange = 5;
let balloonPositionX = Math.random() * balloonRange - (balloonRange/2);
let balloonPositionZ = Math.random() * balloonRange - (balloonRange/2);

// html data
let isMouseDown = false; 
let sliderMapAmp = document.getElementById("mapAmplitude");
let sliderMapFrequency = document.getElementById("mapFrequency");

// gl data
let gl;

// camera data
let cameraDistance = 5;
let cameraRotation = { x: 30, y: 30 };
let camHeight = parseFloat(sliderMapAmp.value)/3 + 0.5;

// array of objects that are to be renderd
let objects = [
	{	mesh: groundMesh,
		vao: null,
		program: null,
		shaders: [
			"shaders/plane.vert",
			"shaders/plane.frag"
		],
		texturing: {
			usesTexture: true, texture: null, textureLocation: "textures/aerial_rocks.jpg"
		},
		attr: [
			{name: "a_position", data: groundMesh.positions, size: 3},
			{name: "a_uv", data: groundMesh.uvs, size: 2},
		],
		attrRealTime: [
			{name: "a_noise", data: currentPerlinNoise, size: 1},
			{name: "a_normal", data: groundMesh.normals, size: 3},
		],
		uniform: [
			null,	// model matrix
			null,	// view matrix
			null	// projection matrix
		],	
		modelMatrix: [
		0, 0, 5, 0,
		0, 1, 0, 0,
		5, 0, 0, 0,
		0, 0, 0, 1,
		],
	}, 
	{	mesh: balloonMesh,
		vao: null,
		program: null,
		shaders: [
			"shaders/balloon.vert",
			"shaders/balloon.frag"
		],
		texturing: {
			usesTexture: true, texture: null, textureLocation: "textures/balloon_flat.jpg"
		},
		attr: [
			{name: "a_position", data: balloonMesh.positions, size: 3},
			{name: "a_uv", data: balloonMesh.uvs, size: 2},
			{name: "a_normal", data: balloonMesh.normals, size: 3},
		],
		attrRealTime: [],
		uniform: [
			null,	// model matrix
			null,	// view matrix
			null	// projection matrix
		],
		modelMatrix: [
		0, 0, .07, balloonPositionX,
		0, .07, 0, sliderMapAmp.value + .1,
		.07, 0, 0, balloonPositionZ,
		0, 0, 0, 1,
		],	
	},
	{	mesh: cubeMesh,
		vao: null,
		program: null,
		shaders: [
			"shaders/skybox.vert",
			"shaders/skybox.frag"
		],
		texturing: {
			usesTexture: false, texture: null, textureLocation: ""
		},
		attr: [
			{name: "a_position", data: cubeMesh.positions, size: 3},
		],
		attrRealTime: [],
		uniform: [
			null,	// model matrix
			null,	// view matrix
			null	// projection matrix
		],
		modelMatrix: [
		0, 0, 10, 0,
		0, 5, 0, 0,
		10, 0, 0, 0,
		0, 0, 0, 1,
		],	
	},
];

// perlin obj from https://github.com/joeiddon/perlin.git
let perlin = {
	gradients: {},
	memory: {},

	rand_vect: function () {
		let theta = Math.random() * 2 * Math.PI;
		return { x: Math.cos(theta), y: Math.sin(theta) };
	},
	dot_prod_grid: function (x, y, vx, vy) {
		let g_vect;
		let d_vect = { x: x - vx, y: y - vy };
		if (this.gradients[[vx, vy]]) {
			g_vect = this.gradients[[vx, vy]];
		} else {
			g_vect = this.rand_vect();
			this.gradients[[vx, vy]] = g_vect;
		}
		return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
	},
	smootherstep: function (x) {
		return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
	},
	interp: function (x, a, b) {
		return a + this.smootherstep(x) * (b - a);
	},
	seed: function () {
		this.gradients = {};
		this.memory = {};
	},
	get: function (x, y) {
		if (this.memory.hasOwnProperty([x, y]))
			return this.memory[[x, y]];
		let xf = Math.floor(x);
		let yf = Math.floor(y);
		//interpolate
		let tl = this.dot_prod_grid(x, y, xf, yf);
		let tr = this.dot_prod_grid(x, y, xf + 1, yf);
		let bl = this.dot_prod_grid(x, y, xf, yf + 1);
		let br = this.dot_prod_grid(x, y, xf + 1, yf + 1);
		let xt = this.interp(x - xf, tl, tr);
		let xb = this.interp(x - xf, bl, br);
		let v = this.interp(y - yf, xt, xb);
		this.memory[[x, y]] = v;
		return v;
	}
}

// set changes when button is pressed
function buttonNewMap() {
	// new perlin noise
	// sets perlinNoiseOrigin to the currentPerlinNoise in case the button is spammed
	perlinNoiseOrigin = currentPerlinNoise;
    perlinNoiseGoal = generateNoise(groundMesh);
    interpolationStartTime = performance.now();
    isInterpolating = true;

	// new balloon positions
	balloonPositionX = Math.random() * balloonRange - (balloonRange/2);
	balloonPositionZ = Math.random() * balloonRange - (balloonRange/2);
}

// generate noise array for a given mesh. 
// slightly modified code from https://github.com/joeiddon/perlin.git
function generateNoise(mesh) {
	// setting noise depth for more rough surface
	const depth = 5;
	const depthAmp = 0.5; 
    const depthFreq = 2.0;  

	// setting noise base depth modifiers 
    const amplitudeBase = parseFloat(sliderMapAmp.value);
	const frequencyBase = parseFloat(sliderMapFrequency.value);

	let texture = [];

	// perlin seed resets the perlin objects noise memory
	perlin.seed();

	// get perlin noise for each vertex
	for (let uv = 0; uv < mesh.uvs.length; uv += 2) {
        let u = mesh.uvs[uv];
        let v = mesh.uvs[uv + 1];

        let noiseValue = 0;
        let amplitude = amplitudeBase;
        let frequency = frequencyBase;

		// stack noise values in for loop to get rough surface
        for (let d = 0; d < depth; d++) {
            noiseValue += Math.abs(perlin.get(u * frequency, v * frequency)) * amplitude;

			// modify next depths noise 
            amplitude *= depthAmp;
            frequency *= depthFreq;
        }

        texture.push(noiseValue);
    }

    return texture;
}

// function that computes the normals for a given object
function newObjNormals(obj) {
	const objMesh = obj.mesh;

	// sets positions of obj to currentPerlinNoise
	for (let i = 0; i < objMesh.positions.length / 3; i++) {
    	obj.attr[0].data[i * 3 + 1] = currentPerlinNoise[i];
	}

	// get positions and indices of mesh
	let meshPositions = objMesh.positions;
	let meshIndices = objMesh.indices;

	// initialize normals array
	const normals = new Float32Array(meshPositions.length);
	// calculate and insert all normals
	for (let i = 0; i < meshIndices.length; i += 3) {
		// setup vectors
		const i0 = meshIndices[i] * 3, i1 = meshIndices[i+1] * 3, i2 = meshIndices[i+2] * 3;
		const v0 = [meshPositions[i0], meshPositions[i0+1], meshPositions[i0+2]];
		const v1 = [meshPositions[i1], meshPositions[i1+1], meshPositions[i1+2]];
		const v2 = [meshPositions[i2], meshPositions[i2+1], meshPositions[i2+2]];
		const e1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
		const e2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
		// calculate cross product -> vector (nx, ny, nz) is the normal vector
		const nx = e1[1]*e2[2] - e1[2]*e2[1];
		const ny = e1[2]*e2[0] - e1[0]*e2[2];
		const nz = e1[0]*e2[1] - e1[1]*e2[0];
		// insert x y z values into normals array
		for (const idx of [i0, i1, i2]) {
			normals[idx  ] += nx;
			normals[idx+1] += ny;
			normals[idx+2] += nz;
		}
	}
	// normalize normals to unit length
	for (let i = 0; i < normals.length; i += 3) {
		const nx = normals[i], ny = normals[i+1], nz = normals[i+2];
		const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1.0;
		normals[i]   = nx / len;
		normals[i+1] = ny / len;
		normals[i+2] = nz / len;
	}

	return normals;
} 



function setupCameraRotation() {
	const canvas = document.querySelector("canvas");

	canvas.onmousedown = function (event) { if (event.button === 0) { isMouseDown = true } };

	document.onmouseup = function (event) { if (event.button === 0) { isMouseDown = false } };

	document.onmousemove = function (event) {
		if (isMouseDown) {
			cameraRotation.x += event.movementY * 0.2;
			cameraRotation.y += event.movementX * 0.2;
		}
	};
}


async function initialize() {
	setupCameraRotation();


	const canvas = document.querySelector("canvas"); // get the html canvas element
	// everytime we talk to WebGL we use this object
	gl = canvas.getContext("webgl2", { alpha: false });

	if (!gl) { console.error("Your browser does not support WebGL2"); }
	// set the resolution of the html canvas element
	canvas.width = 500; canvas.height = 350;

	// create the starting perlin noise
	perlinNoiseOrigin = generateNoise(groundMesh);
	perlinNoiseGoal = [...perlinNoiseOrigin];
	currentPerlinNoise = [...perlinNoiseOrigin];

	// set starting perlin noise for ground
	objects[0].attrRealTime[0].data = currentPerlinNoise;
	objects[0].attrRealTime[1].data = newObjNormals(objects[0]);

	// set starting height for balloon
	objects[1].modelMatrix[7] = parseFloat(sliderMapAmp.value)/2 + 0.5;
	
	// set the resolution of the framebuffer
	gl.viewport(0, 0, canvas.width, canvas.height);

	gl.enable(gl.DEPTH_TEST); // enable z-buffering
	// backface culling removes the plane for some reason
	// gl.enable(gl.CULL_FACE); // enable back-face culling


	// load objects 
	for (let num = 0; num < objects.length; num++) {
		let obj = objects[num];

		// get obj shaders and create obj program
		const vertexShaderText = await loadTextResource(obj.shaders[0]);
		const fragmentShaderText = await loadTextResource(obj.shaders[1]);
		const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
		const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);
		
		obj.program = createProgram(gl, vertexShader, fragmentShader);
		
		// if available, upload texture
		if (obj.texturing.usesTexture) {
			obj.texturing.texture = gl.createTexture();

			let image = new Image();
			image.onload = function() {
				gl.bindTexture(gl.TEXTURE_2D, obj.texturing.texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.bindTexture(gl.TEXTURE_2D, null)
			};
			image.src = obj.texturing.textureLocation;
		}

		// upload attr data given for obj
		uploadAttributeData(obj);
	
		// set maticies for obj
		obj.uniform[0] = gl.getUniformLocation(obj.program, "u_modelMatrix");
		obj.uniform[1] = gl.getUniformLocation(obj.program, "u_viewMatrix");
		obj.uniform[2] = gl.getUniformLocation(obj.program, "u_projectionMatrix");
	}
}

function uploadAttributeData(obj) {
	const mesh = obj.mesh;
	const program = obj.program;

	obj.vao = gl.createVertexArray();
	gl.bindVertexArray(obj.vao)
	
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

	// upload all in attr contained data
	const attr = obj.attr;
	for (let attribute = 0; attribute < attr.length; attribute++) {
		const attrBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attr[attribute].data), gl.STATIC_DRAW);
		const attributeLocation = gl.getAttribLocation(program, attr[attribute].name);
		gl.vertexAttribPointer(attributeLocation, attr[attribute].size, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(attributeLocation);
	}
	// upload all real time attrs to have base data
	const attrRealTime = obj.attrRealTime;
	for (let attribute = 0; attribute < attrRealTime.length; attribute++) {
		const attrBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attrRealTime[attribute].data), gl.STATIC_DRAW);
		const attributeLocation = gl.getAttribLocation(program, attrRealTime[attribute].name);
		gl.vertexAttribPointer(attributeLocation, attrRealTime[attribute].size, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(attributeLocation);
	}

	// unbind to avoid accidental modification
	gl.bindVertexArray(null); // before other unbinds
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}

function render(time) {
	gl.clearColor(0, 0, 0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);

	let perlinNoise;
	// changes that happen during animation interpolation
	if (isInterpolating && interpolationStartTime !== null) {
		// how much time has passed since interpolation started
		const elapsed = time - interpolationStartTime;

		// set perlinNoise to incremental between perlinNoiseOrigin and perlinNoiseGoal
		// t is how far the interpolation is from 0 - 1, used for calculations
    	let t = Math.min(elapsed / interpolationDuration, 1);
    	perlinNoise = perlinNoiseOrigin.map((v, i) =>
        	v * (1 - t) + perlinNoiseGoal[i] * t
    	);

		// update current perlin noise 
		currentPerlinNoise = perlinNoise;
		objects[0].attrRealTime[0].data = currentPerlinNoise;

		// update new normals for ground
		objects[0].attrRealTime[1].data = newObjNormals(objects[0]);

		// update balloon position
		objects[1].modelMatrix[3] = objects[1].modelMatrix[3] * (1 - t) + balloonPositionX * t;
		objects[1].modelMatrix[7] = objects[1].modelMatrix[7] * (1 - t) + (parseFloat(sliderMapAmp.value)/2 + 0.5) * t;
		objects[1].modelMatrix[11] = objects[1].modelMatrix[11] * (1 - t) + balloonPositionZ * t;

		// update camera height
		camHeight = camHeight * (1 - t) + (parseFloat(sliderMapAmp.value)/2 + 0.5) * t;

    	if (t >= 1) {
        	isInterpolating = false;
        	perlinNoiseOrigin = perlinNoiseGoal;
    	}
	} else {
    	perlinNoise = perlinNoiseGoal;
	}
	
	// check if ground should use texture
	objects[0].texturing.usesTexture = document.getElementById("useTexture").checked;
	
	// iterate over objects
	for (let num = 0; num < objects.length; num++) {
		const obj = objects[num];

		const mesh = obj.mesh;
		const program = obj.program;
		const vao = obj.vao; 

		gl.useProgram(program);
		gl.bindVertexArray(vao);

		if (obj.texturing.usesTexture) {
			gl.bindTexture(gl.TEXTURE_2D, obj.texturing.texture);
		}


		// upload changed attr data (only necessary if scene is interpolating) 
		if (isInterpolating && interpolationStartTime !== null) {
			const attrRealTime = obj.attrRealTime;
			for (let attribute = 0; attribute < attrRealTime.length; attribute++) {
				const attrBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, attrBuffer);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attrRealTime[attribute].data), gl.STATIC_DRAW);
				const attributeLocation = gl.getAttribLocation(program, attrRealTime[attribute].name);
				gl.vertexAttribPointer(attributeLocation, attrRealTime[attribute].size, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(attributeLocation);
			}
		}
		setMatrices(obj);
		const numVertices = mesh.indices.length;
		gl.drawElements(gl.TRIANGLES, numVertices, gl.UNSIGNED_SHORT, 0);
 	

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindVertexArray(null);
		gl.useProgram(null); 
	}

	requestAnimationFrame(render);
}

function setMatrices(obj) {
	const modelMatrix = obj.modelMatrix;

	let viewMatrix = null;
	let cameraType = document.querySelector('input[name="cameraType"]:checked').value;
	if (cameraType == 0) {
		// camera first person
		const vT = mat4Translation(0, -camHeight, -0);	// base maybe like -1.25
		const vRy = mat4RotY(-cameraRotation.y * Math.PI / 180);
		const vRx = mat4RotX(-cameraRotation.x * Math.PI / 180);
		viewMatrix = mat4Mul(vRx, mat4Mul(vRy, vT));
	
	} else if (cameraType == 1) {	
		// camera pan
		const vT = mat4Translation(0, 0, -cameraDistance);
		const vRy = mat4RotY(cameraRotation.y * Math.PI / 180);
		const vRx = mat4RotX(cameraRotation.x * Math.PI / 180);
		viewMatrix = mat4Mul(vT, mat4Mul(vRx, vRy));
	
	}
	
	const canvas = document.querySelector("canvas");
	const aspectRatio = canvas.width / canvas.height;
	const projectionMatrix = perspective(45, aspectRatio, 0.1, 100);

	// we set transpose to true to convert to column-major
	gl.uniformMatrix4fv(obj.uniform[0], true, modelMatrix);
	gl.uniformMatrix4fv(obj.uniform[1], true, viewMatrix);
	gl.uniformMatrix4fv(obj.uniform[2], true, projectionMatrix);
}

main();
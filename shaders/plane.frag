#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

in vec2 v_uv;
in float v_noise;

in vec3 v_worldSpacePosition;
in vec3 v_worldSpaceNormal;
in vec3 v_worldSpaceCameraPosition;

uniform sampler2D u_texture;


out vec4 outColor;
 

// brdf for plane, basic flat color 
// add reflectence test: + pow( max(dot(omega_o, -reflect(omega_i, n)), 0.0), 1000.0) 
vec3 brdf(vec3 x, vec3 omega_i, vec3 omega_o, vec3 n, vec3 c_diffuse) {
	return c_diffuse;
}

// directional light
vec3 L_i_directional(vec3 x, vec3 omega_i) {
	return vec3(1);
}

// fresnel effect
// brought to you by https://godotshaders.com/snippet/fresnel/
float fresnel(float power, vec3 n, vec3 omega_o) {
    return pow(1.0 - clamp(dot(n, omega_o), 0.0, 1.0), power);
}

vec2 planeMapUV(vec3 position) {
	return position.xz;
}

void main() {
//  visualize the noise texture
//	outColor = vec4(vec3(v_noise), 1.0);

	vec3 c_diffuse = texture(u_texture, planeMapUV(v_worldSpacePosition)).xyz;
	if (c_diffuse.xyz == vec3(0.0, 0.0, 0.0)) {
// 		map coloring  
//		vec3 c_diffuse = vec3(0.4);	// flat grey
//		vec3 c_diffuse = vec3( v_noise * 3.0 , 0.7 , 0.5 + v_noise * 2.0 );	// so called vaporwave
		c_diffuse = vec3( 0.2 + v_noise * 1.0 , 0.2 + v_noise * 1.0 , 0.0 + v_noise * 1.0 ); // brown map
	}

	// position on surface
	vec3 x = v_worldSpacePosition;
	// surface normal direction
	vec3 n = normalize(v_worldSpaceNormal);
	// direction to camera
	vec3 omega_o = normalize(v_worldSpaceCameraPosition - x);
	// direction to light source
	vec3 omega_i = normalize(vec3(1,2,0));

	vec3 ambientLight = c_diffuse * 0.3;

	vec3 lighting = ambientLight;
	lighting += brdf(x, omega_i, omega_o, n, c_diffuse) * L_i_directional(x, omega_i) * max(0.0, dot(omega_i, n));

	// add fresnel effect
	float f = fresnel(.05, n, omega_o);
	lighting *= f;


	outColor = vec4(lighting, 1.0);
}
  